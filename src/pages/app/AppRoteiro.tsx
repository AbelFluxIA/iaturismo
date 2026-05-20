import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";

// Fix leaflet default marker icons (broken with bundlers)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface ParsedItinerary {
  intro: string[];
  days: Day[];
}

interface GeoPoint {
  lat: number;
  lng: number;
  name: string;
  dayIndex: number;
  actIndex: number;
}

// ─── Parser (mesma lógica do ItineraryPage) ──────────────────────────────────

function cleanLine(raw: string) {
  return raw.replace(/\*/g, "").trim();
}

function stripLeadingSymbols(s: string) {
  return s.replace(/^[^\p{L}\d(]+/u, "").trim();
}

function parseItinerary(text: string): ParsedItinerary {
  const days: Day[] = [];
  const intro: string[] = [];
  let currentDay: Day | null = null;
  let currentActivity: Partial<Activity> | null = null;
  let descBuffer: string[] = [];
  let inIntro = true;

  const flushActivity = () => {
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
    const line = cleanLine(raw);
    if (!line) continue;
    if (/^---+$/.test(line) || /^(Com carinho|Sol)$/i.test(line)) continue;

    const stripped = stripLeadingSymbols(line);

    if (/^DIA\s*\d+/i.test(stripped)) {
      inIntro = false;
      flushActivity();
      currentDay = { label: stripped, activities: [] };
      days.push(currentDay);
      continue;
    }

    if (inIntro) {
      if (stripped.length > 20) intro.push(stripped);
      continue;
    }

    if (line.startsWith("⚠️")) continue;

    if (line.startsWith("🚗") || /^~\s*\d+/i.test(stripped)) {
      if (currentActivity) currentActivity.travel = line.replace(/^🚗\s*/, "").trim();
      continue;
    }

    if (line.startsWith("📍") || /^https?:\/\//i.test(stripped)) {
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

    const periodMatch = stripped.match(
      /^(Manh[aã]|Tarde|Noite|P[oô]r\s*do\s*Sol|Dia\s*Inteiro)\s*\(([^)]+)\)[:\s-]+(.+)/i
    );
    if (periodMatch) {
      flushActivity();
      currentActivity = {
        period: periodMatch[1],
        time: periodMatch[2].trim(),
        name: periodMatch[3].trim(),
        travel: "",
        mapUrl: "",
      };
      continue;
    }

    if (currentActivity && !currentActivity.name) {
      currentActivity.name = stripped;
    } else if (currentActivity) {
      descBuffer.push(stripped);
    }
  }

  flushActivity();
  return { intro, days };
}

// ─── Geocoding via Nominatim (OpenStreetMap, gratuito) ───────────────────────

const geoCache = new Map<string, { lat: number; lng: number } | null>();

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  if (geoCache.has(query)) return geoCache.get(query)!;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
    const data = await res.json();
    if (data[0]) {
      const point = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geoCache.set(query, point);
      return point;
    }
    geoCache.set(query, null);
    return null;
  } catch {
    geoCache.set(query, null);
    return null;
  }
}

function extractQuery(mapUrl: string): string | null {
  try {
    const u = new URL(mapUrl);
    return u.searchParams.get("query");
  } catch {
    return null;
  }
}

// ─── Numbered marker icon ────────────────────────────────────────────────────

function numberedIcon(n: number, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

const DAY_COLORS = [
  "#c8a96e", "#4a9e8a", "#e07b4a", "#7a6fc8", "#4a90c8",
  "#c84a7a", "#6abf5e", "#d4a030",
];

// ─── Map auto-fit helper ─────────────────────────────────────────────────────

function FitBounds({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [points, map]);
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AppRoteiro() {
  const { profile, profileLoading, token } = useClientAuth();
  const [rawText, setRawText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoPoints, setGeoPoints] = useState<GeoPoint[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API_URL}/api/app/roteiro`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.rawItinerary) setRawText(data.rawItinerary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const parsed = rawText ? parseItinerary(rawText) : null;

  // Geocodifica todas as atividades com mapUrl
  useEffect(() => {
    if (!parsed) return;
    setGeocoding(true);

    const tasks: Promise<void>[] = [];
    const points: GeoPoint[] = [];

    parsed.days.forEach((day, di) => {
      day.activities.forEach((act, ai) => {
        if (!act.mapUrl) return;
        const query = extractQuery(act.mapUrl);
        if (!query) return;
        const task = geocode(query).then((pt) => {
          if (pt) points.push({ ...pt, name: act.name, dayIndex: di, actIndex: ai });
        });
        tasks.push(task);
      });
    });

    Promise.all(tasks).then(() => {
      setGeoPoints([...points]);
      setGeocoding(false);
    });
  }, [rawText]); // eslint-disable-line react-hooks/exhaustive-deps

  const dayPoints = (di: number) => geoPoints.filter((p) => p.dayIndex === di);
  const currentDayPoints = dayPoints(activeDay);

  // ─── Loading / empty states ─────────────────────────────────────────────────

  if (loading || (profileLoading && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c8a96e]" />
      </div>
    );
  }

  if (!parsed || parsed.days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center gap-4">
        <span className="text-5xl">📄</span>
        <h3 className="text-lg font-semibold text-[#1a1a1a]">Roteiro ainda não gerado</h3>
        <p className="text-sm text-[#888]">
          Quando a Sol finalizar seu roteiro personalizado, ele aparecerá aqui.
        </p>
      </div>
    );
  }

  const activeDayData = parsed.days[activeDay];
  const color = DAY_COLORS[activeDay % DAY_COLORS.length];

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Day tabs */}
      <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto no-scrollbar">
        {parsed.days.map((day, di) => (
          <button
            key={di}
            onClick={() => setActiveDay(di)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              di === activeDay
                ? "text-white"
                : "bg-white text-[#888] border border-[#e0d9d0]"
            }`}
            style={di === activeDay ? { backgroundColor: DAY_COLORS[di % DAY_COLORS.length] } : {}}
          >
            {day.label}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="mx-4 rounded-2xl overflow-hidden shadow-sm" style={{ height: 240 }}>
        {currentDayPoints.length > 0 ? (
          <MapContainer
            style={{ height: "100%", width: "100%" }}
            center={[currentDayPoints[0].lat, currentDayPoints[0].lng]}
            zoom={13}
            zoomControl={false}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <FitBounds points={currentDayPoints} />

            {/* Route polyline */}
            {currentDayPoints.length > 1 && (
              <Polyline
                positions={currentDayPoints.map((p) => [p.lat, p.lng])}
                color={color}
                weight={3}
                dashArray="6 6"
                opacity={0.7}
              />
            )}

            {/* Markers */}
            {currentDayPoints.map((pt, i) => (
              <Marker
                key={i}
                position={[pt.lat, pt.lng]}
                icon={numberedIcon(i + 1, color)}
              >
                <Popup>
                  <span className="text-xs font-semibold">{pt.name}</span>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center bg-[#f0ebe4]">
            {geocoding ? (
              <div className="flex items-center gap-2 text-[#aaa] text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#c8a96e]" />
                Carregando mapa...
              </div>
            ) : (
              <p className="text-sm text-[#aaa]">Nenhum local mapeado neste dia</p>
            )}
          </div>
        )}
      </div>

      {/* Activity list */}
      <div className="px-4 pt-3 pb-4 space-y-3 flex-1 overflow-y-auto">
        {activeDayData.activities.map((act, ai) => {
          const ptIndex = currentDayPoints.findIndex((p) => p.actIndex === ai);
          const hasPin = ptIndex >= 0;

          return (
            <div
              key={ai}
              ref={(el) => (cardRefs.current[ai] = el)}
              className="bg-white rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                {/* Number badge or period dot */}
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                  style={{ backgroundColor: hasPin ? color : "#ddd" }}
                >
                  {hasPin ? ptIndex + 1 : "•"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {act.period && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#aaa]">
                        {act.period}
                      </span>
                    )}
                    {act.time && (
                      <span className="text-[10px] text-[#c8a96e] font-medium">{act.time}</span>
                    )}
                  </div>
                  <p className="font-semibold text-sm text-[#1a1a1a] mt-0.5 leading-snug">{act.name}</p>
                  {act.description && (
                    <p className="text-xs text-[#777] mt-1 leading-relaxed line-clamp-3">{act.description}</p>
                  )}
                  {act.travel && (
                    <p className="text-xs text-[#aaa] mt-1">🚗 {act.travel}</p>
                  )}
                </div>

                {/* Open in maps button */}
                {act.mapUrl && (
                  <a
                    href={act.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-[#f0ebe4] text-base"
                  >
                    📍
                  </a>
                )}
              </div>
            </div>
          );
        })}

        {/* PDF link */}
        {profile?.itinerary?.pdfUrl && (
          <a
            href={profile.itinerary.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#c8a96e] text-white font-semibold text-sm active:scale-95 transition-transform mt-2"
          >
            📥 Baixar PDF completo
          </a>
        )}
      </div>
    </div>
  );
}
