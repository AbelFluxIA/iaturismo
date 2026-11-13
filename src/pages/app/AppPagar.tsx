import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Copy, CreditCard, RefreshCw } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { useViagens } from "@/contexts/ViagensContext";
import { Aviso, Carregando, TopBar, btnPrimario, btnSecundario, cartao } from "@/components/app/ui";
import { urlSegura } from "@/lib/utils";

// Pagamento dentro do app: Pix na tela (QR Code + copia e cola), sem formulário.
// A tela consulta o servidor a cada poucos segundos e libera sozinha quando o Pix cai.
// Cartão abre a página segura da AbacatePay.
interface Pagamento {
  ref: string; tipo: "roteiro" | "guia_dia" | "guia_mes"; dias: number; valorCentavos: number; status: "pendente" | "pago";
  brCode: string | null; qr: string | null; expiraEm: string | null; cartaoUrl: string | null;
}
const reais = (c: number) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;
const descricao = (p: Pagamento) =>
  p.tipo === "guia_mes" ? "Guia Sol por 30 dias"
  : p.tipo === "guia_dia" ? `Guia Sol por ${p.dias} ${p.dias === 1 ? "dia" : "dias"}`
  : `Roteiro: ${p.dias} ${p.dias === 1 ? "dia" : "dias"} a mais`;

export default function AppPagar() {
  const { ref } = useParams();
  const { token, refreshProfile } = useClientAuth();
  const { recarregar } = useViagens();
  const [p, setP] = useState<Pagamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [agora, setAgora] = useState(Date.now());
  const avisouPago = useRef(false);
  const cab = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  async function consultar() {
    try {
      const r = await fetch(`${API_URL}/api/app/pagamento/${ref}`, { headers: cab });
      if (r.status === 404) { setErro("Não achei este pagamento."); return; }
      if (r.ok) { const d = await r.json().catch(() => null); if (d?.ref && d.tipo) setP(d); else setErro("Não consegui carregar este pagamento."); }
    } catch { /* tenta de novo no próximo ciclo */ }
  }
  useEffect(() => {
    consultar();
    const id = window.setInterval(() => { setAgora(Date.now()); if (document.visibilityState === "visible") consultar(); }, 4000);
    return () => window.clearInterval(id);
  }, [ref]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (p?.status === "pago" && !avisouPago.current) { avisouPago.current = true; refreshProfile(); recarregar(); }
  }, [p?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function acao(nome: "pix" | "cartao") {
    setOcupado(true); setErro(null);
    try {
      const r = await fetch(`${API_URL}/api/app/pagamento/${ref}/${nome}`, { method: "POST", headers: cab });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(d.error ?? "Não consegui agora. Tente de novo."); return; }
      if (!d?.ref) { setErro("Não consegui agora. Tente de novo."); return; }
      setP(d);
      if (nome === "cartao" && urlSegura(d.cartaoUrl)) window.open(d.cartaoUrl, "_blank", "noopener");
    } catch { setErro("Sem conexão. Tente de novo."); } finally { setOcupado(false); }
  }
  function copiar() {
    if (!p?.brCode) return;
    navigator.clipboard?.writeText(p.brCode).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2500); });
  }

  if (!p && !erro) return <Carregando />;
  const vencido = !!p?.expiraEm && new Date(p.expiraEm).getTime() < agora;

  return (
    <div className="flex flex-col">
      <TopBar title="Pagamento" back={p?.tipo === "roteiro" ? "/app/criar" : "/app/guia"} />
      <div className="flex flex-col gap-3 px-5">
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        {p?.status === "pago" ? (
          <>
            <div className="flex justify-center mt-6"><span className="w-20 h-20 rounded-full bg-sol-ok-claro text-sol-ok flex items-center justify-center"><Check size={40} strokeWidth={3} /></span></div>
            <h1 className="m-0 text-center font-display font-extrabold text-[26px] leading-tight">Pagamento confirmado</h1>
            <p className="m-0 text-center text-[15px] text-sol-texto2">
              {p.tipo === "roteiro" ? "A Sol já está montando o seu roteiro. Ele aparece em Roteiros em cerca de um minuto." : "A Guia Sol está ativa. É só chamar durante a viagem."}
            </p>
            <Link to={p.tipo === "roteiro" ? "/app/roteiro" : "/app/guia"} className={`${btnPrimario} mt-4 no-underline`}>{p.tipo === "roteiro" ? "Ver meus roteiros" : "Abrir a Guia Sol"}</Link>
            <Link to="/app" className={`${btnSecundario} no-underline`}>Ir para o Início</Link>
          </>
        ) : p && (
          <>
            <section className="flex items-baseline justify-between gap-3 px-4 py-3.5 rounded-2xl bg-sol-fundo text-white">
              <span className="text-[15px] font-bold">{descricao(p)}</span>
              <span className="flex-none font-display font-extrabold text-[26px] text-sol-sun">{reais(p.valorCentavos)}</span>
            </section>

            <section className={`${cartao} flex flex-col items-center gap-3 p-4`}>
              <h2 className="m-0 self-start text-base font-extrabold">Pague com Pix</h2>
              {vencido || !p.qr ? (
                <>
                  <p className="m-0 text-sm text-sol-texto2">Este QR Code venceu.</p>
                  <button type="button" disabled={ocupado} onClick={() => acao("pix")} className={`${btnPrimario} w-full`}><RefreshCw size={18} /> Gerar novo QR Code</button>
                </>
              ) : (
                <>
                  <img src={p.qr} alt="QR Code do Pix" className="w-56 h-56 rounded-xl border border-sol-linha bg-white" />
                  <p className="m-0 text-[13px] text-sol-texto2 text-center">Aponte a câmera do app do seu banco, ou copie o código e cole em "Pix copia e cola".</p>
                  <button type="button" onClick={copiar} className={`${btnPrimario} w-full`}><Copy size={18} /> {copiado ? "Código copiado" : "Copiar código Pix"}</button>
                  <p role="status" className="m-0 flex items-center gap-2 text-[13px] font-bold text-sol-mar">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-sol-mar border-t-transparent animate-spin" /> Aguardando o pagamento. Esta tela atualiza sozinha.
                  </p>
                </>
              )}
            </section>

            <button type="button" disabled={ocupado} onClick={() => acao("cartao")} className={btnSecundario}><CreditCard size={18} /> Pagar com cartão</button>
            <p className="m-0 text-xs text-sol-texto2 text-center">Pagamento processado pela AbacatePay. A Sol não guarda dados do seu cartão.</p>
          </>
        )}
      </div>
    </div>
  );
}
