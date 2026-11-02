import { useEffect, useState } from "react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { useViagens } from "@/contexts/ViagensContext";
import { geocode, posicaoSePermitida, type Coord } from "@/lib/geo";

// Cidade do cabeçalho (RA-NAV-06): pela localização; sem ela, a do roteiro em
// andamento; depois a do cadastro; senão, nenhuma ("Escolher cidade").

export interface Cidade {
  nome: string | null;
  coord: Coord | null;
  origem: "posicao" | "roteiro" | "cadastro" | null;
}

const CHAVE = "sol_cidade_posicao";

async function cidadeDaPosicao(c: Coord): Promise<string | null> {
  try {
    const g = JSON.parse(sessionStorage.getItem(CHAVE) || "null");
    if (g && Math.abs(g.lat - c.lat) < 0.05 && Math.abs(g.lng - c.lng) < 0.05) return g.nome;
  } catch { /* sem cache */ }
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${c.lat}&lon=${c.lng}&format=json&zoom=10`, { headers: { "Accept-Language": "pt-BR" } });
    const d = await r.json();
    const a = d.address ?? {};
    const cidade = a.city || a.town || a.municipality || a.village;
    const uf = (a["ISO3166-2-lvl4"] as string | undefined)?.split("-")[1];
    const nome = cidade ? `${cidade}${uf ? `, ${uf}` : ""}` : null;
    if (nome) sessionStorage.setItem(CHAVE, JSON.stringify({ ...c, nome }));
    return nome;
  } catch { return null; }
}

export function useCidade(): Cidade & { carregando: boolean } {
  const { profile } = useClientAuth();
  const { atual } = useViagens();
  const [estado, setEstado] = useState<Cidade & { carregando: boolean }>({ nome: null, coord: null, origem: null, carregando: true });

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const pos = await posicaoSePermitida();
      if (pos) {
        const nome = await cidadeDaPosicao(pos);
        if (!cancelado && nome) { setEstado({ nome, coord: pos, origem: "posicao", carregando: false }); return; }
      }
      const doRoteiro = atual?.destination;
      const doCadastro = profile?.originCity || profile?.destination;
      const nome = doRoteiro || doCadastro || null;
      const coord = nome ? await geocode(nome) : null;
      if (!cancelado) setEstado({ nome, coord, origem: doRoteiro ? "roteiro" : doCadastro ? "cadastro" : null, carregando: false });
    })();
    return () => { cancelado = true; };
  }, [atual?.destination, profile?.originCity, profile?.destination]);

  return estado;
}
