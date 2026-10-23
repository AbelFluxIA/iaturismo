// Localização de lugares (Nominatim/OpenStreetMap), rota pelas ruas (OSRM) e
// previsão do tempo (Open-Meteo). Serviços gratuitos e sem chave.

export type Coord = { lat: number; lng: number };

// O Nominatim aceita no máximo 1 consulta por segundo: fila única + memória no aparelho.
const GEO_CHAVE = "sol_geo_v1";
const geoCache: Record<string, Coord | null> = (() => {
  try { return JSON.parse(localStorage.getItem(GEO_CHAVE) || "{}"); } catch { return {}; }
})();
let filaGeo: Promise<unknown> = Promise.resolve();

export function geocode(query: string): Promise<Coord | null> {
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

export function queryDoMapa(mapUrl: string) {
  try { return new URL(mapUrl).searchParams.get("query"); } catch { return null; }
}

export async function rotaPelasRuas(points: Coord[]): Promise<[number, number][]> {
  if (points.length < 2) return points.map((p) => [p.lat, p.lng]);
  try {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
    const data = await res.json();
    if (data.routes?.[0]?.geometry?.coordinates) {
      return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
    }
  } catch { /* linha reta */ }
  return points.map((p) => [p.lat, p.lng]);
}

// Distância em linha reta (km)
export function distanciaKm(a: Coord, b: Coord) {
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

// Posição do aparelho só se a pessoa já deu permissão (não abre o pedido sozinho)
export async function posicaoSePermitida(): Promise<Coord | null> {
  try {
    const p = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    if (p?.state !== "granted") return null;
  } catch { return null; }
  return posicaoAtual();
}

export function posicaoAtual(timeout = 10000): Promise<Coord | null> {
  return new Promise((ok) => {
    if (!navigator.geolocation) return ok(null);
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => ok(null),
      { enableHighAccuracy: false, timeout, maximumAge: 5 * 60 * 1000 },
    );
  });
}

// ─── Previsão do tempo (Open-Meteo) ──────────────────────────────────────────

export interface PrevisaoDia {
  data: string; // AAAA-MM-DD
  max: number;
  min: number;
  chuva: number; // probabilidade máxima de chuva (%)
  codigo: number; // código WMO
}

const prevCache = new Map<string, Promise<PrevisaoDia[] | null>>();

export function previsao(c: Coord, dias = 7): Promise<PrevisaoDia[] | null> {
  const chave = `${c.lat.toFixed(2)},${c.lng.toFixed(2)},${dias}`;
  if (!prevCache.has(chave)) {
    prevCache.set(chave, (async () => {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}` +
          `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=America%2FSao_Paulo&forecast_days=${dias}`
        );
        if (!r.ok) return null;
        const d = await r.json();
        return (d.daily?.time ?? []).map((t: string, i: number) => ({
          data: t,
          max: Math.round(d.daily.temperature_2m_max[i]),
          min: Math.round(d.daily.temperature_2m_min[i]),
          chuva: d.daily.precipitation_probability_max[i] ?? 0,
          codigo: d.daily.weathercode[i] ?? 0,
        }));
      } catch { return null; }
    })());
  }
  return prevCache.get(chave)!;
}

export function descreverTempo(p: PrevisaoDia) {
  const c = p.codigo;
  const ceu = c === 0 ? "sol" : c <= 3 ? "parcialmente nublado" : c <= 48 ? "nublado" : c <= 67 || (c >= 80 && c <= 82) ? "chuva" : c >= 95 ? "trovoadas" : "nublado";
  return `${p.max}°C · ${ceu}${p.chuva >= 40 ? ` · ${p.chuva}% de chance de chuva` : ""}`;
}
