import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cartao } from "@/components/app/ui";
import { Busca, Estado, Etiqueta, Secao, dataHora, dataHoraSeg, fone, haQuanto, useAdmin, type AbaAdmin } from "./comum";

interface Usuario { phone: string; nome: string | null; criado_em: string; guia: boolean; pagou: boolean; creditos: number; destino: string | null; roteiros: number; mensagens: number; ultima_mensagem: string | null; ultimo_acesso: string | null; cadastro_em: string | null }
interface Evento { ts: string; tipo: string; nivel: "ok" | "aviso" | "erro" | "info"; titulo: string; detalhe?: string; dados?: Record<string, unknown> }
interface Linha { phone: string; nome: string | null; existe: boolean; eventos: Evento[] }
const FILTROS: [string, string][] = [["", "Tudo"], ["login", "Login"], ["roteiro", "Roteiros"], ["pagamento", "Pagamentos"], ["problemas", "Só problemas"]];

export default function Usuarios({ phone, q, ir }: { phone: string; q: string; ir: (aba: AbaAdmin, extra?: Record<string, string>) => void }) {
  if (phone) return <Ficha phone={phone} ir={ir} />;
  return <Lista q={q} ir={ir} />;
}

function Lista({ q, ir }: { q: string; ir: (aba: AbaAdmin, extra?: Record<string, string>) => void }) {
  const { dados, erro, carregando, recarregar } = useAdmin<{ usuarios: Usuario[] }>(`/usuarios?q=${encodeURIComponent(q)}`, (x) => Array.isArray(x.usuarios));
  const lista = dados?.usuarios ?? [];
  return (
    <div className="flex flex-col gap-3">
      <Busca inicial={q} placeholder="Nome ou parte do número" aoBuscar={(v) => ir("usuarios", { q: v })} />
      <Estado carregando={carregando} erro={erro} aoTentar={recarregar} vazio={!lista.length && (q ? `Ninguém encontrado para "${q}".` : "Nenhum contato ainda.")} />
      {lista.length > 0 && (
        <ul className={`${cartao} m-0 p-0 list-none flex flex-col overflow-hidden`}>
          {lista.map((u) => (
            <li key={u.phone} className="border-t border-sol-linha first:border-t-0">
              <button type="button" onClick={() => ir("usuarios", { phone: u.phone })} className="w-full flex items-center gap-2 px-4 py-3 text-left">
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-1.5"><strong className="text-[15px]">{u.nome || "Sem nome"}</strong>{u.guia && <Etiqueta tom="ok">Guia</Etiqueta>}{!u.cadastro_em && <Etiqueta tom="info">sem cadastro no app</Etiqueta>}</span>
                  <span className="text-xs text-sol-texto2">{fone(u.phone)} · {u.roteiros} roteiro{u.roteiros === 1 ? "" : "s"} · {u.mensagens} mensagens</span>
                  <span className="text-xs text-sol-texto2">Última conversa {haQuanto(u.ultima_mensagem)}{u.ultimo_acesso ? ` · último uso do app ${haQuanto(u.ultimo_acesso)}` : ""}</span>
                </span>
                <ChevronRight size={18} className="flex-none text-sol-texto2" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {lista.length >= 80 && <p className="m-0 text-xs text-sol-texto2">Mostrando os 80 mais recentes. Use a busca para achar os demais.</p>}
    </div>
  );
}

function Ficha({ phone, ir }: { phone: string; ir: (aba: AbaAdmin, extra?: Record<string, string>) => void }) {
  const { dados, erro, carregando, recarregar } = useAdmin<Linha>(`/usuario/linha-do-tempo?phone=${encodeURIComponent(phone)}`, (x) => Array.isArray(x.eventos) && typeof x.phone === "string");
  const [filtro, setFiltro] = useState("");
  const [aberto, setAberto] = useState<number | null>(null);
  const eventos = (dados?.eventos ?? []).filter((e) => !filtro || (filtro === "problemas" ? e.nivel === "erro" || e.nivel === "aviso" : e.tipo === filtro));
  const logins = (dados?.eventos ?? []).filter((e) => e.tipo === "login");
  const ultimoLogin = logins.find((e) => e.nivel === "ok");
  const falhasRecentes = logins.filter((e) => e.nivel !== "ok" && e.nivel !== "info" && (!ultimoLogin || new Date(e.ts) > new Date(ultimoLogin.ts)));
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => ir("usuarios")} className="self-start flex items-center gap-1 min-h-[44px] text-sm font-bold text-sol-mar"><ChevronLeft size={18} /> Todos os usuários</button>
      {!dados && <Estado carregando={carregando} erro={erro} aoTentar={recarregar} />}
      {dados && (
        <>
          <section className={`${cartao} flex flex-col gap-2 p-4`}>
            <h2 className="m-0 font-display font-extrabold text-xl">{dados.nome || "Sem nome"}</h2>
            <span className="text-sm text-sol-texto2">{fone(dados.phone)}{dados.existe ? "" : " · este número nunca falou com a Sol"}</span>
            <p className="m-0 text-sm">
              {ultimoLogin ? <>Última entrada no app: <strong>{dataHora(ultimoLogin.ts)}</strong>.</> : "Sem entrada no app registrada."}{" "}
              {falhasRecentes.length > 0 && <span className="font-bold text-sol-sos">{falhasRecentes.length} tentativa{falhasRecentes.length > 1 ? "s" : ""} sem sucesso depois disso: {falhasRecentes[0].titulo.replace(/^login: /, "")}.</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => ir("conversas", { phone: dados.phone })} className="min-h-[40px] px-3 rounded-xl bg-sol-mar text-white text-sm font-bold">Ver conversa</button>
              <button type="button" onClick={() => ir("logs", { phone: dados.phone })} className="min-h-[40px] px-3 rounded-xl border-[1.5px] border-sol-borda bg-white text-sm font-bold">Logs deste número</button>
              <button type="button" onClick={() => ir("roteiros", { q: dados.phone })} className="min-h-[40px] px-3 rounded-xl border-[1.5px] border-sol-borda bg-white text-sm font-bold">Roteiros</button>
              <button type="button" onClick={() => ir("liberar", { phone: dados.phone })} className="min-h-[40px] px-3 rounded-xl border-[1.5px] border-sol-borda bg-white text-sm font-bold">Liberar recursos</button>
            </div>
          </section>
          <Secao titulo="O que aconteceu com este contato">
            <div role="tablist" aria-label="Filtrar" className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
              {FILTROS.map(([id, rot]) => (
                <button key={id} type="button" role="tab" aria-selected={filtro === id} onClick={() => setFiltro(id)} className={`flex-none min-h-[36px] px-3 rounded-full text-[13px] font-bold border-[1.5px] ${filtro === id ? "bg-sol-fundo text-white border-sol-fundo" : "bg-white text-sol-fundo border-sol-borda"}`}>{rot}</button>
              ))}
            </div>
            {eventos.length === 0 && <p className="m-0 py-4 text-center text-sm text-sol-texto2">Nada registrado{filtro ? " neste filtro" : ""}. O histórico detalhado começa em 19/10/2026.</p>}
            <ol className="m-0 p-0 list-none flex flex-col">
              {eventos.map((e, i) => (
                <li key={i} className="border-t border-sol-linha first:border-t-0">
                  <button type="button" onClick={() => setAberto(aberto === i ? null : i)} aria-expanded={aberto === i} className="w-full flex items-start gap-2 py-2.5 text-left">
                    <span className="flex-none w-[86px] text-xs text-sol-texto2 pt-0.5">{dataHora(e.ts)}</span>
                    <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-1.5"><Etiqueta tom={e.nivel}>{e.tipo}</Etiqueta><span className="text-sm font-semibold break-words">{e.titulo}</span></span>
                      {e.detalhe && <span className="text-xs text-sol-texto2 break-words">{e.detalhe}</span>}
                      {aberto === i && <pre className="m-0 mt-1 p-2 rounded-lg bg-sol-areia text-[11px] leading-snug whitespace-pre-wrap break-all">{dataHoraSeg(e.ts)}{"\n"}{JSON.stringify(e.dados ?? {}, null, 1)}</pre>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </Secao>
        </>
      )}
    </div>
  );
}
