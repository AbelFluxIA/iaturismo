import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Share2, X } from "lucide-react";
import { API_URL } from "@/contexts/ClientAuthContext";
import { btnPrimario, btnSecundario, Carregando } from "@/components/app/ui";

// Página pública de UMA viagem (RA-FOT-05): abre por link secreto, que vale 7 dias e
// o dono pode desligar. Mostra a imagem da viagem e as fotos dela, nunca o mural inteiro.

interface Foto { url: string; legenda: string | null; data: string }
interface Viagem { titulo: string; de: string; ate: string; capa: string | null; fotos: Foto[]; convite: string | null; expiraEm: string }

const dia = (d: string, ano = true) => new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", ...(ano ? { year: "numeric" } : {}) });
function periodo(v: Viagem) {
  const ini = dia(v.de), fim = dia(v.ate);
  return ini === fim ? ini : `${ini.slice(6) === fim.slice(6) ? ini.slice(0, 5) : ini} a ${fim}`;
}

export default function ViagemCompartilhada() {
  const { codigo } = useParams<{ codigo: string }>();
  const [viagem, setViagem] = useState<Viagem | null>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "encerrado" | "nao_achou" | "erro">("carregando");
  const [aberta, setAberta] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/app/publico/viagem/${encodeURIComponent(codigo ?? "")}`);
        if (!vivo) return;
        if (r.status === 410) { setEstado("encerrado"); return; }
        if (r.status === 404) { setEstado("nao_achou"); return; }
        const d = r.ok ? await r.json().catch(() => null) : null;
        if (!vivo) return;
        if (!d || typeof d.titulo !== "string" || !Array.isArray(d.fotos)) { setEstado("erro"); return; }
        setViagem(d as Viagem);
        setEstado("ok");
        document.title = `${d.titulo} · Sol`;
      } catch { if (vivo) setEstado("erro"); }
    })();
    return () => { vivo = false; };
  }, [codigo]);

  const total = viagem?.fotos.length ?? 0;
  const tecla = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setAberta(null);
    if (e.key === "ArrowLeft") setAberta((x) => (x === null ? x : Math.max(0, x - 1)));
    if (e.key === "ArrowRight") setAberta((x) => (x === null ? x : Math.min(total - 1, x + 1)));
  }, [total]);
  useEffect(() => {
    if (aberta === null) return;
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberta, tecla]);

  async function compartilhar() {
    const url = window.location.href;
    try { if (navigator.share) { await navigator.share({ title: viagem?.titulo, url }); return; } } catch { return; /* a pessoa cancelou */ }
    try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sem área de transferência */ }
  }

  if (estado === "carregando") return <div className="min-h-screen bg-sol-areia"><Carregando /></div>;

  if (estado !== "ok" || !viagem) {
    const msg = estado === "encerrado"
      ? { titulo: "Este link não está mais ativo", texto: "O link de uma viagem vale 7 dias e pode ser desligado por quem compartilhou. Peça um link novo para a pessoa." }
      : estado === "nao_achou"
        ? { titulo: "Viagem não encontrada", texto: "Confira se o link está completo." }
        : { titulo: "Não consegui abrir agora", texto: "Confira a internet e tente de novo." };
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 bg-sol-areia font-corpo text-sol-fundo text-center">
        <img src="/sol-mark.png" alt="Sol" className="w-16 h-16 object-contain" />
        <h1 className="m-0 font-display font-extrabold text-[22px] leading-tight">{msg.titulo}</h1>
        <p className="m-0 max-w-[320px] text-[15px] leading-snug text-sol-texto2">{msg.texto}</p>
        {estado === "erro"
          ? <button type="button" onClick={() => window.location.reload()} className={`${btnSecundario} mt-2`}>Tentar de novo</button>
          : <Link to="/app" className={`${btnSecundario} mt-2 no-underline`}>Conhecer a Sol</Link>}
      </div>
    );
  }

  const foto = aberta !== null ? viagem.fotos[aberta] : null;

  return (
    <div className="min-h-screen bg-sol-areia font-corpo text-sol-fundo">
      <div className="w-full max-w-[760px] mx-auto flex flex-col gap-4 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-10">
        <header className="flex items-center gap-3">
          <img src="/sol-mark.png" alt="Sol" className="flex-none w-11 h-11 object-contain" />
          <div className="flex-1 min-w-0">
            <h1 className="m-0 font-display font-extrabold text-[20px] leading-tight break-words">{viagem.titulo}</h1>
            <p className="m-0 text-[13px] text-sol-texto2">{periodo(viagem)}{total ? ` · ${total} ${total === 1 ? "foto" : "fotos"}` : ""}</p>
          </div>
        </header>

        <button type="button" onClick={compartilhar} className={btnSecundario}>
          <Share2 size={18} /> {copiado ? "Link copiado" : "Compartilhar esta viagem"}
        </button>

        {viagem.capa && (
          <img src={viagem.capa} alt={viagem.titulo} className="w-full max-w-[360px] mx-auto rounded-2xl border border-sol-linha" />
        )}

        {total === 0 ? (
          <p className="m-0 py-4 text-center text-[15px] text-sol-texto2">As fotos desta viagem aparecem aqui quando ela começar.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {viagem.fotos.map((f, i) => (
              <button key={f.url} type="button" onClick={() => setAberta(i)} aria-label={f.legenda ? `Abrir foto: ${f.legenda}` : `Abrir foto ${i + 1}`} className="flex flex-col rounded-xl overflow-hidden bg-white border border-sol-linha text-left text-sol-fundo">
                <img src={f.url} alt="" loading="lazy" className="w-full aspect-square object-cover" />
                {f.legenda && <span className="block px-2.5 py-2"><span className="text-[12px] leading-snug line-clamp-3">{f.legenda}</span></span>}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 mt-2 p-4 rounded-2xl bg-white border border-sol-linha">
          <strong className="font-display text-[17px] leading-tight">Quer um roteiro assim para a sua viagem?</strong>
          <p className="m-0 text-[14px] leading-snug text-sol-texto2">A Sol monta o roteiro, acompanha a viagem e guarda as fotos.</p>
          <Link to={viagem.convite ? `/convite/${viagem.convite}` : "/app"} className={`${btnPrimario} no-underline`}>Quero o meu também</Link>
        </div>
        <p className="m-0 text-center text-xs text-sol-texto2">Este link vale até {dia(viagem.expiraEm, false)}. Quem compartilhou pode desligar antes.</p>
      </div>

      {foto && aberta !== null && (
        <div role="dialog" aria-modal="true" aria-label="Foto" className="fixed inset-0 z-[80] flex flex-col bg-black text-white">
          <div className="flex-none flex items-center justify-between px-2 pt-[max(8px,env(safe-area-inset-top))]">
            <span className="px-3 text-sm text-white/80">{aberta + 1} de {total} · {dia(foto.data)}</span>
            <button type="button" aria-label="Fechar" onClick={() => setAberta(null)} className="w-12 h-12 flex items-center justify-center"><X size={24} /></button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center px-2">
            <img src={foto.url} alt={foto.legenda ?? "Foto da viagem"} className="max-w-full max-h-full object-contain rounded-lg" />
          </div>
          <div className="flex-none flex flex-col gap-2 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
            {foto.legenda && <p className="m-0 text-[15px] leading-snug"><span className="font-extrabold text-sol-sun">Sol: </span>{foto.legenda}</p>}
            <div className="flex items-center justify-between">
              <button type="button" aria-label="Foto anterior" disabled={aberta === 0} onClick={() => setAberta(aberta - 1)} className="w-12 h-12 flex items-center justify-center disabled:opacity-30"><ChevronLeft size={28} /></button>
              <button type="button" aria-label="Próxima foto" disabled={aberta === total - 1} onClick={() => setAberta(aberta + 1)} className="w-12 h-12 flex items-center justify-center disabled:opacity-30"><ChevronRight size={28} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
