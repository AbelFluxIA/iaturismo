import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { btnPrimario, formatarData } from "@/components/app/ui";

// Álbum: todas as fotos que a pessoa mandou para a Sol (WhatsApp ou app), por
// viagem. As que entraram no mural trazem o comentário da Sol.

export interface Foto {
  url: string;
  legenda: string | null;
  data: string;
}

export interface GrupoAlbum {
  titulo: string;
  inicio: string;
  fim: string;
  fotos: Foto[];
}

export interface Album {
  grupos: GrupoAlbum[];
  total: number;
  mural: { shareCode: string; fotos: number } | null;
}

const VAZIO: Album = { grupos: [], total: 0, mural: null };

// Bot antigo (sem /api/app/album): só as fotos do mural
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

export function useAlbum() {
  const { profile, token, isDemo } = useClientAuth();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    if (!token || isDemo) { setAlbum(VAZIO); setLoading(false); return; }
    try {
      const r = await fetch(`${API_URL}/api/app/album`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setAlbum((await r.json()) as Album);
      else if (r.status === 404 && profile?.mural) setAlbum(await albumDoMural(profile.mural));
      else setAlbum((a) => a ?? VAZIO);
    } catch {
      setAlbum((a) => a ?? VAZIO);
    } finally {
      setLoading(false);
    }
  }, [token, isDemo, profile?.mural]);

  useEffect(() => { recarregar(); }, [recarregar]);
  return { album, loading, recarregar };
}

// Foto do celular reduzida antes de enviar (lado maior até 1600 px, JPEG)
export async function reduzirFoto(arquivo: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(arquivo);
    const escala = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    return blob ?? arquivo;
  } catch {
    return arquivo;
  }
}

// Botão "Enviar fotos": escolhe várias da galeria (ou tira na hora) e manda uma a uma
export function EnviarFotos({ aoTerminar }: { aoTerminar?: () => void }) {
  const { token, isDemo } = useClientAuth();
  const entrada = useRef<HTMLInputElement>(null);
  const [progresso, setProgresso] = useState<{ feitas: number; total: number } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(arquivos: File[]) {
    if (!arquivos.length) return;
    setAviso(null);
    if (isDemo) { setAviso("No modo demonstração as fotos não são enviadas."); return; }
    setProgresso({ feitas: 0, total: arquivos.length });
    let erros = 0;
    for (const [i, arquivo] of arquivos.entries()) {
      try {
        const foto = await reduzirFoto(arquivo);
        const r = await fetch(`${API_URL}/api/app/chat/foto`, {
          method: "POST",
          headers: { "Content-Type": foto.type || "image/jpeg", Authorization: `Bearer ${token}` },
          body: foto,
        });
        if (r.status === 404) { setAviso("O envio de fotos pelo app ainda não foi ligado. Mande pelo WhatsApp da Sol."); break; }
        if (!r.ok) erros++;
      } catch {
        erros++;
      }
      setProgresso({ feitas: i + 1, total: arquivos.length });
    }
    setProgresso(null);
    if (erros) setAviso(`${erros} ${erros === 1 ? "foto não foi enviada" : "fotos não foram enviadas"}. Confira a internet e tente de novo.`);
    aoTerminar?.();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { const lista = Array.from(e.target.files ?? []); e.target.value = ""; enviar(lista); }}
      />
      <button type="button" disabled={!!progresso} onClick={() => entrada.current?.click()} className={btnPrimario}>
        <Camera size={18} />
        {progresso ? `Enviando ${Math.min(progresso.feitas + 1, progresso.total)} de ${progresso.total}...` : "Enviar fotos"}
      </button>
      {progresso && (
        <div className="h-1.5 rounded-full bg-[#E8DFD0] overflow-hidden" aria-hidden>
          <div className="h-full bg-sol-mar transition-all" style={{ width: `${(progresso.feitas / progresso.total) * 100}%` }} />
        </div>
      )}
      {aviso && <p role="status" className="m-0 text-xs text-sol-texto2">{aviso}</p>}
    </div>
  );
}

// Grade de miniaturas; tocar abre a foto em tela cheia com o comentário da Sol
export function GradeFotos({ fotos }: { fotos: Foto[] }) {
  const [aberta, setAberta] = useState<number | null>(null);
  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {fotos.map((f, i) => (
          <button
            key={f.url}
            type="button"
            onClick={() => setAberta(i)}
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
      {aberta !== null && <Visualizador fotos={fotos} inicial={aberta} fechar={() => setAberta(null)} />}
    </>
  );
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
