import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { formatarData } from "@/components/app/ui";

// Prazo da Guia Sol no Início (RA-GUI-04): avisa quando faltam 3 dias ou menos e, quando
// termina, pergunta se a pessoa quer manter a Guia. "Agora não" some com o cartão neste
// aparelho; a Guia continua disponível para assinar de novo no cartão "Contratar Guia Sol".

const CHAVE = "sol_guia_prazo_visto";
const lerVisto = () => { try { return localStorage.getItem(CHAVE) ?? ""; } catch { return ""; } };

export default function PrazoDaGuia() {
  const { profile, isDemo } = useClientAuth();
  const [visto, setVisto] = useState(lerVisto);
  const g = profile?.guia;
  if (!g || isDemo) return null;

  const acabando = g.ativa && g.ate && g.diasRestantes !== null && g.diasRestantes <= 3;
  const acabou = !g.ativa && !!g.terminouEm;
  if (!acabando && !acabou) return null;
  // Cada momento tem a sua marca: dispensar "termina em 3 dias" não esconde "termina amanhã" nem "terminou"
  const marca = acabou ? `fim:${g.terminouEm}` : `${g.ate}:${g.diasRestantes}`;
  if (visto === marca) return null;

  const preco = (v: number | undefined, padrao: number) => `R$ ${(v ?? padrao).toFixed(2).replace(".", ",")}`;
  const mes = preco(profile?.regras?.guiaPrecoMes, 29.9);
  const quando = g.diasRestantes === 0 ? "hoje" : g.diasRestantes === 1 ? "amanhã" : `em ${g.diasRestantes} dias`;

  function agoraNao() {
    try { localStorage.setItem(CHAVE, marca); } catch { /* sem armazenamento: some só nesta abertura */ }
    setVisto(marca);
  }

  return (
    <section aria-label="Prazo da Guia Sol" role="status" className="flex flex-col gap-2.5 p-4 rounded-2xl border bg-sol-atencao border-sol-atencao-borda text-sol-atencao-texto">
      <div className="flex items-start gap-2.5">
        <CalendarClock size={22} className="flex-none mt-0.5" />
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <strong className="text-[16px] leading-tight">
            {acabou ? `Sua Guia Sol terminou em ${formatarData(g.terminouEm)}` : `Sua Guia Sol termina ${quando} (${formatarData(g.ate)})`}
          </strong>
          <span className="text-[14px] leading-snug">
            {acabou
              ? "Quer manter a Guia ativa? Se não quiser agora, ela continua disponível para você assinar de novo quando quiser."
              : "Quer continuar com a Guia? O que você comprar agora começa a valer depois desse dia."}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link to="/app/guia?renovar=1" className="flex flex-col items-center justify-center min-h-[48px] px-2 rounded-[14px] bg-sol-mar text-white text-[14px] font-bold leading-tight no-underline text-center">
          <span>{acabou ? "Assinar de novo" : "Renovar"}</span>
          <span className="text-[12px] font-semibold">30 dias · {mes}</span>
        </Link>
        <button type="button" onClick={agoraNao} className="flex items-center justify-center min-h-[48px] px-2 rounded-[14px] bg-white border-[1.5px] border-sol-borda text-sol-fundo text-[14px] font-bold">Agora não</button>
      </div>
    </section>
  );
}
