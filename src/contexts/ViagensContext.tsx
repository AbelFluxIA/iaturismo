import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_ROTEIRO, demoViagens } from "@/lib/demo";
import { escolherAtual, gravarFeitas, lerFeitas, type Viagem } from "@/lib/roteiro";

// Viagens da pessoa, compartilhadas entre as telas do app (Início, abas,
// Roteiros, Hoje). Carrega uma vez e recarrega quando um roteiro novo fica pronto.

interface ViagensState {
  viagens: Viagem[] | null; // null = carregando
  atual: Viagem | null; // em andamento, senão a próxima
  recarregar: () => Promise<Viagem[]>;
}

const ViagensContext = createContext<ViagensState | null>(null);

export function ViagensProvider({ children }: { children: ReactNode }) {
  const { token, isDemo, profile } = useClientAuth();
  const [viagens, setViagens] = useState<Viagem[] | null>(null);

  const recarregar = useCallback(async (): Promise<Viagem[]> => {
    if (!token) { setViagens([]); return []; }
    if (isDemo) { const d = demoViagens(); setViagens(d); return d; }
    try {
      const r = await fetch(`${API_URL}/api/app/roteiros`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        // Datas só como AAAA-MM-DD (se vierem com hora, as contas de "hoje" quebram)
        const lista = (((await r.json()).roteiros ?? []) as Viagem[]).map((v) => ({
          ...v,
          arrivalDate: v.arrivalDate ? String(v.arrivalDate).slice(0, 10) : v.arrivalDate,
          departureDate: v.departureDate ? String(v.departureDate).slice(0, 10) : v.departureDate,
        }));
        setViagens(lista);
        return lista;
      }
    } catch { /* sem conexão: mantém o que tinha */ }
    setViagens((v) => v ?? []);
    return [];
  }, [token, isDemo]);

  useEffect(() => { recarregar(); }, [recarregar]);

  // Bot antigo (sem a lista): usa o roteiro mais recente do perfil
  const lista = viagens?.length || !profile?.itinerary
    ? viagens
    : [{ id: profile.itinerary.id, destination: profile.destination, arrivalDate: profile.arrivalDate?.slice(0, 10) ?? null, departureDate: profile.departureDate?.slice(0, 10) ?? null, days: profile.itinerary.days, pdfUrl: profile.itinerary.pdfUrl }];

  return (
    <ViagensContext.Provider value={{ viagens: lista, atual: lista ? escolherAtual(lista) : null, recarregar }}>
      {children}
    </ViagensContext.Provider>
  );
}

export function useViagens() {
  const ctx = useContext(ViagensContext);
  if (!ctx) throw new Error("useViagens fora do ViagensProvider");
  return ctx;
}

// ─── Texto de um roteiro (por id da viagem ou código do link /r/) ─────────────

export interface DadosRoteiro {
  texto: string;
  destino: string | null;
  chegada: string | null;
  saida: string | null;
  pdfUrl: string | null;
}

const cacheRoteiros = new Map<string, DadosRoteiro>();

export function useRoteiro(id: string | null, codigo: string | null = null) {
  const { token, isDemo } = useClientAuth();
  const chave = id ? `id:${id}` : codigo ? `cod:${codigo}` : null;
  const [dados, setDados] = useState<DadosRoteiro | null>(chave ? cacheRoteiros.get(chave) ?? null : null);
  const [loading, setLoading] = useState(!!chave && !cacheRoteiros.has(chave));

  useEffect(() => {
    if (!chave) { setDados(null); setLoading(false); return; }
    if (cacheRoteiros.has(chave)) { setDados(cacheRoteiros.get(chave)!); setLoading(false); return; }
    if (!token) { setLoading(false); return; }
    let cancelado = false;
    setLoading(true);
    (async (): Promise<DadosRoteiro | null> => {
      if (isDemo) {
        const v = demoViagens().find((x) => x.id === id) ?? demoViagens()[0];
        return { texto: DEMO_ROTEIRO, destino: v.destination, chegada: v.arrivalDate, saida: v.departureDate, pdfUrl: null };
      }
      if (codigo) {
        // Função pública do banco: devolve só o roteiro desse código (a tabela não é aberta)
        const { data: linhas } = await (supabase as any).rpc("roteiro_publico", { codigo });
        const data = Array.isArray(linhas) ? linhas[0] : null;
        return data?.text_content
          ? { texto: data.text_content, destino: data.destination, chegada: null, saida: null, pdfUrl: data.pdf_url }
          : null;
      }
      const r = await fetch(`${API_URL}/api/app/roteiro?id=${encodeURIComponent(id ?? "")}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = r.ok ? await r.json() : null;
      return d?.rawItinerary
        ? { texto: d.rawItinerary, destino: d.destination ?? null, chegada: d.arrivalDate ?? null, saida: d.departureDate ?? null, pdfUrl: d.pdfUrl ?? null }
        : null;
    })()
      .then((d) => {
        if (d) cacheRoteiros.set(chave, d);
        if (!cancelado) setDados(d);
      })
      .catch(() => {})
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [chave, token, isDemo, id, codigo]);

  return { dados, loading };
}

// ─── Atividades feitas (sincronizadas entre telas abertas) ───────────────────

// Ao marcar como feita, o check-in vai para o servidor (dados de locais visitados)
export function useFeitas(id: string | null) {
  const { token, isDemo } = useClientAuth();
  const [feitas, setFeitas] = useState<Record<string, boolean>>(() => lerFeitas(id));
  useEffect(() => {
    setFeitas(lerFeitas(id));
    const ouvir = (e: Event) => { if ((e as CustomEvent).detail === id) setFeitas(lerFeitas(id)); };
    window.addEventListener("sol-feitas", ouvir);
    return () => window.removeEventListener("sol-feitas", ouvir);
  }, [id]);
  const alternar = (chave: string, info?: { atividade: string; localBusca?: string | null }) => {
    if (!id) return;
    const novo = { ...lerFeitas(id), [chave]: !lerFeitas(id)[chave] };
    gravarFeitas(id, novo);
    if (novo[chave] && info && token && !isDemo) {
      fetch(`${API_URL}/api/app/presenca`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tipo: "checkin", itineraryId: id, atividade: info.atividade, localBusca: info.localBusca ?? undefined }),
      }).catch(() => { /* sem conexão: o check-in fica só no aparelho */ });
    }
  };
  return { feitas, alternar };
}
