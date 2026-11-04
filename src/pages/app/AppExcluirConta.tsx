import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { TopBar, btnPrimario, cartao } from "@/components/app/ui";

// Excluir a própria conta (LGPD; exigência da App Store e do Google Play).
// O servidor apaga conversa, roteiros, fotos, PDFs, cadastro e consentimentos.
export default function AppExcluirConta() {
  const { token, isDemo, logout } = useClientAuth();
  const navigate = useNavigate();
  const [entendi, setEntendi] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    if (!token || isDemo) return;
    setOcupado(true);
    setErro(null);
    try {
      const r = await fetch(`${API_URL}/api/app/conta/excluir`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirmo: true }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErro(d.error || "Não consegui excluir agora. Tente de novo em instantes.");
        return;
      }
      logout();
      navigate("/app/entrar", { replace: true });
    } catch {
      setErro("Sem conexão agora. Tente de novo em instantes.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-col">
      <TopBar title="Excluir minha conta" back="/app/perfil" />
      <div className="flex flex-col gap-4 px-5">
        <p className="m-0 text-[15px] leading-snug">
          Ao excluir a conta, apagamos tudo que é seu: conversa com a Sol, roteiros e PDFs, fotos e álbuns, cadastro, contatos e autorizações.
          O número do WhatsApp deixa de estar ligado ao app. <strong>Isso não pode ser desfeito.</strong>
        </p>
        <div className={`${cartao} p-4 text-[14px] text-sol-texto2 leading-snug`}>
          Compras e a Guia Sol já pagas não são reembolsadas pela exclusão. Se quiser só parar de receber mensagens, basta sair do app: seus roteiros ficam guardados para quando voltar.
        </div>

        {isDemo ? (
          <p className="m-0 text-[14px] text-sol-texto2">No modo demonstração não há conta para excluir.</p>
        ) : (
          <>
            <label className="flex items-start gap-3 min-h-[44px] text-[15px]">
              <input type="checkbox" checked={entendi} onChange={(e) => setEntendi(e.target.checked)} className="mt-1 w-5 h-5 accent-sol-sos" />
              <span>Entendi que meus dados serão apagados e que não dá para desfazer.</span>
            </label>
            {erro && <p role="alert" className="m-0 text-[14px] font-bold text-sol-sos">{erro}</p>}
            <button
              type="button"
              disabled={!entendi || ocupado}
              onClick={excluir}
              className={`${btnPrimario} w-full !bg-sol-sos !text-white disabled:opacity-40`}
            >
              <Trash2 size={18} /> {ocupado ? "Excluindo..." : "Excluir minha conta"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
