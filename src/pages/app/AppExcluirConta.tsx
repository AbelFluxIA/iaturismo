import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { Aviso, TopBar, btnPrimario, cartao, formatarData } from "@/components/app/ui";
import { paginaSol } from "@/lib/paginas";

// Excluir a própria conta (LGPD; exigência da App Store e do Google Play; RA-EXC-01 a 08).
// O pedido fica 7 dias em espera: entrar na conta nesse período cancela. Depois o servidor
// apaga a conta e os dados, em até 15 dias desde o pedido. A mesma coisa pode ser pedida
// sem o app, na página pública /sol/excluir-conta.

interface Resumo { acessoPago: boolean; acessoPagoAte: string | null; esperaDias: number; prazoDias: number }
const ano = { day: "2-digit", month: "2-digit", year: "numeric" } as const;

export default function AppExcluirConta() {
  const { token, isDemo, logout } = useClientAuth();
  const navigate = useNavigate();
  const [entendi, setEntendi] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);

  useEffect(() => {
    if (!token || isDemo) return;
    fetch(`${API_URL}/api/app/conta/exclusao`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setResumo(d as Resumo); }).catch(() => { /* a tela funciona sem o resumo */ });
  }, [token, isDemo]);

  async function excluir() {
    if (!token || isDemo) return;
    if (!window.confirm("Pedir a exclusão da sua conta? Ela fica 7 dias em espera e depois é apagada de forma definitiva.")) return;
    setOcupado(true);
    setErro(null);
    try {
      const r = await fetch(`${API_URL}/api/app/conta/excluir`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirmo: true }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.pedido) { setErro(d.error || "O pedido NÃO foi registrado. Tente de novo em instantes."); return; }
      const espera = formatarData(d.pedido.espera, ano);
      const conclusao = formatarData(d.pedido.conclusao, ano);
      logout();
      navigate("/app/entrar", { replace: true, state: { aviso: `Pedido de exclusão registrado. Ele fica em espera até ${espera}: se você entrar na conta até lá, o pedido é cancelado. Depois disso apagamos seus dados, até ${conclusao}.` } });
    } catch {
      setErro("Sem conexão: o pedido NÃO foi registrado. Tente de novo em instantes.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-col">
      <TopBar title="Excluir minha conta" back="/app/perfil" />
      <div className="flex flex-col gap-4 px-5 pb-6">
        <p className="m-0 text-[15px] leading-snug">
          O pedido fica <strong>7 dias em espera</strong>. Se você entrar na conta nesse período, ele é <strong>cancelado</strong>.
          Depois da espera apagamos a conta e os seus dados, em até <strong>15 dias desde o pedido</strong>, e isso não pode ser desfeito.
        </p>

        <div className={`${cartao} flex flex-col gap-1.5 p-4 text-[14px] leading-snug`}>
          <strong className="text-[15px]">O que apagamos</strong>
          <span className="text-sol-texto2">Perfil, nome, número de telefone e data de nascimento, conversas com a Sol e com a Guia Sol, conversa traduzida, roteiros e PDFs, fotos do álbum, mensagens de voz, localização, preferências, contatos de emergência e chaves de notificação.</span>
        </div>
        <div className={`${cartao} flex flex-col gap-1.5 p-4 text-[14px] leading-snug`}>
          <strong className="text-[15px]">O que a lei manda guardar</strong>
          <span className="text-sol-texto2">Registros de compra e recibos (5 anos) e registros de acesso (6 meses), separados da sua conta e usados só para cumprir a lei.</span>
        </div>
        {resumo?.acessoPago && (
          <Aviso tom="atencao">
            Você tem a <strong>Guia Sol ativa{resumo.acessoPagoAte ? ` até ${formatarData(resumo.acessoPagoAte, ano)}` : ""}</strong>. Os dias restantes se encerram com a exclusão, sem reembolso proporcional. Se comprou há menos de 7 dias, você pode pedir o reembolso integral antes de excluir.
          </Aviso>
        )}
        <p className="m-0 text-[13px] text-sol-texto2">
          Detalhes em <a href={paginaSol("excluir-conta")} target="_blank" rel="noopener noreferrer" className="font-bold text-sol-mar underline">Excluir conta</a> e na{" "}
          <a href={paginaSol("privacidade")} target="_blank" rel="noopener noreferrer" className="font-bold text-sol-mar underline">Política de Privacidade</a>.
          Se quiser só parar de usar, basta sair do app: seus roteiros ficam guardados para quando voltar.
        </p>

        {isDemo ? (
          <p className="m-0 text-[14px] text-sol-texto2">No modo demonstração não há conta para excluir.</p>
        ) : (
          <>
            <label className="flex items-start gap-3 min-h-[44px] text-[15px]">
              <input type="checkbox" checked={entendi} onChange={(e) => setEntendi(e.target.checked)} className="mt-1 w-5 h-5 accent-sol-sos" />
              <span>Entendi que, depois dos 7 dias de espera, meus dados serão apagados e não dá para desfazer.</span>
            </label>
            {erro && <p role="alert" className="m-0 text-[14px] font-bold text-sol-sos">{erro}</p>}
            <button
              type="button"
              disabled={!entendi || ocupado}
              onClick={excluir}
              className={`${btnPrimario} w-full !bg-sol-sos !text-white disabled:opacity-40`}
            >
              <Trash2 size={18} /> {ocupado ? "Registrando o pedido..." : "Pedir a exclusão da conta"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
