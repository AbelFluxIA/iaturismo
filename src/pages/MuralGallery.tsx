import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Download, Share2, Link2, X, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { toast } from "sonner";

interface Mural {
  id: string;
  title: string | null;
  share_code: string;
  cover_photo_url: string | null;
  pdf_url: string | null;
  created_at: string;
}

interface MuralPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  order_index: number;
  created_at: string;
}

const MuralGallery = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [mural, setMural] = useState<Mural | null>(null);
  const [photos, setPhotos] = useState<MuralPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    const fetchMural = async () => {
      if (!shareCode) return;
      const { data: muralData, error } = await supabase
        .from("photo_murals")
        .select("*")
        .eq("share_code", shareCode)
        .maybeSingle();

      if (error || !muralData) { setNotFound(true); setLoading(false); return; }
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

  // Keyboard navigation in lightbox
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setLightboxIndex(null);
    if (e.key === "ArrowRight") setLightboxIndex(prev => prev !== null ? Math.min(photos.length - 1, prev + 1) : null);
    if (e.key === "ArrowLeft") setLightboxIndex(prev => prev !== null ? Math.max(0, prev - 1) : null);
  }, [photos.length]);

  useEffect(() => {
    if (lightboxIndex !== null) {
      window.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { window.removeEventListener("keydown", handleKey); document.body.style.overflow = ""; };
  }, [lightboxIndex, handleKey]);

  async function shareLink() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: mural?.title || "Mural de Viagem", url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  }

  async function downloadPhoto(url: string, index: number) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `momento-${index + 1}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  }

  async function downloadAlbumPdf() {
    if (photos.length === 0) { toast.error("Nenhuma foto no mural ainda."); return; }
    setGeneratingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210, H = 297;

      // Capa
      pdf.setFillColor(10, 10, 10);
      pdf.rect(0, 0, W, H, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.setFont("helvetica", "bold");
      pdf.text(mural?.title || "Minha Viagem", W / 2, 90, { align: "center" });
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(180, 180, 180);
      pdf.text(`${photos.length} momentos registrados`, W / 2, 108, { align: "center" });
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text("Criado com Sol IA Turismo ☀️", W / 2, H - 20, { align: "center" });

      const loadImg = (url: string): Promise<string> =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const c = document.createElement("canvas");
            c.width = img.width; c.height = img.height;
            c.getContext("2d")!.drawImage(img, 0, 0);
            resolve(c.toDataURL("image/jpeg", 0.85));
          };
          img.onerror = reject;
          img.src = url;
        });

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        pdf.addPage();
        pdf.setFillColor(10, 10, 10);
        pdf.rect(0, 0, W, H, "F");
        try {
          const dataUrl = await loadImg(photo.photo_url);
          pdf.addImage(dataUrl, "JPEG", 15, 20, W - 30, 150);
        } catch {
          pdf.setFillColor(30, 30, 30);
          pdf.rect(15, 20, W - 30, 150, "F");
        }
        if (photo.caption) {
          pdf.setFontSize(12);
          pdf.setFont("helvetica", "italic");
          pdf.setTextColor(200, 200, 200);
          const lines = pdf.splitTextToSize(photo.caption, W - 30);
          pdf.text(lines, 15, 182);
        }
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(80, 80, 80);
        pdf.text(`${i + 2} / ${photos.length + 1}`, W - 15, H - 10, { align: "right" });
      }

      pdf.save(`${(mural?.title || "mural-viagem").replace(/\s+/g, "-")}.pdf`);
      toast.success("Álbum gerado!");
    } catch {
      toast.error("Erro ao gerar PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/40" />
      </div>
    );
  }

  if (notFound || !mural) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        <div className="text-center">
          <Camera className="h-14 w-14 mx-auto mb-4 opacity-30" />
          <h1 className="text-xl font-semibold mb-1">Mural não encontrado</h1>
          <p className="text-white/40 text-sm">O link não existe ou expirou.</p>
        </div>
      </div>
    );
  }

  const currentPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* Header fixo */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/8 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-semibold text-base truncate">{mural.title || "Meu Mural"}</h1>
            <p className="text-white/40 text-xs">{photos.length} {photos.length === 1 ? "momento" : "momentos"}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={shareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Link2 size={13} /> Compartilhar
            </button>
            <button
              onClick={downloadAlbumPdf}
              disabled={generatingPdf || photos.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-40"
            >
              {generatingPdf
                ? <span className="animate-spin rounded-full h-3 w-3 border-b border-white" />
                : <Download size={13} />
              }
              {generatingPdf ? "Gerando..." : "PDF"}
            </button>
          </div>
        </div>
      </header>

      {/* Grid masonry */}
      <main className="max-w-6xl mx-auto px-2 py-4">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-white/30">
            <Camera className="h-16 w-16 mb-4" />
            <p className="text-base">As fotos aparecerão aqui</p>
            <p className="text-xs mt-1 text-white/20">Mande fotos pelo WhatsApp com a Sol Acompanhante</p>
          </div>
        ) : (
          <div
            className="columns-2 md:columns-3 lg:columns-4 gap-2"
            style={{ columnGap: "8px" }}
          >
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="break-inside-avoid mb-2 relative group cursor-zoom-in overflow-hidden rounded-xl bg-white/5"
                onClick={() => setLightboxIndex(index)}
              >
                <img
                  src={photo.photo_url}
                  alt={photo.caption || `Momento ${index + 1}`}
                  className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Overlay com narração + botão download */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                  {photo.caption && (
                    <p className="text-white text-xs leading-snug line-clamp-3 mb-2">
                      {photo.caption}
                    </p>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadPhoto(photo.photo_url, index); }}
                    className="self-end bg-white/20 hover:bg-white/40 rounded-full p-1.5 transition-colors"
                    title="Baixar foto"
                  >
                    <Download size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-10 text-white/20 text-xs border-t border-white/8 mt-6">
        Memórias geradas com ❤️ pela Sol IA Turismo
      </footer>

      {/* Lightbox */}
      {currentPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 md:p-8"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Fechar */}
          <button
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            onClick={() => setLightboxIndex(null)}
          >
            <X size={26} />
          </button>

          {/* Contador */}
          <p className="absolute top-4 left-4 text-white/40 text-sm">
            {lightboxIndex! + 1} / {photos.length}
          </p>

          {/* Foto */}
          <div
            className="max-w-4xl w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentPhoto.photo_url}
              alt=""
              className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
            {currentPhoto.caption && (
              <p className="mt-4 text-white/70 text-center italic text-sm max-w-xl px-4 leading-relaxed">
                {currentPhoto.caption}
              </p>
            )}
            <button
              onClick={() => downloadPhoto(currentPhoto.photo_url, lightboxIndex!)}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm transition-colors"
            >
              <Download size={14} /> Baixar foto
            </button>
          </div>

          {/* Navegar */}
          {lightboxIndex! > 0 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex! - 1); }}
            >
              <ChevronLeft size={28} />
            </button>
          )}
          {lightboxIndex! < photos.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex! + 1); }}
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MuralGallery;
