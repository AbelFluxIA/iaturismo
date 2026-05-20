import { useEffect, useState } from "react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { useNavigate } from "react-router-dom";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
}

export default function AppMural() {
  const { profile, token } = useClientAuth();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.mural?.share_code) { setLoading(false); return; }
    fetch(`${API_URL}/api/mural/${profile.mural.share_code}/photos`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setPhotos(Array.isArray(data) ? data : data.photos ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.mural?.share_code, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c8a96e]" />
      </div>
    );
  }

  if (!profile?.mural) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center gap-4">
        <span className="text-5xl">📸</span>
        <h3 className="text-lg font-semibold text-[#1a1a1a]">Seu mural ainda está vazio</h3>
        <p className="text-sm text-[#888]">
          As fotos da sua viagem aparecerão aqui depois de enviadas pela Sol.
        </p>
      </div>
    );
  }

  const shareCode = profile.mural.share_code;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#1a1a1a]">Mural de fotos</h2>
        <button
          onClick={() => navigate(`/mural/${shareCode}`)}
          className="text-xs text-[#c8a96e] underline"
        >
          Ver completo
        </button>
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-[#999] text-center py-8">Nenhuma foto no mural ainda.</p>
      ) : (
        <div className="columns-2 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="mb-2 break-inside-avoid rounded-xl overflow-hidden shadow-sm">
              <img
                src={photo.url}
                alt={photo.caption ?? "Foto"}
                className="w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate(`/mural/${shareCode}`)}
        className="w-full py-3 rounded-xl bg-[#c8a96e] text-white font-semibold text-sm active:scale-95 transition-transform"
      >
        Abrir mural completo
      </button>
    </div>
  );
}
