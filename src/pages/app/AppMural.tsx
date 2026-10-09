import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Image as ImageIcon, Link2, MessageCircle } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { TopBar, Carregando, Vazio, Aviso, btnPrimario, btnSecundario } from "@/components/app/ui";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
}

export default function AppMural() {
  const { profile, token } = useClientAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

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
              <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-[10px] overflow-hidden bg-sol-claro">
                <img src={photo.url} alt={photo.caption ?? "Foto da viagem"} className="w-full h-full object-cover" loading="lazy" />
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
