import { useEffect, useState } from "react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { cartao } from "@/components/app/ui";
import { Estado, Etiqueta, dataHoraSeg, fone, type AbaAdmin } from "./comum";

interface Linha { id: number; ts: string; level: string; phone: string | null; step: string | null; msg: string; duration_ms: number | null; data: Record<string, unknown> | null; error: { message?: string; stack?: string; status?: number } | null }
const NIVEIS: [string, string][] = [["", "Tudo"], ["problemas", "Erros e avisos"], ["erro", "Só erros"], ["aviso", "Só avisos"]];
const TOM: Record<string, "erro" | "aviso" | "info"> = { error: "erro", warn: "aviso", info: "info" };
const ROTULO: Record<string, string> = { error: "erro", warn: "aviso", info: "info" };

export default function Logs({ inicial, ir }: { inicial: { nivel: string; phone: string; etapa: string; q: string }; ir: (aba: AbaAdmin, extra?: Record<string, string>) => void }) {
  const { token } = useClientAuth();
  const [f, setF] = useState({ ...inicial, semPedidos: true });
  const [q, setQ] = useState(inicial.q);
  const [fonePesq, setFonePesq] = useState(inicial.phone);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [etapas, setEtapas] = useState<{ etapa: string; n: number }[]>([]);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<number | null>(null);

  async function carregar(antes?: number) {
    setCarregando(true); setErro(null);
    const p = new URLSearchParams();
    if (f.nivel) p.set("nivel", f.nivel);
    if (f.phone) p.set("phone", f.phone);
    if (f.etapa) p.set("etapa", f.etapa);
    if (f.q) p.set("q", f.q);
    if (f.semPedidos && !f.etapa) p.set("semPedidos", "1");
    if (antes) p.set("antes", String(antes));
    try {
      const r = await fetch(`${API_URL}/api/app/admin/logs?${p}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d || !Array.isArray(d.linhas)) { setErro(d?.error ?? "Não consegui carregar os logs."); return; }
      setLinhas((atuais) => (antes ? [...atuais, ...d.linhas] : d.linhas));
      if (!antes && Array.isArray(d.etapas)) setEtapas(d.etapas);
      setTemMais(!!d.temMais);
    } catch { setErro("Sem conexão."); } finally { setCarregando(false); }
  }
  useEffect(() => { setAberto(null); carregar(); }, [f]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={(e) => { e.preventDefault(); setF({ ...f, q: q.trim(), phone: fonePesq.replace(/\D/g, "") }); }} className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Palavra na mensagem ou no erro" aria-label="Palavra na mensagem ou no erro" className="min-w-0 h-12 px-3.5 rounded-xl border-[1.5px] border-sol-borda bg-white text-[15px] focus:outline-none focus:border-sol-mar" />
        <input value={fonePesq} onChange={(e) => setFonePesq(e.target.value)} inputMode="tel" placeholder="Número (ou parte)" aria-label="Número (ou parte)" className="min-w-0 h-12 px-3.5 rounded-xl border-[1.5px] border-sol-borda bg-white text-[15px] focus:outline-none focus:border-sol-mar" />
        <button type="submit" className="h-12 px-5 rounded-xl bg-sol-fundo text-white font-bold">Buscar</button>
      </form>
      <div className="flex flex-wrap items-center gap-1.5">
        {NIVEIS.map(([v, rot]) => <button key={v} type="button" aria-pressed={f.nivel === v} onClick={() => setF({ ...f, nivel: v })} className={`min-h-[36px] px-3 rounded-full text-[13px] font-bold border-[1.5px] ${f.nivel === v ? "bg-sol-fundo text-white border-sol-fundo" : "bg-white text-sol-fundo border-sol-borda"}`}>{rot}</button>)}
        <select value={f.etapa} onChange={(e) => setF({ ...f, etapa: e.target.value })} aria-label="Etapa do sistema" className="min-h-[36px] max-w-[190px] px-2 rounded-full border-[1.5px] border-sol-borda bg-white text-[13px] font-bold">
          <option value="">Todas as etapas</option>
          {f.etapa && !etapas.some((e) => e.etapa === f.etapa) && <option value={f.etapa}>{f.etapa}</option>}
          {etapas.map((e) => <option key={e.etapa} value={e.etapa}>{e.etapa} ({e.n})</option>)}
        </select>
        <label className="flex items-center gap-1.5 min-h-[36px] text-[13px] font-semibold"><input type="checkbox" checked={!f.semPedidos} onChange={(e) => setF({ ...f, semPedidos: !e.target.checked })} className="w-4 h-4 accent-[#0B5F8A]" /> mostrar cada pedido do app</label>
        {(f.nivel || f.phone || f.etapa || f.q) && <button type="button" onClick={() => { setQ(""); setFonePesq(""); setF({ nivel: "", phone: "", etapa: "", q: "", semPedidos: true }); }} className="min-h-[36px] px-2 text-[13px] font-bold text-sol-mar underline">Limpar filtros</button>}
      </div>
      {erro && <Estado carregando={false} erro={erro} aoTentar={() => carregar()} />}
      {!erro && !carregando && linhas.length === 0 && <p className="m-0 py-6 text-center text-sm text-sol-texto2">Nenhum registro com esses filtros.</p>}
      {linhas.length > 0 && (
        <ul className={`${cartao} m-0 p-0 list-none flex flex-col overflow-hidden`}>
          {linhas.map((l) => (
            <li key={l.id} className="border-t border-sol-linha first:border-t-0">
              <button type="button" onClick={() => setAberto(aberto === l.id ? null : l.id)} aria-expanded={aberto === l.id} className="w-full flex flex-col gap-0.5 px-3.5 py-2.5 text-left">
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-sol-texto2">
                  <Etiqueta tom={TOM[l.level] ?? "info"}>{ROTULO[l.level] ?? l.level}</Etiqueta>
                  <span>{dataHoraSeg(l.ts)}</span>
                  {l.step && <span className="font-bold">{l.step}</span>}
                  {l.duration_ms != null && <span>{l.duration_ms.toLocaleString("pt-BR")} ms</span>}
                </span>
                <span className="text-sm font-semibold break-words">{l.msg}</span>
                {l.error?.message && <span className="text-xs text-sol-sos break-words">{l.error.message}</span>}
                {l.phone && <span className="text-xs text-sol-texto2">{fone(l.phone)}</span>}
              </button>
              {aberto === l.id && (
                <div className="flex flex-col gap-2 px-3.5 pb-3">
                  {l.phone && <button type="button" onClick={() => ir("usuarios", { phone: l.phone! })} className="self-start min-h-[36px] px-3 rounded-lg border-[1.5px] border-sol-borda bg-white text-[13px] font-bold">Abrir ficha de {fone(l.phone)}</button>}
                  <pre className="m-0 p-2 rounded-lg bg-sol-areia text-[11px] leading-snug whitespace-pre-wrap break-all max-h-80 overflow-auto">{JSON.stringify({ dados: l.data ?? undefined, erro: l.error ?? undefined }, null, 1)}</pre>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {carregando && <Estado carregando erro={null} />}
      {temMais && !carregando && <button type="button" onClick={() => carregar(linhas[linhas.length - 1]?.id)} className="self-center min-h-[44px] px-5 rounded-full border-[1.5px] border-sol-borda bg-white text-sm font-bold">Ver mais antigos</button>}
    </div>
  );
}
