import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Check, ChevronLeft, Crosshair, Download, Map as MapIcon, MapPin, MessageCircle } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { Carregando, Vazio, btnPrimario, btnSecundario, formatarData } from "@/components/app/ui";

// Fix leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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

const geoCache = new Map<string, { lat: number; lng: number } | null>();

async function geocode(query: string) {
  if (geoCache.has(query)) return geoCache.get(query)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "Accept-Language": "pt-BR" } }
    );
    const data = await res.json();
    if (data[0]) {
      const pt = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geoCache.set(query, pt);
      return pt;
    }
  } catch { /* ignore */ }
  geoCache.set(query, null);
  return null;
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

// ─── Markers ──────────────────────────────────────────────────────────────────

const MAR = "#0B5F8A";
const FUNDO = "#0E2F45";
const SUN = "#F5B40F";
const OK = "#1E6B4F";

// Feita = verde, próxima = amarelo, depois = branco (legenda do protótipo)
function numberedIcon(n: number, estado: "feita" | "proxima" | "depois") {
  const bg = estado === "feita" ? OK : estado === "proxima" ? SUN : "#FFFFFF";
  const fg = estado === "feita" ? "#FFFFFF" : FUNDO;
  const borda = estado === "feita" ? "#FFFFFF" : FUNDO;
  const size = estado === "proxima" ? 34 : 28;
  return L.divIcon({
    className: "",
    html: `<div style="background:${bg};color:${fg};width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;border:3px solid ${borda};box-shadow:0 2px 8px rgba(14,47,69,0.25)">${n}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -18],
  });
}

function userLocationIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:20px;height:20px">
      <div style="position:absolute;inset:0;background:${MAR};border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(11,95,138,0.5)"></div>
      <div style="position:absolute;inset:-6px;background:rgba(11,95,138,0.18);border-radius:50%;animation:pulse 2s infinite"></div>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// ─── Map helpers ──────────────────────────────────────────────────────────────

function FitBounds({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [48, 48] });
  }, [points, map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function FlyTo({ latlng }: { latlng: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (latlng) map.flyTo(latlng, 15, { duration: 1.2 });
  }, [latlng, map]);
  return null;
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

// ─── Main ─────────────────────────────────────────────────────────────────────

type Aba = "dia" | "mapa";

export default function AppRoteiro() {
  const { profile, profileLoading, token } = useClientAuth();
  const [params, setParams] = useSearchParams();
  const aba: Aba = params.get("aba") === "mapa" ? "mapa" : "dia";
  const [rawText, setRawText] = useState<string | null>(null);
  const [itineraryId, setItineraryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [aberta, setAberta] = useState<number | null>(null);
  const [geoPoints, setGeoPoints] = useState<GeoPoint[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const watchRef = useRef<number | null>(null);
  const { feitas, alternar } = useFeitas(itineraryId ? `sol_feitas_${itineraryId}` : null);

  // Fetch itinerary text
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API_URL}/api/app/roteiro`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.rawItinerary) setRawText(d.rawItinerary);
        if (d?.id) setItineraryId(String(d.id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  // Localização só enquanto o mapa estiver aberto
  useEffect(() => {
    if (aba !== "mapa" || !navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [aba]);

  const days = rawText ? parseItinerary(rawText) : [];

  // Geocodifica o dia só quando o mapa é aberto
  useEffect(() => {
    if (aba !== "mapa") return;
    const day = days[activeDay];
    if (!day) return;
    setGeocoding(true);
    setGeoPoints([]);
    setRouteCoords([]);

    const tasks = day.activities.map(async (act, ai) => {
      if (!act.mapUrl) return null;
      const q = extractQuery(act.mapUrl);
      if (!q) return null;
      const pt = await geocode(q);
      return pt ? { ...pt, name: act.name, actIndex: ai } : null;
    });

    Promise.all(tasks).then(async (results) => {
      const pts = results.filter(Boolean) as GeoPoint[];
      setGeoPoints(pts);
      setGeocoding(false);
      if (pts.length >= 2) {
        const route = await fetchRoadRoute(pts);
        setRouteCoords(route);
      }
    });
  }, [activeDay, rawText, aba]); // eslint-disable-line react-hooks/exhaustive-deps

  const locateMe = useCallback(() => {
    if (userPos) { setFlyTo(userPos); setTimeout(() => setFlyTo(null), 100); }
    else navigator.geolocation?.getCurrentPosition(
      (p) => { const pos: [number, number] = [p.coords.latitude, p.coords.longitude]; setUserPos(pos); setFlyTo(pos); setTimeout(() => setFlyTo(null), 100); }
    );
  }, [userPos]);

  const trocarAba = (nova: Aba) => {
    const p = new URLSearchParams(params);
    if (nova === "mapa") p.set("aba", "mapa"); else p.delete("aba");
    setParams(p, { replace: true });
  };

  if (loading || (profileLoading && !profile)) return <Carregando />;

  if (days.length === 0) {
    return (
      <div className="px-5 pt-8">
        <h1 className="m-0 font-display font-extrabold text-2xl tracking-tight">Meus roteiros</h1>
        <Vazio
          icone={<MapIcon size={32} />}
          titulo="Nenhum roteiro ainda"
          texto="Quando a Sol terminar seu roteiro personalizado, ele aparece aqui com o dia a dia e o mapa."
        >
          <Link to="/app/chat" className={`${btnPrimario} w-full mt-4`}>Pedir roteiro à Sol</Link>
        </Vazio>
      </div>
    );
  }

  const dia = days[activeDay];
  const chaveAtiv = (ai: number) => `d${activeDay}-${ai}`;
  const feitasHoje = dia.activities.filter((_, ai) => feitas[chaveAtiv(ai)]).length;
  const proxima = dia.activities.findIndex((_, ai) => !feitas[chaveAtiv(ai)]);
  const periodo = [formatarData(profile?.arrivalDate), formatarData(profile?.departureDate)].filter(Boolean).join(" a ");

  const estadoPonto = (ai: number) => (feitas[chaveAtiv(ai)] ? "feita" : ai === proxima ? "proxima" : "depois");

  return (
    <div className="flex flex-col">
      {/* Cabeçalho escuro do roteiro */}
      <header className="flex flex-col gap-0.5 px-4 pt-8 pb-2.5 bg-sol-fundo text-white">
        <div className="flex items-center gap-1">
          <Link to="/app" aria-label="Voltar" className="flex-none flex items-center justify-center w-12 h-12 -ml-2 text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="flex-1 m-0 font-display font-extrabold text-2xl tracking-tight truncate">
            {profile?.destination || "Seu roteiro"}
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
            <div className="relative -mx-5 overflow-hidden bg-[#E6EEE9]" style={{ height: 380 }}>
              <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.8)}}`}</style>
              {geoPoints.length > 0 ? (
                <MapContainer
                  style={{ height: "100%", width: "100%" }}
                  center={[geoPoints[0].lat, geoPoints[0].lng]}
                  zoom={13}
                  zoomControl={false}
                  attributionControl={false}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  <FitBounds points={geoPoints} />
                  {flyTo && <FlyTo latlng={flyTo} />}
                  {routeCoords.length > 1 && (
                    <Polyline positions={routeCoords} color={MAR} weight={5} opacity={0.9} dashArray="2 10" />
                  )}
                  {geoPoints.map((pt, i) => (
                    <Marker key={i} position={[pt.lat, pt.lng]} icon={numberedIcon(i + 1, estadoPonto(pt.actIndex))}>
                      <Popup><span className="text-xs font-semibold">{pt.name}</span></Popup>
                    </Marker>
                  ))}
                  {userPos && (
                    <>
                      <Circle center={userPos} radius={40} color={MAR} fillColor={MAR} fillOpacity={0.15} weight={0} />
                      <Marker position={userPos} icon={userLocationIcon()} />
                    </>
                  )}
                </MapContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  {geocoding ? (
                    <div className="flex items-center gap-2 text-sol-texto2 text-sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sol-mar" />
                      Carregando o mapa...
                    </div>
                  ) : (
                    <p className="text-sm text-sol-texto2 px-6 text-center">Não consegui localizar os pontos deste dia no mapa.</p>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={locateMe}
                aria-label="Centralizar na minha posição"
                className="absolute right-3.5 bottom-3.5 z-[1000] w-12 h-12 rounded-full bg-white text-sol-mar flex items-center justify-center shadow-[0_2px_8px_rgba(14,47,69,0.2)]"
              >
                <Crosshair size={22} />
              </button>
              <div className="absolute bottom-1 left-2 z-[999] text-[9px] text-gray-500 pointer-events-none">© OpenStreetMap · CARTO</div>
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
          {profile?.itinerary?.pdfUrl ? (
            <a href={profile.itinerary.pdfUrl} target="_blank" rel="noopener noreferrer" className={`${btnSecundario} no-underline`}>
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
