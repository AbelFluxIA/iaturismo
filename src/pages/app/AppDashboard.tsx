import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Camera, ChevronRight, ClipboardCheck, Gift, Languages, MapPin, MessageCircle, Plus, Route, X } from "lucide-react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { useFeitas, useRoteiro, useViagens } from "@/contexts/ViagensContext";
import { BotaoSOS, Carregando, btnPrimario, cartao, formatarData } from "@/components/app/ui";
import { geocode, previsao, type PrevisaoDia } from "@/lib/geo";
import { CORES_TIPO, useSugestoes } from "@/lib/sugestoes";
import {
  ITENS_CHECKLIST, chaveAtividade, diaDaViagem, horaInicio, hojeISO, indiceDoDia, lerChecklist, nomeCurto, parseItinerary, situacao, type Viagem,
} from "@/lib/roteiro";

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
        className="flex-none w-9 h-9 -mt-1 -mr-1 flex items-center justify-center"
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
        <span className="flex-1 min-w-0 font-display font-extrabold text-[22px] leading-tight truncate">{nomeCurto(viagem.destination) || "Sua viagem"}</span>
        {andamento?.total ? (
          <span className="flex-none text-xs font-extrabold px-2.5 py-1 rounded-full bg-sol-sun text-sol-fundo">Dia {andamento.dia} de {andamento.total}</span>
        ) : sit === "proxima" && viagem.arrivalDate ? (
          <span className="flex-none text-xs font-extrabold px-2.5 py-1 rounded-full bg-white/15">{formatarData(viagem.arrivalDate)}</span>
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
          { to: `/app/roteiro/checklist?id=${encodeURIComponent(viagem.id)}`, label: "Checklist", Icon: ClipboardCheck, extra: `${checklist}/${ITENS_CHECKLIST.length}` },
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
        <Link to="/app/destinos" className="text-sm font-bold text-sol-mar underline">Ver todos</Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
        {lista === null
          ? [0, 1, 2].map((i) => <span key={i} className={`${cartao} flex-none w-[150px] h-[150px] animate-pulse`} />)
          : lista.map((d) => (
              <Link key={d.slug} to={`/app/destinos/${d.slug}`} className={`${cartao} flex-none w-[150px] p-1.5 flex flex-col gap-1 text-sol-fundo no-underline`}>
                <span className="h-[62px] rounded-xl flex items-center justify-center" style={{ background: CORES_TIPO[d.tipo] ?? "#EDE7DC" }}>
                  <MapPin size={22} className="text-sol-fundo/60" />
                </span>
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

  if ((profileLoading && !profile) || viagens === null) return <Carregando />;

  const primeiroNome = (name || profile?.name || "viajante").split(" ")[0];
  const cidade = atual?.destination || profile?.destination || "Paraíba";
  const guiaAtiva = !!profile?.hasCompanion;
  const gratis = profile?.ofertas?.gratisDuranteTeste;
  const creditos = profile?.freeCredits ?? 0;

  return (
    <div className="flex flex-col gap-3 px-5 pt-7">
      <header className="flex items-start gap-2">
        <div className="flex-1 min-w-0 flex flex-col">
          <h1 className="m-0 font-display font-extrabold text-[22px] leading-tight tracking-tight truncate">Olá, {primeiroNome}</h1>
          <span className="flex items-center gap-1 text-[13px] font-semibold text-sol-texto2 truncate">
            <MapPin size={13} strokeWidth={2.2} />{cidade}
          </span>
        </div>
        <BotaoSOS />
        <Link to="/app/perfil" aria-label="Perfil" className="flex-none w-11 h-11 rounded-full bg-sol-sun flex items-center justify-center font-display font-extrabold text-lg text-sol-fundo no-underline">
          {primeiroNome.charAt(0).toUpperCase()}
        </Link>
      </header>

      {atual && <AlertaChuva viagem={atual} />}

      <nav aria-label="Atalhos" className="grid grid-cols-3 gap-2">
        {[
          { to: "/app/tradutor", label: "Tradutor", Icon: Languages },
          { to: "/app/mural", label: "Álbum", Icon: Camera },
          { to: "/app/creditos", label: "Convide e ganhe", Icon: Gift },
        ].map(({ to, label, Icon }) => (
          <Link key={to} to={to} className={`${cartao} flex flex-col items-center justify-center gap-1 min-h-[64px] p-2 text-sol-fundo no-underline text-center`}>
            <Icon size={22} />
            <span className="text-xs font-extrabold leading-tight">{label}</span>
          </Link>
        ))}
      </nav>

      {atual ? (
        <CartaoViagem viagem={atual} />
      ) : (
        <section className={`${cartao} flex flex-col gap-2 p-[18px]`}>
          <span className="font-display font-extrabold text-[22px] leading-tight">Para onde vamos?</span>
          <p className="m-0 text-sm leading-snug text-sol-texto2">Você ainda não tem viagem marcada. Monte um roteiro em menos de 1 minuto.</p>
        </section>
      )}

      <section aria-label="Roteiros e Guia Sol" className={`${cartao} flex flex-col gap-2.5 p-4`}>
        <span className="text-[15px] font-extrabold">
          {gratis ? "Roteiros grátis durante o teste" : creditos > 0 ? `${creditos} ${creditos === 1 ? "roteiro grátis" : "roteiros grátis"} para usar` : "Monte seu próximo roteiro"}
        </span>
        <div className="grid grid-cols-2 gap-2">
          <Link to="/app/criar" className={`${btnPrimario} !min-h-[46px] !text-sm no-underline`}>
            <Plus size={18} strokeWidth={2.4} /> Criar roteiro
          </Link>
          <Link
            to="/app/guia"
            className={`flex items-center justify-center gap-1.5 min-h-[46px] px-2 rounded-[14px] text-sm font-bold no-underline ${
              guiaAtiva ? "bg-sol-ok-claro text-sol-ok-texto border-[1.5px] border-[#B9DCCB]" : "bg-sol-creme text-sol-fundo border-[1.5px] border-[#F2D98A]"
            }`}
          >
            <MessageCircle size={18} /> {guiaAtiva ? "Falar com a Guia" : "Guia Sol"}
          </Link>
        </div>
      </section>

      <ParaOndeIr />
    </div>
  );
}
