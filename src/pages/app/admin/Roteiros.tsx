import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cartao } from "@/components/app/ui";
import { urlSegura } from "@/lib/utils";
import { Busca, Estado, Etiqueta, dataHora, fone, useAdmin, type AbaAdmin } from "./comum";

interface Item { id: string; destino: string | null; chegada: string | null; saida: string | null; dias: number; status: string; criado_em: string; pdf: boolean; tem_texto: boolean; phone: string; nome: string | null }
// O que foi usado para montar o roteiro (gravado desde 25/11; roteiros antigos trazem só o perfil)
interface Configuracao {
  geradoEm?: string; canal?: string; orcamento?: string | null; interesses?: string[]; grupo?: string | null; hospedagem?: string | null; transporte?: string | null;
  horaChegada?: string | null; horaSaida?: string | null; origem?: string | null; gostosDoCadastro?: string[]; roteirosAnterioresNoDestino?: number; eventosNasDatas?: number;
  partiuDeOndeEstava?: boolean; modelo?: string; cartoesPostais?: string[]; cartaoPostalIncluido?: string | null;
  conferencia?: { paradas?: number; ok?: number; trocadas?: number; reprovadas?: string[] }; ajustes?: { tiradas?: string[]; horarios?: string[]; tempos?: string[] };
}
function Linha({ rotulo, valor }: { rotulo: string; valor: string | number | null | undefined }) {
  if (valor === null || valor === undefined || valor === "") return null;
  return <div className="flex gap-2 text-[13px] leading-snug"><span className="flex-none w-[136px] text-sol-texto2">{rotulo}</span><span className="flex-1 min-w-0 break-words font-semibold">{valor}</span></div>;
}
function ConfiguracoesUsadas({ r }: { r: Detalhe }) {
  const c = r.configuracao;
  if (!c && !r.perfil) return null;
  const lista = (v?: string[]) => (v && v.length ? v.join(", ") : null);
  return (
    <section aria-label="Configurações usadas" className={`${cartao} flex flex-col gap-1.5 p-4`}>
      <h3 className="m-0 text-[15px] font-extrabold">Configurações usadas para gerar</h3>
      <Linha rotulo="Perfil enviado à IA" valor={r.perfil} />
      <Linha rotulo="Grupo" valor={c?.grupo ?? r.grupo} />
      {c ? (
        <>
          <Linha rotulo="Orçamento" valor={c.orcamento} />
          <Linha rotulo="Interesses" valor={lista(c.interesses)} />
          <Linha rotulo="Hospedagem" valor={c.hospedagem} />
          <Linha rotulo="Chegada e saída" valor={[c.horaChegada, c.horaSaida].filter(Boolean).join(" a ") || null} />
          <Linha rotulo="Vem de" valor={[c.origem, c.transporte].filter(Boolean).join(" · ") || null} />
          <Linha rotulo="Gostos do cadastro" valor={lista(c.gostosDoCadastro)} />
          <Linha rotulo="Pedido por" valor={c.canal === "app" ? "app" : c.canal === "whatsapp" ? "WhatsApp" : c.canal} />
          <Linha rotulo="Cartões-postais" valor={lista(c.cartoesPostais)} />
          <Linha rotulo="Incluído depois" valor={c.cartaoPostalIncluido ? `${c.cartaoPostalIncluido} (tinha ficado de fora)` : null} />
          <Linha rotulo="Conferência Google" valor={c.conferencia ? `${c.conferencia.ok ?? 0} de ${c.conferencia.paradas ?? 0} paradas aprovadas, ${c.conferencia.trocadas ?? 0} trocadas` : null} />
          <Linha rotulo="Reprovadas antes" valor={lista(c.conferencia?.reprovadas)} />
          <Linha rotulo="Viagens anteriores" valor={c.roteirosAnterioresNoDestino ? `${c.roteirosAnterioresNoDestino} lugares de viagem já feita a este destino` : null} />
          <Linha rotulo="Eventos nas datas" valor={c.eventosNasDatas ?? null} />
          <Linha rotulo="Tiradas" valor={lista(c.ajustes?.tiradas)} />
          <Linha rotulo="Modelo" valor={c.modelo} />
        </>
      ) : <p className="m-0 text-xs text-sol-texto2">Roteiro anterior a 25/11: só o perfil ficou guardado.</p>}
    </section>
  );
}

interface Detalhe { id: string; destino: string | null; chegada: string | null; saida: string | null; dias: number; status: string; criadoEm: string; pdfUrl: string | null; texto: string | null; configuracao?: Configuracao | null; perfil?: string | null; grupo?: string | null; phone: string; nome: string | null }
const STATUS: Record<string, ["ok" | "aviso" | "info" | "erro", string]> = { sent: ["ok", "entregue"], generated: ["ok", "gerado"], paid: ["aviso", "pago, falta gerar"], pending: ["aviso", "não concluído"] };
const FILTROS: [string, string][] = [["", "Todos"], ["sent", "Entregues"], ["pending", "Não concluídos"], ["paid", "Pagos sem gerar"]];

export default function Roteiros({ id, q, ir }: { id: string; q: string; ir: (aba: AbaAdmin, extra?: Record<string, string>) => void }) {
  const [status, setStatus] = useState("");
  if (id) return <Um id={id} ir={ir} />;
  return <Lista q={q} status={status} setStatus={setStatus} ir={ir} />;
}

function Lista({ q, status, setStatus, ir }: { q: string; status: string; setStatus: (s: string) => void; ir: (aba: AbaAdmin, extra?: Record<string, string>) => void }) {
  const { dados, erro, carregando, recarregar } = useAdmin<{ roteiros: Item[] }>(`/roteiros?q=${encodeURIComponent(q)}&status=${status}`, (x) => Array.isArray(x.roteiros));
  const lista = dados?.roteiros ?? [];
  return (
    <div className="flex flex-col gap-3">
      <Busca inicial={q} placeholder="Destino, nome ou número" aoBuscar={(v) => ir("roteiros", { q: v })} />
      <div role="tablist" aria-label="Situação" className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {FILTROS.map(([v, rot]) => <button key={v} type="button" role="tab" aria-selected={status === v} onClick={() => setStatus(v)} className={`flex-none min-h-[36px] px-3 rounded-full text-[13px] font-bold border-[1.5px] ${status === v ? "bg-sol-fundo text-white border-sol-fundo" : "bg-white text-sol-fundo border-sol-borda"}`}>{rot}</button>)}
      </div>
      <Estado carregando={carregando} erro={erro} aoTentar={recarregar} vazio={!lista.length && "Nenhum roteiro encontrado."} />
      {lista.length > 0 && (
        <ul className={`${cartao} m-0 p-0 list-none flex flex-col overflow-hidden`}>
          {lista.map((r) => {
            const [tom, rot] = STATUS[r.status] ?? ["info", r.status];
            return (
              <li key={r.id} className="border-t border-sol-linha first:border-t-0">
                <button type="button" onClick={() => ir("roteiros", { id: r.id })} className="w-full flex items-center gap-2 px-4 py-3 text-left">
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-1.5"><strong className="text-[15px]">{r.destino || "Sem destino"}</strong><Etiqueta tom={tom}>{rot}</Etiqueta>{!r.tem_texto && <Etiqueta tom="erro">sem texto</Etiqueta>}</span>
                    <span className="text-xs text-sol-texto2">{r.nome || "Sem nome"} · {fone(r.phone)}</span>
                    <span className="text-xs text-sol-texto2">{r.chegada ?? "?"} a {r.saida ?? "?"} · {r.dias} dia{r.dias === 1 ? "" : "s"} · criado em {dataHora(r.criado_em)}{r.pdf ? " · com PDF" : ""}</span>
                  </span>
                  <ChevronRight size={18} className="flex-none text-sol-texto2" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Um({ id, ir }: { id: string; ir: (aba: AbaAdmin, extra?: Record<string, string>) => void }) {
  const { dados: r, erro, carregando, recarregar } = useAdmin<Detalhe>(`/roteiro?id=${encodeURIComponent(id)}`, (x) => typeof x.id === "string" && typeof x.phone === "string");
  const pdf = urlSegura(r?.pdfUrl ?? "");
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => ir("roteiros")} className="self-start flex items-center gap-1 min-h-[44px] text-sm font-bold text-sol-mar"><ChevronLeft size={18} /> Todos os roteiros</button>
      {!r && <Estado carregando={carregando} erro={erro} aoTentar={recarregar} />}
      {r && (
        <>
          <section className={`${cartao} flex flex-col gap-1.5 p-4`}>
            <h2 className="m-0 font-display font-extrabold text-xl">{r.destino || "Sem destino"}</h2>
            <span className="text-sm text-sol-texto2">{r.chegada ?? "?"} a {r.saida ?? "?"} · {r.dias} dia{r.dias === 1 ? "" : "s"} · {(STATUS[r.status] ?? ["info", r.status])[1]} · criado em {dataHora(r.criadoEm)}</span>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => ir("usuarios", { phone: r.phone })} className="min-h-[40px] px-3 rounded-xl border-[1.5px] border-sol-borda bg-white text-sm font-bold">{r.nome || fone(r.phone)}</button>
              {pdf && <a href={pdf} target="_blank" rel="noopener noreferrer" className="min-h-[40px] px-3 flex items-center rounded-xl bg-sol-mar text-white text-sm font-bold no-underline">Abrir PDF</a>}
            </div>
          </section>
          <ConfiguracoesUsadas r={r} />
          <section className={`${cartao} p-4`}>
            {r.texto ? <pre className="m-0 text-[13px] leading-relaxed whitespace-pre-wrap break-words font-corpo">{r.texto}</pre> : <p className="m-0 text-sm text-sol-texto2">Este roteiro não tem texto (a geração não terminou).</p>}
          </section>
        </>
      )}
    </div>
  );
}
