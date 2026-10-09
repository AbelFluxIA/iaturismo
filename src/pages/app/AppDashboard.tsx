import { Link } from "react-router-dom";
import { MapPin, Map, Camera, MessageCircle, Gift, Plus, ChevronRight } from "lucide-react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Carregando, btnPrimario, cartao, formatarData } from "@/components/app/ui";

// Dia atual da viagem (1-based) ou null se fora do período.
function diaDaViagem(chegada: string | null, partida: string | null) {
  if (!chegada) return null;
  const hoje = new Date();
  const inicio = new Date(chegada);
  const dia = Math.floor((Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()) - inicio.getTime()) / 86400000) + 1;
  if (dia < 1) return null;
  if (partida) {
    const total = Math.floor((new Date(partida).getTime() - inicio.getTime()) / 86400000) + 1;
    if (dia > total) return null;
    return { dia, total };
  }
  return { dia, total: null };
}

export default function AppDashboard() {
  const { profile, profileLoading, name } = useClientAuth();

  if (profileLoading && !profile) return <Carregando />;

  const primeiroNome = (name || profile?.name || "viajante").split(" ")[0];
  const temViagem = !!profile?.destination;
  const temRoteiro = !!profile?.itinerary;
  const andamento = diaDaViagem(profile?.arrivalDate ?? null, profile?.departureDate ?? null);
  const periodo = [formatarData(profile?.arrivalDate), formatarData(profile?.departureDate)].filter(Boolean).join(" a ");

  return (
    <div className="flex flex-col gap-2.5 px-5 pt-8">
      <div className="flex items-baseline gap-2 min-w-0">
        <h1 className="m-0 font-display font-extrabold text-[22px] tracking-tight whitespace-nowrap">Olá, {primeiroNome}</h1>
        {temViagem && (
          <span className="flex items-center gap-1 min-w-0 text-xs font-semibold text-sol-texto2 truncate">
            <MapPin size={12} strokeWidth={2.2} />
            {profile!.destination}
          </span>
        )}
      </div>

      {temViagem ? (
        <section aria-label="Sua viagem" className="flex flex-col gap-2 px-3.5 py-3 rounded-2xl bg-sol-fundo text-white">
          <Link to="/app/roteiro" className="flex flex-col gap-1.5 text-white no-underline">
            <span className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-sol-azul-suave">
                {andamento ? "Viagem atual" : "Sua viagem"}
              </span>
              <span className="flex-1 font-display font-extrabold text-xl truncate">{profile!.destination}</span>
              {andamento?.total && (
                <span className="text-xs font-extrabold px-2.5 py-[3px] rounded-full bg-sol-sun text-sol-fundo">
                  Dia {andamento.dia} de {andamento.total}
                </span>
              )}
            </span>
            <span className="flex items-center gap-2.5">
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-sm font-bold">{temRoteiro ? "Ver o roteiro dia a dia" : "Roteiro ainda não gerado"}</span>
                <span className="text-xs text-sol-azul-suave">
                  {periodo || "Datas a confirmar"}
                  {profile?.itinerary?.days ? ` · ${profile.itinerary.days} ${profile.itinerary.days === 1 ? "dia" : "dias"}` : ""}
                </span>
              </span>
              <ChevronRight size={18} />
            </span>
          </Link>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { to: "/app/roteiro?aba=mapa", label: "Mapa", Icon: Map },
              { to: "/app/mural", label: "Álbum", Icon: Camera },
              { to: "/app/chat", label: "Conversar", Icon: MessageCircle },
            ].map(({ to, label, Icon }) => (
              <Link key={label} to={to} className="flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl bg-sol-fundo-2 text-white text-[13px] font-bold no-underline">
                <Icon size={18} className="text-sol-sun" />
                {label}
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className={`${cartao} flex flex-col gap-2.5 p-[18px]`}>
          <span className="font-display font-extrabold text-[22px] leading-tight">Para onde vamos?</span>
          <p className="m-0 text-sm leading-snug text-sol-texto2">
            Você ainda não tem viagem. Conte para a Sol para onde vai e ela monta um roteiro verificado para você.
          </p>
          <Link to="/app/chat" className={btnPrimario}>
            <Plus size={18} strokeWidth={2.2} />
            Pedir meu roteiro
          </Link>
        </section>
      )}

      {profile?.hasCompanion ? (
        <section aria-label="Guia Sol ativa" className="flex flex-col gap-2.5 px-4 py-3.5 rounded-2xl bg-sol-ok-claro border border-[#B9DCCB]">
          <div className="flex items-center gap-2.5">
            <span className="flex-none w-9 h-9 rounded-full bg-sol-ok text-white flex items-center justify-center">
              <MessageCircle size={18} />
            </span>
            <div className="flex-1 flex flex-col">
              <span className="text-[15px] font-extrabold text-sol-ok-texto">Guia Sol ativa</span>
              <span className="text-xs text-sol-ok-texto">Acompanhamento em tempo real durante a viagem</span>
            </div>
          </div>
          <Link to="/app/chat" className={`${btnPrimario} !bg-sol-ok !min-h-[44px] !text-sm`}>Falar com a Guia</Link>
        </section>
      ) : (
        <Link to="/app/chat" className="flex items-center gap-2.5 min-h-[48px] px-3 rounded-[14px] bg-sol-creme text-sol-fundo no-underline">
          <MessageCircle size={20} />
          <span className="flex-1 text-sm"><strong>Conheça a Guia Sol</strong> · uma guia em tempo real na viagem</span>
          <ChevronRight size={18} />
        </Link>
      )}

      <nav aria-label="Atalhos" className="grid grid-cols-2 gap-2">
        <Link to="/app/mural" className={`${cartao} flex flex-col items-center justify-center gap-1 min-h-[64px] p-2 text-sol-fundo no-underline text-center`}>
          <Camera size={22} />
          <span className="text-xs font-extrabold">Álbum e mural</span>
        </Link>
        <Link to="/app/creditos" className={`${cartao} flex flex-col items-center justify-center gap-1 min-h-[64px] p-2 text-sol-fundo no-underline text-center`}>
          <Gift size={22} />
          <span className="text-xs font-extrabold">Convide e ganhe</span>
        </Link>
      </nav>

      {profile?.mural?.cover_photo_url && (
        <Link to="/app/mural" className="relative block rounded-2xl overflow-hidden no-underline">
          <img src={profile.mural.cover_photo_url} alt="Capa do álbum" className="w-full h-44 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end px-4 pb-4">
            <div>
              <p className="m-0 text-white font-bold text-sm">Álbum da viagem</p>
              <p className="m-0 text-white/75 text-xs">Ver todas as fotos</p>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
