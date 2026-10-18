import { useEffect, useState, lazy, Suspense } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Download, Map as MapIcon, MapPin, MessageCircle } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { Carregando, Vazio, Selo, btnPrimario, btnSecundario, cartao, formatarData } from "@/components/app/ui";
import { DEMO_ROTEIRO, demoViagens } from "@/lib/demo";
import { supabase } from "@/integrations/supabase/client";
import type { PontoMapa } from "@/components/app/MapaRoteiro";

const MapaRoteiro = lazy(() => import("@/components/app/MapaRoteiro"));

// ─── Types ────────────────────────────────────────────────────────────────────

interface Activity {
  period: string;
  time: string;
  name: string;
  travel: string;
  description: string;
  mapUrl: string;
}

interface Day {
  label: string;
  activities: Activity[];
}

interface GeoPoint {
  lat: number;
  lng: number;
  name: string;
  actIndex: number;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseItinerary(text: string) {
  const days: Day[] = [];
  let currentDay: Day | null = null;
  let currentActivity: Partial<Activity> | null = null;
  let descBuffer: string[] = [];
  let inIntro = true;

  const flush = () => {
    if (currentActivity && currentDay) {
      currentDay.activities.push({
        period: currentActivity.period || "",
        time: currentActivity.time || "",
        name: currentActivity.name || "",
        travel: currentActivity.travel || "",
        description: descBuffer.join(" ").trim(),
        mapUrl: currentActivity.mapUrl || "",
      });
    }
    currentActivity = null;
    descBuffer = [];
  };

  for (const raw of text.split("\n")) {
    const line = raw.replace(/\*/g, "").trim();
    if (!line || /^---+$/.test(line) || /^(Com carinho|Sol)$/i.test(line)) continue;
    const s = line.replace(/^[^\p{L}\d(]+/u, "").trim();

    if (/^DIA\s*\d+/i.test(s)) {
      inIntro = false; flush();
      currentDay = { label: s, activities: [] };
      days.push(currentDay);
      continue;
    }
    if (inIntro || line.startsWith("⚠️")) continue;
    if (line.startsWith("🚗") || /^~\s*\d+/i.test(s)) {
      if (currentActivity) currentActivity.travel = line.replace(/^🚗\s*/, "").trim();
      continue;
    }
    if (line.startsWith("📍") || /^https?:\/\//i.test(s)) {
      if (currentActivity) {
        const url = line.replace(/^📍\s*/, "").trim();
        if (/^https?:\/\//i.test(url)) currentActivity.mapUrl = url;
      }
      continue;
    }
    if (line.startsWith("💬")) {
      if (currentActivity) descBuffer.push(line.replace(/^💬\s*/, "").trim());
      continue;
    }
    const pm = s.match(/^(Manh[aã]|Tarde|Noite|P[oô]r\s*do\s*Sol|Dia\s*Inteiro)\s*\(([^)]+)\)[:\s-]+(.+)/i);
    if (pm) {
      flush();
      currentActivity = { period: pm[1], time: pm[2].trim(), name: pm[3].trim(), travel: "", mapUrl: "" };
      continue;
    }
    if (currentActivity && !currentActivity.name) currentActivity.name = s;
    else if (currentActivity) descBuffer.push(s);
  }
  flush();
  return days;
}

// "DIA 1 — Sábado, 04/10" → "Dia 1"
function rotuloCurto(label: string, i: number) {
  const m = label.match(/DIA\s*(\d+)/i);
  return `Dia ${m ? m[1] : i + 1}`;
}

// ─── Geocoding ────────────────────────────────────────────────────────────────

// O Nominatim (OpenStreetMap) aceita no máximo 1 consulta por segundo; rajadas
// eram bloqueadas e o mapa ficava vazio. Fila única + memória no aparelho.
type Coord = { lat: number; lng: number };
const GEO_CHAVE = "sol_geo_v1";
const geoCache: Record<string, Coord | null> = (() => {
  try { return JSON.parse(localStorage.getItem(GEO_CHAVE) || "{}"); } catch { return {}; }
})();
let filaGeo: Promise<unknown> = Promise.resolve();

function geocode(query: string): Promise<Coord | null> {
  if (query in geoCache) return Promise.resolve(geoCache[query]);
  const tarefa = filaGeo.then(async () => {
    if (query in geoCache) return geoCache[query];
    let pt: Coord | null = null;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`,
        { headers: { "Accept-Language": "pt-BR" } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data[0]) pt = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        geoCache[query] = pt; // só memoriza respostas válidas (erro de rede tenta de novo depois)
        try { localStorage.setItem(GEO_CHAVE, JSON.stringify(geoCache)); } catch { /* sem armazenamento */ }
      }
    } catch { /* tenta de novo numa próxima abertura */ }
    await new Promise((r) => setTimeout(r, 1100));
    return pt;
  });
  filaGeo = tarefa.catch(() => null);
  return tarefa;
}

function extractQuery(mapUrl: string) {
  try { return new URL(mapUrl).searchParams.get("query"); } catch { return null; }
}

// ─── OSRM: rota real pelas ruas ───────────────────────────────────────────────

async function fetchRoadRoute(points: { lat: number; lng: number }[]): Promise<[number, number][]> {
  if (points.length < 2) return points.map((p) => [p.lat, p.lng]);
  try {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    );
    const data = await res.json();
    if (data.routes?.[0]?.geometry?.coordinates) {
      return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
    }
  } catch { /* fallback to straight line */ }
  return points.map((p) => [p.lat, p.lng]);
}

// ─── Marcações "feita" (guardadas só neste aparelho) ─────────────────────────

function useFeitas(chave: string | null) {
  const [feitas, setFeitas] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!chave) return;
    try { setFeitas(JSON.parse(localStorage.getItem(chave) || "{}")); } catch { setFeitas({}); }
  }, [chave]);
  const alternar = (id: string) => {
    setFeitas((atual) => {
      const novo = { ...atual, [id]: !atual[id] };
      if (chave) { try { localStorage.setItem(chave, JSON.stringify(novo)); } catch { /* sem armazenamento */ } }
      return novo;
    });
  };
  return { feitas, alternar };
}

// ─── Minhas viagens ───────────────────────────────────────────────────────────

export interface Viagem {
  id: string;
  destination: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
  days: number;
  pdfUrl: string | null;
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Datas no formato AAAA-MM-DD (como o bot grava): dá para comparar como texto.
function situacao(v: Viagem): "passada" | "agora" | "proxima" {
  const hoje = hojeISO();
  if (v.departureDate && v.departureDate < hoje) return "passada";
  if (v.arrivalDate && v.arrivalDate > hoje) return "proxima";
  return "agora";
}

function CartaoViagem({ v }: { v: Viagem }) {
  const sit = situacao(v);
  const periodo = [formatarData(v.arrivalDate), formatarData(v.departureDate)].filter(Boolean).join(" a ");
  return (
    <Link
      to={`/app/roteiro?id=${encodeURIComponent(v.id)}`}
      className={`${cartao} flex items-center gap-3 p-4 no-underline text-sol-fundo ${sit === "passada" ? "opacity-75" : ""}`}
    >
      <span className={`flex-none w-11 h-11 rounded-xl flex items-center justify-center ${sit === "passada" ? "bg-[#ECEFF1] text-sol-texto2" : "bg-sol-sun text-sol-fundo"}`}>
        <MapIcon size={22} />
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-base font-extrabold truncate">{v.destination || "Roteiro"}</span>
        <span className="text-[13px] text-sol-texto2">
          {periodo || "Datas a confirmar"} · {v.days} {v.days === 1 ? "dia" : "dias"}
        </span>
      </span>
      {sit === "agora" && <Selo tom="ok">Agora</Selo>}
      {sit === "proxima" && <Selo tom="info">Em breve</Selo>}
      {sit === "passada" && <span className="flex-none text-xs font-extrabold px-2 py-1 rounded-full bg-[#ECEFF1] text-sol-texto2">Já passou</span>}
      <ChevronRight size={20} className="flex-none text-sol-texto2" />
    </Link>
  );
}

function ListaViagens() {
  const { profile, profileLoading, token, isDemo } = useClientAuth();
  const [viagens, setViagens] = useState<Viagem[] | null>(null);

  useEffect(() => {
    if (!token) { setViagens([]); return; }
    if (isDemo) { setViagens(demoViagens()); return; }
    fetch(`${API_URL}/api/app/roteiros`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setViagens(Array.isArray(d?.roteiros) ? d.roteiros : null))
      .catch(() => setViagens(null));
  }, [token, isDemo]);

  // Enquanto o bot antigo não tem a lista, mostra só o roteiro mais recente do perfil
  const lista: Viagem[] | null = viagens ?? (profile
    ? profile.itinerary
      ? [{ id: profile.itinerary.id, destination: profile.destination, arrivalDate: profile.arrivalDate, departureDate: profile.departureDate, days: profile.itinerary.days, pdfUrl: profile.itinerary.pdfUrl }]
      : []
    : null);

  if (lista === null || (viagens === null && profileLoading)) return <Carregando />;

  const ativas = lista.filter((v) => situacao(v) !== "passada");
  const passadas = lista.filter((v) => situacao(v) === "passada");

  return (
    <div className="flex flex-col gap-3 px-5 pt-8">
      <h1 className="m-0 font-display font-extrabold text-2xl tracking-tight">Minhas viagens</h1>
      {lista.length === 0 ? (
        <Vazio
          icone={<MapIcon size={32} />}
          titulo="Nenhum roteiro ainda"
          texto="Quando a Sol terminar seu roteiro personalizado, ele aparece aqui com o dia a dia e o mapa."
        >
          <Link to="/app/chat" className={`${btnPrimario} w-full mt-4`}>Pedir roteiro à Sol</Link>
        </Vazio>
      ) : (
        <>
          {ativas.length > 0 && (
            <section aria-label="Próximas viagens" className="flex flex-col gap-2">
              <h2 className="m-0 text-sm font-extrabold text-sol-texto2 uppercase tracking-wide">Próximas e em andamento</h2>
              {ativas.map((v) => <CartaoViagem key={v.id} v={v} />)}
            </section>
          )}
          {passadas.length > 0 && (
            <section aria-label="Viagens que já passaram" className="flex flex-col gap-2 mt-2">
              <h2 className="m-0 text-sm font-extrabold text-sol-texto2 uppercase tracking-wide">Já feitas</h2>
              {passadas.map((v) => <CartaoViagem key={v.id} v={v} />)}
            </section>
          )}
          <Link to="/app/chat" className={`${btnSecundario} no-underline mt-2`}>
            <MessageCircle size={18} /> Planejar outra viagem com a Sol
          </Link>
        </>
      )}
    </div>
  );
}

// /app/roteiro            → lista de viagens
// /app/roteiro?id=X       → roteiro da viagem X (pelo bot)
// /app/roteiro?codigo=Y   → roteiro do link "/r/Y" que a Sol manda na conversa
export default function AppRoteiro() {
  const [params] = useSearchParams();
  if (!params.get("id") && !params.get("codigo")) return <ListaViagens />;
  return <RoteiroDetalhe />;
}

// ─── Roteiro de uma viagem ────────────────────────────────────────────────────

type Aba = "dia" | "mapa";

interface DadosRoteiro {
  texto: string;
  destino: string | null;
  chegada: string | null;
  saida: string | null;
  pdfUrl: string | null;
}

function RoteiroDetalhe() {
  const { profile, profileLoading, token, isDemo } = useClientAuth();
  const [params, setParams] = useSearchParams();
  const aba: Aba = params.get("aba") === "mapa" ? "mapa" : "dia";
  const idParam = params.get("id");
  const codigo = params.get("codigo");
  const [dados, setDados] = useState<DadosRoteiro | null>(null);
  const rawText = dados?.texto ?? null;
  const itineraryId = idParam || codigo;
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [aberta, setAberta] = useState<number | null>(null);
  const [geoPoints, setGeoPoints] = useState<GeoPoint[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [centro, setCentro] = useState<Coord | null>(null);
  const { feitas, alternar } = useFeitas(itineraryId ? `sol_feitas_${itineraryId}` : null);

  // Texto do roteiro: pelo código do link da conversa ou pelo id da viagem
  useEffect(() => {
    setLoading(true);
    setDados(null);
    setActiveDay(0);
    if (!token) { setLoading(false); return; }
    if (isDemo) {
      const v = demoViagens().find((x) => x.id === idParam) ?? demoViagens()[0];
      setDados({ texto: DEMO_ROTEIRO, destino: v.destination, chegada: v.arrivalDate, saida: v.departureDate, pdfUrl: null });
      setLoading(false);
      return;
    }
    let cancelado = false;
    const carregar = codigo
      ? (supabase as any)
          .from("generated_itineraries")
          .select("destination,pdf_url,text_content")
          .eq("share_code", codigo)
          .maybeSingle()
          .then(({ data }: { data: { destination: string | null; pdf_url: string | null; text_content: string | null } | null }) =>
            data?.text_content
              ? { texto: data.text_content, destino: data.destination, chegada: null, saida: null, pdfUrl: data.pdf_url }
              : null)
      : fetch(`${API_URL}/api/app/roteiro?id=${encodeURIComponent(idParam ?? "")}`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) =>
            d?.rawItinerary
              ? { texto: d.rawItinerary, destino: d.destination ?? null, chegada: d.arrivalDate ?? null, saida: d.departureDate ?? null, pdfUrl: d.pdfUrl ?? null }
              : null);
    Promise.resolve(carregar)
      .then((d: DadosRoteiro | null) => { if (!cancelado) setDados(d); })
      .catch(() => {})
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [token, isDemo, idParam, codigo]);

  // Destino e datas: os da viagem aberta; se o bot não mandar, os do perfil (viagem atual)
  const destino = dados?.destino || profile?.destination || null;
  const chegada = dados?.chegada ?? (dados?.destino ? null : profile?.arrivalDate) ?? null;
  const saida = dados?.saida ?? (dados?.destino ? null : profile?.departureDate) ?? null;
  const pdfUrl = dados?.pdfUrl || (!codigo && profile?.itinerary?.id === idParam ? profile?.itinerary?.pdfUrl : null) || null;

  const days = rawText ? parseItinerary(rawText) : [];

  // Geocodifica o dia só quando o mapa é aberto
  useEffect(() => {
    if (aba !== "mapa") return;
    const day = days[activeDay];
    if (!day) return;
    let cancelado = false;
    setGeocoding(true);
    setGeoPoints([]);
    setRouteCoords([]);

    // Centro do mapa = cidade de destino (o mapa aparece mesmo sem nenhum ponto achado)
    if (destino) geocode(destino).then((c) => { if (!cancelado && c) setCentro(c); });

    (async () => {
      const pts: GeoPoint[] = [];
      for (const [ai, act] of day.activities.entries()) {
        const q = act.mapUrl ? extractQuery(act.mapUrl) : null;
        if (!q) continue;
        const pt = await geocode(q);
        if (cancelado) return;
        if (pt) { pts.push({ ...pt, name: act.name, actIndex: ai }); setGeoPoints([...pts]); }
      }
      setGeocoding(false);
      if (pts.length >= 2) {
        const route = await fetchRoadRoute(pts);
        if (!cancelado) setRouteCoords(route);
      }
    })();
    return () => { cancelado = true; };
  }, [activeDay, rawText, aba]); // eslint-disable-line react-hooks/exhaustive-deps

  const trocarAba = (nova: Aba) => {
    const p = new URLSearchParams(params);
    if (nova === "mapa") p.set("aba", "mapa"); else p.delete("aba");
    setParams(p, { replace: true });
  };

  if (loading || (profileLoading && !profile)) return <Carregando />;

  if (days.length === 0) {
    return (
      <div className="px-5 pt-8">
        <Link to="/app/roteiro" className="inline-flex items-center gap-1 min-h-[44px] -ml-1 text-sm font-bold text-sol-mar no-underline">
          <ChevronLeft size={20} /> Minhas viagens
        </Link>
        <Vazio
          icone={<MapIcon size={32} />}
          titulo="Roteiro não encontrado"
          texto="Não consegui abrir este roteiro agora. Volte para a lista de viagens ou peça à Sol para reenviar."
        >
          <Link to="/app/chat" className={`${btnPrimario} w-full mt-4`}>Falar com a Sol</Link>
        </Vazio>
      </div>
    );
  }

  const dia = days[activeDay];
  const chaveAtiv = (ai: number) => `d${activeDay}-${ai}`;
  const feitasHoje = dia.activities.filter((_, ai) => feitas[chaveAtiv(ai)]).length;
  const proxima = dia.activities.findIndex((_, ai) => !feitas[chaveAtiv(ai)]);
  const periodo = [formatarData(chegada), formatarData(saida)].filter(Boolean).join(" a ");

  const estadoPonto = (ai: number): PontoMapa["estado"] => (feitas[chaveAtiv(ai)] ? "feita" : ai === proxima ? "proxima" : "depois");

  return (
    <div className="flex flex-col">
      {/* Cabeçalho escuro do roteiro */}
      <header className="flex flex-col gap-0.5 px-4 pt-8 pb-2.5 bg-sol-fundo text-white">
        <div className="flex items-center gap-1">
          <Link to="/app/roteiro" aria-label="Voltar para minhas viagens" className="flex-none flex items-center justify-center w-12 h-12 -ml-2 text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="flex-1 m-0 font-display font-extrabold text-2xl tracking-tight truncate">
            {destino || "Seu roteiro"}
          </h1>
        </div>
        <span className="text-[13px] text-sol-azul-suave pl-1">
          {periodo || "Datas a confirmar"} · {days.length} {days.length === 1 ? "dia" : "dias"}
        </span>
      </header>

      <nav aria-label="Seções do roteiro" className="grid grid-cols-3 bg-sol-fundo px-3">
        {([
          ["dia", "Dia a dia"],
          ["mapa", "Mapa"],
        ] as [Aba, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-current={aba === id ? "page" : undefined}
            onClick={() => trocarAba(id)}
            className={`min-h-[48px] text-sm border-b-4 ${aba === id ? "font-extrabold text-white border-sol-sun" : "font-semibold text-sol-azul-suave border-transparent"}`}
          >
            {label}
          </button>
        ))}
        <Link to="/app/mural" className="flex items-center justify-center min-h-[48px] text-sm font-semibold text-sol-azul-suave border-b-4 border-transparent no-underline">
          Álbum
        </Link>
      </nav>

      <div className="flex flex-col gap-2.5 px-5 pt-3">
        {/* Dias */}
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Dias" className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {days.map((d, di) => (
              <button
                key={di}
                type="button"
                role="tab"
                aria-selected={di === activeDay}
                onClick={() => { setActiveDay(di); setAberta(null); }}
                className={`flex-none min-w-[76px] min-h-[44px] px-3 rounded-full text-[13px] font-extrabold border-[1.5px] ${
                  di === activeDay ? "bg-sol-fundo text-white border-sol-fundo" : "bg-white text-sol-fundo border-sol-borda"
                }`}
              >
                {rotuloCurto(d.label, di)}
              </button>
            ))}
          </div>
          <span className="ml-auto flex-none text-[13px] font-bold text-sol-texto2">{feitasHoje} de {dia.activities.length} feitas</span>
        </div>

        {aba === "dia" ? (
          <>
            <p className="m-0 text-xs font-semibold text-sol-texto2">{dia.label}</p>
            <ol className="m-0 p-0 list-none flex flex-col gap-1.5">
              {dia.activities.map((act, ai) => {
                const feita = !!feitas[chaveAtiv(ai)];
                const expandida = aberta === ai;
                return (
                  <li key={ai} className="rounded-[14px] bg-white border border-sol-linha">
                    <div className="flex items-center gap-1 pr-2.5 py-0.5 pl-0.5">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={feita}
                        aria-label={`Marcar como feito: ${act.name}`}
                        onClick={() => alternar(chaveAtiv(ai))}
                        className="flex-none w-12 h-[52px] flex items-center justify-center"
                      >
                        <span className={`w-6 h-6 rounded-[7px] border-2 flex items-center justify-center ${feita ? "bg-sol-ok border-sol-ok" : "bg-white border-[#6F7E83]"}`}>
                          {feita && <Check size={14} strokeWidth={3} className="text-white" />}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAberta(expandida ? null : ai)}
                        aria-expanded={expandida}
                        className="flex-1 min-w-0 flex items-center gap-2.5 min-h-[52px] text-left"
                      >
                        <span className="flex-none w-11 font-display font-extrabold text-[15px]">{act.time.split(/[-–]/)[0].trim() || act.period}</span>
                        <span className="flex-1 min-w-0 flex flex-col gap-px">
                          <span className={`text-[15px] font-bold leading-tight ${feita ? "line-through text-sol-texto2" : ""}`}>{act.name}</span>
                          {act.travel && <span className="text-xs text-sol-texto2 truncate">{act.travel}</span>}
                        </span>
                      </button>
                    </div>
                    {expandida && (
                      <div className="flex flex-col gap-2 px-4 pb-3.5">
                        {act.period && <span className="text-xs font-bold text-sol-texto2">{act.period} · {act.time}</span>}
                        {act.description && <p className="m-0 text-sm leading-snug text-sol-texto2">{act.description}</p>}
                        {act.mapUrl && (
                          <a href={act.mapUrl} target="_blank" rel="noopener noreferrer" className={`${btnPrimario} !min-h-[44px] !text-sm no-underline`}>
                            <MapPin size={18} /> Abrir rota no mapa
                          </a>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            <p className="m-0 text-xs text-sol-texto2">As marcações de "feito" ficam guardadas neste celular.</p>
          </>
        ) : (
          <>
            <div className="relative -mx-5 overflow-hidden bg-[#E6EEE9]" style={{ height: 420 }}>
              <Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-sol-texto2">Carregando o mapa...</div>}>
                <MapaRoteiro
                  pontos={geoPoints.map((pt, i): PontoMapa => ({ lat: pt.lat, lng: pt.lng, nome: pt.name, numero: i + 1, estado: estadoPonto(pt.actIndex) }))}
                  rota={routeCoords}
                  centro={centro}
                />
              </Suspense>
              {geocoding && (
                <div className="absolute left-3 top-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 text-xs font-bold text-sol-texto2 shadow">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-sol-mar" />
                  Localizando os lugares do dia...
                </div>
              )}
              {!geocoding && geoPoints.length === 0 && (
                <div className="absolute left-3 right-16 top-3 z-10 px-3 py-2 rounded-xl bg-white/95 text-xs text-sol-texto2 shadow">
                  Não achei os lugares deste dia no mapa. Use o botão "Abrir rota" de cada atividade.
                </div>
              )}
            </div>

            {proxima >= 0 && (
              <>
                <h2 className="m-0 text-base font-extrabold">Próxima parada</h2>
                <div className="flex gap-3 items-center p-3.5 rounded-2xl bg-white border-[1.5px] border-sol-fundo">
                  <span className="flex-none w-9 h-9 rounded-full bg-sol-sun flex items-center justify-center font-extrabold">
                    {(geoPoints.findIndex((p) => p.actIndex === proxima) + 1) || "•"}
                  </span>
                  <span className="flex-1 flex flex-col gap-0.5">
                    <span className="text-base font-bold">{dia.activities[proxima].name}</span>
                    <span className="text-sm text-sol-texto2">{dia.activities[proxima].time}{dia.activities[proxima].travel ? ` · ${dia.activities[proxima].travel}` : ""}</span>
                  </span>
                </div>
                {dia.activities[proxima].mapUrl && (
                  <a href={dia.activities[proxima].mapUrl} target="_blank" rel="noopener noreferrer" className={`${btnPrimario} no-underline`}>
                    <MapPin size={18} /> Abrir rota no navegador
                  </a>
                )}
              </>
            )}
            <div className="flex flex-wrap gap-3.5 text-[13px] text-sol-texto2">
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-sol-ok" />Feita</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-sol-sun border-2 border-sol-fundo" />Próxima</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-sol-fundo" />Depois</span>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-2 mt-1">
          <Link to="/app/chat" className={`${btnSecundario} no-underline`}>
            <MessageCircle size={18} /> Falar com a Sol
          </Link>
          {pdfUrl ? (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={`${btnSecundario} no-underline`}>
              <Download size={18} /> Baixar PDF
            </a>
          ) : (
            <Link to="/app/mural" className={`${btnSecundario} no-underline`}>Ver álbum</Link>
          )}
        </div>
      </div>
    </div>
  );
}
