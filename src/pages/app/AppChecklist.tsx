import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { useViagens } from "@/contexts/ViagensContext";
import { TopBar, cartao, formatarData } from "@/components/app/ui";
import { ITENS_CHECKLIST, chaveChecklist, lerChecklist } from "@/lib/roteiro";

// Checklist antes de sair, uma lista por viagem. Marcações ficam neste aparelho.
export default function AppChecklist() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const { viagens } = useViagens();
  const viagem = viagens?.find((v) => v.id === id) ?? null;
  const [marcados, setMarcados] = useState<boolean[]>(() => lerChecklist(id));

  const alternar = (i: number) => {
    const novo = ITENS_CHECKLIST.map((_, j) => (j === i ? !marcados[j] : !!marcados[j]));
    setMarcados(novo);
    if (id) { try { localStorage.setItem(chaveChecklist(id), JSON.stringify(novo)); } catch { /* sem armazenamento */ } }
  };
  const feitos = marcados.filter(Boolean).length;
  const periodo = viagem ? [formatarData(viagem.arrivalDate), formatarData(viagem.departureDate)].filter(Boolean).join(" a ") : "";

  return (
    <div className="flex flex-col">
      <TopBar
        title="Checklist da viagem"
        step={viagem ? `${viagem.destination ?? "Viagem"}${periodo ? ` · ${periodo}` : ""}` : undefined}
        back={id ? `/app/roteiro?id=${encodeURIComponent(id)}` : "/app/roteiro"}
      />
      <div className="flex flex-col gap-3 px-5">
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-base font-extrabold">Antes de sair</h2>
          <span className="text-sm font-bold text-sol-texto2">{feitos} de {ITENS_CHECKLIST.length}</span>
        </div>
        <div className="h-2 rounded-full bg-[#E8DFD0] overflow-hidden" aria-hidden>
          <div className="h-full bg-sol-ok transition-all" style={{ width: `${(feitos / ITENS_CHECKLIST.length) * 100}%` }} />
        </div>
        <ul className={`${cartao} m-0 p-0 list-none flex flex-col overflow-hidden`}>
          {ITENS_CHECKLIST.map((item, i) => (
            <li key={item} className="border-b border-[#F0E9DD] last:border-b-0">
              <button
                type="button"
                role="checkbox"
                aria-checked={!!marcados[i]}
                onClick={() => alternar(i)}
                className="w-full flex items-center gap-3 min-h-[54px] px-4 text-left"
              >
                <span className={`flex-none w-6 h-6 rounded-[7px] border-2 flex items-center justify-center ${marcados[i] ? "bg-sol-ok border-sol-ok" : "bg-white border-[#6F7E83]"}`}>
                  {marcados[i] && <Check size={14} strokeWidth={3} className="text-white" />}
                </span>
                <span className={`text-[15px] ${marcados[i] ? "line-through text-sol-texto2" : "font-semibold"}`}>{item}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="m-0 text-xs text-sol-texto2">As marcações ficam guardadas neste celular. Cada viagem tem a sua lista.</p>
      </div>
    </div>
  );
}
