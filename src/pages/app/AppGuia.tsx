import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppChat from "@/pages/app/AppChat";
import { CalendarClock, Camera, Check, CloudRain, MapPin, MessageCircle, Plus, Search, UtensilsCrossed } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { useViagens } from "@/contexts/ViagensContext";
import { Aviso, Carregando, btnPrimario, btnSecundario, cartao } from "@/components/app/ui";
import { nomeCurto } from "@/lib/roteiro";

// Aba Guia Sol: com a Guia ativa abre a conversa; sem ela, mostra a oferta.
const BENEFICIOS = [
  { Icon: MapPin, texto: "Mande sua localização e a Sol diz o que vale a pena por perto" },
  { Icon: Search, texto: "Confere na hora se um lugar ainda está aberto" },
  { Icon: CloudRain, texto: "Reorganiza o dia se o tempo mudar" },
  { Icon: CalendarClock, texto: "Avisa de eventos na cidade que combinam com você" },
  { Icon: UtensilsCrossed, texto: "\"Onde almoçar perto daqui?\" com a resposta na hora" },
  { Icon: Camera, texto: "Suas fotos viram um mural de memórias com comentários da Sol" },
];

export default function AppGuia() {
  const { profile, profileLoading, token, isDemo, refreshProfile } = useClientAuth();
  const { viagens, atual } = useViagens();
  const navigate = useNavigate();
  const [estado, setEstado] = useState<{ carregando: boolean; pagar?: string; erro?: string }>({ carregando: false });

  if (profile?.hasCompanion) return <AppChat modo="guia" />;
  if ((profileLoading && !profile) || viagens === null) return <Carregando />;

  async function ativar() {
    if (isDemo) { setEstado({ carregando: false, erro: "No modo demonstração a Guia Sol não é ativada." }); return; }
    setEstado({ carregando: true });
    try {
      const r = await fetch(`${API_URL}/api/app/guia`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ aceitar: true }),
      });
      if (r.status === 404) { navigate(`/app/chat?texto=${encodeURIComponent("Quero ativar a Sol Guia")}`); return; }
      const d = await r.json();
      if (d.resultado === "pagamento") {
        setEstado({ carregando: false, pagar: String(d.reply ?? "").match(/https?:\/\/\S+/)?.[0] });
        return;
      }
      await refreshProfile();
      navigate("/app/chat");
    } catch {
      setEstado({ carregando: false, erro: "Não consegui ativar agora. Confira a internet e tente de novo." });
    }
  }

  // Compra pela AbacatePay: cria a cobrança e abre a tela do Pix
  async function comprar(tipo: "guia_dia" | "guia_mes") {
    if (isDemo) { setEstado({ carregando: false, erro: "No modo demonstração a Guia Sol não é ativada." }); return; }
    setEstado({ carregando: true });
    try {
      const r = await fetch(`${API_URL}/api/app/pagamento`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ tipo, dias: 1 }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ref) { setEstado({ carregando: false, erro: d.error ?? "Não consegui gerar o pagamento agora." }); return; }
      navigate(`/app/pagar/${d.ref}`);
    } catch {
      setEstado({ carregando: false, erro: "Sem conexão. Tente de novo." });
    }
  }
  const regras = profile?.regras;
  const preco = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const semViagem = !atual;

  return (
    <div className="flex flex-col gap-3 px-5 pt-7">
      <header className="flex items-center gap-2">
        <h1 className="flex-1 m-0 font-display font-extrabold text-[28px] tracking-tight">Guia Sol</h1>
      </header>

      <section className="flex flex-col gap-2 p-5 rounded-[22px] bg-sol-fundo text-white">
        <span className="flex-none w-12 h-12 rounded-2xl bg-sol-sun text-sol-fundo flex items-center justify-center"><MessageCircle size={26} /></span>
        <h2 className="m-0 font-display font-extrabold text-2xl leading-tight">Uma guia do seu lado na viagem, em tempo real</h2>
        <p className="m-0 text-sm text-sol-azul-suave leading-snug">Especializada no seu roteiro e na sua cidade, do primeiro ao último dia. Também no WhatsApp.</p>
        <span className="mt-1 self-start px-3 py-1.5 rounded-full bg-sol-sun text-sol-fundo text-sm font-extrabold">{`A partir de ${preco(regras?.guiaPrecoDia ?? 9.9)} por dia`}</span>
      </section>

      <ul className={`${cartao} m-0 p-0 list-none flex flex-col overflow-hidden`}>
        {BENEFICIOS.map(({ Icon, texto }) => (
          <li key={texto} className="flex items-center gap-3 min-h-[52px] px-4 py-2 border-b border-[#F0E9DD] last:border-b-0 text-[15px] leading-snug">
            <Icon size={20} className="flex-none text-sol-mar" />{texto}
          </li>
        ))}
      </ul>

      {semViagem ? (
        <>
          <Aviso>A Guia Sol acompanha um roteiro seu. Para ativar, crie um roteiro primeiro.</Aviso>
          <Link to="/app/criar" className={`${btnPrimario} no-underline`}><Plus size={18} strokeWidth={2.4} /> Criar roteiro</Link>
        </>
      ) : (
        <>
          <button type="button" disabled={estado.carregando} onClick={() => comprar("guia_dia")} className={`${btnPrimario} justify-between`}>
            <span>Guia Sol por 1 dia</span><span className="font-extrabold">{preco(regras?.guiaPrecoDia ?? 9.9)}</span>
          </button>
          <button type="button" disabled={estado.carregando} onClick={() => comprar("guia_mes")} className={`${btnPrimario} !bg-sol-sun !text-sol-fundo justify-between`}>
            <span>Guia Sol por 30 dias</span><span className="font-extrabold">{preco(regras?.guiaPrecoMes ?? 29.9)}</span>
          </button>
          <p className="m-0 text-xs text-sol-texto2 text-center">Pix na hora, direto aqui no app. Também dá para pagar com cartão.</p>
          {profile?.ofertas?.gratisDuranteTeste && (
            <button type="button" disabled={estado.carregando} onClick={ativar} className={btnSecundario}>
              <Check size={18} strokeWidth={2.6} /> Ativar grátis (período de teste)
            </button>
          )}
        </>
      )}
      {estado.erro && <p role="status" className="m-0 text-sm text-sol-sos">{estado.erro}</p>}

      <Link to="/app/guia/comparar" className={`${btnSecundario} no-underline`}>Com e sem a Guia Sol</Link>
      <Link to="/app/chat" className={`${btnSecundario} no-underline`}>
        <MessageCircle size={18} /> Conversar com a Sol
      </Link>
      <p className="m-0 text-xs text-sol-texto2 text-center">A conversa com a Sol para criar roteiros e tirar dúvidas continua livre.</p>
    </div>
  );
}
