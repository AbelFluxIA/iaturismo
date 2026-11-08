import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Lock, Trash2, X } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { btnPrimario, btnSecundario, cartao, formatarData } from "@/components/app/ui";
import { urlSegura } from "@/lib/utils";

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

export type MotivoBloqueio = "sem_guia" | "sem_viagem" | "viagem_encerrada";
export interface EnvioAlbum { podeEnviar: boolean; motivo: MotivoBloqueio | null; viagem: { destino: string | null; chegada: string; saida: string } | null }

export interface Album {
  grupos: GrupoAlbum[];
  total: number;
  mural: { shareCode: string; fotos: number } | null;
  envio?: EnvioAlbum; // regra do mural: só com a Guia e durante a viagem
}

const VAZIO: Album = { grupos: [], total: 0, mural: null };

// Bot antigo (sem /api/app/album): só as fotos do mural
async function albumDoMural(mural: { id: string; share_code: string; title: string | null }): Promise<Album> {
  const { data } = await (supabase as any).rpc("mural_fotos_publicas", { codigo: mural.share_code });
  const fotos = ((Array.isArray(data) ? data : []) as { photo_url: string; caption: string | null; created_at: string }[])
    .map((f) => ({ url: f.photo_url, legenda: f.caption ?? null, data: f.created_at }));
  return {
    grupos: fotos.length ? [{ titulo: mural.title ?? "Mural", inicio: fotos[0].data, fim: fotos[fotos.length - 1].data, fotos }] : [],
    total: fotos.length,
    mural: { shareCode: mural.share_code, fotos: fotos.length },
  };
}

export function useAlbum() {
  const { profile, token, isDemo } = useClientAuth();
  // Apaga a foto no servidor (bucket + registros) e recarrega o álbum
  const apagar = useCallback(async (foto: Foto): Promise<boolean> => {
    if (!token || isDemo) return false;
    try {
      const r = await fetch(`${API_URL}/api/app/album/apagar`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ url: foto.url }) });
      if (!r.ok) return false;
      setAlbum((a) => a ? { ...a, total: Math.max(0, a.total - 1), grupos: a.grupos.map((g) => ({ ...g, fotos: g.fotos.filter((f) => f.url !== foto.url) })).filter((g) => g.fotos.length) } : a);
      return true;
    } catch { return false; }
  }, [token, isDemo]);
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
  return { album, loading, recarregar, apagar };
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
// Motivos de bloqueio do envio (a mesma regra do servidor)
const TEXTO_BLOQUEIO: Record<MotivoBloqueio, { titulo: string; texto: string; link?: { para: string; rotulo: string } }> = {
  sem_guia: { titulo: "Fotos do álbum são um recurso da Guia Sol", texto: "Ative a Guia na sua viagem para guardar as fotos aqui, com o comentário da Sol em cada uma.", link: { para: "/app/guia", rotulo: "Conhecer a Guia Sol" } },
  sem_viagem: { titulo: "O álbum recebe fotos durante a viagem", texto: "Quando a sua viagem começar, é só mandar as fotos por aqui ou pelo WhatsApp." },
  viagem_encerrada: { titulo: "Viagem encerrada", texto: "Você pode ver, apagar e compartilhar as fotos desta viagem, mas não enviar novas." },
};

export function EnviarFotos({ aoTerminar, envio }: { aoTerminar?: () => void; envio?: EnvioAlbum }) {
  const { token, isDemo } = useClientAuth();
  if (envio && !envio.podeEnviar && envio.motivo) {
    const b = TEXTO_BLOQUEIO[envio.motivo];
    return (
      <div className={`${cartao} flex flex-col gap-1.5 p-4`}>
        <span className="flex items-center gap-2 text-[15px] font-extrabold"><Lock size={16} className="text-sol-texto2" />{b.titulo}</span>
        <p className="m-0 text-[14px] leading-snug text-sol-texto2">{b.texto}</p>
        {b.link && <Link to={b.link.para} className={`${btnSecundario} mt-1 no-underline`}>{b.link.rotulo}</Link>}
      </div>
    );
  }
  return <EnviarFotosLiberado aoTerminar={aoTerminar} token={token} isDemo={isDemo} />;
}

function EnviarFotosLiberado({ aoTerminar, token, isDemo }: { aoTerminar?: () => void; token: string | null; isDemo: boolean }) {
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
        if (r.status === 403) { setAviso((await r.json().catch(() => ({}))).error ?? "Envio de fotos indisponível para esta viagem."); break; }
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
export function GradeFotos({ fotos, aoApagar }: { fotos: Foto[]; aoApagar?: (foto: Foto) => Promise<boolean> }) {
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
      {aberta !== null && <Visualizador fotos={fotos} inicial={Math.min(aberta, fotos.length - 1)} fechar={() => setAberta(null)} aoApagar={aoApagar} />}
    </>
  );
}

function Visualizador({ fotos, inicial, fechar, aoApagar }: { fotos: Foto[]; inicial: number; fechar: () => void; aoApagar?: (foto: Foto) => Promise<boolean> }) {
  const [i, setI] = useState(inicial);
  const [apagando, setApagando] = useState(false);
  const foto = fotos[i];
  if (!foto) { fechar(); return null; }
  async function apagar() {
    if (!aoApagar || !window.confirm("Apagar esta foto? Não dá para desfazer.")) return;
    setApagando(true);
    const ok = await aoApagar(foto);
    setApagando(false);
    if (ok) { if (fotos.length <= 1) fechar(); else setI((x) => Math.max(0, x - 1)); }
  }
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
          <span className="flex items-center gap-4">
            {urlSegura(foto.url) && <a href={urlSegura(foto.url)!} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-white/90 underline">Abrir original</a>}
            {aoApagar && (
              <button type="button" disabled={apagando} onClick={apagar} className="flex items-center gap-1 min-h-[44px] text-sm font-bold text-red-300 disabled:opacity-50">
                <Trash2 size={16} /> {apagando ? "Apagando…" : "Apagar"}
              </button>
            )}
          </span>
          <button type="button" aria-label="Próxima foto" disabled={i === fotos.length - 1} onClick={() => setI(i + 1)} className="w-12 h-12 flex items-center justify-center disabled:opacity-30">
            <ChevronRight size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}
