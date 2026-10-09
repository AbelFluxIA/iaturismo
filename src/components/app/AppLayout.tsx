import { Outlet, Link, useLocation } from "react-router-dom";
import { Home, Map, MessageCircle, User, type LucideIcon } from "lucide-react";

interface Aba {
  to: string;
  label: string;
  Icon: LucideIcon;
  // Outras rotas que também acendem esta aba (ex.: álbum faz parte de Roteiros)
  match: string[];
}

const ESQUERDA: Aba[] = [
  { to: "/app", label: "Início", Icon: Home, match: ["/app"] },
  { to: "/app/roteiro", label: "Roteiros", Icon: Map, match: ["/app/roteiro", "/app/mural"] },
];
const DIREITA: Aba[] = [
  { to: "/app/chat", label: "Guia Sol", Icon: MessageCircle, match: ["/app/chat"] },
  { to: "/app/perfil", label: "Perfil", Icon: User, match: ["/app/perfil", "/app/creditos", "/app/config"] },
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

export default function AppLayout() {
  const { pathname } = useLocation();
  const caminho = pathname.replace(/\/+$/, "") || "/app";
  const ativo = (aba: Aba) => aba.match.includes(caminho);
  const segAtiva = caminho === "/app/seguranca";

  return (
    <div className="flex flex-col min-h-screen bg-sol-areia font-corpo text-sol-fundo">
      <main className="flex-1 pb-[100px]">
        <Outlet />
      </main>

      <nav
        aria-label="Navegação principal"
        className="fixed bottom-0 inset-x-0 z-50 grid grid-cols-5 items-end bg-white border-t border-sol-linha px-1 pt-1.5 pb-[max(14px,env(safe-area-inset-bottom))]"
      >
        {ESQUERDA.map((a) => <ItemAba key={a.to} aba={a} ativo={ativo(a)} />)}
        <Link
          to="/app/seguranca"
          aria-label="SOS e segurança: telefones de emergência e alertas"
          aria-current={segAtiva ? "page" : undefined}
          className={`flex flex-col items-center justify-end gap-[3px] min-h-[52px] text-[11px] text-sol-fundo no-underline ${segAtiva ? "font-extrabold" : "font-semibold"}`}
        >
          <span
            className={`-mt-[22px] w-[58px] h-[58px] rounded-full bg-sol-sos text-white flex items-center justify-center text-[15px] font-extrabold tracking-wide shadow-[0_4px_12px_rgba(180,35,24,0.30)] border-[3px] ${
              segAtiva ? "border-sol-sun" : "border-white"
            }`}
          >
            SOS
          </span>
          Segurança
        </Link>
        {DIREITA.map((a) => <ItemAba key={a.to} aba={a} ativo={ativo(a)} />)}
      </nav>
    </div>
  );
}
