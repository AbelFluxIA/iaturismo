import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, ChevronLeft, ChevronRight, Image as ImageIcon, Link2, X } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TopBar, Carregando, Vazio, Aviso, btnPrimario, btnSecundario, formatarData } from "@/components/app/ui";

// Álbum: todas as fotos que a pessoa mandou para a Sol (WhatsApp ou app), por
// viagem. As que entraram no mural trazem o comentário da Sol.

interface Foto {
  url: string;
  legenda: string | null;
  data: string;
}

interface Grupo {
  titulo: string;
  inicio: string;
  fim: string;
  fotos: Foto[];
}

interface Album {
  grupos: Grupo[];
  total: number;
  mural: { shareCode: string; fotos: number } | null;
}

// "16 a 17/05/2026", "30/05 a 02/06/2026" ou "09/08/2026"
function periodo(g: Grupo) {
  const dia = (d: string) => new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
  const ini = dia(g.inicio);
  const fim = dia(g.fim);
  if (ini === fim) return ini;
  if (ini.slice(3) === fim.slice(3)) return `${ini.slice(0, 2)} a ${fim}`;
  if (ini.slice(6) === fim.slice(6)) return `${ini.slice(0, 5)} a ${fim}`;
  return `${ini} a ${fim}`;
}

// Bot antigo (sem /api/app/album): só as fotos do mural, como antes
async function albumDoMural(mural: { id: string; share_code: string; title: string | null }): Promise<Album> {
  const { data } = await supabase
    .from("mural_photos")
    .select("photo_url, caption, created_at")
    .eq("mural_id", mural.id)
    .order("order_index", { ascending: true });
  const fotos = (data ?? []).map((f) => ({ url: f.photo_url, legenda: f.caption ?? null, data: f.created_at }));
  return {
    grupos: fotos.length ? [{ titulo: mural.title ?? "Mural", inicio: fotos[0].data, fim: fotos[fotos.length - 1].data, fotos }] : [],
    total: fotos.length,
    mural: { shareCode: mural.share_code, fotos: fotos.length },
  };
}

function Visualizador({ fotos, inicial, fechar }: { fotos: Foto[]; inicial: number; fechar: () => void }) {
  const [i, setI] = useState(inicial);
  const foto = fotos[i];
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
      if (e.key === "ArrowRight") setI((x) => Math.min(fotos.length - 1, x + 1));
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [fotos.length, fechar]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Foto" className="fixed inset-0 z-[80] flex flex-col bg-black text-white font-corpo">
      <div className="flex-none flex items-center justify-between px-2 pt-[max(8px,env(safe-area-inset-top))]">
        <span className="px-3 text-sm text-white/80">{i + 1} de {fotos.length} · {formatarData(foto.data, { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
        <button type="button" aria-label="Fechar" onClick={fechar} className="w-12 h-12 flex items-center justify-center">
          <X size={24} />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center px-2">
        <img src={foto.url} alt={foto.legenda ?? "Foto da viagem"} className="max-w-full max-h-full object-contain rounded-lg" />
      </div>
      <div className="flex-none flex flex-col gap-2 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        {foto.legenda && (
          <p className="m-0 text-[15px] leading-snug">
            <span className="font-extrabold text-sol-sun">Sol: </span>{foto.legenda}
          </p>
        )}
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Foto anterior" disabled={i === 0} onClick={() => setI(i - 1)} className="w-12 h-12 flex items-center justify-center disabled:opacity-30">
            <ChevronLeft size={28} />
          </button>
          <a href={foto.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-white/90 underline">Abrir original</a>
          <button type="button" aria-label="Próxima foto" disabled={i === fotos.length - 1} onClick={() => setI(i + 1)} className="w-12 h-12 flex items-center justify-center disabled:opacity-30">
            <ChevronRight size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppMural() {
  const { profile, token, isDemo } = useClientAuth();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [aberta, setAberta] = useState<{ fotos: Foto[]; i: number } | null>(null);

  useEffect(() => {
    if (!token || isDemo) { setAlbum({ grupos: [], total: 0, mural: null }); setLoading(false); return; }
    let cancelado = false;
    fetch(`${API_URL}/api/app/album`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (r.ok) return (await r.json()) as Album;
        if (r.status === 404 && profile?.mural) return albumDoMural(profile.mural);
        return null;
      })
      .then((a) => { if (!cancelado) setAlbum(a ?? { grupos: [], total: 0, mural: null }); })
      .catch(() => { if (!cancelado) setAlbum({ grupos: [], total: 0, mural: null }); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [token, isDemo, profile?.mural]);

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

  if (total === 0) {
    return (
      <div className="flex flex-col">
        <TopBar title="Álbum" back="/app" />
        <div className="px-5">
          <Vazio
            icone={<ImageIcon size={32} />}
            titulo="Seu álbum ainda não tem fotos"
            texto="Mande fotos da viagem para a Sol, pela câmera no chat do app ou pelo WhatsApp. Elas aparecem aqui."
          >
            <Link to="/app/chat" className={`${btnPrimario} w-full mt-4 no-underline`}>
              <Camera size={18} /> Mandar uma foto
            </Link>
          </Vazio>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <TopBar title="Álbum" step={`${total} ${total === 1 ? "foto" : "fotos"}`} back="/app" />
      <div className="flex flex-col gap-4 px-5">
        {album!.grupos.map((g) => (
          <section key={g.inicio} aria-label={g.titulo} className="flex flex-col gap-2">
            <div className="flex flex-col">
              <h2 className="m-0 text-base font-extrabold">{g.titulo}</h2>
              <span className="text-xs text-sol-texto2">
                {periodo(g)} · {g.fotos.length} {g.fotos.length === 1 ? "foto" : "fotos"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {g.fotos.map((f, i) => (
                <button
                  key={f.url}
                  type="button"
                  onClick={() => setAberta({ fotos: g.fotos, i })}
                  aria-label={f.legenda ? `Foto com comentário da Sol: ${f.legenda}` : "Abrir foto"}
                  className="relative block aspect-square rounded-[10px] overflow-hidden bg-sol-claro"
                >
                  <img src={f.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  {f.legenda && (
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-black/60 text-[10px] font-extrabold text-sol-sun">Sol</span>
                  )}
                </button>
              ))}
            </div>
          </section>
        ))}

        {linkMural && (
          <div className="grid grid-cols-2 gap-2">
            <Link to={`/mural/${shareCode}`} className={`${btnSecundario} !text-sm no-underline`}>Ver mural</Link>
            <button type="button" onClick={copiarLink} className={`${btnSecundario} !text-sm`}>
              <Link2 size={16} /> {copiado ? "Link copiado" : "Copiar link"}
            </button>
          </div>
        )}
        <Aviso tom="neutro">
          Para colocar mais fotos, mande para a Sol pela câmera do chat ou pelo WhatsApp. Com a Sol Guia ativa, cada foto
          entra no mural com um comentário dela{linkMural ? "; o mural abre só para quem tiver o link" : ""}.
        </Aviso>
      </div>

      {aberta && <Visualizador fotos={aberta.fotos} inicial={aberta.i} fechar={() => setAberta(null)} />}
    </div>
  );
}
