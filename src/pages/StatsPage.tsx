import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Share2, Link, Gift, Users, CheckCircle, TrendingUp } from "lucide-react";

interface Stats {
  referral_code: string;
  name: string | null;
  free_credits: number;
  total_referrals: number;
  converted_referrals: number;
}

export default function StatsPage() {
  const { referralCode } = useParams<{ referralCode: string }>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const solPhone = import.meta.env.VITE_SOL_PHONE || "";
  const referralLink = solPhone
    ? `https://wa.me/${solPhone}?text=${encodeURIComponent(`Oi Sol! Vim pelo link de ${stats?.name || "um amigo"} (ref:${referralCode})`)}`
    : "";

  useEffect(() => {
    if (!referralCode) return;
    supabase
      .from("referral_stats")
      .select("referral_code, name, free_credits, total_referrals, converted_referrals")
      .eq("referral_code", referralCode.toUpperCase())
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        setStats(data as Stats);
        setLoading(false);
      });
  }, [referralCode]);

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const shareLink = () => {
    if (navigator.share && referralLink) {
      navigator.share({
        title: "Sol Roteiros — Crie o seu!",
        text: `Crie seu roteiro de viagem personalizado com a Sol! Acessa pelo meu link ☀️`,
        url: referralLink,
      });
    } else {
      copyLink();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(40,35%,93%)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[hsl(152,42%,18%)]" />
      </div>
    );
  }

  if (notFound || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(40,35%,93%)] text-center px-4">
        <div>
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-2xl font-bold text-[hsl(152,42%,18%)] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Conta não encontrada
          </h1>
          <p className="text-gray-500 text-sm">Verifique o link que a Sol enviou para você.</p>
        </div>
      </div>
    );
  }

  const conversionRate =
    stats.total_referrals > 0
      ? Math.round((stats.converted_referrals / stats.total_referrals) * 100)
      : 0;

  const pendingReferrals = stats.total_referrals - stats.converted_referrals;

  return (
    <div className="min-h-screen bg-[hsl(40,35%,93%)]">
      {/* Header */}
      <div className="bg-[hsl(152,42%,18%)] text-white px-4 py-8">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center gap-2 mb-1 opacity-60">
            <span className="text-sm">☀️</span>
            <span className="text-[10px] font-medium tracking-widest uppercase">Sol Roteiros</span>
          </div>
          <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Olá, {stats.name || "viajante"} 👋
          </h1>
          <p className="text-sm opacity-60 mt-1">Seu painel de indicações</p>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 py-6 space-y-4">

        {/* Créditos grátis */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Gift className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Roteiros grátis</p>
              <p className="text-3xl font-bold text-[hsl(152,42%,18%)]">{stats.free_credits}</p>
            </div>
          </div>
          {stats.free_credits > 0 && (
            <p className="text-xs text-gray-500 mt-3 border-t border-gray-50 pt-3">
              Mande mensagem pra Sol para usar seus créditos grátis!
            </p>
          )}
          {stats.free_credits === 0 && (
            <p className="text-xs text-gray-400 mt-3 border-t border-gray-50 pt-3">
              Indique amigos para ganhar roteiros grátis.
            </p>
          )}
        </div>

        {/* Cards de indicação */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 text-center">
            <Users className="h-5 w-5 text-gray-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-800">{stats.total_referrals}</p>
            <p className="text-[10px] text-gray-400 leading-tight mt-0.5">indicações feitas</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 text-center">
            <CheckCircle className="h-5 w-5 text-[hsl(152,42%,35%)] mx-auto mb-1" />
            <p className="text-2xl font-bold text-[hsl(152,42%,18%)]">{stats.converted_referrals}</p>
            <p className="text-[10px] text-gray-400 leading-tight mt-0.5">pagaram</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 text-center">
            <TrendingUp className="h-5 w-5 text-blue-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-600">{conversionRate}%</p>
            <p className="text-[10px] text-gray-400 leading-tight mt-0.5">conversão</p>
          </div>
        </div>

        {/* Indicações pendentes */}
        {pendingReferrals > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-sm text-amber-800 font-medium">
              ⏳ {pendingReferrals} pessoa{pendingReferrals !== 1 ? "s" : ""} ainda {pendingReferrals !== 1 ? "não pagaram" : "não pagou"}.
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Quando pagarem, você ganha mais roteiros grátis automaticamente!
            </p>
          </div>
        )}

        {/* Link de compartilhamento */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-1">Seu link de indicação</p>
            <p className="text-sm font-mono text-gray-700 break-all bg-gray-50 rounded-lg px-3 py-2 text-[11px]">
              {referralLink || `wa.me/${solPhone}?ref=${referralCode}`}
            </p>
          </div>
          <div className="grid grid-cols-2 border-t border-gray-100">
            <button
              onClick={shareLink}
              className="flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-[hsl(152,42%,18%)] hover:bg-gray-50 transition-colors border-r border-gray-100"
            >
              <Share2 className="h-4 w-4" />
              Compartilhar
            </button>
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Link className="h-4 w-4" />
              {copied ? "Copiado ✓" : "Copiar link"}
            </button>
          </div>
        </div>

        {/* Explicação */}
        <div className="bg-[hsl(152,42%,18%)]/5 rounded-2xl p-4">
          <p className="text-xs font-semibold text-[hsl(152,42%,18%)] mb-2">Como funciona?</p>
          <div className="space-y-1.5">
            {[
              "Compartilhe seu link com quem vai viajar",
              "Quando a pessoa contratar, você ganha 1 roteiro grátis",
              "Sem limite — quanto mais indica, mais ganha!",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[hsl(152,42%,35%)] font-bold text-xs mt-0.5">{i + 1}.</span>
                <p className="text-xs text-gray-600">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 py-4">
          Código: <span className="font-mono font-semibold">{referralCode}</span> · Sol ☀️
        </p>
      </div>
    </div>
  );
}
