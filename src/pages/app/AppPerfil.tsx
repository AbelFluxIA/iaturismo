import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, RefreshCw } from "lucide-react";
import { procurarAtualizacao, versaoDoApp } from "@/lib/atualizacao";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { useViagens } from "@/contexts/ViagensContext";
import { LinhaMenu, Selo, TopBar, mascararTelefone } from "@/components/app/ui";

const SOL_WHATSAPP = import.meta.env.VITE_SOL_PHONE as string | undefined;

// Preferências usadas nos roteiros, lidas do último perfil gravado pela Sol
function preferencias(perfil: string | null | undefined, grupo: string | null | undefined) {
  const itens: string[] = [];
  const foco = perfil?.match(/foco em ([^|]+?)(?:, orçamento|\||$)/i)?.[1];
  if (foco) itens.push(...foco.split(/,| e /).map((x) => x.trim()).filter(Boolean).slice(0, 3));
  const orc = perfil?.match(/orçamento ([^,|]+)/i)?.[1]?.trim();
  if (orc) itens.push(orc.charAt(0).toUpperCase() + orc.slice(1));
  if (grupo) itens.push(grupo.charAt(0).toUpperCase() + grupo.slice(1));
  return itens;
}

export default function AppPerfil() {
  const { profile, name, phone, logout } = useClientAuth();
  const { viagens } = useViagens();
  const navigate = useNavigate();
  const nome = name || profile?.name || "Viajante";
  const creditos = profile?.freeCredits ?? 0;
  const prefs = preferencias(profile?.touristProfile, profile?.groupType);

  const [procurando, setProcurando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  async function procurar() {
    setProcurando(true);
    setResultado(null);
    try {
      const r = await procurarAtualizacao();
      setResultado(
        r === "nova" ? "Versão nova baixada: toque em Atualizar no aviso do topo."
        : r === "atual" ? "Você já está na versão mais nova."
        : "Este navegador não instala atualizações. Feche e abra o app de novo."
      );
    } catch {
      setResultado("Sem conexão agora. Tente de novo em instantes.");
    } finally {
      setProcurando(false);
    }
  }

  function sair() {
    logout();
    navigate("/app/entrar", { replace: true });
  }

  return (
    <div className="flex flex-col">
      <TopBar title="Perfil" back="/app" />
      <div className="flex flex-col gap-3 px-5">
        <div className="flex items-center gap-3.5">
          <div className="flex-none w-16 h-16 rounded-full bg-sol-sun flex items-center justify-center font-display font-extrabold text-2xl">
            {nome.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="font-display font-extrabold text-2xl truncate">{nome}</span>
            <span className="flex items-center gap-1.5 text-sm text-sol-texto2">
              {mascararTelefone(profile?.phone || phone)}
              <Selo tom="ok">Verificado</Selo>
            </span>
          </div>
        </div>

        {prefs.length > 0 && (
          <section className="flex flex-col gap-2 p-4 rounded-[18px] bg-sol-claro">
            <h2 className="m-0 text-[15px] font-extrabold">Minhas preferências de viagem</h2>
            <div className="flex flex-wrap gap-1.5">
              {prefs.map((p) => <span key={p} className="px-3 py-1.5 rounded-full bg-white text-[13px] font-bold">{p}</span>)}
            </div>
            <p className="m-0 text-xs text-sol-claro-texto">Do seu último roteiro. Você muda ao criar o próximo, no app ou no WhatsApp.</p>
          </section>
        )}

        <nav aria-label="Conta" className="flex flex-col rounded-[18px] bg-white border border-sol-linha overflow-hidden">
          <LinhaMenu to="/app/config" titulo="Minha conta e viagem" detalhe={profile?.destination ?? undefined} />
          <LinhaMenu titulo="WhatsApp associado" detalhe={mascararTelefone(profile?.phone || phone)} emBreve />
          <LinhaMenu titulo="Idioma" detalhe="Português" emBreve />
          <LinhaMenu to="/app/creditos" titulo="Créditos e indicações" selo={creditos > 0 ? `${creditos} ${creditos === 1 ? "crédito" : "créditos"}` : undefined} />
          <LinhaMenu titulo="Compras" emBreve />
          <LinhaMenu to="/app/roteiro" titulo="Minhas viagens e álbuns" detalhe={viagens ? `${viagens.length} ${viagens.length === 1 ? "viagem" : "viagens"}` : undefined} />
          <LinhaMenu to="/app/seguranca" titulo="Segurança e contatos de emergência" />
          <LinhaMenu titulo="Notificações" emBreve />
          <LinhaMenu titulo="Privacidade e dados" emBreve />
          {SOL_WHATSAPP && <LinhaMenu href={`https://wa.me/${SOL_WHATSAPP}`} titulo="Falar com a Sol no WhatsApp" />}
          <LinhaMenu to="/app/chat" titulo="Ajuda e suporte" detalhe="Pergunte à Sol" />
        </nav>

      <button
        type="button"
        onClick={sair}
        className="flex items-center justify-center gap-2 min-h-[48px] mt-2 rounded-2xl border-[1.5px] border-sol-sos bg-white text-sol-sos text-base font-extrabold"
      >
        <LogOut size={18} /> Sair deste aparelho
      </button>

      <div className="flex flex-col items-center gap-1.5 mt-3 mb-2">
        <span className="text-xs text-sol-texto2">Versão do app: {versaoDoApp() || "local"}</span>
        <button
          type="button"
          onClick={procurar}
          disabled={procurando}
          className="flex items-center gap-1.5 min-h-[44px] px-3 text-sm font-bold text-sol-mar disabled:opacity-60"
        >
          <RefreshCw size={16} className={procurando ? "animate-spin" : ""} />
          {procurando ? "Procurando..." : "Procurar atualização"}
        </button>
        {resultado && <span role="status" className="text-xs text-center text-sol-texto2">{resultado}</span>}
      </div>
      </div>
    </div>
  );
}
