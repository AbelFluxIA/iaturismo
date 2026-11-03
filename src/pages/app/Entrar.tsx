import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ClipboardPaste, MessageCircle } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { Aviso, btnPrimario } from "@/components/app/ui";
import { DEMO_TOKEN } from "@/lib/demo";

type Step = "inicio" | "whatsapp" | "phone" | "otp";

interface Pedido { pedido: string; whatsapp: string; texto: string; criado: number }
const CHAVE_PEDIDO = "sol_pedido_login";
const VALIDADE_PEDIDO = 14 * 60 * 1000;

function pedidoGuardado(): Pedido | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(CHAVE_PEDIDO) || "null") as Pedido | null;
    return p && Date.now() - p.criado < VALIDADE_PEDIDO ? p : null;
  } catch { return null; }
}

export default function Entrar() {
  // Voltando do WhatsApp com um pedido aberto: já mostra o campo do código
  const [step, setStep] = useState<Step>(() => (pedidoGuardado() ? "whatsapp" : "inicio"));
  const [pedido, setPedido] = useState<Pedido | null>(pedidoGuardado);
  const [abriuWhatsapp, setAbriuWhatsapp] = useState(() => !!pedidoGuardado());
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useClientAuth();
  const navigate = useNavigate();
  // Veio de um link protegido (ex.: /r/código)? Volta para lá depois de entrar
  const de = (useLocation().state as { de?: string } | null)?.de;
  const destino = de && de.startsWith("/app") ? de : "/app";

  const digitos = phone.replace(/\D/g, "");

  // Primeiro login: pede um "pedido" ao bot e abre o WhatsApp com a mensagem pronta.
  // A Sol responde só com o código; a pessoa cola aqui.
  async function novoPedido() {
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/app/auth/pedido`, { method: "POST" });
      if (!res.ok) { setStep("phone"); return; } // servidor antigo: entra pelo número
      const d = await res.json();
      const p: Pedido = { pedido: d.pedido, whatsapp: d.whatsapp, texto: d.texto, criado: Date.now() };
      try { sessionStorage.setItem(CHAVE_PEDIDO, JSON.stringify(p)); } catch { /* ok */ }
      setPedido(p);
      setAbriuWhatsapp(false);
      setOtp("");
    } catch {
      setError("Sem conexão. Conecte-se para entrar.");
    }
  }
  useEffect(() => { if (step === "whatsapp" && !pedido) novoPedido(); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  async function colar() {
    try {
      const t = await navigator.clipboard.readText();
      const c = t.match(/\d{6}/)?.[0];
      if (c) setOtp(c); else setError("Não achei um código de 6 números no que você copiou.");
    } catch {
      setError("Toque no campo do código e cole (segure o dedo e escolha Colar).");
    }
  }

  async function entrarComPedido(e: React.FormEvent) {
    e.preventDefault();
    if (!pedido) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/app/auth/verificar-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido: pedido.pedido, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Código incorreto."); return; }
      try { sessionStorage.removeItem(CHAVE_PEDIDO); } catch { /* ok */ }
      login(data.token, data.phone, data.name);
      navigate(destino, { replace: true });
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  const linkWhatsapp = pedido ? `https://wa.me/${pedido.whatsapp}?text=${encodeURIComponent(pedido.texto)}` : undefined;

  // Temporário: entra com uma viagem de exemplo, sem código
  function pularDemonstracao() {
    login(DEMO_TOKEN, "", "Visitante");
    navigate(destino, { replace: true });
  }

  const pular = (
    <button
      type="button"
      onClick={pularDemonstracao}
      className="min-h-[48px] text-[15px] font-bold text-sol-mar"
    >
      Pular por enquanto · ver demonstração
    </button>
  );

  async function handleSolicitarOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/app/auth/solicitar-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Não foi possível enviar o código."); return; }
      setStep("otp");
    } catch {
      setError("Sem conexão. Conecte-se para receber o código.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerificarOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/app/auth/verificar-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Código incorreto."); return; }
      login(data.token, data.phone, data.name);
      navigate(destino, { replace: true });
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  const voltar = (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => { setError(""); setStep(step === "otp" ? "phone" : step === "phone" ? "whatsapp" : "inicio"); }}
      className="flex items-center justify-center w-12 h-12 -ml-3 text-sol-fundo"
    >
      <ChevronLeft size={24} />
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-sol-areia font-corpo text-sol-fundo">
      <div className="flex-1 flex flex-col w-full max-w-[430px] mx-auto px-6 pt-10 pb-10">
        {step === "inicio" && (
          <>
            <div className="flex justify-center items-center h-[300px] mt-2">
              <img src="/sol-logo.png" alt="Sol" className="w-[210px] h-auto object-contain" />
            </div>
            <div className="flex flex-col gap-3.5">
              <h1 className="m-0 font-display font-extrabold text-[30px] leading-[1.02] tracking-[-0.03em]">
                Sua viagem inteligente
              </h1>
              <p className="m-0 text-[15px] leading-snug text-sol-texto2">
                Roteiro, mapa, álbum e segurança no mesmo lugar, para qualquer destino. A Sol também atende você no WhatsApp.
              </p>
            </div>
            <div className="mt-auto pt-8 flex flex-col gap-3">
              <button type="button" onClick={() => setStep("whatsapp")} className={btnPrimario}>
                Entrar com meu WhatsApp
              </button>
              {pular}
            </div>
          </>
        )}

        {step === "whatsapp" && (
          <form onSubmit={entrarComPedido} className="flex-1 flex flex-col">
            {voltar}
            <h1 className="m-0 font-display font-extrabold text-[23px] leading-tight">Entrar com o WhatsApp</h1>
            <ol className="mt-3 mb-0 pl-0 list-none flex flex-col gap-2.5 text-[15px] leading-snug">
              {[
                "Toque no botão verde. O WhatsApp abre com uma mensagem pronta para a Sol.",
                "Envie a mensagem do jeito que está.",
                "A Sol responde com o seu código. Copie e cole aqui embaixo.",
              ].map((t, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex-none w-7 h-7 rounded-full bg-sol-fundo text-white flex items-center justify-center text-sm font-extrabold">{i + 1}</span>
                  <span className="pt-0.5">{t}</span>
                </li>
              ))}
            </ol>

            <a
              href={linkWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!linkWhatsapp}
              onClick={(e) => { if (!linkWhatsapp) { e.preventDefault(); return; } setAbriuWhatsapp(true); }}
              className={`mt-5 flex items-center justify-center gap-2 min-h-[54px] rounded-[14px] text-white text-base font-extrabold no-underline ${linkWhatsapp ? "bg-[#1E8E4F]" : "bg-[#9BBFA9]"}`}
            >
              <MessageCircle size={20} /> {linkWhatsapp ? "Receber código no WhatsApp" : "Preparando..."}
            </a>

            <label htmlFor="otp-pedido" className="mt-6 text-[15px] font-bold">Código que a Sol mandou</label>
            <div className="flex gap-2 mt-2.5">
              <input
                id="otp-pedido"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp((e.target.value.match(/\d/g) ?? []).join("").slice(0, 6))}
                placeholder="000000"
                className="flex-1 min-w-0 h-14 px-4 rounded-xl border-[1.5px] border-sol-borda bg-white text-center text-2xl font-bold tracking-[0.35em] focus:outline-none focus:border-sol-mar"
              />
              <button type="button" onClick={colar} className="flex-none flex items-center gap-1.5 h-14 px-3.5 rounded-xl border-[1.5px] border-sol-borda bg-white text-sm font-bold">
                <ClipboardPaste size={18} /> Colar
              </button>
            </div>
            {error && <div className="mt-3"><Aviso tom="erro">{error}</Aviso></div>}
            {abriuWhatsapp && !error && (
              <p className="mt-2 mb-0 text-[13px] text-sol-texto2">O código chega em poucos segundos. Não chegou? Confira se a mensagem foi enviada para a Sol.</p>
            )}

            <div className="mt-auto pt-8 flex flex-col gap-2">
              <button type="submit" disabled={loading || otp.length < 6 || !pedido} className={`${btnPrimario} w-full`}>
                {loading ? "Entrando..." : "Entrar"}
              </button>
              <button type="button" onClick={novoPedido} className="min-h-[44px] text-[14px] font-bold text-sol-mar">Gerar uma nova mensagem</button>
              <button type="button" onClick={() => { setError(""); setStep("phone"); }} className="min-h-[44px] text-[14px] font-bold text-sol-texto2">Prefiro digitar meu número</button>
              {pular}
            </div>
          </form>
        )}

        {step === "phone" && (
          <form onSubmit={handleSolicitarOtp} className="flex-1 flex flex-col">
            {voltar}
            <h1 className="m-0 font-display font-extrabold text-[21px] leading-tight">Qual é o seu WhatsApp?</h1>
            <p className="mt-2.5 mb-0 text-[15px] leading-snug text-sol-texto2">
              Vamos enviar um código pelo WhatsApp para confirmar que o número é seu.
            </p>
            <label htmlFor="phone" className="mt-6 text-[15px] font-bold">Número com DDD</label>
            <div className="flex gap-2 mt-2.5">
              <span className="flex-none min-w-[76px] h-14 rounded-xl border-[1.5px] border-sol-borda bg-white flex items-center justify-center text-[17px] font-bold">+55</span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="83 99999 0000"
                required
                className="flex-1 min-w-0 h-14 px-4 rounded-xl border-[1.5px] border-sol-borda bg-white text-[19px] font-semibold tracking-wide focus:outline-none focus:border-sol-mar"
              />
            </div>
            {error && <div className="mt-3"><Aviso tom="erro">{error}</Aviso></div>}
            <div className="mt-auto pt-8">
              <button type="submit" disabled={loading || digitos.length < 10} className={`${btnPrimario} w-full`}>
                {loading ? "Enviando..." : "Enviar código"}
              </button>
            </div>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerificarOtp} className="flex-1 flex flex-col">
            {voltar}
            <h1 className="m-0 font-display font-extrabold text-[21px] leading-tight">Confirme seu número</h1>
            <p className="mt-2.5 mb-0 text-[15px] leading-snug text-sol-texto2">
              Enviamos um código pelo WhatsApp para <strong className="text-sol-fundo whitespace-nowrap">{phone}</strong>.
            </p>
            <label htmlFor="otp" className="mt-6 text-[15px] font-bold">Código do WhatsApp</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              required
              autoFocus
              className="mt-2.5 h-14 px-4 rounded-xl border-[1.5px] border-sol-borda bg-white text-center text-2xl font-bold tracking-[0.4em] focus:outline-none focus:border-sol-mar"
            />
            {error && <div className="mt-3"><Aviso tom="erro">{error}</Aviso></div>}
            <button
              type="button"
              onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
              className="self-start mt-2 min-h-[44px] text-[15px] font-bold text-sol-mar underline"
            >
              Trocar número
            </button>
            <div className="mt-auto pt-8">
              <button type="submit" disabled={loading || otp.length < 6} className={`${btnPrimario} w-full`}>
                {loading ? "Confirmando..." : "Confirmar"}
              </button>
              <div className="flex justify-center mt-2">{pular}</div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
