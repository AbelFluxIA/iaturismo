import { useState } from "react";
import { Share2 } from "lucide-react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { TopBar, btnPrimario, cartao } from "@/components/app/ui";

export default function AppCreditos() {
  const { profile } = useClientAuth();
  const [copied, setCopied] = useState(false);

  const code = profile?.referralCode ?? "";
  const stats = profile?.referralStats;
  const creditos = profile?.freeCredits ?? 0;

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function share() {
    const text = `Usa esse código ${code} pra ter desconto na Sol, a assistente de viagens que monta seu roteiro! ☀️`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex flex-col">
      <TopBar title="Créditos e indicações" back="/app/perfil" />
      <div className="flex flex-col gap-2.5 px-5">
        <div className="flex flex-col gap-0.5 px-4 py-3 rounded-2xl bg-sol-fundo text-white">
          <span className="font-display font-extrabold text-[30px] text-sol-sun">
            {creditos} crédito{creditos !== 1 ? "s" : ""}
          </span>
          <span className="text-[13px] leading-snug">Use seus créditos em roteiros extras, sem custo.</span>
        </div>

        {code ? (
          <div className={`${cartao} flex flex-col gap-3 p-4`}>
            <div>
              <h2 className="m-0 text-base font-extrabold">Indique e ganhe</h2>
              <p className="m-0 mt-1 text-sm text-sol-texto2">
                A cada amigo que usar seu código e contratar um roteiro, você ganha um crédito.
              </p>
            </div>
            <div className="flex items-center gap-2 p-1.5 pl-3.5 rounded-[14px] bg-sol-areia border border-sol-linha">
              <span className="flex-1 font-display font-extrabold text-xl tracking-widest">{code}</span>
              <button type="button" onClick={copyCode} className="min-h-[44px] px-3.5 rounded-[10px] bg-sol-claro text-sol-claro-texto text-sm font-extrabold">
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
            <button type="button" onClick={share} className={btnPrimario}>
              <Share2 size={18} /> Compartilhar pelo WhatsApp
            </button>
            {stats && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-sol-linha text-center">
                <div>
                  <p className="m-0 font-display font-extrabold text-2xl">{stats.totalReferrals}</p>
                  <p className="m-0 text-xs text-sol-texto2">Indicações</p>
                </div>
                <div>
                  <p className="m-0 font-display font-extrabold text-2xl text-sol-ok">{stats.convertedReferrals}</p>
                  <p className="m-0 text-xs text-sol-texto2">Convertidas</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`${cartao} p-4 text-sm text-sol-texto2`}>
            Seu código de indicação aparece aqui depois que seu primeiro roteiro ficar pronto.
          </div>
        )}

        <div className={`${cartao} flex flex-col gap-2.5 p-4`}>
          <h2 className="m-0 text-base font-extrabold">Como funciona</h2>
          {[
            "Compartilhe seu código com amigos",
            "Eles usam o código ao contratar a Sol",
            "Você ganha 1 crédito por indicação convertida",
            "Use créditos em roteiros extras",
          ].map((texto, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex-none w-7 h-7 rounded-full bg-sol-claro text-sol-claro-texto text-sm font-extrabold flex items-center justify-center">{i + 1}</span>
              <p className="m-0 text-sm text-sol-fundo pt-1">{texto}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
