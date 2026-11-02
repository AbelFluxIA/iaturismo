import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { useViagens } from "@/contexts/ViagensContext";
import { Carregando, TituloSecao, TopBar, Vazio, cartao, formatarData } from "@/components/app/ui";
import { IconeTempo } from "@/components/app/IconeTempo";
import { useCidade } from "@/lib/cidade";
import { descreverTempo, previsao, tempoAgora, tipoDeTempo, type PrevisaoDia, type TempoAgora } from "@/lib/geo";
import { nomeCurto } from "@/lib/roteiro";

// Previsão do tempo (RA-INI-04): agora, por horário e cada dia (com a viagem marcada)
const DESCRICAO = { sol: "Sol", nuvens: "Parcialmente nublado", nublado: "Nublado", chuva: "Chuva", trovoada: "Trovoadas" };

export default function AppTempo() {
  const cidade = useCidade();
  const { atual } = useViagens();
  const [agora, setAgora] = useState<TempoAgora | null>(null);
  const [dias, setDias] = useState<PrevisaoDia[] | null>(null);

  useEffect(() => {
    if (!cidade.coord) return;
    tempoAgora(cidade.coord).then(setAgora);
    previsao(cidade.coord, 7).then(setDias);
  }, [cidade.coord?.lat, cidade.coord?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  if (cidade.carregando) return <Carregando />;
  if (!cidade.coord) {
    return (
      <div className="flex flex-col">
        <TopBar title="Previsão do tempo" back="/app" />
        <div className="px-5"><Vazio icone={<MapPin size={32} />} titulo="Escolha uma cidade" texto="Libere a localização ou crie um roteiro para ver a previsão." /></div>
      </div>
    );
  }
  const naViagem = (d: string) => atual && atual.arrivalDate && d >= atual.arrivalDate && d <= (atual.departureDate ?? atual.arrivalDate);

  return (
    <div className="flex flex-col">
      <TopBar title="Previsão do tempo" step={nomeCurto(cidade.nome)} back="/app" />
      <div className="flex flex-col gap-3 px-5">
        {agora ? (
          <section className="flex items-center gap-4 p-5 rounded-[22px] bg-sol-fundo text-white">
            <IconeTempo codigo={agora.codigo} size={48} className="text-sol-sun" />
            <span className="flex flex-col">
              <span className="font-display font-extrabold text-5xl leading-none">{agora.temp}°</span>
              <span className="text-sm text-sol-azul-suave">{DESCRICAO[tipoDeTempo(agora.codigo)]} agora</span>
            </span>
          </section>
        ) : <div className="h-28 rounded-[22px] bg-white animate-pulse" />}

        {agora && (
          <>
            <TituloSecao>Próximas horas</TituloSecao>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
              {agora.horas.map((h) => (
                <span key={h.hora} className={`${cartao} flex-none w-[68px] flex flex-col items-center gap-1 py-2.5`}>
                  <span className="text-xs font-bold text-sol-texto2">{h.hora}</span>
                  <IconeTempo codigo={h.codigo} size={22} className="text-sol-mar" />
                  <span className="text-[15px] font-extrabold">{h.temp}°</span>
                  <span className="text-[11px] text-sol-texto2">{h.chuva}%</span>
                </span>
              ))}
            </div>
          </>
        )}

        <TituloSecao>Próximos dias</TituloSecao>
        <div className={`${cartao} flex flex-col divide-y divide-[#F0E9DD]`}>
          {(dias ?? []).map((d) => (
            <span key={d.data} className={`flex items-center gap-3 px-3.5 py-2.5 ${naViagem(d.data) ? "bg-sol-creme/50" : ""}`}>
              <IconeTempo codigo={d.codigo} size={20} className="flex-none text-sol-mar" />
              <span className="flex-none w-16 text-sm font-bold">{formatarData(d.data, { weekday: "short", day: "2-digit" })}</span>
              <span className="flex-1 text-sm">{descreverTempo(d)}</span>
              <span className="flex-none text-xs text-sol-texto2">{d.min}°</span>
            </span>
          ))}
        </div>
        {atual?.arrivalDate && <p className="m-0 text-xs text-sol-texto2">Dias destacados: sua viagem a {nomeCurto(atual.destination)}.</p>}
        <p className="m-0 text-xs text-sol-texto2">Fonte: Open-Meteo · {cidade.nome}</p>
      </div>
    </div>
  );
}
