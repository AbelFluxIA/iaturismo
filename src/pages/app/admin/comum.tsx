import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { cartao } from "@/components/app/ui";

// Peças comuns do painel de administração (só a equipe abre estas telas).

export type AbaAdmin = "geral" | "saude" | "usuarios" | "conversas" | "roteiros" | "logs" | "liberar";

// Busca uma rota do painel. caminho = null: não busca (ex.: nada escolhido ainda).
// valido: confere o formato da resposta; resposta incompleta vira aviso de erro, nunca tela quebrada.
export function useAdmin<T>(caminho: string | null, valido?: (d: any) => boolean) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const { token } = useClientAuth();
  const [estado, setEstado] = useState<{ dados: T | null; erro: string | null; carregando: boolean }>({ dados: null, erro: null, carregando: !!caminho });
  const [vez, setVez] = useState(0);
  useEffect(() => {
    if (!caminho || !token) { setEstado({ dados: null, erro: null, carregando: false }); return; }
    let cancelado = false;
    setEstado((e) => ({ ...e, erro: null, carregando: true }));
    fetch(`${API_URL}/api/app/admin${caminho}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (cancelado) return;
        if (r.ok && d && valido && !valido(d)) setEstado({ dados: null, erro: "O servidor respondeu incompleto. Tente de novo.", carregando: false });
        else if (!r.ok || !d) setEstado({ dados: null, erro: d?.error ?? (r.status === 403 ? "Sem permissão." : "Não consegui carregar agora."), carregando: false });
        else setEstado({ dados: d as T, erro: null, carregando: false });
      })
      .catch(() => { if (!cancelado) setEstado({ dados: null, erro: "Sem conexão.", carregando: false }); });
    return () => { cancelado = true; };
  }, [caminho, token, vez]);
  const recarregar = useCallback(() => setVez((v) => v + 1), []);
  return { ...estado, recarregar };
}

export const dataHora = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca";
export const dataHoraSeg = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
export function haQuanto(iso: string | null | undefined) {
  if (!iso) return "nunca";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  if (min < 48 * 60) return `há ${Math.round(min / 60)} h`;
  return `há ${Math.round(min / 1440)} dias`;
}
// +55 (11) 98299-6711: na administração o número aparece inteiro (é por ele que se pesquisa)
export function fone(p: string | null | undefined) {
  const d = String(p ?? "").replace(/\D/g, "");
  const m = d.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : d ? `+${d}` : "sem número";
}
export const reais = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
export const numero = (n: number) => n.toLocaleString("pt-BR");
export const tamanho = (bytes: number) => (bytes > 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} kB`);
export function duracao(seg: number) {
  if (seg < 3600) return `${Math.round(seg / 60)} min`;
  if (seg < 172800) return `${Math.round(seg / 3600)} h`;
  return `${Math.round(seg / 86400)} dias`;
}

export const CORES_NIVEL: Record<string, string> = {
  erro: "bg-sol-sos-claro border-[#F0B4AC] text-sol-sos",
  aviso: "bg-sol-atencao border-sol-atencao-borda text-sol-atencao-texto",
  ok: "bg-sol-ok-claro border-[#A9D4C0] text-sol-ok-texto",
  info: "bg-sol-bege border-sol-linha text-sol-texto2",
};
export function Etiqueta({ tom, children }: { tom: "erro" | "aviso" | "ok" | "info"; children: ReactNode }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-extrabold whitespace-nowrap ${CORES_NIVEL[tom]}`}>{children}</span>;
}

// Número em destaque (não é gráfico: é o valor que interessa de relance)
export function Numero({ rotulo, valor, detalhe, tom }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; tom?: "erro" | "aviso" | "ok" }) {
  return (
    <div className={`${cartao} flex flex-col gap-0.5 p-3.5 min-w-0`}>
      <span className="text-xs font-bold text-sol-texto2">{rotulo}</span>
      <span className={`font-display font-extrabold text-2xl leading-tight ${tom === "erro" ? "text-sol-sos" : tom === "aviso" ? "text-[#8A5A00]" : "text-sol-fundo"}`}>{valor}</span>
      {detalhe && <span className="text-xs text-sol-texto2">{detalhe}</span>}
    </div>
  );
}

export function Secao({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className={`${cartao} flex flex-col gap-3 p-4 min-w-0`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-xs font-extrabold tracking-[0.06em] uppercase text-sol-texto2">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Busca({ inicial = "", placeholder, aoBuscar }: { inicial?: string; placeholder: string; aoBuscar: (q: string) => void }) {
  const [q, setQ] = useState(inicial);
  useEffect(() => setQ(inicial), [inicial]);
  return (
    <form onSubmit={(e) => { e.preventDefault(); aoBuscar(q.trim()); }} className="flex gap-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="flex-1 min-w-0 h-12 px-3.5 rounded-xl border-[1.5px] border-sol-borda bg-white text-[15px] focus:outline-none focus:border-sol-mar" />
      <button type="submit" aria-label="Buscar" className="flex-none w-12 h-12 rounded-xl bg-sol-fundo text-white flex items-center justify-center"><Search size={20} /></button>
    </form>
  );
}

// ─── Gráfico de barras por dia ───────────────────────────────────────────────
// Uma ou duas séries empilhadas (mesma unidade, um eixo só). Cores conferidas no
// validador de paleta (azul #0B5F8A e laranja #E0872B: distinguíveis também para
// daltônicos). O laranja tem pouco contraste com o fundo, então há sempre legenda,
// valor ao tocar e a tabela embaixo.
const COR_A = "#0B5F8A";
const COR_B = "#E0872B";
export interface PontoDia { dia: string; a: number; b?: number }
export function BarrasPorDia({ titulo, pontos, rotuloA, rotuloB, formato = numero }: { titulo: string; pontos: PontoDia[]; rotuloA: string; rotuloB?: string; formato?: (n: number) => string }) {
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(1, ...pontos.map((p) => p.a + (p.b ?? 0)));
  const total = pontos.reduce((s, p) => s + p.a + (p.b ?? 0), 0);
  const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  const p = sel !== null ? pontos[sel] : null;
  return (
    <Secao titulo={titulo}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 min-h-[22px] text-[13px]">
        <span className="font-bold text-sol-fundo">
          {p ? `${ddmm(p.dia)}: ${rotuloB ? `${formato(p.a)} ${rotuloA.toLowerCase()} · ${formato(p.b ?? 0)} ${rotuloB.toLowerCase()}` : formato(p.a)}` : `${formato(total)} em ${pontos.length} dias`}
        </span>
        {rotuloB && (
          <span className="flex items-center gap-3 text-xs text-sol-texto2">
            <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COR_A }} />{rotuloA}</span>
            <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COR_B }} />{rotuloB}</span>
          </span>
        )}
      </div>
      <div role="img" aria-label={`${titulo}: ${formato(total)} em ${pontos.length} dias`} className="flex items-end gap-[2px] h-28 border-b border-sol-linha" onMouseLeave={() => setSel(null)}>
        {pontos.map((x, i) => {
          const hA = (x.a / max) * 100;
          const hB = ((x.b ?? 0) / max) * 100;
          return (
            <button key={x.dia} type="button" aria-label={`${ddmm(x.dia)}: ${formato(x.a)}${rotuloB ? ` ${rotuloA}, ${formato(x.b ?? 0)} ${rotuloB}` : ""}`} onMouseEnter={() => setSel(i)} onFocus={() => setSel(i)} onClick={() => setSel(i)}
              className={`flex-1 min-w-0 h-full flex flex-col justify-end gap-[2px] rounded-t ${sel === i ? "bg-sol-bege" : ""}`}>
              {hB > 0 && <span className="block w-full rounded-t-[4px]" style={{ height: `${hB}%`, minHeight: 3, background: COR_B }} />}
              {hA > 0 && <span className={`block w-full ${hB > 0 ? "" : "rounded-t-[4px]"}`} style={{ height: `${hA}%`, minHeight: 3, background: COR_A }} />}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-sol-texto2 -mt-2">
        <span>{pontos[0] ? ddmm(pontos[0].dia) : ""}</span>
        <span>{pontos.length > 2 ? ddmm(pontos[Math.floor(pontos.length / 2)].dia) : ""}</span>
        <span>{pontos.length ? `${ddmm(pontos[pontos.length - 1].dia)} (hoje)` : ""}</span>
      </div>
      <details className="text-xs text-sol-texto2">
        <summary className="cursor-pointer min-h-[32px] flex items-center font-bold text-sol-mar">Ver em tabela</summary>
        <table className="w-full mt-1 border-collapse">
          <thead><tr className="text-left"><th className="py-1 font-bold">Dia</th><th className="py-1 font-bold text-right">{rotuloA}</th>{rotuloB && <th className="py-1 font-bold text-right">{rotuloB}</th>}</tr></thead>
          <tbody>{[...pontos].reverse().map((x) => (
            <tr key={x.dia} className="border-t border-sol-linha"><td className="py-1">{ddmm(x.dia)}</td><td className="py-1 text-right">{formato(x.a)}</td>{rotuloB && <td className="py-1 text-right">{formato(x.b ?? 0)}</td>}</tr>
          ))}</tbody>
        </table>
      </details>
    </Secao>
  );
}

export function Estado({ carregando, erro, vazio, aoTentar }: { carregando: boolean; erro: string | null; vazio?: string | false; aoTentar?: () => void }) {
  if (carregando) return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sol-mar" /></div>;
  if (erro) return (
    <div role="alert" className="flex flex-col items-start gap-2 px-3.5 py-3 rounded-[14px] border bg-sol-sos-claro border-[#F0B4AC] text-sm text-sol-sos">
      {erro}
      {aoTentar && <button type="button" onClick={aoTentar} className="min-h-[36px] font-extrabold underline">Tentar de novo</button>}
    </div>
  );
  if (vazio) return <p className="m-0 py-6 text-center text-sm text-sol-texto2">{vazio}</p>;
  return null;
}
