import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Image as ImageIcon, Link2, MessageCircle } from "lucide-react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TopBar, Carregando, Vazio, Aviso, btnPrimario, btnSecundario } from "@/components/app/ui";

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
}

export default function AppMural() {
  const { profile } = useClientAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

  // Mesma leitura da página pública do mural (/mural/:shareCode)
  useEffect(() => {
    const muralId = profile?.mural?.id;
    if (!muralId) { setLoading(false); return; }
    supabase
      .from("mural_photos")
      .select("id, photo_url, caption")
      .eq("mural_id", muralId)
      .order("order_index", { ascending: true })
      .then(({ data }) => setPhotos(data ?? []))
      .then(() => setLoading(false), () => setLoading(false));
  }, [profile?.mural?.id]);

  if (loading) return <Carregando />;

  const titulo = profile?.destination ? `Álbum · ${profile.destination}` : "Álbum da viagem";

  if (!profile?.mural) {
    return (
      <div className="flex flex-col">
        <TopBar title={titulo} back="/app/roteiro" />
        <div className="px-5">
          <Vazio
            icone={<ImageIcon size={32} />}
            titulo="Seu álbum ainda não tem fotos"
            texto="Mande fotos da viagem para a Sol no WhatsApp. Ela monta o álbum e um mural para você compartilhar."
          >
            <Link to="/app/chat" className={`${btnPrimario} w-full mt-4 no-underline`}>
              <MessageCircle size={18} /> Falar com a Sol
            </Link>
          </Vazio>
        </div>
      </div>
    );
  }

  const linkMural = `${window.location.origin}/mural/${profile.mural.share_code}`;

  function copiarLink() {
    navigator.clipboard?.writeText(linkMural).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <div className="flex flex-col">
      <TopBar title={titulo} step={`${photos.length} ${photos.length === 1 ? "foto" : "fotos"}`} back="/app/roteiro" />
      <div className="flex flex-col gap-2.5 px-5">
        {photos.length === 0 ? (
          <p className="text-sm text-sol-texto2 text-center py-8">Nenhuma foto no álbum ainda.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((photo) => (
              <a key={photo.id} href={photo.photo_url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-[10px] overflow-hidden bg-sol-claro">
                <img src={photo.photo_url} alt={photo.caption ?? "Foto da viagem"} className="w-full h-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link to={`/mural/${profile.mural.share_code}`} className={`${btnSecundario} !text-sm no-underline`}>Ver mural</Link>
          <button type="button" onClick={copiarLink} className={`${btnSecundario} !text-sm`}>
            <Link2 size={16} /> {copiado ? "Link copiado" : "Copiar link"}
          </button>
        </div>
        <Aviso tom="neutro">
          Para colocar mais fotos, envie para a Sol no WhatsApp. O mural abre só para quem tiver o link.
        </Aviso>
      </div>
    </div>
  );
}
