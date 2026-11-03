import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Mapa do roteiro com OpenFreeMap (gratuito, sem chave, uso comercial liberado;
// https://openfreemap.org). Substitui os mapas CARTO, que passaram a exigir chave.
// Carregado sob demanda (React.lazy) para não pesar no resto do app.

const ESTILO = "https://tiles.openfreemap.org/styles/liberty";
const CINZA_FEITO = "#7D8A90";

export interface PontoMapa {
  lat: number;
  lng: number;
  nome: string;
  numero: number;
  estado: "feita" | "proxima" | "depois";
}

// Um pedaço do caminho (de um ponto ao seguinte), cada um com sua cor
export interface TrechoMapa {
  linha: [number, number][]; // [lat, lng]
  cor: string;
  feito: boolean; // trecho já percorrido: cinza tracejado
}

type Coord = { lat: number; lng: number };

interface Props {
  pontos: PontoMapa[];
  trechos: TrechoMapa[];
  voce: Coord | null; // onde a pessoa está (só quando perto dos lugares do dia)
  centro: Coord | null; // usado quando não há pontos
  onPosicao?: (c: Coord) => void; // quando a pessoa toca no botão de localização do mapa
}

function elementoVoce() {
  const el = document.createElement("div");
  el.style.cssText = "width:18px;height:18px;border-radius:50%;background:#1DA1F2;border:3px solid #FFFFFF;box-shadow:0 0 0 6px rgba(29,161,242,.25),0 1px 4px rgba(0,0,0,.3)";
  el.setAttribute("aria-label", "Você está aqui");
  return el;
}

function elementoMarcador(p: PontoMapa) {
  const el = document.createElement("div");
  const cores = {
    feita: { bg: "#1E6B4F", fg: "#FFFFFF", borda: "#FFFFFF" },
    proxima: { bg: "#F5B40F", fg: "#0E2F45", borda: "#0E2F45" },
    depois: { bg: "#FFFFFF", fg: "#0E2F45", borda: "#0E2F45" },
  }[p.estado];
  const tam = p.estado === "proxima" ? 34 : 28;
  el.style.cssText = `width:${tam}px;height:${tam}px;border-radius:50%;background:${cores.bg};color:${cores.fg};border:3px solid ${cores.borda};display:flex;align-items:center;justify-content:center;font:800 13px Figtree,system-ui,sans-serif;box-shadow:0 2px 8px rgba(14,47,69,.25);cursor:pointer`;
  el.textContent = String(p.numero);
  el.setAttribute("aria-label", `${p.numero}. ${p.nome}`);
  return el;
}

export default function MapaRoteiro({ pontos, trechos, voce, centro, onPosicao }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<maplibregl.Map | null>(null);
  const marcadores = useRef<maplibregl.Marker[]>([]);
  const marcadorVoce = useRef<maplibregl.Marker | null>(null);
  const enquadrado = useRef("");
  // "load" só dispara uma vez; isStyleLoaded() pode voltar a ser false depois (ícones,
  // fontes e tiles ainda carregando), e esperar um novo "load" deixaria a rota sem desenhar
  const pronto = useRef(false);
  const avisarPosicao = useRef(onPosicao);
  avisarPosicao.current = onPosicao;

  // Cria o mapa uma vez
  useEffect(() => {
    if (!caixa.current) return;
    const m = new maplibregl.Map({
      container: caixa.current,
      style: ESTILO,
      center: centro ? [centro.lng, centro.lat] : [-34.86, -7.12], // João Pessoa como último recurso
      zoom: centro ? 12 : 10,
      attributionControl: { compact: true },
      cooperativeGestures: false,
    });
    // Nomes de ruas e lugares em português (o estilo prefere o nome em inglês)
    m.once("load", () => {
      pronto.current = true;
      for (const camada of m.getStyle().layers ?? []) {
        if (camada.type === "symbol" && m.getLayoutProperty(camada.id, "text-field")) {
          m.setLayoutProperty(camada.id, "text-field", ["coalesce", ["get", "name:pt"], ["get", "name"], ["get", "name_en"]]);
        }
      }
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const localizar = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true });
    localizar.on("geolocate", (e: { coords: GeolocationCoordinates }) => {
      avisarPosicao.current?.({ lat: e.coords.latitude, lng: e.coords.longitude });
    });
    m.addControl(localizar, "top-right");
    mapa.current = m;
    return () => { m.remove(); mapa.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pontos, trechos e enquadramento (só quando o conteúdo muda de verdade)
  const chave = JSON.stringify([pontos, trechos, voce, centro]);
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const aplicar = () => {
      marcadores.current.forEach((mk) => mk.remove());
      marcadores.current = pontos.map((p) =>
        new maplibregl.Marker({ element: elementoMarcador(p) })
          .setLngLat([p.lng, p.lat])
          .setPopup(new maplibregl.Popup({ offset: 18, closeButton: false }).setText(`${p.numero}. ${p.nome}`))
          .addTo(m),
      );

      marcadorVoce.current?.remove();
      marcadorVoce.current = voce ? new maplibregl.Marker({ element: elementoVoce() }).setLngLat([voce.lng, voce.lat]).addTo(m) : null;

      // O primeiro trecho fica por cima dos outros quando passam pela mesma rua
      const linhas = {
        type: "FeatureCollection" as const,
        features: trechos.map((t, i) => ({
          type: "Feature" as const,
          properties: { cor: t.cor, feito: t.feito, ordem: -i },
          geometry: { type: "LineString" as const, coordinates: t.linha.map(([lat, lng]) => [lng, lat]) },
        })),
      };
      const fonte = m.getSource("rota") as maplibregl.GeoJSONSource | undefined;
      if (fonte) fonte.setData(linhas);
      else {
        m.addSource("rota", { type: "geojson", data: linhas });
        const contorno: maplibregl.LineLayerSpecification["layout"] = { "line-cap": "round", "line-join": "round", "line-sort-key": ["get", "ordem"] };
        m.addLayer({
          id: "rota-feita",
          type: "line",
          source: "rota",
          filter: ["==", ["get", "feito"], true],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": CINZA_FEITO, "line-width": 4, "line-opacity": 0.7, "line-dasharray": [0.2, 2] },
        });
        m.addLayer({
          id: "rota-borda",
          type: "line",
          source: "rota",
          filter: ["==", ["get", "feito"], false],
          layout: contorno,
          paint: { "line-color": "#FFFFFF", "line-width": 9 },
        });
        m.addLayer({
          id: "rota",
          type: "line",
          source: "rota",
          filter: ["==", ["get", "feito"], false],
          layout: contorno,
          paint: { "line-color": ["get", "cor"], "line-width": 5 },
        });
      }

      // Enquadra de novo só quando mudam os lugares (ou a pessoa aparece no mapa),
      // não a cada passo que ela anda
      const quadro = JSON.stringify([pontos.map((p) => [p.lat, p.lng]), !!voce, centro]);
      if (quadro === enquadrado.current) return;
      enquadrado.current = quadro;
      const todos = voce ? [...pontos, voce] : pontos;
      if (todos.length > 1) {
        const limites = new maplibregl.LngLatBounds();
        todos.forEach((p) => limites.extend([p.lng, p.lat]));
        m.fitBounds(limites, { padding: 56, maxZoom: 15, duration: 600 });
      } else if (todos.length === 1) {
        m.easeTo({ center: [todos[0].lng, todos[0].lat], zoom: 14, duration: 600 });
      } else if (centro) {
        m.easeTo({ center: [centro.lng, centro.lat], zoom: 12, duration: 600 });
      }
    };
    if (pronto.current) aplicar();
    else m.once("load", aplicar);
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={caixa} className="w-full h-full" />;
}
