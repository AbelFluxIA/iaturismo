import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { Aviso, btnPrimario } from "@/components/app/ui";

type Step = "inicio" | "phone" | "otp";

export default function Entrar() {
  const [step, setStep] = useState<Step>("inicio");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useClientAuth();
  const navigate = useNavigate();

  const digitos = phone.replace(/\D/g, "");

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
      navigate("/app", { replace: true });
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
      onClick={() => { setError(""); setStep(step === "otp" ? "phone" : "inicio"); }}
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
                Sua viagem pela Paraíba, organizada.
              </h1>
              <p className="m-0 text-[15px] leading-snug text-sol-texto2">
                Roteiro, mapa, álbum e segurança no mesmo lugar. A Sol também atende você no WhatsApp.
              </p>
            </div>
            <div className="mt-auto pt-8 flex flex-col gap-3">
              <button type="button" onClick={() => setStep("phone")} className={btnPrimario}>
                Entrar com meu WhatsApp
              </button>
            </div>
          </>
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
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
