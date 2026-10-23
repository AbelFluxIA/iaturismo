import { useEffect, useState } from "react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { useViagens } from "@/contexts/ViagensContext";
import { DESTINOS } from "@/lib/destinos";
import { distanciaKm, geocode, posicaoSePermitida, type Coord } from "@/lib/geo";

// "Para onde ir": a Sol recomenda destinos para cada pessoa (perfil, viagens já
// feitas e onde ela está), conferidos na busca do Google. Uma vez por dia.

export interface Sugestao {
  nome: string;
  uf: string;
  tipo: string;
  motivo: string;
  destaques: string[];
}

export interface SugestaoComDistancia extends Sugestao {
  slug: string;
  km: number | null;
  coord: Coord | null;
}

export const CORES_TIPO: Record<string, string> = {
  Praia: "#DFF3F7", Natureza: "#E2F1E8", Serra: "#EDE7DC", Cultura: "#FEF1CC", Aventura: "#F6E3D3", Gastronomia: "#FCE7E2", Sertão: "#F6E3D3",
};

export const slugDe = (s: { nome: string; uf: string }) =>
  `${s.nome}-${s.uf}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const CHAVE = "sol_sugestoes_v1";
const hoje = () => new Date().toLocaleDateString("sv-SE");

// Destinos fixos da Paraíba: só quando a recomendação não está disponível
const RESERVA: Sugestao[] = DESTINOS.map((d) => ({ nome: d.nome, uf: "PB", tipo: d.tipo, motivo: "", destaques: [] }));

export function lerSugestoesGuardadas(): Sugestao[] {
  try {
    const g = JSON.parse(sessionStorage.getItem(CHAVE) || "null");
    return g?.dia === hoje() ? (g.sugestoes as Sugestao[]) : [];
  } catch { return []; }
}

export function useSugestoes() {
  const { token, isDemo, profile } = useClientAuth();
  const { atual } = useViagens();
  const [estado, setEstado] = useState<{ base: string | null; lista: SugestaoComDistancia[] | null; recomendado: boolean }>({ base: null, lista: null, recomendado: false });

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const pos = await posicaoSePermitida();
      const cidade = atual?.destination || profile?.destination || "João Pessoa - PB";
      let base = cidade;
      let sugestoes: Sugestao[] = [];
      let recomendado = false;

      try {
        const g = JSON.parse(sessionStorage.getItem(CHAVE) || "null");
        if (g?.dia === hoje() && g.chave === (pos ? "pos" : cidade)) { sugestoes = g.sugestoes; base = g.base; recomendado = true; }
      } catch { /* sem cache */ }

      if (!sugestoes.length && token && !isDemo) {
        try {
          const q = pos ? `lat=${pos.lat}&lng=${pos.lng}` : `cidade=${encodeURIComponent(cidade)}`;
          const r = await fetch(`${API_URL}/api/app/sugestoes?${q}`, { headers: { Authorization: `Bearer ${token}` } });
          if (r.ok) {
            const d = await r.json();
            if (Array.isArray(d.sugestoes) && d.sugestoes.length) {
              sugestoes = d.sugestoes; base = d.base ?? cidade; recomendado = true;
              try { sessionStorage.setItem(CHAVE, JSON.stringify({ dia: hoje(), chave: pos ? "pos" : cidade, base, sugestoes })); } catch { /* ok */ }
            }
          }
        } catch { /* usa a reserva */ }
      }
      if (!sugestoes.length) sugestoes = RESERVA;
      if (cancelado) return;

      const inicial = sugestoes.map((s) => ({ ...s, slug: slugDe(s), km: null, coord: null }));
      setEstado({ base, lista: inicial, recomendado });

      // Distância: da posição do aparelho, senão da cidade de referência
      const origem = pos ?? (await geocode(base));
      const comCoord: SugestaoComDistancia[] = [];
      for (const s of inicial) {
        const fixo = DESTINOS.find((d) => d.nome === s.nome && s.uf === "PB");
        const c = fixo ? { lat: fixo.lat, lng: fixo.lng } : await geocode(`${s.nome} - ${s.uf}`);
        if (cancelado) return;
        comCoord.push({ ...s, coord: c, km: c && origem ? Math.round(distanciaKm(origem, c)) : null });
        setEstado({ base, recomendado, lista: [...comCoord, ...inicial.slice(comCoord.length)] });
      }
    })();
    return () => { cancelado = true; };
  }, [token, isDemo, atual?.destination, profile?.destination]);

  return estado;
}
