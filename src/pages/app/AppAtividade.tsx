import { Link, useSearchParams } from "react-router-dom";
import { Check, MapPin, MessageCircle, Route } from "lucide-react";
import { useFeitas, useRoteiro, useViagens } from "@/contexts/ViagensContext";
import { Carregando, TopBar, Vazio, btnPrimario, btnSecundario, cartao } from "@/components/app/ui";
import { queryDoMapa } from "@/lib/geo";
import { chaveAtividade, parseItinerary, rotuloDia } from "@/lib/roteiro";

// Detalhe de uma atividade do roteiro: horário, local, deslocamento e o que a
// Sol escreveu sobre ela. /app/roteiro/atividade?id=VIAGEM&d=DIA&a=ATIVIDADE
export default function AppAtividade() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const codigo = params.get("codigo");
  const d = Number(params.get("d") ?? 0);
  const a = Number(params.get("a") ?? 0);
  const { dados, loading } = useRoteiro(id, codigo);
  const { viagens } = useViagens();
  const { feitas, alternar } = useFeitas(id || codigo);

  if (loading) return <Carregando />;
  const dias = dados ? parseItinerary(dados.texto) : [];
  const atv = dias[d]?.activities[a];
  const voltar = `/app/roteiro?${id ? "id" : "codigo"}=${encodeURIComponent(id || codigo || "")}`;

  if (!atv) {
    return (
      <div className="flex flex-col">
        <TopBar title="Atividade" back={voltar} />
        <div className="px-5"><Vazio icone={<MapPin size={32} />} titulo="Atividade não encontrada" texto="Volte ao roteiro e escolha outra." /></div>
      </div>
    );
  }

  const destino = dados?.destino || viagens?.find((v) => v.id === id)?.destination || "";
  const chegada = dados?.chegada ?? viagens?.find((v) => v.id === id)?.arrivalDate ?? null;
  const local = atv.mapUrl ? queryDoMapa(atv.mapUrl) : null;
  const feita = !!feitas[chaveAtividade(d, a)];
  const pedirOutra = `Quero trocar uma atividade do meu roteiro de ${destino || "viagem"} por outra opção: ${rotuloDia(chegada, d, dias[d].label)}, ${atv.time} · ${atv.name}.`;

  return (
    <div className="flex flex-col">
      <TopBar title={atv.name} step={`${rotuloDia(chegada, d, dias[d].label)}${destino ? ` · ${destino}` : ""}`} back={voltar} />
      <div className="flex flex-col gap-3 px-5">
        <div className="flex flex-wrap gap-2">
          {atv.time && <span className="text-[13px] font-extrabold px-2.5 py-1 rounded-full bg-sol-creme text-sol-creme-texto">{atv.time}</span>}
          {atv.period && <span className="text-[13px] font-extrabold px-2.5 py-1 rounded-full bg-sol-claro text-sol-claro-texto">{atv.period}</span>}
        </div>

        <dl className={`${cartao} m-0 flex flex-col gap-2.5 p-4 text-[15px]`}>
          {local && (
            <div className="flex gap-3"><dt className="flex-none w-[104px] font-extrabold">Local</dt><dd className="m-0">{local}</dd></div>
          )}
          {atv.travel && (
            <div className="flex gap-3"><dt className="flex-none w-[104px] font-extrabold">Deslocamento</dt><dd className="m-0">{atv.travel}</dd></div>
          )}
          <div className="flex gap-3"><dt className="flex-none w-[104px] font-extrabold">Horário</dt><dd className="m-0">{atv.time || "Livre"}</dd></div>
        </dl>

        {atv.description && (
          <section className={`${cartao} flex flex-col gap-1.5 p-4`}>
            <h2 className="m-0 text-xs font-extrabold tracking-[0.06em] uppercase text-sol-texto2">Dica da Sol</h2>
            <p className="m-0 text-[15px] leading-snug">{atv.description}</p>
          </section>
        )}

        <div className="grid grid-cols-2 gap-2">
          {atv.mapUrl ? (
            <a href={atv.mapUrl} target="_blank" rel="noopener noreferrer" className={`${btnPrimario} no-underline`}><Route size={18} /> Ver rota</a>
          ) : (
            <Link to={`${voltar}&aba=mapa`} className={`${btnPrimario} no-underline`}><Route size={18} /> Ver no mapa</Link>
          )}
          <Link to={`/app/chat?texto=${encodeURIComponent(pedirOutra)}`} className={`${btnSecundario} no-underline`}>
            <MessageCircle size={18} /> Outra opção
          </Link>
        </div>

        <button
          type="button"
          role="checkbox"
          aria-checked={feita}
          onClick={() => alternar(chaveAtividade(d, a))}
          className={`${cartao} flex items-center gap-3 min-h-[56px] px-4 text-left`}
        >
          <span className={`flex-none w-7 h-7 rounded-lg border-2 flex items-center justify-center ${feita ? "bg-sol-ok border-sol-ok" : "bg-white border-[#6F7E83]"}`}>
            {feita && <Check size={16} strokeWidth={3} className="text-white" />}
          </span>
          <span className="text-[15px] font-semibold">{feita ? "Feita" : "Marcar como feita"}</span>
        </button>
      </div>
    </div>
  );
}
