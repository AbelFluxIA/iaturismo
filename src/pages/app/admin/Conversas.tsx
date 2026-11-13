import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { cartao } from "@/components/app/ui";
import { Busca, Estado, Etiqueta, dataHora, fone, haQuanto, useAdmin, type AbaAdmin } from "./comum";

interface Resumo { phone: string; nome: string | null; quem: string; trecho: string; canal: string | null; em: string; total: number }
interface Mensagem { id: string; role: string; content: string; canal: string | null; createdAt: string }
const CANAL = (c: string | null) => (c === "app" ? "app" : c === "whatsapp" ? "WhatsApp" : "canal não registrado");

export default function Conversas({ phone, q, ir }: { phone: string; q: string; ir: (aba: AbaAdmin, extra?: Record<string, string>) => void }) {
  if (phone) return <Conversa phone={phone} ir={ir} />;
  return <Lista q={q} ir={ir} />;
}

function Lista({ q, ir }: { q: string; ir: (aba: AbaAdmin, extra?: Record<string, string>) => void }) {
  const { dados, erro, carregando, recarregar } = useAdmin<{ conversas: Resumo[] }>(`/conversas?q=${encodeURIComponent(q)}`, (x) => Array.isArray(x.conversas));
  const lista = dados?.conversas ?? [];
  return (
    <div className="flex flex-col gap-3">
      <Busca inicial={q} placeholder="Nome, número ou palavra da conversa" aoBuscar={(v) => ir("conversas", { q: v })} />
      <Estado carregando={carregando} erro={erro} aoTentar={recarregar} vazio={!lista.length && (q ? `Nenhuma conversa com "${q}".` : "Nenhuma conversa ainda.")} />
      {lista.length > 0 && (
        <ul className={`${cartao} m-0 p-0 list-none flex flex-col overflow-hidden`}>
          {lista.map((c) => (
            <li key={c.phone} className="border-t border-sol-linha first:border-t-0">
              <button type="button" onClick={() => ir("conversas", { phone: c.phone })} className="w-full flex items-center gap-2 px-4 py-3 text-left">
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="flex items-center justify-between gap-2"><strong className="text-[15px] truncate">{c.nome || fone(c.phone)}</strong><span className="flex-none text-xs text-sol-texto2">{haQuanto(c.em)}</span></span>
                  <span className="text-[13px] text-sol-texto2 line-clamp-2 break-words">{c.quem === "user" ? "" : "Sol: "}{c.trecho}</span>
                  <span className="text-xs text-sol-texto2">{fone(c.phone)} · {c.total} mensagens · última pelo {CANAL(c.canal)}</span>
                </span>
                <ChevronRight size={18} className="flex-none text-sol-texto2" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Conversa({ phone, ir }: { phone: string; ir: (aba: AbaAdmin, extra?: Record<string, string>) => void }) {
  const { token } = useClientAuth();
  const [nome, setNome] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Mensagem[]>([]);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const primeira = useRef(true);

  async function carregar(antes?: string) {
    setCarregando(true); setErro(null);
    try {
      const r = await fetch(`${API_URL}/api/app/admin/conversa?phone=${encodeURIComponent(phone)}&limite=80${antes ? `&antes=${encodeURIComponent(antes)}` : ""}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d || !Array.isArray(d.mensagens)) { setErro(d?.error ?? "Não consegui carregar a conversa."); return; }
      setNome(d.nome ?? null);
      setTemMais(!!d.temMais);
      setMsgs((atuais) => (antes ? [...d.mensagens, ...atuais] : d.mensagens));
    } catch { setErro("Sem conexão."); } finally { setCarregando(false); }
  }
  useEffect(() => { primeira.current = true; setMsgs([]); carregar(); }, [phone]); // eslint-disable-line react-hooks/exhaustive-deps
  // Abre no fim (mensagens mais novas), como num aplicativo de conversa
  useEffect(() => { if (primeira.current && msgs.length) { primeira.current = false; fim.current?.scrollIntoView({ block: "end" }); } }, [msgs.length]);

  let diaAnterior = "";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => ir("conversas")} className="flex items-center gap-1 min-h-[44px] text-sm font-bold text-sol-mar"><ChevronLeft size={18} /> Todas as conversas</button>
        <button type="button" onClick={() => ir("usuarios", { phone })} className="min-h-[40px] px-3 rounded-xl border-[1.5px] border-sol-borda bg-white text-sm font-bold">Ficha do contato</button>
      </div>
      <div className="flex flex-col">
        <h2 className="m-0 font-display font-extrabold text-xl">{nome || "Conversa"}</h2>
        <span className="text-sm text-sol-texto2">{fone(phone)} · somente leitura</span>
      </div>
      {erro && <Estado carregando={false} erro={erro} aoTentar={() => carregar()} />}
      {temMais && <button type="button" disabled={carregando} onClick={() => carregar(msgs[0]?.createdAt)} className="self-center min-h-[40px] px-4 rounded-full border-[1.5px] border-sol-borda bg-white text-sm font-bold disabled:opacity-50">{carregando ? "Carregando…" : "Ver mensagens mais antigas"}</button>}
      {carregando && !msgs.length && <Estado carregando erro={null} />}
      {!carregando && !erro && !msgs.length && <p className="m-0 py-6 text-center text-sm text-sol-texto2">Nenhuma mensagem nesta conversa.</p>}
      <div className="flex flex-col gap-1.5">
        {msgs.map((m) => {
          const dia = new Date(m.createdAt).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
          const mostraDia = dia !== diaAnterior; diaAnterior = dia;
          const pessoa = m.role === "user";
          return (
            <div key={m.id} className="flex flex-col gap-1.5">
              {mostraDia && <span className="self-center my-1 px-3 py-0.5 rounded-full bg-sol-bege text-[11px] font-bold text-sol-texto2">{dia}</span>}
              <div className={`max-w-[86%] md:max-w-[70%] px-3 py-2 rounded-2xl text-[14px] leading-snug whitespace-pre-wrap break-words ${pessoa ? "self-end bg-sol-claro text-sol-fundo rounded-br-md" : "self-start bg-white border border-sol-linha rounded-bl-md"}`}>
                {m.content}
                <span className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-sol-texto2">
                  {pessoa ? "pessoa" : "Sol"} · {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  <Etiqueta tom={m.canal === "app" ? "ok" : "info"}>{CANAL(m.canal)}</Etiqueta>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div ref={fim} />
      {msgs.length > 0 && <span className="self-center text-xs text-sol-texto2">Última mensagem: {dataHora(msgs[msgs.length - 1].createdAt)}</span>}
    </div>
  );
}
