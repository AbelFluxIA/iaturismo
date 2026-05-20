import { useClientAuth } from "@/contexts/ClientAuthContext";
import { useNavigate } from "react-router-dom";

function StatusCard({ icon, label, value, onClick }: { icon: string; label: string; value: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center bg-white rounded-2xl p-5 gap-2 shadow-sm active:scale-95 transition-transform text-center w-full"
    >
      <span className="text-3xl">{icon}</span>
      <span className="text-xs text-[#999] font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-[#1a1a1a] leading-snug">{value}</span>
    </button>
  );
}

export default function AppDashboard() {
  const { profile, profileLoading, name } = useClientAuth();
  const navigate = useNavigate();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const firstName = (name || profile?.name || "viajante").split(" ")[0];

  if (profileLoading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c8a96e]" />
      </div>
    );
  }

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const tripStatus = () => {
    if (!profile?.destination) return "Nenhuma viagem planejada";
    let s = profile.destination;
    if (profile.arrivalDate) s += ` · ${formatDate(profile.arrivalDate)}`;
    if (profile.departureDate) s += ` – ${formatDate(profile.departureDate)}`;
    return s;
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-[#888] text-sm">{greeting()},</p>
        <h2 className="text-2xl font-bold text-[#1a1a1a]">{firstName} ✈️</h2>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatusCard
          icon="🗺️"
          label="Viagem"
          value={tripStatus()}
          onClick={() => navigate("/app/roteiro")}
        />
        <StatusCard
          icon="📸"
          label="Mural"
          value={profile?.mural ? "Ver fotos" : "Sem fotos ainda"}
          onClick={() => navigate("/app/mural")}
        />
        <StatusCard
          icon="⭐"
          label="Créditos"
          value={`${profile?.freeCredits ?? 0} crédito${(profile?.freeCredits ?? 0) !== 1 ? "s" : ""}`}
          onClick={() => navigate("/app/creditos")}
        />
        <StatusCard
          icon={profile?.hasPaid ? "✅" : "💳"}
          label="Status"
          value={profile?.hasPaid ? "Pago" : "Aguardando pagamento"}
        />
      </div>

      {/* Itinerary CTA */}
      {profile?.itinerary?.pdfUrl && (
        <a
          href={profile.itinerary.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-[#c8a96e] text-white rounded-2xl px-5 py-4 shadow-sm active:scale-95 transition-transform"
        >
          <span className="text-2xl">📄</span>
          <div>
            <p className="font-semibold text-sm">Seu roteiro está pronto!</p>
            <p className="text-xs opacity-80">Toque para abrir o PDF</p>
          </div>
        </a>
      )}

      {/* Mural preview */}
      {profile?.mural?.cover_photo_url && (
        <div
          className="rounded-2xl overflow-hidden shadow-sm cursor-pointer active:scale-95 transition-transform"
          onClick={() => navigate("/app/mural")}
        >
          <div className="relative">
            <img
              src={profile.mural.cover_photo_url}
              alt="Mural"
              className="w-full h-44 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end px-4 pb-4">
              <div>
                <p className="text-white font-semibold text-sm">Mural de fotos</p>
                <p className="text-white/70 text-xs">Ver todas as fotos →</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Referral teaser */}
      {profile?.referralCode && (
        <div
          className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm cursor-pointer active:scale-95 transition-transform"
          onClick={() => navigate("/app/creditos")}
        >
          <span className="text-2xl">🎁</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#1a1a1a]">Indique amigos, ganhe créditos</p>
            <p className="text-xs text-[#888]">Código: {profile.referralCode}</p>
          </div>
          <span className="text-[#ccc]">›</span>
        </div>
      )}
    </div>
  );
}
