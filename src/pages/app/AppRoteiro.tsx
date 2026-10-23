import { useEffect, useState, lazy, Suspense } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import {
  Camera, Check, ChevronLeft, ChevronRight, ClipboardCheck, Download, Map as MapIcon, MapPin, MessageCircle, Pencil, Phone, Plus, Route, Share2, CloudSun,
} from "lucide-react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { useFeitas, useRoteiro, useViagens } from "@/contexts/ViagensContext";
import { BotaoSOS, Carregando, Segmentos, TituloSecao, Vazio, btnPrimario, btnSecundario, cartao, formatarData } from "@/components/app/ui";
import { EnviarFotos, GradeFotos, type GrupoAlbum, useAlbum } from "@/components/app/Album";
import type { PontoMapa } from "@/components/app/MapaRoteiro";
import { descreverTempo, geocode, previsao, queryDoMapa, rotaPelasRuas, type Coord, type PrevisaoDia } from "@/lib/geo";
import {
  ITENS_CHECKLIST, chaveAtividade, diaDaViagem, horaInicio, indiceDoDia, lerChecklist, nomeCurto, parseItinerary, rotuloDia, situacao, type Viagem,
} from "@/lib/roteiro";

const MapaRoteiro = lazy(() => import("@/components/app/MapaRoteiro"));

// /app/roteiro            → Meus roteiros (Próximos · Já feitos · Álbuns)
// /app/roteiro?id=X       → roteiro da viagem X (Dia a dia · Mapa · Álbum · Informações)
// /app/roteiro?codigo=Y   → roteiro do link "/r/Y" que a Sol manda na conversa
export default function AppRoteiro() {
  const [params] = useSearchParams();
  if (!params.get("id") && !params.get("codigo")) return <MeusRoteiros />;
  return <RoteiroDetalhe />;
}

// Botão do meio da barra: abre a viagem de agora (ou a próxima)
export function AppHoje() {
  const { viagens, atual } = useViagens();
  if (viagens === null) return <Carregando />;
  return <Navigate to={atual ? `/app/roteiro?id=${encodeURIComponent(atual.id)}` : "/app/criar"} replace />;
}

const dataCurta = (iso: string | null) => {
  if (!iso) return { mes: "", dia: "" };
  const d = new Date(`${iso}T12:00:00Z`);
  return { mes: d.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "").toUpperCase(), dia: String(d.getUTCDate()).padStart(2, "0") };
};

// ─── Meus roteiros ────────────────────────────────────────────────────────────

type AbaLista = "proximos" | "feitos" | "albuns";

function MeusRoteiros() {
  const { profile } = useClientAuth();
  const { viagens } = useViagens();
  const [params, setParams] = useSearchParams();
  const aba: AbaLista = params.get("aba") === "feitos" ? "feitos" : params.get("aba") === "albuns" ? "albuns" : "proximos";
  const trocar = (a: AbaLista) => setParams(a === "proximos" ? {} : { aba: a }, { replace: true });

  if (viagens === null) return <Carregando />;
  const agora = viagens.filter((v) => situacao(v) === "agora");
  const futuras = viagens.filter((v) => situacao(v) === "proxima").sort((a, b) => (a.arrivalDate ?? "").localeCompare(b.arrivalDate ?? ""));
  const passadas = viagens.filter((v) => situacao(v) === "passada");
  const gratis = profile?.ofertas?.gratisDuranteTeste;

  return (
    <div className="flex flex-col gap-3 px-5 pt-7">
      <header className="flex items-center gap-2">
        <h1 className="flex-1 m-0 font-display font-extrabold text-[28px] tracking-tight">Meus roteiros</h1>
        <BotaoSOS />
      </header>
      <Segmentos rotulo="Meus roteiros" valor={aba} aoMudar={trocar} opcoes={[["proximos", "Próximos"], ["feitos", "Já feitos"], ["albuns", "Álbuns"]]} />

      {aba === "proximos" && (
        <>
          <section className={`${cartao} flex flex-col gap-2.5 p-4`}>
            <span className="text-[15px] font-extrabold">
              {gratis ? "Roteiros grátis durante o teste" : `${profile?.freeCredits ?? 0} roteiros grátis para usar`}
            </span>
            <Link to="/app/criar" className={`${btnPrimario} no-underline`}><Plus size={18} strokeWidth={2.4} /> Criar roteiro</Link>
          </section>
          {agora.length > 0 && <TituloSecao>Em andamento</TituloSecao>}
          {agora.map((v) => <CartaoAndamento key={v.id} v={v} guiaAtiva={!!profile?.hasCompanion} />)}
          {futuras.length > 0 && <TituloSecao>Futuros</TituloSecao>}
          {futuras.map((v) => <CartaoData key={v.id} v={v} />)}
          {agora.length + futuras.length === 0 && (
            <p className="m-0 text-sm text-sol-texto2 text-center py-4">Nenhuma viagem marcada. Crie um roteiro para a próxima.</p>
          )}
        </>
      )}

      {aba === "feitos" && (
        passadas.length === 0 ? (
          <Vazio icone={<MapIcon size={32} />} titulo="Nenhuma viagem concluída" texto="Quando uma viagem terminar, ela aparece aqui com o roteiro e o que você marcou como feito." />
        ) : (
          <>
            <p className="m-0 text-sm text-sol-texto2">Viagens já concluídas. Toque para rever o roteiro e o que você marcou como feito.</p>
            {passadas.map((v) => <CartaoData key={v.id} v={v} passada />)}
          </>
        )
      )}

      {aba === "albuns" && <ListaAlbuns />}
    </div>
  );
}

function CartaoAndamento({ v, guiaAtiva }: { v: Viagem; guiaAtiva: boolean }) {
  const { dados } = useRoteiro(v.id);
  const { feitas } = useFeitas(v.id);
  const andamento = diaDaViagem(v.arrivalDate, v.departureDate);
  const dias = dados ? parseItinerary(dados.texto) : [];
  const di = indiceDoDia(v.arrivalDate, dias.length);
  const hoje = dias[di]?.activities ?? [];
  const feitasHoje = hoje.filter((_, i) => feitas[chaveAtividade(di, i)]).length;
  return (
    <Link to={`/app/roteiro?id=${encodeURIComponent(v.id)}`} className="flex flex-col gap-2.5 p-4 rounded-[20px] bg-sol-fundo text-white no-underline">
      <span className="flex items-center gap-2">
        <span className="flex-1 font-display font-extrabold text-[26px] leading-tight truncate">{nomeCurto(v.destination) || "Roteiro"}</span>
        {andamento?.total && <span className="flex-none text-xs font-extrabold px-2.5 py-1 rounded-full bg-sol-sun text-sol-fundo">Dia {andamento.dia} de {andamento.total}</span>}
      </span>
      <span className="text-sm text-sol-azul-suave">{[formatarData(v.arrivalDate), formatarData(v.departureDate)].filter(Boolean).join(" a ")} · {v.days} {v.days === 1 ? "dia" : "dias"}</span>
      <span className="flex items-center gap-2 pt-2.5 border-t border-white/15 text-[13px] font-bold">
        <span className="flex-1">{hoje.length ? `${feitasHoje} de ${hoje.length} atividades feitas hoje` : "Ver o roteiro"}</span>
        <span className="text-sol-azul-suave">{guiaAtiva ? "Guia Sol ativa" : "Guia Sol não ativa"}</span>
      </span>
    </Link>
  );
}

function CartaoData({ v, passada = false }: { v: Viagem; passada?: boolean }) {
  const { mes, dia } = dataCurta(v.arrivalDate);
  return (
    <Link to={`/app/roteiro?id=${encodeURIComponent(v.id)}`} className={`${cartao} flex items-center gap-3 p-3.5 text-sol-fundo no-underline ${passada ? "opacity-90" : ""}`}>
      <span className={`flex-none w-14 h-14 rounded-xl flex flex-col items-center justify-center ${passada ? "bg-[#ECEFF1] text-sol-texto2" : "bg-sol-claro text-sol-claro-texto"}`}>
        <span className="text-[11px] font-extrabold">{mes}</span>
        <span className="font-display font-extrabold text-xl leading-none">{dia}</span>
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-base font-extrabold truncate">{nomeCurto(v.destination) || "Roteiro"}</span>
        <span className="text-[13px] text-sol-texto2">{v.days} {v.days === 1 ? "dia" : "dias"}{passada ? " · já passou" : ""}</span>
      </span>
      <ChevronRight size={20} className="flex-none text-sol-texto2" />
    </Link>
  );
}

function ListaAlbuns() {
  const { album, loading } = useAlbum();
  if (loading) return <Carregando />;
  if (!album || album.total === 0) {
    return (
      <Vazio icone={<Camera size={32} />} titulo="Nenhum álbum ainda" texto="Cada viagem gera o seu álbum com as fotos que você manda para a Sol, no app ou no WhatsApp.">
        <Link to="/app/mural" className={`${btnPrimario} w-full mt-4 no-underline`}><Camera size={18} /> Mandar fotos</Link>
      </Vazio>
    );
  }
  return (
    <>
      {album.grupos.map((g) => (
        <Link key={g.inicio} to="/app/mural" className={`${cartao} flex items-center gap-3 p-2.5 text-sol-fundo no-underline`}>
          <img src={g.fotos[g.fotos.length - 1].url} alt="" className="flex-none w-16 h-16 rounded-xl object-cover bg-sol-claro" />
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="text-base font-extrabold truncate">{g.titulo}</span>
            <span className="text-[13px] text-sol-texto2">{g.fotos.length} {g.fotos.length === 1 ? "foto" : "fotos"}</span>
          </span>
          <ChevronRight size={20} className="flex-none text-sol-texto2" />
        </Link>
      ))}
    </>
  );
}

// ─── Roteiro de uma viagem ────────────────────────────────────────────────────

type Aba = "dia" | "mapa" | "album" | "info";

interface GeoPoint { lat: number; lng: number; name: string; actIndex: number }

function RoteiroDetalhe() {
  const { profile } = useClientAuth();
  const { viagens } = useViagens();
  const [params, setParams] = useSearchParams();
  const abaParam = params.get("aba");
  const aba: Aba = abaParam === "mapa" || abaParam === "album" || abaParam === "info" ? abaParam : "dia";
  const idParam = params.get("id");
  const codigo = params.get("codigo");
  const { dados, loading } = useRoteiro(idParam, codigo);
  const viagem = viagens?.find((v) => v.id === idParam) ?? null;
  const chave = idParam || codigo;
  const { feitas, alternar } = useFeitas(chave);
  const days = dados ? parseItinerary(dados.texto) : [];
  const [activeDay, setActiveDay] = useState<number | null>(null);

  const destino = dados?.destino || viagem?.destination || null;
  const chegada = dados?.chegada ?? viagem?.arrivalDate ?? null;
  const saida = dados?.saida ?? viagem?.departureDate ?? null;
  const di = activeDay ?? indiceDoDia(chegada, days.length);

  const trocarAba = (nova: Aba) => {
    const p = new URLSearchParams(params);
    if (nova === "dia") p.delete("aba"); else p.set("aba", nova);
    setParams(p, { replace: true });
  };

  if (loading) return <Carregando />;

  if (days.length === 0) {
    return (
      <div className="px-5 pt-8">
        <Link to="/app/roteiro" className="inline-flex items-center gap-1 min-h-[44px] -ml-1 text-sm font-bold text-sol-mar no-underline">
          <ChevronLeft size={20} /> Meus roteiros
        </Link>
        <Vazio icone={<MapIcon size={32} />} titulo="Roteiro não encontrado" texto="Não consegui abrir este roteiro agora. Volte para a lista ou peça à Sol para reenviar.">
          <Link to="/app/chat" className={`${btnPrimario} w-full mt-4 no-underline`}>Falar com a Sol</Link>
        </Vazio>
      </div>
    );
  }

  const dia = days[Math.min(di, days.length - 1)];
  const periodo = [formatarData(chegada), formatarData(saida)].filter(Boolean).join(" a ");
  const passou = situacao({ arrivalDate: chegada, departureDate: saida }) === "passada";

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-1 px-4 pt-7 pb-0 bg-sol-fundo text-white">
        <div className="flex items-center gap-1">
          <Link to="/app/roteiro" aria-label="Voltar para Meus roteiros" className="flex-none flex items-center justify-center w-12 h-12 -ml-2 text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="flex-1 min-w-0 m-0 font-display font-extrabold text-[26px] tracking-tight truncate">{nomeCurto(destino) || "Seu roteiro"}</h1>
          <BotaoSOS claro />
        </div>
        <span className="text-[13px] text-sol-azul-suave pl-1 pb-2">
          {periodo || "Datas a confirmar"} · {days.length} {days.length === 1 ? "dia" : "dias"}
        </span>
        <nav aria-label="Seções do roteiro" className="grid grid-cols-4 -mx-4 px-1">
          {([["dia", "Dia a dia"], ["mapa", "Mapa"], ["album", "Álbum"], ["info", "Informações"]] as [Aba, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={aba === id ? "page" : undefined}
              onClick={() => trocarAba(id)}
              className={`min-h-[48px] text-[13px] border-b-4 ${aba === id ? "font-extrabold text-white border-sol-sun" : "font-semibold text-sol-azul-suave border-transparent"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex flex-col gap-3 px-5 pt-3">
        {(aba === "dia" || aba === "mapa") && (
          <div className="flex items-center gap-2">
            <div role="tablist" aria-label="Dias" className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {days.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === di}
                  onClick={() => setActiveDay(i)}
                  className={`flex-none min-w-[76px] min-h-[44px] px-3 rounded-full text-[13px] font-extrabold border-[1.5px] ${
                    i === di ? "bg-sol-fundo text-white border-sol-fundo" : "bg-white text-sol-fundo border-sol-borda"
                  }`}
                >
                  {rotuloDia(chegada, i, d.label)}
                </button>
              ))}
            </div>
            <span className="ml-auto flex-none text-[13px] font-bold text-sol-texto2">
              {dia.activities.filter((_, ai) => feitas[chaveAtividade(di, ai)]).length} de {dia.activities.length} feitas
            </span>
          </div>
        )}

        {aba === "dia" && (
          <>
            <ol className="m-0 p-0 list-none flex flex-col gap-1.5">
              {dia.activities.map((act, ai) => {
                const feita = !!feitas[chaveAtividade(di, ai)];
                return (
                  <li key={ai} className="flex items-center gap-1 rounded-[14px] bg-white border border-sol-linha pr-2">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={feita}
                      aria-label={`Marcar como feito: ${act.name}`}
                      onClick={() => alternar(chaveAtividade(di, ai))}
                      className="flex-none w-12 h-[56px] flex items-center justify-center"
                    >
                      <span className={`w-6 h-6 rounded-[7px] border-2 flex items-center justify-center ${feita ? "bg-sol-ok border-sol-ok" : "bg-white border-[#6F7E83]"}`}>
                        {feita && <Check size={14} strokeWidth={3} className="text-white" />}
                      </span>
                    </button>
                    <Link
                      to={`/app/roteiro/atividade?${chave === idParam ? "id" : "codigo"}=${encodeURIComponent(chave ?? "")}&d=${di}&a=${ai}`}
                      className="flex-1 min-w-0 flex items-center gap-2.5 min-h-[56px] text-sol-fundo no-underline"
                    >
                      <span className="flex-none w-12 font-display font-extrabold text-[15px]">{horaInicio(act)}</span>
                      <span className="flex-1 min-w-0 flex flex-col gap-px">
                        <span className={`text-[15px] font-bold leading-tight ${feita ? "line-through text-sol-texto2" : ""}`}>{act.name}</span>
                        {act.travel && <span className="text-xs text-sol-texto2 truncate">{act.travel}</span>}
                      </span>
                      <ChevronRight size={18} className="flex-none text-sol-texto2" />
                    </Link>
                  </li>
                );
              })}
            </ol>

            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: "Checklist", Icon: ClipboardCheck, to: `/app/roteiro/checklist?id=${encodeURIComponent(chave ?? "")}` },
                { label: "Rota", Icon: Route, onClick: () => trocarAba("mapa") },
                { label: "Foto", Icon: Camera, onClick: () => trocarAba("album") },
                { label: "Enviar", Icon: Share2, onClick: () => compartilharDia(destino, rotuloDia(chegada, di, dia.label), dia.activities.map((a) => `${horaInicio(a)} ${a.name}`), dados?.pdfUrl) },
                { label: "Alterar", Icon: Pencil, to: `/app/chat?texto=${encodeURIComponent(`Quero alterar meu roteiro de ${destino ?? "viagem"}: `)}` },
              ].map(({ label, Icon, to, onClick }) => {
                const classe = `${cartao} flex flex-col items-center justify-center gap-1 min-h-[60px] text-[12px] font-bold text-sol-fundo no-underline`;
                return to
                  ? <Link key={label} to={to} className={classe}><Icon size={20} />{label}</Link>
                  : <button key={label} type="button" onClick={onClick} className={classe}><Icon size={20} />{label}</button>;
              })}
            </div>

            {!profile?.hasCompanion && !passou && (
              <Link to="/app/guia" className="flex flex-col gap-1.5 p-4 rounded-[18px] bg-sol-sun text-sol-fundo no-underline">
                <span className="flex items-center gap-3">
                  <span className="flex-none w-11 h-11 rounded-xl bg-sol-fundo text-sol-sun flex items-center justify-center"><MessageCircle size={22} /></span>
                  <span className="flex-1 flex flex-col">
                    <span className="font-display font-extrabold text-lg leading-tight">Ative a Guia Sol</span>
                    <span className="text-[13px] font-bold">{profile?.ofertas?.guiaPreco ?? "Acompanhamento na viagem"}</span>
                  </span>
                  <span className="flex-none px-4 py-2.5 rounded-xl bg-sol-fundo text-white text-sm font-extrabold">Ativar</span>
                </span>
                <span className="text-[13px] leading-snug">Ajuda em tempo real no caminho: o que tem por perto, o que está aberto e o dia reorganizado se chover.</span>
              </Link>
            )}
          </>
        )}

        {aba === "mapa" && (
          <AbaMapa
            destino={destino}
            atividades={dia.activities}
            estado={(ai) => (feitas[chaveAtividade(di, ai)] ? "feita" : ai === dia.activities.findIndex((_, i) => !feitas[chaveAtividade(di, i)]) ? "proxima" : "depois")}
            chaveDia={`${chave}-${di}`}
          />
        )}

        {aba === "album" && <AbaAlbum chegada={chegada} saida={saida} />}

        {aba === "info" && <AbaInfo destino={destino} chegada={chegada} saida={saida} pdfUrl={dados?.pdfUrl ?? null} chave={chave} />}
      </div>
    </div>
  );
}

async function compartilharDia(destino: string | null, dia: string, itens: string[], pdf?: string | null) {
  const texto = `Meu roteiro em ${destino ?? "viagem"} · ${dia}\n${itens.join("\n")}${pdf ? `\n\nRoteiro completo: ${pdf}` : ""}\n\nMontado pela Sol ☀️`;
  try {
    if (navigator.share) { await navigator.share({ text: texto }); return; }
  } catch { return; }
  try { await navigator.clipboard.writeText(texto); alert("Roteiro do dia copiado."); } catch { /* sem área de transferência */ }
}

// ─── Mapa do dia ──────────────────────────────────────────────────────────────

function AbaMapa({ destino, atividades, estado, chaveDia }: {
  destino: string | null;
  atividades: ReturnType<typeof parseItinerary>[number]["activities"];
  estado: (ai: number) => PontoMapa["estado"];
  chaveDia: string;
}) {
  const [pontos, setPontos] = useState<GeoPoint[]>([]);
  const [rota, setRota] = useState<[number, number][]>([]);
  const [centro, setCentro] = useState<Coord | null>(null);
  const [buscando, setBuscando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setBuscando(true);
    setPontos([]);
    setRota([]);
    if (destino) geocode(destino).then((c) => { if (!cancelado && c) setCentro(c); });
    (async () => {
      const pts: GeoPoint[] = [];
      for (const [ai, act] of atividades.entries()) {
        const q = act.mapUrl ? queryDoMapa(act.mapUrl) : null;
        if (!q) continue;
        const pt = await geocode(q);
        if (cancelado) return;
        if (pt) { pts.push({ ...pt, name: act.name, actIndex: ai }); setPontos([...pts]); }
      }
      setBuscando(false);
      if (pts.length >= 2) {
        const r = await rotaPelasRuas(pts);
        if (!cancelado) setRota(r);
      }
    })();
    return () => { cancelado = true; };
  }, [chaveDia]); // eslint-disable-line react-hooks/exhaustive-deps

  const proxima = atividades.findIndex((_, ai) => estado(ai) === "proxima");
  return (
    <>
      <div className="relative -mx-5 overflow-hidden bg-[#E6EEE9]" style={{ height: 400 }}>
        <Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-sol-texto2">Carregando o mapa...</div>}>
          <MapaRoteiro
            pontos={pontos.map((pt, i): PontoMapa => ({ lat: pt.lat, lng: pt.lng, nome: pt.name, numero: i + 1, estado: estado(pt.actIndex) }))}
            rota={rota}
            centro={centro}
          />
        </Suspense>
        {buscando && (
          <div className="absolute left-3 top-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 text-xs font-bold text-sol-texto2 shadow">
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-sol-mar" />
            Localizando os lugares do dia...
          </div>
        )}
        {!buscando && pontos.length === 0 && (
          <div className="absolute left-3 right-16 top-3 z-10 px-3 py-2 rounded-xl bg-white/95 text-xs text-sol-texto2 shadow">
            Não achei os lugares deste dia no mapa. Use "Ver rota" em cada atividade.
          </div>
        )}
      </div>
      {proxima >= 0 && (
        <>
          <h2 className="m-0 text-base font-extrabold">Próxima parada</h2>
          <div className="flex gap-3 items-center p-3.5 rounded-2xl bg-white border-[1.5px] border-sol-fundo">
            <span className="flex-none w-9 h-9 rounded-full bg-sol-sun flex items-center justify-center font-extrabold">
              {(pontos.findIndex((p) => p.actIndex === proxima) + 1) || "•"}
            </span>
            <span className="flex-1 flex flex-col gap-0.5">
              <span className="text-base font-bold">{atividades[proxima].name}</span>
              <span className="text-sm text-sol-texto2">{atividades[proxima].time}{atividades[proxima].travel ? ` · ${atividades[proxima].travel}` : ""}</span>
            </span>
          </div>
          {atividades[proxima].mapUrl && (
            <a href={atividades[proxima].mapUrl} target="_blank" rel="noopener noreferrer" className={`${btnPrimario} no-underline`}>
              <MapPin size={18} /> Abrir rota no navegador
            </a>
          )}
        </>
      )}
      <div className="flex flex-wrap gap-3.5 text-[13px] text-sol-texto2">
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-sol-ok" />Feita</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-sol-sun border-2 border-sol-fundo" />Próxima</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-sol-fundo" />Depois</span>
      </div>
    </>
  );
}

// ─── Álbum desta viagem ───────────────────────────────────────────────────────

function AbaAlbum({ chegada, saida }: { chegada: string | null; saida: string | null }) {
  const { album, loading, recarregar } = useAlbum();
  if (loading) return <Carregando />;
  // Fotos tiradas entre a véspera da chegada e o dia seguinte à saída
  const ini = chegada ? new Date(`${chegada}T00:00:00-03:00`).getTime() - 86400000 : -Infinity;
  const fim = (saida || chegada) ? new Date(`${saida || chegada}T23:59:59-03:00`).getTime() + 86400000 : Infinity;
  const fotos = (album?.grupos ?? []).flatMap((g: GrupoAlbum) => g.fotos).filter((f) => {
    const t = new Date(f.data).getTime();
    return t >= ini && t <= fim;
  });
  return (
    <>
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-base font-extrabold">Álbum desta viagem</h2>
        <span className="text-[13px] text-sol-texto2">{fotos.length} {fotos.length === 1 ? "foto" : "fotos"}</span>
      </div>
      <EnviarFotos aoTerminar={recarregar} />
      {fotos.length > 0 ? (
        <GradeFotos fotos={fotos} />
      ) : (
        <p className="m-0 text-sm text-sol-texto2 text-center py-3">Ainda não há fotos desta viagem. As fotos que você manda para a Sol aparecem aqui.</p>
      )}
      <Link to="/app/mural" className={`${btnSecundario} no-underline`}>Ver todas as fotos e o mural</Link>
    </>
  );
}

// ─── Informações ──────────────────────────────────────────────────────────────

const TELEFONES = [
  ["190", "Polícia"], ["192", "SAMU"], ["193", "Bombeiros"], ["199", "Defesa Civil"],
] as const;

function AbaInfo({ destino, chegada, saida, pdfUrl, chave }: { destino: string | null; chegada: string | null; saida: string | null; pdfUrl: string | null; chave: string | null }) {
  const [tempo, setTempo] = useState<PrevisaoDia[] | null>(null);
  const [checklist] = useState(() => lerChecklist(chave).filter(Boolean).length);
  useEffect(() => {
    if (!destino) return;
    geocode(destino).then(async (c) => { if (c) setTempo(await previsao(c, 7)); });
  }, [destino]);
  const naViagem = (tempo ?? []).filter((d) => (!chegada || d.data >= chegada) && (!saida || d.data <= saida));
  const mostrar = naViagem.length ? naViagem : (tempo ?? []).slice(0, 3);

  return (
    <>
      <TituloSecao>Previsão do tempo</TituloSecao>
      <div className={`${cartao} flex flex-col divide-y divide-[#F0E9DD]`}>
        {tempo === null ? (
          <span className="p-3.5 text-sm text-sol-texto2">Buscando a previsão...</span>
        ) : mostrar.length === 0 ? (
          <span className="p-3.5 text-sm text-sol-texto2">Previsão disponível até 7 dias antes da viagem.</span>
        ) : (
          mostrar.map((d) => (
            <span key={d.data} className="flex items-center gap-3 px-3.5 py-2.5">
              <CloudSun size={20} className="flex-none text-sol-mar" />
              <span className="flex-none w-16 text-sm font-bold">{formatarData(d.data, { weekday: "short", day: "2-digit" })}</span>
              <span className="flex-1 text-sm">{descreverTempo(d)}</span>
            </span>
          ))
        )}
      </div>
      <span className="text-xs text-sol-texto2 -mt-1">Fonte: Open-Meteo · {destino}</span>

      <TituloSecao>Telefones úteis</TituloSecao>
      <div className="grid grid-cols-2 gap-2">
        {TELEFONES.map(([n, nome]) => (
          <a key={n} href={`tel:${n}`} className={`${cartao} flex items-center gap-2.5 min-h-[56px] px-3.5 text-sol-fundo no-underline`}>
            <Phone size={18} className="text-sol-sos" />
            <span className="flex flex-col"><span className="font-display font-extrabold text-lg leading-none">{n}</span><span className="text-xs text-sol-texto2">{nome}</span></span>
          </a>
        ))}
      </div>

      <TituloSecao>Este roteiro</TituloSecao>
      <div className={`${cartao} flex flex-col overflow-hidden`}>
        <Link to={`/app/roteiro/checklist?id=${encodeURIComponent(chave ?? "")}`} className="flex items-center gap-3 min-h-[52px] px-4 border-b border-[#F0E9DD] text-sol-fundo no-underline">
          <ClipboardCheck size={20} /><span className="flex-1 text-[15px] font-semibold">Checklist da viagem</span>
          <span className="text-sm text-sol-texto2">{checklist}/{ITENS_CHECKLIST.length}</span><ChevronRight size={18} className="text-sol-texto2" />
        </Link>
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 min-h-[52px] px-4 border-b border-[#F0E9DD] text-sol-fundo no-underline">
            <Download size={20} /><span className="flex-1 text-[15px] font-semibold">Baixar o PDF do roteiro</span><ChevronRight size={18} className="text-sol-texto2" />
          </a>
        )}
        <Link to={`/app/chat?texto=${encodeURIComponent(`Quero alterar meu roteiro de ${destino ?? "viagem"}: `)}`} className="flex items-center gap-3 min-h-[52px] px-4 text-sol-fundo no-underline">
          <Pencil size={20} /><span className="flex-1 text-[15px] font-semibold">Pedir alteração à Sol</span><ChevronRight size={18} className="text-sol-texto2" />
        </Link>
      </div>
    </>
  );
}
