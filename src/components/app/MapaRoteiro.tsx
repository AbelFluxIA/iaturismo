import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Mapa do roteiro com OpenFreeMap (gratuito, sem chave, uso comercial liberado;
// https://openfreemap.org). Substitui os mapas CARTO, que passaram a exigir chave.
// Carregado sob demanda (React.lazy) para não pesar no resto do app.

const ESTILO = "https://tiles.openfreemap.org/styles/liberty";
const MAR = "#0B5F8A";

export interface PontoMapa {
  lat: number;
  lng: number;
  nome: string;
  numero: number;
  estado: "feita" | "proxima" | "depois";
}

interface Props {
  pontos: PontoMapa[];
  rota: [number, number][]; // [lat, lng]
  centro: { lat: number; lng: number } | null; // usado quando não há pontos
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

export default function MapaRoteiro({ pontos, rota, centro }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<maplibregl.Map | null>(null);
  const marcadores = useRef<maplibregl.Marker[]>([]);

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
      for (const camada of m.getStyle().layers ?? []) {
        if (camada.type === "symbol" && m.getLayoutProperty(camada.id, "text-field")) {
          m.setLayoutProperty(camada.id, "text-field", ["coalesce", ["get", "name:pt"], ["get", "name"], ["get", "name_en"]]);
        }
      }
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }),
      "top-right",
    );
    mapa.current = m;
    return () => { m.remove(); mapa.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pontos, rota e enquadramento (só quando o conteúdo muda de verdade)
  const chave = JSON.stringify([pontos, rota, centro]);
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

      const linha = {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: rota.map(([lat, lng]) => [lng, lat]) },
      };
      const fonte = m.getSource("rota") as maplibregl.GeoJSONSource | undefined;
      if (fonte) fonte.setData(linha);
      else {
        m.addSource("rota", { type: "geojson", data: linha });
        m.addLayer({
          id: "rota",
          type: "line",
          source: "rota",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": MAR, "line-width": 4, "line-opacity": 0.85, "line-dasharray": [0.2, 2] },
        });
      }

      if (pontos.length > 1) {
        const limites = new maplibregl.LngLatBounds();
        pontos.forEach((p) => limites.extend([p.lng, p.lat]));
        m.fitBounds(limites, { padding: 56, maxZoom: 15, duration: 600 });
      } else if (pontos.length === 1) {
        m.easeTo({ center: [pontos[0].lng, pontos[0].lat], zoom: 14, duration: 600 });
      } else if (centro) {
        m.easeTo({ center: [centro.lng, centro.lat], zoom: 12, duration: 600 });
      }
    };
    if (m.isStyleLoaded()) aplicar();
    else m.once("load", aplicar);
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={caixa} className="w-full h-full" />;
}
