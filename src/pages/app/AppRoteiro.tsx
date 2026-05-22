import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";

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

function numberedIcon(n: number, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${n}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

function userLocationIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:20px;height:20px">
      <div style="position:absolute;inset:0;background:#4285f4;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(66,133,244,0.5)"></div>
      <div style="position:absolute;inset:-6px;background:rgba(66,133,244,0.2);border-radius:50%;animation:pulse 2s infinite"></div>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

const DAY_COLORS = ["#c8a96e", "#4a9e8a", "#e07b4a", "#7a6fc8", "#4a90c8", "#c84a7a", "#6abf5e"];

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AppRoteiro() {
  const { profile, profileLoading, token } = useClientAuth();
  const [rawText, setRawText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [geoPoints, setGeoPoints] = useState<GeoPoint[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const watchRef = useRef<number | null>(null);

  // Fetch itinerary text
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API_URL}/api/app/roteiro`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.rawItinerary) setRawText(d.rawItinerary); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  // Watch user location
  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const days = rawText ? parseItinerary(rawText) : [];

  // Geocode day activities
  useEffect(() => {
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
  }, [activeDay, rawText]); // eslint-disable-line react-hooks/exhaustive-deps

  const locateMe = useCallback(() => {
    if (userPos) { setFlyTo(userPos); setTimeout(() => setFlyTo(null), 100); }
    else navigator.geolocation.getCurrentPosition(
      (p) => { const pos: [number, number] = [p.coords.latitude, p.coords.longitude]; setUserPos(pos); setFlyTo(pos); setTimeout(() => setFlyTo(null), 100); }
    );
  }, [userPos]);

  // ── Loading / empty ──
  if (loading || (profileLoading && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c8a96e]" />
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center gap-4">
        <span className="text-5xl">📄</span>
        <h3 className="text-lg font-semibold text-[#1a1a1a]">Roteiro ainda não gerado</h3>
        <p className="text-sm text-[#888]">Quando a Sol finalizar seu roteiro personalizado, ele aparecerá aqui.</p>
      </div>
    );
  }

  const color = DAY_COLORS[activeDay % DAY_COLORS.length];
  const activeDayData = days[activeDay];
  const hasMap = geoPoints.length > 0;

  return (
    <div className="flex flex-col">
      {/* Day tabs */}
      <div className="flex gap-2 px-4 pt-4 pb-3 overflow-x-auto no-scrollbar">
        {days.map((day, di) => (
          <button
            key={di}
            onClick={() => setActiveDay(di)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              di === activeDay ? "text-white shadow-sm" : "bg-white text-[#888] border border-[#e0d9d0]"
            }`}
            style={di === activeDay ? { backgroundColor: DAY_COLORS[di % DAY_COLORS.length] } : {}}
          >
            {day.label}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="relative mx-4 rounded-2xl overflow-hidden shadow-md" style={{ height: 280 }}>
        {/* Pulse animation */}
        <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.8)}}`}</style>

        {hasMap ? (
          <MapContainer
            style={{ height: "100%", width: "100%" }}
            center={[geoPoints[0].lat, geoPoints[0].lng]}
            zoom={13}
            zoomControl={false}
            attributionControl={false}
          >
            {/* Clean navigation-style tiles */}
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />

            <FitBounds points={geoPoints} />
            {flyTo && <FlyTo latlng={flyTo} />}

            {/* Road route */}
            {routeCoords.length > 1 && (
              <>
                {/* Shadow */}
                <Polyline positions={routeCoords} color="#000" weight={7} opacity={0.12} />
                {/* Main route */}
                <Polyline positions={routeCoords} color={color} weight={5} opacity={0.9} />
              </>
            )}

            {/* Attraction markers */}
            {geoPoints.map((pt, i) => (
              <Marker key={i} position={[pt.lat, pt.lng]} icon={numberedIcon(i + 1, color)}>
                <Popup>
                  <span className="text-xs font-semibold">{pt.name}</span>
                </Popup>
              </Marker>
            ))}

            {/* User location */}
            {userPos && (
              <>
                <Circle center={userPos} radius={40} color="#4285f4" fillColor="#4285f4" fillOpacity={0.15} weight={0} />
                <Marker position={userPos} icon={userLocationIcon()} />
              </>
            )}
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

        {/* Locate me button */}
        <button
          onClick={locateMe}
          className="absolute bottom-3 right-3 z-[1000] w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-lg active:scale-90 transition-transform"
        >
          📍
        </button>

        {/* Attribution small */}
        <div className="absolute bottom-1 left-2 z-[999] text-[9px] text-gray-400 pointer-events-none">
          © OpenStreetMap
        </div>
      </div>

      {/* Activity list */}
      <div className="px-4 pt-3 pb-6 space-y-3">
        {activeDayData.activities.map((act, ai) => {
          const ptIdx = geoPoints.findIndex((p) => p.actIndex === ai);
          const hasPin = ptIdx >= 0;

          return (
            <div key={ai} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                  style={{ backgroundColor: hasPin ? color : "#ddd" }}
                >
                  {hasPin ? ptIdx + 1 : "·"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    {act.period && <span className="text-[10px] font-semibold uppercase tracking-wide text-[#aaa]">{act.period}</span>}
                    {act.time && <span className="text-[10px] text-[#c8a96e] font-medium">{act.time}</span>}
                  </div>
                  <p className="font-semibold text-sm text-[#1a1a1a] leading-snug">{act.name}</p>
                  {act.description && (
                    <p className="text-xs text-[#777] mt-1 leading-relaxed line-clamp-2">{act.description}</p>
                  )}
                  {act.travel && <p className="text-xs text-[#aaa] mt-1">🚗 {act.travel}</p>}
                </div>
                {act.mapUrl && (
                  <a
                    href={act.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <span className="text-base">📍</span>
                  </a>
                )}
              </div>
            </div>
          );
        })}

        {profile?.itinerary?.pdfUrl && (
          <a
            href={profile.itinerary.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm active:scale-95 transition-transform mt-1"
            style={{ backgroundColor: color }}
          >
            📥 Baixar PDF completo
          </a>
        )}
      </div>
    </div>
  );
}
