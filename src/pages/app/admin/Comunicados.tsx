import { useState } from "react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { cartao } from "@/components/app/ui";
import { Estado, Etiqueta, Secao, dataHora, useAdmin } from "./comum";

// Comunicados da equipe: aparecem no Início do app de quem está na cidade escolhida (ou
// com roteiro para ela) e a Sol passa a saber deles na conversa. Cidade vazia = todo mundo.
interface Comunicado { id: number; titulo: string; texto: string; nivel: "info" | "atencao" | "urgente"; cidade: string | null; link: string | null; inicio: string; fim: string; criado_por: string | null; criado_em: string; encerrado_em: string | null }
const NIVEIS: ["info" | "atencao" | "urgente", string, string][] = [["info", "Informação", "novidade, dica, lembrete"], ["atencao", "Atenção", "muda o plano de alguém"], ["urgente", "Urgente", "risco ou fechamento"]];
const DURACOES: [number, string][] = [[6, "6 horas"], [24, "1 dia"], [72, "3 dias"], [168, "7 dias"]];
const TOM = { info: "info", atencao: "aviso", urgente: "erro" } as const;
const campo = "w-full min-w-0 box-border px-3.5 rounded-xl border-[1.5px] border-sol-borda bg-white text-[15px] text-sol-fundo focus:outline-none focus:border-sol-mar";

export default function Comunicados() {
  const { token } = useClientAuth();
  const { dados, erro, carregando, recarregar } = useAdmin<{ comunicados: Comunicado[] }>("/comunicados", (x) => Array.isArray(x.comunicados));
  const [f, setF] = useState({ titulo: "", texto: "", nivel: "info" as "info" | "atencao" | "urgente", cidade: "", link: "", horas: 24 });
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tom: "ok" | "erro"; texto: string } | null>(null);
  const cab = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    if (f.titulo.trim().length < 3 || f.texto.trim().length < 5) { setAviso({ tom: "erro", texto: "Escreva o título e o texto do comunicado." }); return; }
    if (f.link.trim() && !/^https:\/\//i.test(f.link.trim())) { setAviso({ tom: "erro", texto: "O link precisa começar com https://" }); return; }
    setOcupado(true);
    try {
      const r = await fetch(`${API_URL}/api/app/admin/comunicados`, { method: "POST", headers: cab, body: JSON.stringify({ ...f, titulo: f.titulo.trim(), texto: f.texto.trim(), cidade: f.cidade.trim(), link: f.link.trim() }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setAviso({ tom: "erro", texto: d?.error ?? "Não consegui publicar agora." }); return; }
      setAviso({ tom: "ok", texto: `Publicado para ${f.cidade.trim() ? `quem está em ${f.cidade.trim()} ou tem roteiro para lá` : "todo mundo"}.` });
      setF({ titulo: "", texto: "", nivel: "info", cidade: "", link: "", horas: 24 });
      recarregar();
    } catch { setAviso({ tom: "erro", texto: "Sem conexão." }); } finally { setOcupado(false); }
  }
  async function encerrar(id: number) {
    setOcupado(true);
    try { await fetch(`${API_URL}/api/app/admin/comunicados/encerrar`, { method: "POST", headers: cab, body: JSON.stringify({ id }) }); recarregar(); } finally { setOcupado(false); }
  }

  const agora = Date.now();
  const lista = dados?.comunicados ?? [];
  return (
    <div className="flex flex-col gap-3">
      <Secao titulo="Novo comunicado">
        <form onSubmit={publicar} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5"><span className="text-sm font-extrabold">Título</span>
            <input className={`${campo} h-12`} maxLength={100} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Ex.: Orla de Tambaú interditada hoje" />
          </label>
          <label className="flex flex-col gap-1.5"><span className="text-sm font-extrabold">Texto</span>
            <textarea className={`${campo} py-3 min-h-[96px]`} maxLength={500} value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} placeholder="O que aconteceu e o que a pessoa deve fazer." />
            <span className="text-xs text-sol-texto2">{f.texto.length} de 500 letras</span>
          </label>
          <fieldset className="flex flex-col gap-2 border-0 p-0 m-0"><legend className="text-sm font-extrabold mb-2">Importância</legend>
            <div className="flex flex-wrap gap-2">
              {NIVEIS.map(([v, rot, dica]) => (
                <button key={v} type="button" aria-pressed={f.nivel === v} onClick={() => setF({ ...f, nivel: v })} className={`min-h-[44px] px-3.5 rounded-full text-sm font-bold border-[1.5px] ${f.nivel === v ? "bg-sol-fundo text-white border-sol-fundo" : "bg-white text-sol-fundo border-sol-borda"}`} title={dica}>{rot}</button>
              ))}
            </div>
            <span className="text-xs text-sol-texto2">{NIVEIS.find(([v]) => v === f.nivel)?.[2]}</span>
          </fieldset>
          <label className="flex flex-col gap-1.5"><span className="text-sm font-extrabold">Cidade (vazio = todo mundo)</span>
            <input className={`${campo} h-12`} maxLength={80} value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} placeholder="Ex.: João Pessoa" />
            <span className="text-xs text-sol-texto2">Aparece para quem está na cidade agora ou tem roteiro para ela (da véspera até a volta).</span>
          </label>
          <fieldset className="flex flex-col gap-2 border-0 p-0 m-0"><legend className="text-sm font-extrabold mb-2">Fica no ar por</legend>
            <div className="flex flex-wrap gap-2">
              {DURACOES.map(([h, rot]) => (
                <button key={h} type="button" aria-pressed={f.horas === h} onClick={() => setF({ ...f, horas: h })} className={`min-h-[44px] px-3.5 rounded-full text-sm font-bold border-[1.5px] ${f.horas === h ? "bg-sol-fundo text-white border-sol-fundo" : "bg-white text-sol-fundo border-sol-borda"}`}>{rot}</button>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5"><span className="text-sm font-extrabold">Link para saber mais (opcional)</span>
            <input className={`${campo} h-12`} maxLength={300} inputMode="url" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://..." />
          </label>
          {aviso && <p role={aviso.tom === "erro" ? "alert" : "status"} className={`m-0 px-3.5 py-2.5 rounded-[14px] text-sm font-semibold ${aviso.tom === "ok" ? "bg-sol-ok-claro text-sol-ok-texto" : "bg-sol-sos-claro text-sol-sos"}`}>{aviso.texto}</p>}
          <button type="submit" disabled={ocupado} className="min-h-[48px] rounded-[14px] bg-sol-mar text-white text-[15px] font-bold disabled:opacity-50">{ocupado ? "Publicando…" : "Publicar comunicado"}</button>
        </form>
      </Secao>

      <Estado carregando={carregando && !dados} erro={erro} aoTentar={recarregar} vazio={!!dados && !lista.length && "Nenhum comunicado ainda."} />
      {lista.length > 0 && (
        <ul className={`${cartao} m-0 p-0 list-none flex flex-col overflow-hidden`}>
          {lista.map((c) => {
            const ativo = !c.encerrado_em && new Date(c.fim).getTime() > agora;
            return (
              <li key={c.id} className="flex flex-col gap-1 px-4 py-3 border-t border-sol-linha first:border-t-0">
                <span className="flex flex-wrap items-center gap-1.5">
                  <Etiqueta tom={ativo ? TOM[c.nivel] : "info"}>{ativo ? NIVEIS.find(([v]) => v === c.nivel)?.[1] : c.encerrado_em ? "encerrado" : "venceu"}</Etiqueta>
                  <strong className="text-[15px] break-words">{c.titulo}</strong>
                </span>
                <span className="text-[13px] text-sol-texto2 break-words">{c.texto}</span>
                <span className="text-xs text-sol-texto2">{c.cidade ? `Cidade: ${c.cidade}` : "Para todo mundo"} · publicado em {dataHora(c.criado_em)} · {ativo ? `no ar até ${dataHora(c.fim)}` : `saiu em ${dataHora(c.encerrado_em ?? c.fim)}`}</span>
                {ativo && <button type="button" disabled={ocupado} onClick={() => encerrar(c.id)} className="self-start min-h-[40px] px-3 rounded-xl border-[1.5px] border-sol-borda bg-white text-sm font-bold disabled:opacity-50">Tirar do ar agora</button>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
