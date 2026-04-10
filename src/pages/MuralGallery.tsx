import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Download, Camera, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Mural {
  id: string;
  title: string | null;
  description: string | null;
  share_code: string;
  cover_photo_url: string | null;
  pdf_url: string | null;
  created_at: string;
}

interface MuralPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  narrative_text: string | null;
  order_index: number;
  created_at: string;
}

const MuralGallery = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [mural, setMural] = useState<Mural | null>(null);
  const [photos, setPhotos] = useState<MuralPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchMural = async () => {
      if (!shareCode) return;

      const { data: muralData, error: muralError } = await supabase
        .from("photo_murals")
        .select("*")
        .eq("share_code", shareCode)
        .maybeSingle();

      if (muralError || !muralData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setMural(muralData);

      const { data: photosData } = await supabase
        .from("mural_photos")
        .select("*")
        .eq("mural_id", muralData.id)
        .order("order_index", { ascending: true });

      setPhotos(photosData || []);
      setLoading(false);
    };

    fetchMural();
  }, [shareCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (notFound || !mural) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-white">
        <div className="text-center">
          <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h1 className="text-2xl font-bold mb-2">Mural não encontrado</h1>
          <p className="text-slate-400">O link que você acessou não existe ou expirou.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Hero Cover */}
      <div
        className="relative h-[40vh] md:h-[50vh] bg-cover bg-center flex items-end"
        style={{
          backgroundImage: mural.cover_photo_url
            ? `url(${mural.cover_photo_url})`
            : "linear-gradient(135deg, #0f172a 0%, #1e40af 100%)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="relative z-10 container mx-auto px-4 pb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            📸 {mural.title || "Minha Viagem"}
          </h1>
          {mural.description && (
            <p className="text-white/80 text-lg">{mural.description}</p>
          )}
          <p className="text-white/60 text-sm mt-2">{photos.length} momentos registrados</p>
        </div>
      </div>

      {/* PDF Download */}
      {mural.pdf_url && (
        <div className="container mx-auto px-4 py-4 flex justify-end">
          <a href={mural.pdf_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Baixar Diário de Viagem
            </Button>
          </a>
        </div>
      )}

      {/* Photo Grid */}
      <div className="container mx-auto px-4 py-8">
        {photos.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">As fotos da viagem aparecerão aqui em breve!</p>
          </div>
        ) : (
          <div className="space-y-12">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className={`flex flex-col md:flex-row items-center gap-6 md:gap-10 ${
                  index % 2 !== 0 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Photo */}
                <div className="w-full md:w-1/2">
                  <div className="rounded-2xl overflow-hidden shadow-xl">
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || `Momento ${photo.order_index}`}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Caption & Narrative */}
                <div className="w-full md:w-1/2 space-y-3">
                  <span className="text-sm text-blue-600 font-medium">
                    Momento {photo.order_index}
                  </span>
                  {photo.caption && (
                    <h3 className="text-xl font-semibold text-slate-800">
                      {photo.caption}
                    </h3>
                  )}
                  {photo.narrative_text && (
                    <p className="text-slate-600 leading-relaxed italic">
                      {photo.narrative_text}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-slate-400 text-sm border-t border-slate-100 mt-8">
        <p>Gerado com ❤️ por IA Turismo</p>
      </footer>
    </div>
  );
};

export default MuralGallery;
