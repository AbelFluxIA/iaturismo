import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Download, Camera, Share2, Link2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Compartilhar link do mural (para família e amigos)
  async function shareFamilyLink() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: mural?.title || "Mural de Viagem",
        text: `Veja as memórias da viagem: ${mural?.title}`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  }

  // Gerar imagem para Story (1080×1920) com as melhores fotos
  async function shareStory() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d")!;

    const bestPhotos = photos.slice(0, 4);

    // Fundo escuro
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 1080, 1920);

    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    try {
      if (bestPhotos.length === 1) {
        // Foto única ocupando quase tudo
        const img = await loadImg(bestPhotos[0].photo_url);
        ctx.drawImage(img, 0, 200, 1080, 1300);
      } else if (bestPhotos.length === 2) {
        const imgs = await Promise.all(bestPhotos.map(p => loadImg(p.photo_url)));
        ctx.drawImage(imgs[0], 0, 200, 1080, 640);
        ctx.drawImage(imgs[1], 0, 860, 1080, 640);
      } else if (bestPhotos.length >= 3) {
        const imgs = await Promise.all(bestPhotos.slice(0, 4).map(p => loadImg(p.photo_url)));
        ctx.drawImage(imgs[0], 0, 200, 1080, 640);
        const cols = imgs.length >= 4 ? [0, 360, 720] : [0, 540];
        const w = imgs.length >= 4 ? 350 : 530;
        for (let i = 1; i < Math.min(imgs.length, 4); i++) {
          ctx.drawImage(imgs[i], cols[i - 1] ?? (i - 1) * (1080 / (imgs.length - 1)), 860, w, 640);
        }
      }

      // Gradiente no topo e base
      const topGrad = ctx.createLinearGradient(0, 0, 0, 280);
      topGrad.addColorStop(0, "rgba(15,23,42,1)");
      topGrad.addColorStop(1, "rgba(15,23,42,0)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, 1080, 280);

      const botGrad = ctx.createLinearGradient(0, 1520, 0, 1920);
      botGrad.addColorStop(0, "rgba(15,23,42,0)");
      botGrad.addColorStop(1, "rgba(15,23,42,1)");
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, 1520, 1080, 400);

      // Título
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 64px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(mural?.title || "Minha Viagem", 540, 120);

      ctx.font = "36px Arial, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(`${photos.length} momentos registrados`, 540, 180);

      // Branding
      ctx.font = "bold 32px Arial, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText("Criado com Sol IA Turismo ✨", 540, 1870);
    } catch {
      // fallback: apenas fundo com texto
    }

    // Converter canvas para blob e compartilhar
    canvas.toBlob(async blob => {
      if (!blob) return;
      const file = new File([blob], "mural-story.jpg", { type: "image/jpeg" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: mural?.title || "Minha Viagem" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mural-story.jpg";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Imagem baixada! Poste no seu Story.");
      }
    }, "image/jpeg", 0.92);
  }

  // Gerar PDF álbum com jsPDF
  async function downloadAlbumPdf() {
    if (photos.length === 0) {
      toast.error("Nenhuma foto no mural ainda.");
      return;
    }
    setGeneratingPdf(true);

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const PAGE_W = 210;
      const PAGE_H = 297;

      // Capa
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, PAGE_W, PAGE_H, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.setFont("helvetica", "bold");
      pdf.text(mural?.title || "Minha Viagem", PAGE_W / 2, 80, { align: "center" });
      if (mural?.description) {
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(200, 200, 200);
        const lines = pdf.splitTextToSize(mural.description, 160);
        pdf.text(lines, PAGE_W / 2, 100, { align: "center" });
      }
      pdf.setFontSize(12);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`${photos.length} momentos`, PAGE_W / 2, 130, { align: "center" });
      pdf.text("Criado com Sol IA Turismo", PAGE_W / 2, PAGE_H - 20, { align: "center" });

      const loadImageAsDataUrl = (url: string): Promise<string> =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const c = document.createElement("canvas");
            c.width = img.width;
            c.height = img.height;
            c.getContext("2d")!.drawImage(img, 0, 0);
            resolve(c.toDataURL("image/jpeg", 0.85));
          };
          img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${url}`));
          img.src = url;
        });

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        pdf.addPage();

        pdf.setFillColor(248, 248, 248);
        pdf.rect(0, 0, PAGE_W, PAGE_H, "F");

        // Foto
        try {
          const dataUrl = await loadImageAsDataUrl(photo.photo_url);
          const imgH = 140;
          pdf.addImage(dataUrl, "JPEG", 15, 20, PAGE_W - 30, imgH);
        } catch {
          pdf.setFillColor(200, 200, 200);
          pdf.rect(15, 20, PAGE_W - 30, 140, "F");
        }

        // Número do momento
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Momento ${i + 1}`, 15, 175);

        // Narração
        if (photo.narrative_text || photo.caption) {
          pdf.setFontSize(13);
          pdf.setTextColor(50, 50, 50);
          pdf.setFont("helvetica", "italic");
          const text = photo.narrative_text || photo.caption || "";
          const lines = pdf.splitTextToSize(text, PAGE_W - 30);
          pdf.text(lines, 15, 185);
        }

        // Número de página
        pdf.setFontSize(9);
        pdf.setTextColor(180, 180, 180);
        pdf.setFont("helvetica", "normal");
        pdf.text(`${i + 2} / ${photos.length + 1}`, PAGE_W - 15, PAGE_H - 10, { align: "right" });
      }

      pdf.save(`${(mural?.title || "mural-viagem").replace(/\s+/g, "-")}.pdf`);
      toast.success("Álbum PDF gerado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  }

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
      <canvas ref={canvasRef} className="hidden" />

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

      {/* Ações */}
      <div className="container mx-auto px-4 py-4 flex flex-wrap gap-3 justify-end">
        <Button variant="outline" onClick={shareFamilyLink} className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Compartilhar com família
        </Button>

        <Button variant="outline" onClick={shareStory} className="flex items-center gap-2" disabled={photos.length === 0}>
          <Share2 className="h-4 w-4" />
          Compartilhar Story
        </Button>

        <Button variant="outline" onClick={downloadAlbumPdf} disabled={generatingPdf || photos.length === 0} className="flex items-center gap-2">
          {generatingPdf ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {generatingPdf ? "Gerando..." : "Baixar Álbum PDF"}
        </Button>

        {mural.pdf_url && (
          <a href={mural.pdf_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Ver Roteiro PDF
            </Button>
          </a>
        )}
      </div>

      {/* Photo Grid */}
      <div className="container mx-auto px-4 py-8">
        {photos.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">As fotos da viagem aparecerão aqui em breve!</p>
            <p className="text-sm mt-2 text-slate-400">Ative a Sol Acompanhante e mande suas fotos pelo WhatsApp.</p>
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
                {/* Foto */}
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

                {/* Narração */}
                <div className="w-full md:w-1/2 space-y-3">
                  <span className="text-sm text-blue-600 font-medium">
                    Momento {photo.order_index || index + 1}
                  </span>
                  {photo.caption && (
                    <h3 className="text-xl font-semibold text-slate-800">
                      {photo.caption}
                    </h3>
                  )}
                  {photo.narrative_text && (
                    <p className="text-slate-600 leading-relaxed italic text-lg">
                      "{photo.narrative_text}"
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    {new Date(photo.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-slate-400 text-sm border-t border-slate-100 mt-8">
        <p>Memórias geradas com ❤️ pela Sol IA Turismo</p>
      </footer>
    </div>
  );
};

export default MuralGallery;
