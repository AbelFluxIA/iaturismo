import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";

type Step = "phone" | "otp";

export default function Entrar() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useClientAuth();
  const navigate = useNavigate();

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
      if (!res.ok) { setError(data.error || "Erro ao enviar código"); return; }
      setStep("otp");
    } catch {
      setError("Erro de conexão. Tente novamente.");
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
      if (!res.ok) { setError(data.error || "Código inválido"); return; }
      login(data.token, data.phone, data.name);
      navigate("/app", { replace: true });
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#ece8e3] px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">☀️</div>
          <h1 className="text-3xl font-bold text-[#1a1a1a]">Sol</h1>
          <p className="text-[#666] mt-1 text-sm">Sua assistente de viagens em João Pessoa</p>
        </div>

        {step === "phone" ? (
          <form onSubmit={handleSolicitarOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Seu número do WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                required
                className="w-full px-4 py-3 rounded-xl border border-[#d0c9c0] bg-white text-[#1a1a1a] placeholder-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#c8a96e] text-base"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading || phone.length < 8}
              className="w-full py-3 rounded-xl bg-[#c8a96e] text-white font-semibold text-base disabled:opacity-50 active:scale-95 transition-transform"
            >
              {loading ? "Enviando..." : "Receber código via WhatsApp"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerificarOtp} className="space-y-4">
            <div>
              <p className="text-sm text-[#555] mb-4 text-center">
                Enviamos um código de 6 dígitos para o WhatsApp do número{" "}
                <span className="font-semibold text-[#1a1a1a]">{phone}</span>
              </p>
              <label className="block text-sm font-medium text-[#333] mb-1">
                Código de verificação
              </label>
              <input
                type="number"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                maxLength={6}
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-[#d0c9c0] bg-white text-[#1a1a1a] placeholder-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#c8a96e] text-center text-2xl tracking-widest font-mono"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-3 rounded-xl bg-[#c8a96e] text-white font-semibold text-base disabled:opacity-50 active:scale-95 transition-transform"
            >
              {loading ? "Verificando..." : "Entrar"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
              className="w-full py-2 text-sm text-[#888] underline"
            >
              Usar outro número
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
