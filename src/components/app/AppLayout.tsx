import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { ViagensProvider, useViagens } from "@/contexts/ViagensContext";
import CentralBugs from "@/components/app/CentralBugs";
import { Home, Languages, Map, MessageCircle, Plus, Sun, type LucideIcon } from "lucide-react";

// Abas do protótipo: Início · Roteiros · [Hoje ou Criar roteiro] · Guia Sol · Tradutor.
// SOS fica no topo de cada tela; Perfil abre pelo avatar no Início.

interface Aba {
  to: string;
  label: string;
  Icon: LucideIcon;
  ativa: (caminho: string, busca: URLSearchParams) => boolean;
}

const temViagemAberta = (busca: URLSearchParams) => busca.has("id") || busca.has("codigo");

const ESQUERDA: Aba[] = [
  { to: "/app", label: "Início", Icon: Home, ativa: (c) => c === "/app" || c.startsWith("/app/destinos") },
  {
    to: "/app/roteiro",
    label: "Roteiros",
    Icon: Map,
    ativa: (c, b) => (c === "/app/roteiro" && !temViagemAberta(b)) || c === "/app/mural",
  },
];
const DIREITA: Aba[] = [
  { to: "/app/guia", label: "Guia Sol", Icon: MessageCircle, ativa: (c) => c === "/app/guia" || c === "/app/chat" },
  { to: "/app/tradutor", label: "Tradutor", Icon: Languages, ativa: (c) => c === "/app/tradutor" },
];

function ItemAba({ aba, ativo }: { aba: Aba; ativo: boolean }) {
  return (
    <Link
      to={aba.to}
      aria-current={ativo ? "page" : undefined}
      className={`flex flex-col items-center justify-center gap-1 min-h-[52px] text-xs no-underline ${
        ativo ? "text-sol-fundo font-extrabold" : "text-[#4E5F66] font-semibold"
      }`}
    >
      <span className={`flex px-3.5 py-[3px] rounded-full ${ativo ? "bg-sol-sun" : "bg-transparent"}`}>
        <aba.Icon size={22} strokeWidth={1.9} />
      </span>
      {aba.label}
    </Link>
  );
}

function BarraAbas({ navRef }: { navRef: React.RefObject<HTMLElement> }) {
  const { pathname, search } = useLocation();
  const caminho = pathname.replace(/\/+$/, "") || "/app";
  const busca = new URLSearchParams(search);
  const { viagens, atual } = useViagens();
  // Sem viagem em andamento ou próxima, o botão do meio cria um roteiro
  const criar = viagens !== null && !atual;
  const centroAtivo = caminho.startsWith("/app/criar") || caminho.startsWith("/app/hoje")
    || (caminho.startsWith("/app/roteiro") && (temViagemAberta(busca) || caminho !== "/app/roteiro"));

  return (
    <nav
      ref={navRef}
      aria-label="Navegação principal"
      className="fixed bottom-0 inset-x-0 z-50 grid grid-cols-5 items-end bg-white border-t border-sol-linha px-1 pt-1.5 pb-[max(14px,env(safe-area-inset-bottom))]"
    >
      {ESQUERDA.map((a) => <ItemAba key={a.to} aba={a} ativo={a.ativa(caminho, busca)} />)}
      <Link
        to={criar ? "/app/criar" : "/app/hoje"}
        aria-label={criar ? "Criar roteiro" : "Abrir o roteiro de hoje"}
        aria-current={centroAtivo ? "page" : undefined}
        className={`flex flex-col items-center justify-end gap-[3px] min-h-[52px] text-xs text-sol-fundo no-underline ${centroAtivo ? "font-extrabold" : "font-semibold"}`}
      >
        <span
          className={`-mt-[22px] w-[58px] h-[58px] rounded-full bg-sol-fundo text-sol-sun flex items-center justify-center shadow-[0_4px_14px_rgba(14,47,69,0.35)] border-[3px] ${
            centroAtivo ? "border-sol-sun" : "border-white"
          }`}
        >
          {criar ? <Plus size={28} strokeWidth={2.4} /> : <Sun size={28} strokeWidth={2.2} />}
        </span>
        {criar ? "Criar" : "Hoje"}
      </Link>
      {DIREITA.map((a) => <ItemAba key={a.to} aba={a} ativo={a.ativa(caminho, busca)} />)}
    </nav>
  );
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const caminho = pathname.replace(/\/+$/, "") || "/app";
  const { isDemo, logout } = useClientAuth();
  const navigate = useNavigate();
  const telaCheia = caminho === "/app/chat"; // o chat ocupa a altura exata da tela

  // Altura real da faixa de demonstração e da barra de abas (variam por aparelho)
  const faixaRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [medidas, setMedidas] = useState({ topo: 0, nav: 88 });
  useEffect(() => {
    const medir = () => setMedidas({
      topo: faixaRef.current?.offsetHeight ?? 0,
      nav: navRef.current?.offsetHeight ?? 88,
    });
    medir();
    const obs = new ResizeObserver(medir);
    if (faixaRef.current) obs.observe(faixaRef.current);
    if (navRef.current) obs.observe(navRef.current);
    return () => obs.disconnect();
  }, [isDemo]);
  const variaveis = { "--sol-topo": `${medidas.topo}px`, "--sol-nav": `${medidas.nav}px` } as CSSProperties;

  return (
    <ViagensProvider>
      <div style={variaveis} className="flex flex-col min-h-screen bg-sol-areia font-corpo text-sol-fundo">
        {isDemo && (
          <div ref={faixaRef} role="status" className="sticky top-0 z-40 flex items-center gap-2 px-4 py-2 bg-sol-creme text-sol-creme-texto text-[13px]">
            <span className="flex-1"><strong>Modo demonstração</strong> · viagem de exemplo, nada é salvo</span>
            <button
              type="button"
              onClick={() => { logout(); navigate("/app/entrar", { replace: true }); }}
              className="flex-none min-h-[36px] px-3 rounded-lg bg-white font-bold text-sol-fundo"
            >
              Entrar de verdade
            </button>
          </div>
        )}
        <main className={telaCheia ? "flex-1" : "flex-1 pb-[calc(var(--sol-nav)+16px)]"}>
          <Outlet />
        </main>
        <CentralBugs />
        <BarraAbas navRef={navRef} />
      </div>
    </ViagensProvider>
  );
}
