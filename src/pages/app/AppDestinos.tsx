import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, CloudSun, MapPin, MessageCircle, Plus, Star } from "lucide-react";
import { Carregando, TopBar, Vazio, btnPrimario, btnSecundario, cartao, formatarData } from "@/components/app/ui";
import { descreverTempo, previsao, type PrevisaoDia } from "@/lib/geo";
import { CORES_TIPO, useSugestoes } from "@/lib/sugestoes";

// Lista "Para onde ir": destinos recomendados pela Sol para a pessoa
export function AppDestinos() {
  const { base, lista, recomendado } = useSugestoes();
  const tipos = ["Todos", ...new Set((lista ?? []).map((d) => d.tipo))];
  const [filtro, setFiltro] = useState("Todos");

  return (
    <div className="flex flex-col">
      <TopBar title="Para onde ir" step={recomendado ? `Escolhidos para você · perto de ${base}` : "Sugestões gerais"} back="/app" />
      <div className="flex flex-col gap-3 px-5">
        {lista === null ? (
          <Carregando />
        ) : (
          <>
            {tipos.length > 2 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
                {tipos.map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={filtro === f}
                    onClick={() => setFiltro(f)}
                    className={`flex-none min-h-[40px] px-4 rounded-full border-[1.5px] text-sm font-bold ${filtro === f ? "bg-sol-fundo text-white border-sol-fundo" : "bg-white border-sol-borda"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
            {lista.filter((d) => filtro === "Todos" || d.tipo === filtro).map((d) => (
              <Link key={d.slug} to={`/app/destinos/${d.slug}`} className={`${cartao} flex items-center gap-3 p-2.5 text-sol-fundo no-underline`}>
                <span className="flex-none w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: CORES_TIPO[d.tipo] ?? "#EDE7DC" }}>
                  <MapPin size={22} className="text-sol-fundo/60" />
                </span>
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-base font-extrabold">{d.nome}{d.uf ? ` · ${d.uf}` : ""}</span>
                  <span className="text-[13px] text-sol-texto2">{d.tipo}{d.km !== null ? ` · ${d.km} km` : ""}</span>
                  {d.motivo && <span className="text-xs text-sol-texto2 leading-snug line-clamp-2">{d.motivo}</span>}
                </span>
                <ChevronRight size={20} className="flex-none text-sol-texto2" />
              </Link>
            ))}
            <p className="m-0 text-xs text-sol-texto2">
              {recomendado
                ? "A Sol escolhe pelo seu perfil e pelas viagens que você já fez, e confere na internet que cada lugar existe. Distâncias em linha reta."
                : "Sem conexão com a Sol agora: mostrando destinos gerais da Paraíba."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Detalhe de um destino sugerido
export function AppDestino() {
  const { slug } = useParams();
  const { base, lista } = useSugestoes();
  const d = lista?.find((x) => x.slug === slug) ?? null;
  const [tempo, setTempo] = useState<PrevisaoDia[] | null>(null);
  const coord = d?.coord ?? null;
  useEffect(() => { if (coord) previsao(coord, 3).then(setTempo); }, [coord?.lat, coord?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  if (lista === null) return <Carregando />;
  if (!d) {
    return (
      <div className="flex flex-col">
        <TopBar title="Destino" back="/app/destinos" />
        <div className="px-5"><Vazio icone={<MapPin size={32} />} titulo="Destino não encontrado" texto="As sugestões mudam a cada dia. Volte para a lista." /></div>
      </div>
    );
  }
  const nomeCompleto = `${d.nome}${d.uf ? ` - ${d.uf}` : ""}`;
  return (
    <div className="flex flex-col">
      <TopBar title={d.nome} step={`Destino sugerido${d.uf ? ` · ${d.uf}` : ""}`} back="/app/destinos" />
      <div className="flex flex-col gap-3 px-5">
        <div className="h-28 rounded-2xl flex items-center justify-center" style={{ background: CORES_TIPO[d.tipo] ?? "#EDE7DC" }}>
          <MapPin size={36} className="text-sol-fundo/50" />
        </div>
        <span className="self-start text-[13px] font-extrabold px-2.5 py-1 rounded-full bg-sol-claro text-sol-claro-texto">{d.tipo}</span>
        {d.motivo && (
          <section className={`${cartao} flex flex-col gap-1 p-4`}>
            <h2 className="m-0 text-xs font-extrabold tracking-[0.06em] uppercase text-sol-texto2">Por que a Sol sugeriu</h2>
            <p className="m-0 text-[15px] leading-snug">{d.motivo}</p>
          </section>
        )}

        <dl className={`${cartao} m-0 flex flex-col gap-2.5 p-4 text-[15px]`}>
          {d.km !== null && (
            <div className="flex gap-3"><dt className="flex-none w-24 font-extrabold">Distância</dt><dd className="m-0">{d.km} km de {base ?? "você"}, em linha reta</dd></div>
          )}
          <div className="flex gap-3">
            <dt className="flex-none w-24 font-extrabold">Clima</dt>
            <dd className="m-0 flex flex-col gap-1">
              {!coord ? <span className="text-sol-texto2">Não há dados disponíveis.</span> : tempo === null ? <span className="text-sol-texto2">Buscando...</span> : tempo.map((p) => (
                <span key={p.data} className="flex items-center gap-1.5"><CloudSun size={16} className="text-sol-mar" />{formatarData(p.data, { weekday: "short", day: "2-digit" })}: {descreverTempo(p)}</span>
              ))}
              {coord && <span className="text-xs text-sol-texto2">Fonte: Open-Meteo</span>}
            </dd>
          </div>
        </dl>

        {d.destaques.length > 0 && (
          <>
            <h2 className="m-0 text-base font-extrabold">Destaques</h2>
            <ul className={`${cartao} m-0 p-0 list-none flex flex-col overflow-hidden`}>
              {d.destaques.map((x) => (
                <li key={x} className="flex items-center gap-3 min-h-[48px] px-4 py-2 border-b border-[#F0E9DD] last:border-b-0 text-[15px]">
                  <Star size={16} className="flex-none text-sol-sun" fill="currentColor" />{x}
                </li>
              ))}
            </ul>
          </>
        )}

        <Link to={`/app/criar?destino=${encodeURIComponent(nomeCompleto)}`} className={`${btnPrimario} no-underline`}><Plus size={18} strokeWidth={2.4} /> Criar roteiro aqui</Link>
        <Link to={`/app/chat?texto=${encodeURIComponent(`Me conta mais sobre ${nomeCompleto}: vale a visita?`)}`} className={`${btnSecundario} no-underline`}>
          <MessageCircle size={18} /> Perguntar à Sol
        </Link>
      </div>
    </div>
  );
}
