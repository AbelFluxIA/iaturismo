import { useClientAuth } from "@/contexts/ClientAuthContext";

export default function AppRoteiro() {
  const { profile, profileLoading } = useClientAuth();

  if (profileLoading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c8a96e]" />
      </div>
    );
  }

  const itinerary = profile?.itinerary;

  if (!itinerary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center gap-4">
        <span className="text-5xl">📄</span>
        <h3 className="text-lg font-semibold text-[#1a1a1a]">Roteiro ainda não gerado</h3>
        <p className="text-sm text-[#888]">
          Quando a Sol gerar seu roteiro personalizado, ele aparecerá aqui.
        </p>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    pending: "Aguardando geração",
    generating: "Gerando seu roteiro...",
    done: "Pronto!",
    error: "Erro na geração",
  };

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    generating: "bg-blue-100 text-blue-800",
    done: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <h2 className="text-xl font-bold text-[#1a1a1a]">Seu roteiro</h2>

      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
        {/* Trip info */}
        {profile?.destination && (
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗺️</span>
            <div>
              <p className="text-xs text-[#999] uppercase tracking-wide">Destino</p>
              <p className="font-semibold text-[#1a1a1a]">{profile.destination}</p>
            </div>
          </div>
        )}

        {(profile?.arrivalDate || profile?.departureDate) && (
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-xs text-[#999] uppercase tracking-wide">Período</p>
              <p className="font-semibold text-[#1a1a1a]">
                {profile.arrivalDate
                  ? new Date(profile.arrivalDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
                  : "—"}
                {" até "}
                {profile.departureDate
                  ? new Date(profile.departureDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
                  : "—"}
              </p>
            </div>
          </div>
        )}

        {itinerary.days > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌅</span>
            <div>
              <p className="text-xs text-[#999] uppercase tracking-wide">Duração</p>
              <p className="font-semibold text-[#1a1a1a]">
                {itinerary.days} dia{itinerary.days !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}

        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              statusColor[itinerary.status] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {statusLabel[itinerary.status] ?? itinerary.status}
          </span>
        </div>
      </div>

      {/* PDF button */}
      {itinerary.pdfUrl ? (
        <a
          href={itinerary.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#c8a96e] text-white font-semibold text-sm active:scale-95 transition-transform shadow-sm"
        >
          <span>📥</span> Baixar PDF do roteiro
        </a>
      ) : itinerary.status === "generating" ? (
        <div className="flex items-center justify-center gap-2 bg-blue-50 rounded-xl py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
          <p className="text-sm text-blue-700">Gerando seu roteiro personalizado...</p>
        </div>
      ) : null}
    </div>
  );
}
