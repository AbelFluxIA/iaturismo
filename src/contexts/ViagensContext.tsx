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
        const lista = ((await r.json()).roteiros ?? []) as Viagem[];
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
    : [{ id: profile.itinerary.id, destination: profile.destination, arrivalDate: profile.arrivalDate, departureDate: profile.departureDate, days: profile.itinerary.days, pdfUrl: profile.itinerary.pdfUrl }];

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
        const { data } = await (supabase as any)
          .from("generated_itineraries")
          .select("destination,pdf_url,text_content")
          .eq("share_code", codigo)
          .maybeSingle();
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

export function useFeitas(id: string | null) {
  const [feitas, setFeitas] = useState<Record<string, boolean>>(() => lerFeitas(id));
  useEffect(() => {
    setFeitas(lerFeitas(id));
    const ouvir = (e: Event) => { if ((e as CustomEvent).detail === id) setFeitas(lerFeitas(id)); };
    window.addEventListener("sol-feitas", ouvir);
    return () => window.removeEventListener("sol-feitas", ouvir);
  }, [id]);
  const alternar = (chave: string) => {
    if (!id) return;
    const novo = { ...lerFeitas(id), [chave]: !lerFeitas(id)[chave] };
    gravarFeitas(id, novo);
  };
  return { feitas, alternar };
}
