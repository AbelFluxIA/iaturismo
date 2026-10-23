import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, CloudSun, MapPin, MessageCircle, Plus, Star } from "lucide-react";
import { TopBar, Vazio, btnPrimario, btnSecundario, cartao, formatarData } from "@/components/app/ui";
import { CAPITAL, DESTINOS, destinoPorSlug, type Destino } from "@/lib/destinos";
import { descreverTempo, distanciaKm, posicaoSePermitida, previsao, type Coord, type PrevisaoDia } from "@/lib/geo";

function useOrigem() {
  const [origem, setOrigem] = useState<{ c: Coord; deVoce: boolean }>({ c: CAPITAL, deVoce: false });
  useEffect(() => { posicaoSePermitida().then((c) => { if (c) setOrigem({ c, deVoce: true }); }); }, []);
  return origem;
}

const FILTROS = ["Todos", "Praia", "Cultura", "Serra", "Sertão"] as const;

// Lista "Para onde ir" completa
export function AppDestinos() {
  const origem = useOrigem();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("Todos");
  const lista = DESTINOS.filter((d) => filtro === "Todos" || d.tipo === filtro)
    .map((d) => ({ d, km: Math.round(distanciaKm(origem.c, d)) }))
    .sort((a, b) => a.km - b.km);

  return (
    <div className="flex flex-col">
      <TopBar title="Destinos sugeridos" step="Para a sua próxima viagem" back="/app" />
      <div className="flex flex-col gap-3 px-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {FILTROS.map((f) => (
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
        {lista.map(({ d, km }) => (
          <Link key={d.slug} to={`/app/destinos/${d.slug}`} className={`${cartao} flex items-center gap-3 p-2.5 text-sol-fundo no-underline`}>
            <span className="flex-none w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: d.cor }}>
              <MapPin size={22} className="text-sol-fundo/60" />
            </span>
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-base font-extrabold">{d.nome}</span>
              <span className="text-[13px] text-sol-texto2 leading-snug">{d.tipo} · {km} km</span>
              <span className="text-xs text-sol-texto2 line-clamp-1">{d.destaques[0]}</span>
            </span>
            <ChevronRight size={20} className="flex-none text-sol-texto2" />
          </Link>
        ))}
        <p className="m-0 text-xs text-sol-texto2">Distâncias em linha reta {origem.deVoce ? "a partir de onde você está" : "a partir de João Pessoa"}.</p>
      </div>
    </div>
  );
}

// Detalhe de um destino sugerido
export function AppDestino() {
  const { slug } = useParams();
  const d = destinoPorSlug(slug);
  const origem = useOrigem();
  const [tempo, setTempo] = useState<PrevisaoDia[] | null>(null);
  useEffect(() => { if (d) previsao(d, 3).then(setTempo); }, [d]);

  if (!d) {
    return (
      <div className="flex flex-col">
        <TopBar title="Destino" back="/app/destinos" />
        <div className="px-5"><Vazio icone={<MapPin size={32} />} titulo="Destino não encontrado" /></div>
      </div>
    );
  }
  const km = Math.round(distanciaKm(origem.c, d));
  return (
    <div className="flex flex-col">
      <TopBar title={d.nome} step="Destino sugerido · PB" back="/app/destinos" />
      <div className="flex flex-col gap-3 px-5">
        <div className="h-28 rounded-2xl flex items-center justify-center" style={{ background: d.cor }}>
          <MapPin size={36} className="text-sol-fundo/50" />
        </div>
        <span className="self-start text-[13px] font-extrabold px-2.5 py-1 rounded-full bg-sol-claro text-sol-claro-texto">{d.tipo}</span>
        <p className="m-0 text-[15px] leading-snug">{d.resumo}</p>

        <dl className={`${cartao} m-0 flex flex-col gap-2.5 p-4 text-[15px]`}>
          <div className="flex gap-3"><dt className="flex-none w-24 font-extrabold">Distância</dt><dd className="m-0">{km} km {origem.deVoce ? "de você" : "de João Pessoa"}, em linha reta</dd></div>
          <div className="flex gap-3">
            <dt className="flex-none w-24 font-extrabold">Clima</dt>
            <dd className="m-0 flex flex-col gap-1">
              {tempo === null ? <span className="text-sol-texto2">Buscando...</span> : tempo.length === 0 ? <span className="text-sol-texto2">Não há dados disponíveis.</span> : tempo.map((p) => (
                <span key={p.data} className="flex items-center gap-1.5"><CloudSun size={16} className="text-sol-mar" />{formatarData(p.data, { weekday: "short", day: "2-digit" })}: {descreverTempo(p)}</span>
              ))}
              <span className="text-xs text-sol-texto2">Fonte: Open-Meteo</span>
            </dd>
          </div>
        </dl>

        <h2 className="m-0 text-base font-extrabold">Destaques</h2>
        <ul className={`${cartao} m-0 p-0 list-none flex flex-col overflow-hidden`}>
          {d.destaques.map((x) => (
            <li key={x} className="flex items-center gap-3 min-h-[48px] px-4 border-b border-[#F0E9DD] last:border-b-0 text-[15px]">
              <Star size={16} className="flex-none text-sol-sun" fill="currentColor" />{x}
            </li>
          ))}
        </ul>

        <Link to={`/app/criar?destino=${encodeURIComponent(`${d.nome} - PB`)}`} className={`${btnPrimario} no-underline`}><Plus size={18} strokeWidth={2.4} /> Criar roteiro aqui</Link>
        <Link to={`/app/chat?texto=${encodeURIComponent(`Me conta mais sobre ${d.nome} (PB): vale a visita?`)}`} className={`${btnSecundario} no-underline`}>
          <MessageCircle size={18} /> Perguntar à Sol
        </Link>
      </div>
    </div>
  );
}

export type { Destino };
