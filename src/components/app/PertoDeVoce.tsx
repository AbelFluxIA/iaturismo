import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, MapPin, RefreshCw } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { cartao } from "@/components/app/ui";
import { posicaoAtual, posicaoSePermitida, type Coord } from "@/lib/geo";
import { explicarSemPosicao } from "@/lib/gps";

// "Perto de você agora" (Guia Sol): lugares abertos perto da pessoa, escolhidos pelo
// perfil e pela hora do dia. Vem do Google Maps na hora (não fica guardado) e mostra o
// crédito "Google Maps". Sem a Guia aparece o cartão com cadeado.

interface Lugar { nome: string; tipo: string | null; metros: number; abertoAgora: boolean | null; nota: number | null; avaliacoes: number | null; mapsUrl: string | null }
const distancia = (m: number) => (m < 950 ? `${Math.max(50, Math.round(m / 50) * 50)} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);

export default function PertoDeVoce() {
  const { token, profile } = useClientAuth();
  const guia = !!profile?.hasCompanion;
  const [estado, setEstado] = useState<"parado" | "buscando" | "pronto" | "sem-posicao" | "vazio">("parado");
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  async function buscar(pos: Coord | null) {
    if (!pos) { setEstado("sem-posicao"); return; }
    setEstado("buscando"); setAviso(null);
    try {
      const r = await fetch(`${API_URL}/api/app/perto?lat=${pos.lat}&lng=${pos.lng}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 429) { setAviso("Você já consultou bastante hoje. Pergunte à Sol na conversa."); setEstado("vazio"); return; }
      const d = r.status === 200 ? await r.json().catch(() => null) : null;
      // Resposta incompleta não quebra a tela: só entram lugares com nome e distância
      const lista: Lugar[] = Array.isArray(d?.lugares) ? d.lugares.filter((l: Lugar) => l && typeof l.nome === "string" && typeof l.metros === "number") : [];
      setLugares(lista);
      setEstado(lista.length ? "pronto" : "vazio");
    } catch { setEstado("vazio"); }
  }

  // Abre já com a lista se a pessoa já liberou a localização (não abre pedido sozinho)
  useEffect(() => {
    if (!guia || !token) return;
    let cancelado = false;
    posicaoSePermitida().then((p) => { if (!cancelado) buscar(p); });
    return () => { cancelado = true; };
  }, [guia, token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function comLocalizacao() {
    setEstado("buscando");
    const p = await posicaoAtual(15000, { ligar: true });
    if (!p) { setAviso(explicarSemPosicao()); setEstado("sem-posicao"); return; }
    buscar(p);
  }

  if (!guia) {
    return (
      <Link to="/app/guia/comparar" aria-label="Perto de você agora, recurso da Guia Sol" className={`${cartao} relative flex items-center gap-3 p-4 text-sol-fundo no-underline`}>
        <span className="flex-none w-11 h-11 rounded-xl bg-sol-creme flex items-center justify-center"><MapPin size={22} /></span>
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-[15px] font-extrabold">Perto de você agora</span>
          <span className="text-[13px] leading-snug text-sol-texto2">Com a Guia Sol: lugares abertos por perto, eventos do dia e avisos durante a viagem.</span>
        </span>
        <span className="flex-none w-7 h-7 rounded-full bg-sol-sun flex items-center justify-center"><Lock size={14} strokeWidth={2.4} /></span>
      </Link>
    );
  }

  return (
    <section aria-label="Perto de você agora" className={`${cartao} flex flex-col gap-2 p-4`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-[15px] font-extrabold">Perto de você agora</h2>
        {(estado === "pronto" || estado === "vazio") && (
          <button type="button" onClick={comLocalizacao} aria-label="Atualizar a lista" className="flex-none w-11 h-11 -my-2 -mr-2 flex items-center justify-center text-sol-mar"><RefreshCw size={18} /></button>
        )}
      </div>
      {estado === "buscando" && <p role="status" className="m-0 py-2 text-sm text-sol-texto2">Procurando lugares abertos por perto…</p>}
      {(estado === "sem-posicao" || estado === "parado") && (
        <>
          <p className="m-0 text-[13px] text-sol-texto2">{aviso ?? "A Sol mostra lugares abertos perto de onde você está, do seu jeito."}</p>
          <button type="button" onClick={comLocalizacao} className="self-start min-h-[44px] px-4 rounded-xl bg-sol-mar text-white text-sm font-bold flex items-center gap-2"><MapPin size={16} /> Usar minha localização</button>
        </>
      )}
      {estado === "vazio" && <p className="m-0 py-1 text-[13px] text-sol-texto2">{aviso ?? "Não achei lugares abertos bem avaliados por perto agora. Tente daqui a pouco ou pergunte à Sol."}</p>}
      {estado === "pronto" && (
        <>
          <ul className="m-0 p-0 list-none flex flex-col">
            {lugares.map((l) => {
              const linha = (
                <>
                  <span className="flex-1 min-w-0 flex flex-col gap-px">
                    <span className="text-[15px] font-bold leading-tight break-words">{l.nome}</span>
                    <span className="text-xs text-sol-texto2 truncate">
                      {[l.tipo, distancia(l.metros), l.abertoAgora === true ? "aberto agora" : null, l.nota ? `nota ${l.nota.toFixed(1).replace(".", ",")}` : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="flex-none text-xs font-bold text-sol-mar">Abrir</span>
                </>
              );
              return (
                <li key={`${l.nome}-${l.metros}`} className="border-t border-sol-linha first:border-t-0">
                  {l.mapsUrl && /^https:\/\//.test(l.mapsUrl)
                    ? <a href={l.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 min-h-[52px] py-1.5 text-sol-fundo no-underline">{linha}</a>
                    : <div className="flex items-center gap-2 min-h-[52px] py-1.5">{linha}</div>}
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-sol-texto2">
            <span>Lugares e horários do <strong>Google Maps</strong>, agora.</span>
            <Link to={`/app/chat?texto=${encodeURIComponent("O que você recomenda perto de mim agora?")}`} className="min-h-[32px] flex items-center font-bold text-sol-mar no-underline">Perguntar à Sol</Link>
          </div>
        </>
      )}
    </section>
  );
}
