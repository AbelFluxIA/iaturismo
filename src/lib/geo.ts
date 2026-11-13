// Localização de lugares (Nominatim/OpenStreetMap), rota pelas ruas (OSRM) e
// previsão do tempo (Open-Meteo). Serviços gratuitos e sem chave.

import { UFS } from "@/lib/fotoLugar";
import { ehNativo } from "@/lib/nativo";
import { registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";

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

// ─── Busca de cidades enquanto a pessoa digita (Open-Meteo geocoding, grátis) ──
// "Curit" → [{ nome: "Curitiba", uf: "PR", rotulo: "Curitiba - PR" }]
export interface CidadeAchada { nome: string; uf: string | null; rotulo: string; lat: number; lng: number }

const UF_POR_NOME: Record<string, string> = Object.fromEntries(Object.entries(UFS).map(([uf, nome]) => [nome.toLowerCase(), uf]));
const cidadesCache = new Map<string, Promise<CidadeAchada[]>>();

export function buscarCidades(texto: string): Promise<CidadeAchada[]> {
  const q = texto.trim();
  if (q.length < 3) return Promise.resolve([]);
  const chave = q.toLowerCase();
  if (!cidadesCache.has(chave)) {
    cidadesCache.set(chave, (async () => {
      try {
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=pt&countryCode=BR`);
        if (!r.ok) { cidadesCache.delete(chave); return []; }
        const d = await r.json();
        const vistos = new Set<string>();
        const lista: CidadeAchada[] = [];
        for (const c of (d.results ?? []) as { name: string; admin1?: string; feature_code?: string; latitude: number; longitude: number }[]) {
          if (!/^PPL/.test(c.feature_code ?? "")) continue; // só lugares habitados (não rios, serras...)
          const uf = c.admin1 ? UF_POR_NOME[c.admin1.toLowerCase()] ?? null : null;
          const rotulo = uf ? `${c.name} - ${uf}` : c.name;
          if (vistos.has(rotulo)) continue;
          vistos.add(rotulo);
          lista.push({ nome: c.name, uf, rotulo, lat: c.latitude, lng: c.longitude });
          if (lista.length === 5) break;
        }
        return lista;
      } catch { cidadesCache.delete(chave); return []; }
    })());
  }
  return cidadesCache.get(chave)!;
}

export function queryDoMapa(mapUrl: string) {
  try { return new URL(mapUrl).searchParams.get("query"); } catch { return null; }
}

// Rota de carro pelas ruas, separada em trechos (um entre cada par de pontos seguidos),
// com tempo e distância de cada um. Sem resposta do OSRM, vira linha reta sem tempo.
export interface Trecho { linha: [number, number][]; minutos: number | null; km: number | null }

const trechosCache = new Map<string, Promise<Trecho[]>>();

export function rotaPorTrechos(points: Coord[]): Promise<Trecho[]> {
  if (points.length < 2) return Promise.resolve([]);
  const coords = points.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
  if (!trechosCache.has(coords)) {
    const retas = (): Trecho[] => points.slice(1).map((p, i) => ({ linha: [[points[i].lat, points[i].lng], [p.lat, p.lng]], minutos: null, km: null }));
    trechosCache.set(coords, (async () => {
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&steps=true&geometries=geojson`);
        const data = await res.json();
        const legs = data.routes?.[0]?.legs;
        if (Array.isArray(legs) && legs.length === points.length - 1) {
          return legs.map((leg: { duration: number; distance: number; steps: { geometry: { coordinates: [number, number][] } }[] }) => ({
            linha: leg.steps.flatMap((s) => s.geometry.coordinates.map(([lng, lat]): [number, number] => [lat, lng])),
            minutos: Math.max(1, Math.round(leg.duration / 60)),
            km: Math.round(leg.distance / 100) / 10,
          }));
        }
      } catch { /* linha reta */ }
      trechosCache.delete(coords); // tenta as ruas de novo numa próxima vez
      return retas();
    })());
  }
  return trechosCache.get(coords)!;
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
// Lembra que a pessoa já liberou a localização neste aparelho: o Safari do iPhone não
// responde à Permissions API, e sem isso o app nunca usava a posição mesmo depois de liberada
const JA_LIBEROU = "sol_geo_permitida";

export async function posicaoSePermitida(): Promise<Coord | null> {
  if (ehNativo) return posicaoAtual(8000); // o plugin não abre pedido de permissão sozinho
  try {
    const p = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    if (p?.state === "granted") return posicaoAtual();
    if (p?.state === "denied") return null;
  } catch { /* Safari: sem Permissions API para geolocalização */ }
  try { if (localStorage.getItem(JA_LIBEROU) === "1") return posicaoAtual(); } catch { /* sem armazenamento */ }
  return null;
}

export function posicaoAtual(timeout = 10000): Promise<Coord | null> {
  // App das lojas: lê pelo plugin nativo (a permissão foi dada a ele; o caminho do navegador
  // dentro do app às vezes não devolve nada). Se falhar, tenta o do navegador.
  if (ehNativo) return posicaoNativa(timeout).then((c) => c ?? posicaoDoNavegador(timeout));
  return posicaoDoNavegador(timeout);
}

function posicaoNativa(timeout: number): Promise<Coord | null> {
  return new Promise((ok) => {
    const BG = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");
    let id: string | null = null;
    let fim = false;
    const terminar = (c: Coord | null) => {
      if (fim) return;
      fim = true;
      if (id) BG.removeWatcher({ id }).catch(() => { /* ok */ });
      if (c) { try { localStorage.setItem(JA_LIBEROU, "1"); } catch { /* ok */ } }
      ok(c);
    };
    BG.addWatcher({ requestPermissions: false, stale: true }, (pos, erro) => {
      if (erro) terminar(null);
      else if (pos) terminar({ lat: pos.latitude, lng: pos.longitude });
    })
      .then((i) => { id = i; if (fim) BG.removeWatcher({ id: i }).catch(() => { /* ok */ }); })
      .catch(() => terminar(null));
    window.setTimeout(() => terminar(null), timeout);
  });
}

function posicaoDoNavegador(timeout: number): Promise<Coord | null> {
  return new Promise((ok) => {
    if (!navigator.geolocation) return ok(null);
    const ler = (preciso: boolean, depois?: () => void) => navigator.geolocation.getCurrentPosition(
      (p) => {
        try { localStorage.setItem(JA_LIBEROU, "1"); } catch { /* ok */ }
        ok({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      (e) => {
        if (e.code === e.PERMISSION_DENIED) { try { localStorage.removeItem(JA_LIBEROU); } catch { /* ok */ } ok(null); return; }
        if (depois) depois(); else ok(null);
      },
      { enableHighAccuracy: preciso, timeout, maximumAge: 5 * 60 * 1000 },
    );
    // Primeiro a posição rápida (rede); se não vier, tenta com GPS
    ler(false, () => ler(true));
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

export interface TempoAgora {
  temp: number;
  codigo: number;
  horas: { hora: string; temp: number; chuva: number; codigo: number }[]; // próximas 12 h
}

const agoraCache = new Map<string, Promise<TempoAgora | null>>();

export function tempoAgora(c: Coord): Promise<TempoAgora | null> {
  const chave = `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`;
  if (!agoraCache.has(chave)) {
    agoraCache.set(chave, (async () => {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}` +
          `&current=temperature_2m,weathercode&hourly=temperature_2m,precipitation_probability,weathercode&forecast_hours=12&timezone=America%2FSao_Paulo`
        );
        if (!r.ok) return null;
        const d = await r.json();
        return {
          temp: Math.round(d.current?.temperature_2m),
          codigo: d.current?.weathercode ?? 0,
          horas: (d.hourly?.time ?? []).map((t: string, i: number) => ({
            hora: t.slice(11, 16),
            temp: Math.round(d.hourly.temperature_2m[i]),
            chuva: d.hourly.precipitation_probability[i] ?? 0,
            codigo: d.hourly.weathercode[i] ?? 0,
          })),
        };
      } catch { return null; }
    })());
  }
  return agoraCache.get(chave)!;
}

export function tipoDeTempo(codigo: number): "sol" | "nuvens" | "nublado" | "chuva" | "trovoada" {
  if (codigo === 0) return "sol";
  if (codigo <= 3) return "nuvens";
  if (codigo <= 48) return "nublado";
  if (codigo >= 95) return "trovoada";
  return "chuva";
}

export function descreverTempo(p: PrevisaoDia) {
  const c = p.codigo;
  const ceu = c === 0 ? "sol" : c <= 3 ? "parcialmente nublado" : c <= 48 ? "nublado" : c <= 67 || (c >= 80 && c <= 82) ? "chuva" : c >= 95 ? "trovoadas" : "nublado";
  return `${p.max}°C · ${ceu}${p.chuva >= 40 ? ` · ${p.chuva}% de chance de chuva` : ""}`;
}
