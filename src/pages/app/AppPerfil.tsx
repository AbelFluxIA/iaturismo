import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, LogOut } from "lucide-react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Selo, mascararTelefone } from "@/components/app/ui";

const SOL_WHATSAPP = import.meta.env.VITE_SOL_PHONE as string | undefined;

export default function AppPerfil() {
  const { profile, name, phone, logout } = useClientAuth();
  const navigate = useNavigate();
  const nome = name || profile?.name || "Viajante";
  const creditos = profile?.freeCredits ?? 0;

  const itens = [
    { to: "/app/config", label: "Minha conta e viagem", extra: profile?.destination ?? undefined },
    { to: "/app/creditos", label: "Créditos e indicações", selo: creditos > 0 ? `${creditos} crédito${creditos > 1 ? "s" : ""}` : undefined },
    { to: "/app/mural", label: "Álbum e mural" },
    { to: "/app/seguranca", label: "Segurança e telefones úteis" },
  ];

  function sair() {
    logout();
    navigate("/app/entrar", { replace: true });
  }

  return (
    <div className="flex flex-col gap-2.5 px-5 pt-8">
      <div className="flex items-center gap-3.5">
        <div className="flex-none w-16 h-16 rounded-full bg-sol-sun flex items-center justify-center font-display font-extrabold text-2xl">
          {nome.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="m-0 font-display font-extrabold text-2xl truncate">{nome}</h1>
          <span className="flex items-center gap-1.5 text-sm text-sol-texto2">
            {mascararTelefone(profile?.phone || phone)}
            <Selo tom="ok">Verificado</Selo>
          </span>
        </div>
      </div>

      <nav aria-label="Conta" className="flex flex-col rounded-[18px] bg-white border border-sol-linha overflow-hidden">
        {itens.map((item) => (
          <Link key={item.to} to={item.to} className="flex items-center gap-3 min-h-[52px] px-4 border-b border-[#F0E9DD] text-sol-fundo no-underline">
            <span className="flex-1 text-base font-semibold">{item.label}</span>
            {item.extra && <span className="text-sm text-sol-texto2 truncate max-w-[40%]">{item.extra}</span>}
            {item.selo && <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-sol-creme text-sol-creme-texto">{item.selo}</span>}
            <ChevronRight size={18} className="text-sol-texto2" />
          </Link>
        ))}
        {SOL_WHATSAPP && (
          <a href={`https://wa.me/${SOL_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 min-h-[52px] px-4 text-sol-fundo no-underline">
            <span className="flex-1 text-base font-semibold">Falar com a Sol no WhatsApp</span>
            <ChevronRight size={18} className="text-sol-texto2" />
          </a>
        )}
      </nav>

      <button
        type="button"
        onClick={sair}
        className="flex items-center justify-center gap-2 min-h-[48px] mt-2 rounded-2xl border-[1.5px] border-sol-sos bg-white text-sol-sos text-base font-extrabold"
      >
        <LogOut size={18} /> Sair deste aparelho
      </button>
    </div>
  );
}
