import { useState } from "react";
import { Link } from "react-router-dom";
import { Image as ImageIcon, Link2 } from "lucide-react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { TopBar, Carregando, Vazio, Aviso, btnSecundario } from "@/components/app/ui";
import { EnviarFotos, GradeFotos, useAlbum, type GrupoAlbum } from "@/components/app/Album";

// "16 a 17/05/2026", "30/05 a 02/06/2026" ou "09/08/2026"
function periodo(g: GrupoAlbum) {
  const dia = (d: string) => new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
  const ini = dia(g.inicio);
  const fim = dia(g.fim);
  if (ini === fim) return ini;
  if (ini.slice(3) === fim.slice(3)) return `${ini.slice(0, 2)} a ${fim}`;
  if (ini.slice(6) === fim.slice(6)) return `${ini.slice(0, 5)} a ${fim}`;
  return `${ini} a ${fim}`;
}

export default function AppMural() {
  const { profile } = useClientAuth();
  const { album, loading, recarregar } = useAlbum();
  const [copiado, setCopiado] = useState(false);

  if (loading) return <Carregando />;

  const total = album?.total ?? 0;
  const shareCode = album?.mural?.shareCode ?? profile?.mural?.share_code ?? null;
  const linkMural = shareCode ? `${window.location.origin}/mural/${shareCode}` : null;

  function copiarLink() {
    if (!linkMural) return;
    navigator.clipboard?.writeText(linkMural).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <div className="flex flex-col">
      <TopBar title="Álbum" step={total ? `${total} ${total === 1 ? "foto" : "fotos"}` : undefined} back="/app" />
      <div className="flex flex-col gap-4 px-5">
        <EnviarFotos aoTerminar={recarregar} />

        {total === 0 ? (
          <Vazio
            icone={<ImageIcon size={32} />}
            titulo="Seu álbum ainda não tem fotos"
            texto="Mande fotos da viagem para a Sol, por aqui, pela câmera no chat ou pelo WhatsApp. Elas aparecem separadas por viagem."
          />
        ) : (
          album!.grupos.map((g) => (
            <section key={g.inicio} aria-label={g.titulo} className="flex flex-col gap-2">
              <div className="flex flex-col">
                <h2 className="m-0 text-base font-extrabold">{g.titulo}</h2>
                <span className="text-xs text-sol-texto2">{periodo(g)} · {g.fotos.length} {g.fotos.length === 1 ? "foto" : "fotos"}</span>
              </div>
              <GradeFotos fotos={g.fotos} />
            </section>
          ))
        )}

        {linkMural && (
          <div className="grid grid-cols-2 gap-2">
            <Link to={`/mural/${shareCode}`} className={`${btnSecundario} !text-sm no-underline`}>Ver mural</Link>
            <button type="button" onClick={copiarLink} className={`${btnSecundario} !text-sm`}>
              <Link2 size={16} /> {copiado ? "Link copiado" : "Copiar link"}
            </button>
          </div>
        )}
        <Aviso tom="neutro">
          Com a Sol Guia ativa, cada foto entra no mural com um comentário da Sol{linkMural ? ". O mural abre só para quem tiver o link" : ""}.
        </Aviso>
      </div>
    </div>
  );
}
