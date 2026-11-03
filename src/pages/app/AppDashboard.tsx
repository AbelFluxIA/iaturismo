import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Camera, ChevronRight, ClipboardCheck, Gift, Languages, Lock, MapPin, MessageCircle, Navigation, Plus, Route, X } from "lucide-react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { useFeitas, useRoteiro, useViagens } from "@/contexts/ViagensContext";
import { BotaoSOS, Carregando, btnSecundario, cartao, formatarData } from "@/components/app/ui";
import { IconeTempo } from "@/components/app/IconeTempo";
import { useAlbum } from "@/components/app/Album";
import { useCidade } from "@/lib/cidade";
import { useLocalizacaoEmUso } from "@/lib/localizacao";
import { geocode, previsao, tempoAgora, type PrevisaoDia, type TempoAgora } from "@/lib/geo";
import { useSugestoes } from "@/lib/sugestoes";
import { ImagemLugar } from "@/components/app/ImagemLugar";
import {
  itensChecklist, chaveAtividade, diaDaViagem, horaInicio, hojeISO, indiceDoDia, lerChecklist, nomeCurto, parseItinerary, situacao, type Viagem,
} from "@/lib/roteiro";

// "Faltam 5 dias" até a chegada (cartão da próxima viagem, RA-NAV-05)
function faltam(chegada: string) {
  const um = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  const n = Math.round((um(chegada) - um(hojeISO())) / 86400000);
  return n <= 1 ? "Amanhã" : `Faltam ${n} dias`;
}

// Alerta de chuva forte na viagem (previsão Open-Meteo), que a pessoa pode fechar
function AlertaChuva({ viagem }: { viagem: Viagem }) {
  const chave = `sol_alerta_fechado_${viagem.id}_${hojeISO()}`;
  const [fechado, setFechado] = useState(() => { try { return sessionStorage.getItem(chave) === "1"; } catch { return false; } });
  const [dia, setDia] = useState<PrevisaoDia | null>(null);

  useEffect(() => {
    if (fechado || !viagem.destination) return;
    let cancelado = false;
    geocode(viagem.destination).then(async (c) => {
      if (!c) return;
      const p = await previsao(c, 3);
      const fim = viagem.departureDate ?? viagem.arrivalDate ?? "";
      const forte = p?.find((d) => d.chuva >= 70 && d.data >= hojeISO() && (!fim || d.data <= fim));
      if (!cancelado && forte) setDia(forte);
    });
    return () => { cancelado = true; };
  }, [viagem.destination, viagem.departureDate, viagem.arrivalDate, fechado]);

  if (fechado || !dia) return null;
  const quando = dia.data === hojeISO() ? "hoje" : `em ${formatarData(dia.data)}`;
  return (
    <div role="status" className="flex items-start gap-2.5 px-3.5 py-3 rounded-2xl bg-sol-atencao border-[1.5px] border-sol-atencao-borda text-sol-atencao-texto">
      <AlertTriangle size={20} className="flex-none mt-0.5" />
      <span className="flex-1 text-sm leading-snug">
        <strong>Previsão · chuva</strong> {dia.chuva}% de chance de chuva {quando} em {nomeCurto(viagem.destination)}.
        <span className="block text-xs opacity-80">Fonte: Open-Meteo</span>
      </span>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={() => { setFechado(true); try { sessionStorage.setItem(chave, "1"); } catch { /* ok */ } }}
        className="flex-none w-11 h-11 -mt-2 -mr-2 flex items-center justify-center"
      >
        <X size={18} />
      </button>
    </div>
  );
}

function CartaoViagem({ viagem }: { viagem: Viagem }) {
  const { dados, loading } = useRoteiro(viagem.id);
  const { feitas } = useFeitas(viagem.id);
  const [checklist] = useState(() => lerChecklist(viagem.id).filter(Boolean).length);
  const sit = situacao(viagem);
  const andamento = diaDaViagem(viagem.arrivalDate, viagem.departureDate);
  const dias = dados ? parseItinerary(dados.texto) : [];
  const di = indiceDoDia(viagem.arrivalDate, dias.length);
  const dia = dias[di];
  const ai = dia ? dia.activities.findIndex((_, i) => !feitas[chaveAtividade(di, i)]) : -1;
  const proxima = dia && ai >= 0 ? dia.activities[ai] : null;
  const base = `/app/roteiro?id=${encodeURIComponent(viagem.id)}`;

  return (
    <section aria-label="Sua viagem" className="flex flex-col gap-3 p-4 rounded-[20px] bg-sol-fundo text-white">
      <Link to={base} className="flex items-center gap-2 text-white no-underline">
        <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-sol-azul-suave">{sit === "agora" ? "Viagem atual" : "Próxima viagem"}</span>
        <span className="flex-1 min-w-0 font-display font-extrabold text-[18px] leading-tight truncate">{nomeCurto(viagem.destination) || "Sua viagem"}</span>
        {andamento?.total ? (
          <span className="flex-none text-xs font-extrabold px-2.5 py-1 rounded-full bg-sol-sun text-sol-fundo">Dia {andamento.dia} de {andamento.total}</span>
        ) : sit === "proxima" && viagem.arrivalDate ? (
          <span className="flex-none text-xs font-extrabold px-2.5 py-1 rounded-full bg-white/15">{faltam(viagem.arrivalDate)}</span>
        ) : null}
      </Link>

      {loading ? (
        <div className="h-10 rounded-xl bg-white/10 animate-pulse" />
      ) : proxima ? (
        <Link to={`/app/roteiro/atividade?id=${encodeURIComponent(viagem.id)}&d=${di}&a=${ai}`} className="flex items-center gap-3 text-white no-underline">
          <span className="flex-none font-display font-extrabold text-lg text-sol-sun">{horaInicio(proxima)}</span>
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="text-[15px] font-bold leading-tight">{proxima.name}</span>
            <span className="text-[13px] text-sol-azul-suave truncate">{proxima.travel ? `Próximo passo · ${proxima.travel}` : sit === "agora" ? "Próximo passo" : "Primeira parada"}</span>
          </span>
          <ChevronRight size={20} className="flex-none" />
        </Link>
      ) : (
        <Link to={base} className="flex items-center gap-2 text-white no-underline text-sm font-bold">
          <span className="flex-1">{dia ? "Tudo feito por hoje. Veja o roteiro completo" : "Ver o roteiro dia a dia"}</span>
          <ChevronRight size={20} />
        </Link>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        {[
          { to: `${base}&aba=mapa`, label: "Mapa", Icon: Route },
          { to: "/app/mural", label: "Foto", Icon: Camera },
          { to: `/app/roteiro/checklist?id=${encodeURIComponent(viagem.id)}`, label: "Checklist", Icon: ClipboardCheck, extra: `${checklist}/${itensChecklist(viagem).itens.length}` },
        ].map(({ to, label, Icon, extra }) => (
          <Link key={label} to={to} className="flex items-center justify-center gap-1 min-h-[46px] px-1 rounded-xl bg-white/10 text-white text-[13px] font-bold no-underline whitespace-nowrap">
            <Icon size={18} className="flex-none text-sol-sun" />
            {label}
            {extra && <span className="text-xs font-semibold text-sol-azul-suave">{extra}</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}

function ParaOndeIr() {
  const { base, lista, recomendado } = useSugestoes();
  return (
    <section aria-label="Para onde ir" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 font-display font-extrabold text-[22px]">Para onde ir</h2>
        <Link to="/app/destinos" className="inline-flex items-center min-h-[44px] text-sm font-bold text-sol-mar underline">Ver todos</Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
        {lista === null
          ? [0, 1, 2].map((i) => <span key={i} className={`${cartao} flex-none w-[150px] h-[150px] animate-pulse`} />)
          : lista.map((d) => (
              <Link key={d.slug} to={`/app/destinos/${d.slug}`} className={`${cartao} flex-none w-[150px] p-1.5 flex flex-col gap-1 text-sol-fundo no-underline`}>
                <ImagemLugar nome={d.nome} uf={d.uf} tipo={d.tipo} className="h-[84px] rounded-xl" />
                <span className="px-1 text-[15px] font-extrabold leading-tight truncate">{d.nome}</span>
                <span className="px-1 text-xs text-sol-texto2">{d.km === null ? d.tipo : d.km < 2 ? `aqui · ${d.tipo.toLowerCase()}` : `${d.km} km · ${d.tipo.toLowerCase()}`}</span>
                {d.motivo && <span className="self-start mx-1 mb-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-sol-claro text-sol-claro-texto">Combina com você</span>}
              </Link>
            ))}
      </div>
      {lista !== null && (
        <p className="m-0 text-xs text-sol-texto2">
          {recomendado ? `Escolhidos pela Sol para você, perto de ${base}.` : "Sugestões gerais da Paraíba."}
        </p>
      )}
    </section>
  );
}

export default function AppDashboard() {
  const { profile, profileLoading, name } = useClientAuth();
  const { viagens, atual } = useViagens();
  const localizacaoEmUso = useLocalizacaoEmUso();

  if ((profileLoading && !profile) || viagens === null) return <Carregando />;

  const primeiroNome = (name || profile?.name || "viajante").split(" ")[0];
  const guiaAtiva = !!profile?.hasCompanion;
  const gratis = profile?.ofertas?.gratisDuranteTeste;
  const regras = profile?.regras;
  const passada = !atual ? (viagens ?? []).find((v) => situacao(v) === "passada") ?? null : null;

  return (
    <div className="flex flex-col gap-3 px-5 pt-7">
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <h1 className="flex-1 min-w-0 m-0 font-display font-extrabold text-[24px] leading-tight tracking-tight truncate">Olá, {primeiroNome}</h1>
          <BotaoSOS />
          <Link to="/app/perfil" aria-label="Perfil" className="flex-none w-11 h-11 rounded-full bg-sol-sun flex items-center justify-center font-display font-extrabold text-lg text-sol-fundo no-underline">
            {primeiroNome.charAt(0).toUpperCase()}
          </Link>
        </div>
        <CidadeETempo />
        {localizacaoEmUso && (
          <Link to="/app/localizacao" className="self-start flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-sol-ok-claro text-sol-ok-texto text-xs font-bold no-underline">
            <Navigation size={12} className="fill-current" /> Localização da viagem ligada
          </Link>
        )}
      </header>

      {atual && <AlertaChuva viagem={atual} />}

      <nav aria-label="Atalhos" className="grid grid-cols-3 gap-2">
        {[
          { to: "/app/tradutor", label: "Tradutor", Icon: Languages, cadeado: !guiaAtiva },
          { to: "/app/mural", label: "Álbum", Icon: Camera, cadeado: false },
          { to: "/app/creditos", label: "Convide e ganhe", Icon: Gift, cadeado: false },
        ].map(({ to, label, Icon, cadeado }) => (
          <Link key={to} to={to} className={`${cartao} relative flex flex-col items-center justify-center gap-1 min-h-[64px] p-2 text-sol-fundo no-underline text-center`}>
            {cadeado && <span className="absolute top-1.5 right-1.5 w-[22px] h-[22px] rounded-full bg-sol-sun flex items-center justify-center" aria-label="Só com a Guia Sol"><Lock size={12} strokeWidth={2.6} /></span>}
            <Icon size={22} />
            <span className="text-xs font-extrabold leading-tight">{label}</span>
          </Link>
        ))}
      </nav>

      {atual ? (
        <CartaoViagem viagem={atual} />
      ) : passada ? (
        <section className={`${cartao} flex flex-col gap-2.5 p-[18px]`}>
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-sol-texto2">Última viagem</span>
          <span className="font-display font-extrabold text-[22px] leading-tight">{nomeCurto(passada.destination) || "Sua viagem"}</span>
          <div className="grid grid-cols-2 gap-2">
            <Link to={`/app/roteiro?id=${encodeURIComponent(passada.id)}`} className={`${btnSecundario} !min-h-[44px] !text-sm no-underline`}>Rever roteiro</Link>
            <Link to="/app/mural" className={`${btnSecundario} !min-h-[44px] !text-sm no-underline`}>Ver fotos</Link>
          </div>
        </section>
      ) : (
        <section className={`${cartao} flex flex-col gap-2 p-[18px]`}>
          <span className="font-display font-extrabold text-[22px] leading-tight">Para onde vamos?</span>
          <p className="m-0 text-sm leading-snug text-sol-texto2">Você ainda não tem viagem marcada. Monte um roteiro em menos de 1 minuto.</p>
        </section>
      )}

      <section aria-label="Roteiros e Guia Sol" className={`${cartao} flex flex-col gap-3 p-4`}>
        <div className="flex items-center gap-3">
          <span className="flex-1 text-[14px] leading-snug">
            {profile?.cota
              ? <><strong>{Math.min(profile.cota.usados, profile.cota.limite)} de {profile.cota.limite} {guiaAtiva ? "roteiros" : "grátis"}</strong> · renova domingo, 21h{gratis ? <span className="block text-xs text-sol-texto2">Durante o teste, sem cobrança</span> : null}</>
              : gratis
                ? <><strong>Roteiros grátis</strong> durante o teste</>
                : regras
                  ? <><strong>{regras.roteirosGratisSemana} grátis por semana</strong> · renova domingo, 21h</>
                  : <strong>Monte seu próximo roteiro</strong>}
          </span>
          <Link to="/app/criar" className="flex-none flex items-center gap-1.5 min-h-[44px] px-4 rounded-[14px] border-[1.5px] border-sol-mar text-sol-mar text-sm font-extrabold no-underline">
            <Plus size={18} strokeWidth={2.4} /> Criar
          </Link>
        </div>
        <Link
          to="/app/guia"
          className={`flex items-center gap-3 min-h-[56px] px-4 rounded-[14px] no-underline ${guiaAtiva ? "bg-sol-ok-claro text-sol-ok-texto" : "bg-sol-sun text-sol-fundo"}`}
        >
          <MessageCircle size={22} className="flex-none" />
          <span className="flex-1 flex flex-col">
            <span className="text-[16px] font-extrabold leading-tight">{guiaAtiva ? "Guia Sol ativa" : "Contratar Guia Sol"}</span>
            <span className="text-[13px] font-semibold">{guiaAtiva ? "Falar com a Guia" : profile?.ofertas?.guiaPreco ?? "Uma guia em tempo real na viagem"}</span>
          </span>
          <ChevronRight size={20} className="flex-none" />
        </Link>
      </section>

      <MuralDeViagens />

      <ParaOndeIr />
    </div>
  );
}

// Cidade do cabeçalho e o tempo de agora (abre a previsão)
function CidadeETempo() {
  const cidade = useCidade();
  const [agora, setAgora] = useState<TempoAgora | null>(null);
  useEffect(() => { if (cidade.coord) tempoAgora(cidade.coord).then(setAgora); }, [cidade.coord?.lat, cidade.coord?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 min-w-0 flex items-center gap-1.5 text-[14px] font-semibold text-sol-texto2 truncate">
        {cidade.origem === "posicao" ? <Navigation size={13} strokeWidth={2.4} className="flex-none fill-current" /> : <MapPin size={14} strokeWidth={2.2} className="flex-none" />}
        {cidade.carregando ? "…" : cidade.nome ? nomeCurto(cidade.nome) : "Escolher cidade"}
      </span>
      {agora && (
        <Link to="/app/tempo" aria-label={`Tempo agora: ${agora.temp} graus. Ver a previsão`} className="flex-none flex items-center gap-1.5 h-11 px-3 rounded-full bg-white border border-sol-linha text-sol-fundo text-[15px] font-extrabold no-underline">
          <IconeTempo codigo={agora.codigo} size={18} className="text-sol-mar" />{agora.temp}°
        </Link>
      )}
    </div>
  );
}

// Faixa com as últimas fotos do álbum
function MuralDeViagens() {
  const { album } = useAlbum();
  const fotos = (album?.grupos ?? []).flatMap((g) => g.fotos).slice(-3).reverse();
  if (!fotos.length) return null;
  return (
    <section aria-label="Mural de viagens" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 font-display font-extrabold text-[22px]">Mural de viagens</h2>
        <Link to="/app/mural" className="inline-flex items-center min-h-[44px] text-sm font-bold text-sol-mar underline">Ver mural</Link>
      </div>
      <Link to="/app/mural" className="grid grid-cols-3 gap-1.5 no-underline">
        {fotos.map((f) => <img key={f.url} src={f.url} alt="" className="w-full aspect-square object-cover rounded-xl bg-sol-claro" />)}
      </Link>
      <span className="text-[13px] text-sol-texto2">{album?.total} {album?.total === 1 ? "foto" : "fotos"} das suas viagens</span>
    </section>
  );
}
