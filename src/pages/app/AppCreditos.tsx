import { useState } from "react";
import { useClientAuth } from "@/contexts/ClientAuthContext";

export default function AppCreditos() {
  const { profile } = useClientAuth();
  const [copied, setCopied] = useState(false);

  const code = profile?.referralCode ?? "";
  const stats = profile?.referralStats;

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function share() {
    const text = `Usa esse código ${code} pra ter desconto na Sol, a melhor assistente de viagens pra João Pessoa! 🌴☀️`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <h2 className="text-xl font-bold text-[#1a1a1a]">Créditos & Indicações</h2>

      {/* Credits balance */}
      <div className="bg-[#c8a96e] rounded-2xl p-6 text-white text-center shadow-sm">
        <p className="text-sm font-medium opacity-80 mb-1">Seus créditos</p>
        <p className="text-5xl font-bold">{profile?.freeCredits ?? 0}</p>
        <p className="text-sm opacity-70 mt-1">crédito{(profile?.freeCredits ?? 0) !== 1 ? "s" : ""} gratuito{(profile?.freeCredits ?? 0) !== 1 ? "s" : ""}</p>
      </div>

      {/* Referral program */}
      {code ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-[#1a1a1a] mb-1">Indique e ganhe!</h3>
            <p className="text-sm text-[#888]">
              A cada amigo que usar seu código e contratar um roteiro, você ganha um crédito gratuito.
            </p>
          </div>

          {/* Code display */}
          <div className="bg-[#f5f2ee] rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[#999] mb-0.5">Seu código</p>
              <p className="text-xl font-bold tracking-widest text-[#1a1a1a] font-mono">{code}</p>
            </div>
            <button
              onClick={copyCode}
              className="px-4 py-2 rounded-lg bg-[#c8a96e] text-white text-sm font-medium active:scale-95 transition-transform"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>

          <button
            onClick={share}
            className="w-full py-3 rounded-xl bg-[#1a1a1a] text-white font-semibold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <span>📤</span> Compartilhar código
          </button>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#f0ebe4]">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#1a1a1a]">{stats.totalReferrals}</p>
                <p className="text-xs text-[#999]">Indicações totais</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#c8a96e]">{stats.convertedReferrals}</p>
                <p className="text-xs text-[#999]">Convertidas</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
          <span className="text-3xl">🎁</span>
          <p className="text-sm text-[#888] mt-2">
            Seu código de indicação aparece aqui após concluir seu roteiro.
          </p>
        </div>
      )}

      {/* How it works */}
      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="font-semibold text-[#1a1a1a]">Como funciona</h3>
        {[
          { n: "1", text: "Compartilhe seu código com amigos" },
          { n: "2", text: "Eles usam o código ao contratar a Sol" },
          { n: "3", text: "Você ganha 1 crédito por indicação convertida" },
          { n: "4", text: "Use créditos para roteiros extras gratuitos" },
        ].map((step) => (
          <div key={step.n} className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-[#c8a96e] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {step.n}
            </span>
            <p className="text-sm text-[#555]">{step.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
