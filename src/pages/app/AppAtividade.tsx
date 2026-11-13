import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BadgeCheck, Check, Lock, MapPin, RefreshCw, Route, ThumbsDown, ThumbsUp, TriangleAlert } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { AbrirRota } from "@/components/app/AbrirRota";
import { FotoParada, localDaParada } from "@/components/app/FotoParada";
import { atualizarRoteiroGuardado, useFeitas, useRoteiro, useViagens } from "@/contexts/ViagensContext";
import { Carregando, TopBar, Vazio, btnPrimario, btnSecundario, cartao } from "@/components/app/ui";
import { queryDoMapa } from "@/lib/geo";
import { chaveAtividade, parseItinerary, rotuloDia } from "@/lib/roteiro";

// Detalhe de uma atividade do roteiro: horário, local, deslocamento e o que a
// Sol escreveu sobre ela. /app/roteiro/atividade?id=VIAGEM&d=DIA&a=ATIVIDADE
export default function AppAtividade() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const codigo = params.get("codigo");
  const d = Number(params.get("d") ?? 0);
  const a = Number(params.get("a") ?? 0);
  const { dados, loading } = useRoteiro(id, codigo);
  const { viagens } = useViagens();
  const { feitas, alternar } = useFeitas(id || codigo);
  const { profile, token } = useClientAuth();
  // Troca desta atividade por outra (Guia Sol) e "gostei / não gostei"
  const [trocando, setTrocando] = useState<"fechado" | "motivo" | "enviando">("fechado");
  const [aviso, setAviso] = useState<{ tom: "ok" | "erro"; texto: string } | null>(null);
  // Aberto agora, horário de hoje e nota: direto do Google Maps, na hora (não fica guardado)
  const [aoVivo, setAoVivo] = useState<{ fechadoDeVez: boolean; abertoAgora: boolean | null; horarioHoje: string | null; nota: number | null; avaliacoes: number | null; mapsUrl: string | null } | null>(null);
  const nomeDaAtividade = dados ? parseItinerary(dados.texto)[d]?.activities[a]?.name ?? "" : "";
  const localBusca = dados ? (() => { const x = parseItinerary(dados.texto)[d]?.activities[a]; return x?.mapUrl ? queryDoMapa(x.mapUrl) : null; })() : null;
  const cidadeDoRoteiro = dados?.destino ?? "";
  useEffect(() => {
    setAoVivo(null);
    if (!token || !id || !localBusca) return;
    let cancelado = false;
    fetch(`${API_URL}/api/app/local-info?local=${encodeURIComponent(localBusca)}&cidade=${encodeURIComponent(cidadeDoRoteiro)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.status === 200 ? r.json() : null))
      // Resposta incompleta não pode quebrar a tela: cada campo é conferido antes de usar
      .then((j) => {
        if (cancelado || !j || typeof j !== "object") return;
        setAoVivo({
          fechadoDeVez: j.fechadoDeVez === true,
          abertoAgora: typeof j.abertoAgora === "boolean" ? j.abertoAgora : null,
          horarioHoje: typeof j.horarioHoje === "string" && j.horarioHoje ? j.horarioHoje : null,
          nota: typeof j.nota === "number" ? j.nota : null,
          avaliacoes: typeof j.avaliacoes === "number" ? j.avaliacoes : null,
          mapsUrl: typeof j.mapsUrl === "string" && /^https:\/\//.test(j.mapsUrl) ? j.mapsUrl : null,
        });
      })
      .catch(() => { /* sem informação ao vivo: a tela segue igual */ });
    return () => { cancelado = true; };
  }, [token, id, localBusca, cidadeDoRoteiro]);
  // Outra atividade aberta: limpa o aviso. (Depois de uma troca a tela é a mesma, e o aviso "Trocado por…" fica.)
  useEffect(() => { setAviso(null); setTrocando("fechado"); }, [d, a]);

  if (loading) return <Carregando />;
  const dias = dados ? parseItinerary(dados.texto) : [];
  const atv = dias[d]?.activities[a];
  const voltar = `/app/roteiro?${id ? "id" : "codigo"}=${encodeURIComponent(id || codigo || "")}`;

  if (!atv) {
    return (
      <div className="flex flex-col">
        <TopBar title="Atividade" back={voltar} />
        <div className="px-5"><Vazio icone={<MapPin size={32} />} titulo="Atividade não encontrada" texto="Volte ao roteiro e escolha outra." /></div>
      </div>
    );
  }

  const destino = dados?.destino || viagens?.find((v) => v.id === id)?.destination || "";
  const chegada = dados?.chegada ?? viagens?.find((v) => v.id === id)?.arrivalDate ?? null;
  const local = atv.mapUrl ? queryDoMapa(atv.mapUrl) : null;
  const feita = !!feitas[chaveAtividade(d, a)];
  const nota = dados?.avaliacoes?.[atv.name] ?? 0;
  const cab = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  async function avaliar(nova: 1 | -1) {
    if (!id || !dados) return;
    const valor = nota === nova ? 0 : nova; // tocar de novo tira a avaliação
    const antes = dados.avaliacoes ?? {};
    atualizarRoteiroGuardado(id, { avaliacoes: { ...antes, [atv.name]: valor } });
    try {
      const r = await fetch(`${API_URL}/api/app/roteiro/avaliar`, { method: "POST", headers: cab, body: JSON.stringify({ id, atividade: atv.name, nota: valor }) });
      if (!r.ok) throw new Error();
      setAviso(valor ? { tom: "ok", texto: valor > 0 ? "Anotado. A Sol vai buscar mais lugares assim nos próximos roteiros." : "Anotado. A Sol evita lugares assim nos próximos roteiros." } : null);
    } catch {
      atualizarRoteiroGuardado(id, { avaliacoes: antes });
      setAviso({ tom: "erro", texto: "Não consegui salvar sua avaliação. Tente de novo." });
    }
  }
  async function trocar(motivo: string) {
    if (!id) return;
    setTrocando("enviando"); setAviso(null);
    try {
      const r = await fetch(`${API_URL}/api/app/roteiro/trocar`, { method: "POST", headers: cab, body: JSON.stringify({ id, dia: d, indice: a, nome: atv.name, motivo }) });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.rawItinerary) { setAviso({ tom: "erro", texto: j?.error ?? "Não consegui trocar agora. Tente de novo." }); setTrocando("fechado"); return; }
      atualizarRoteiroGuardado(id, { texto: j.rawItinerary });
      setTrocando("fechado");
      setAviso({ tom: "ok", texto: `Trocado por ${j.nova || "outra opção"}. O PDF antigo continua com a atividade anterior.` });
      window.scrollTo(0, 0);
    } catch {
      setAviso({ tom: "erro", texto: "Sem conexão. Tente de novo." }); setTrocando("fechado");
    }
  }

  return (
    <div className="flex flex-col">
      <TopBar title={atv.name} step={`${rotuloDia(chegada, d, dias[d].label)}${destino ? ` · ${destino}` : ""}`} back={voltar} />
      <div className="flex flex-col gap-3 px-5">
        <FotoParada local={localDaParada(atv)} cidade={destino} />
        <div className="flex flex-wrap gap-2">
          {atv.time && <span className="text-[13px] font-extrabold px-2.5 py-1 rounded-full bg-sol-creme text-sol-creme-texto">{atv.time}</span>}
          {atv.period && <span className="text-[13px] font-extrabold px-2.5 py-1 rounded-full bg-sol-claro text-sol-claro-texto">{atv.period}</span>}
        </div>

        <dl className={`${cartao} m-0 flex flex-col gap-2.5 p-4 text-[15px]`}>
          {local && (
            <div className="flex gap-3"><dt className="flex-none w-[96px] font-extrabold">Local</dt><dd className="m-0 min-w-0 flex-1 break-words">{local}</dd></div>
          )}
          {atv.travel && (
            <div className="flex gap-3"><dt className="flex-none w-[96px] font-extrabold">Deslocamento</dt><dd className="m-0 min-w-0 flex-1 break-words">{atv.travel}</dd></div>
          )}
          <div className="flex gap-3"><dt className="flex-none w-[96px] font-extrabold">Horário</dt><dd className="m-0">{atv.time || "Livre"}</dd></div>
          {atv.hours && (
            <div className="flex gap-3"><dt className="flex-none w-[96px] font-extrabold">Funciona</dt><dd className="m-0 min-w-0 flex-1 break-words">{atv.hours}</dd></div>
          )}
          {atv.cost && (
            <div className="flex gap-3"><dt className="flex-none w-[96px] font-extrabold">Custo</dt><dd className="m-0 min-w-0 flex-1 break-words">{atv.cost}</dd></div>
          )}
          {atv.rain && (
            <div className="flex gap-3"><dt className="flex-none w-[96px] font-extrabold">Se chover</dt><dd className="m-0 min-w-0 flex-1 break-words">{atv.rain}</dd></div>
          )}
        </dl>

        {atv.checked === "ok" && (
          <p className="m-0 flex items-start gap-2 px-3.5 py-2.5 rounded-[14px] bg-sol-ok-claro text-sol-ok-texto text-[13px] font-semibold">
            <BadgeCheck size={18} className="flex-none mt-px" /> Conferido no Google Maps quando o roteiro foi gerado: o lugar existe e abre neste dia e horário.
          </p>
        )}
        {atv.checked === "aviso" && (
          <p className="m-0 flex items-start gap-2 px-3.5 py-2.5 rounded-[14px] bg-sol-atencao border border-sol-atencao-borda text-sol-atencao-texto text-[13px] font-semibold">
            <TriangleAlert size={18} className="flex-none mt-px" /> Não consegui conferir este lugar no Google Maps. Confirme o funcionamento antes de ir.
          </p>
        )}
        {atv.alert && (
          <p className="m-0 flex items-start gap-2 px-3.5 py-2.5 rounded-[14px] bg-sol-atencao border border-sol-atencao-borda text-sol-atencao-texto text-[13px] font-semibold">
            <TriangleAlert size={18} className="flex-none mt-px" /> {atv.alert}
          </p>
        )}
        {aoVivo && (aoVivo.abertoAgora !== null || aoVivo.horarioHoje || aoVivo.nota || aoVivo.fechadoDeVez) && (
          <section className={`${cartao} flex flex-col gap-1 p-4`} aria-label="Agora no Google Maps">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
              {aoVivo.fechadoDeVez ? <strong className="text-sol-sos">Consta como fechado</strong>
                : aoVivo.abertoAgora === true ? <strong className="text-sol-ok">Aberto agora</strong>
                : aoVivo.abertoAgora === false ? <strong className="text-sol-sos">Fechado agora</strong> : null}
              {aoVivo.horarioHoje && <span>Hoje: {aoVivo.horarioHoje}</span>}
              {aoVivo.nota !== null && <span>Nota {String(aoVivo.nota.toFixed(1)).replace(".", ",")}{aoVivo.avaliacoes ? ` (${aoVivo.avaliacoes.toLocaleString("pt-BR")} avaliações)` : ""}</span>}
            </div>
            <span className="text-xs text-sol-texto2">
              Informação de agora do <strong>Google Maps</strong>.{aoVivo.mapsUrl && <> <a href={aoVivo.mapsUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-sol-mar">Ver no Google Maps</a></>}
            </span>
          </section>
        )}
        {atv.event && (
          <section className={`${cartao} flex flex-col gap-1.5 p-4`}>
            <h2 className="m-0 text-xs font-extrabold tracking-[0.06em] uppercase text-sol-texto2">Evento</h2>
            <p className="m-0 text-[15px] leading-snug break-words">{atv.event.replace(/\s*Fonte:\s*https?:\/\/\S+/i, "")}</p>
            {atv.event.match(/https?:\/\/\S+/) && <a href={atv.event.match(/https?:\/\/\S+/)![0]} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-sol-mar break-all">Ver a fonte e confirmar a data</a>}
          </section>
        )}

        {atv.description && (
          <section className={`${cartao} flex flex-col gap-1.5 p-4`}>
            <h2 className="m-0 text-xs font-extrabold tracking-[0.06em] uppercase text-sol-texto2">Dica da Sol</h2>
            <p className="m-0 text-[15px] leading-snug">{atv.description}</p>
          </section>
        )}
        {atv.tip && (
          <section className={`${cartao} flex flex-col gap-1.5 p-4`}>
            <h2 className="m-0 text-xs font-extrabold tracking-[0.06em] uppercase text-sol-texto2">Curiosidade</h2>
            <p className="m-0 text-[15px] leading-snug">{atv.tip}</p>
          </section>
        )}
        {aviso && <p role="status" className={`m-0 px-3.5 py-2.5 rounded-[14px] text-sm font-semibold ${aviso.tom === "ok" ? "bg-sol-ok-claro text-sol-ok-texto" : "bg-sol-sos-claro text-sol-sos"}`}>{aviso.texto}</p>}

        <div className="grid grid-cols-2 gap-2">
          {atv.mapUrl ? (
            <AbrirRota mapUrl={atv.mapUrl} />
          ) : (
            <Link to={`${voltar}&aba=mapa`} className={`${btnPrimario} no-underline`}><Route size={18} /> Ver no mapa</Link>
          )}
          {/* Trocar a atividade é da Guia Sol (RA-ROT-07): com a Guia, troca na hora, sem gerar tudo de novo */}
          {!id ? null : profile?.hasCompanion ? (
            <button type="button" disabled={trocando === "enviando"} onClick={() => setTrocando(trocando === "motivo" ? "fechado" : "motivo")} className={btnSecundario}>
              <RefreshCw size={18} className={trocando === "enviando" ? "animate-spin" : ""} /> {trocando === "enviando" ? "Trocando…" : "Trocar"}
            </button>
          ) : (
            <Link to="/app/guia/comparar" className={`${btnSecundario} no-underline`}>
              <Lock size={18} /> Trocar
            </Link>
          )}
        </div>

        {trocando === "motivo" && (
          <section className={`${cartao} flex flex-col gap-2 p-4`} aria-label="Por que trocar">
            <h2 className="m-0 text-[15px] font-extrabold">Por que você quer trocar?</h2>
            <div className="flex flex-wrap gap-2">
              {([["ja-conheco", "Já conheço"], ["caro", "Achei caro"], ["nao-gosto", "Não é meu estilo"], ["longe", "Fica longe"], ["coberto", "Quero lugar coberto"], ["outro", "Só quero outra opção"]] as const).map(([v, rot]) => (
                <button key={v} type="button" onClick={() => trocar(v)} className="min-h-[44px] px-3.5 rounded-full border-[1.5px] border-sol-borda bg-white text-sm font-bold text-sol-fundo">{rot}</button>
              ))}
            </div>
            <span className="text-xs text-sol-texto2">A Sol põe outro lugar no mesmo horário e confere no Google Maps. Leva uns 20 segundos.</span>
          </section>
        )}
        {trocando === "enviando" && <p role="status" className="m-0 text-sm text-sol-texto2">Procurando outra opção e conferindo no Google Maps…</p>}

        {id && (
          <div className={`${cartao} flex items-center gap-2 px-4 py-2.5`}>
            <span className="flex-1 text-[15px] font-semibold">O que achou desta sugestão?</span>
            <button type="button" aria-label="Gostei" aria-pressed={nota === 1} onClick={() => avaliar(1)} className={`flex-none w-12 h-12 rounded-xl border-[1.5px] flex items-center justify-center ${nota === 1 ? "bg-sol-ok border-sol-ok text-white" : "bg-white border-sol-borda text-sol-fundo"}`}><ThumbsUp size={20} /></button>
            <button type="button" aria-label="Não gostei" aria-pressed={nota === -1} onClick={() => avaliar(-1)} className={`flex-none w-12 h-12 rounded-xl border-[1.5px] flex items-center justify-center ${nota === -1 ? "bg-sol-sos border-sol-sos text-white" : "bg-white border-sol-borda text-sol-fundo"}`}><ThumbsDown size={20} /></button>
          </div>
        )}

        <button
          type="button"
          role="checkbox"
          aria-checked={feita}
          onClick={() => alternar(chaveAtividade(d, a), { atividade: atv.name, localBusca: local })}
          className={`${cartao} flex items-center gap-3 min-h-[56px] px-4 text-left`}
        >
          <span className={`flex-none w-7 h-7 rounded-lg border-2 flex items-center justify-center ${feita ? "bg-sol-ok border-sol-ok" : "bg-white border-[#6F7E83]"}`}>
            {feita && <Check size={16} strokeWidth={3} className="text-white" />}
          </span>
          <span className="text-[15px] font-semibold">{feita ? "Feita" : "Marcar como feita"}</span>
        </button>
      </div>
    </div>
  );
}
