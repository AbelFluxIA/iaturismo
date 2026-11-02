import { Link } from "react-router-dom";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { TopBar, btnPrimario, cartao } from "@/components/app/ui";

// "Com e sem a Guia Sol" (RA-NAV-07): tabela com os valores do servidor.
const reais = (v?: number) => (v === undefined ? "-" : `R$ ${v.toFixed(2).replace(".", ",")}`);

export default function AppGuiaComparar() {
  const { profile } = useClientAuth();
  const r = profile?.regras;
  const ativa = !!profile?.hasCompanion;
  const linhas: [string, string, string][] = [
    [
      "Roteiros",
      r ? `${r.roteirosGratisSemana} grátis por semana, 1 dia cada. ${reais(r.diaRoteiroPreco)} por dia a mais. Até ${r.maxDiasSemGuia} dias` : "-",
      r ? `${r.guiaRoteirosSemana} por semana, até ${r.maxDiasComGuia} dias, sem cobrança por dia` : "-",
    ],
    ["Editar o roteiro", "Só com a Guia", "Sim, sem gastar roteiro"],
    ["Regenerar", "Usa 1 roteiro grátis. Sem grátis, não regenera", "Sim"],
    ["Alertas", "Só Severos", "Todos os níveis, Avisos perdidos e alertas no destino"],
    ["Tradutor", "Só para entrar na sala de outra pessoa", "Tradutor e criar salas"],
    ["Conversa com a Sol", r ? `${r.chatMensagensDia} mensagens por dia e 1 imagem por viagem` : "-", "Conversa aprofundada"],
    ["Tempo real, verificar, por perto, reorganizar", "Não", "Sim"],
    ["Roteiro offline", "Não", "Sim, baixa todos os dados da viagem"],
  ];
  return (
    <div className="flex flex-col">
      <TopBar title="Com e sem a Guia Sol" back="/app/guia" />
      <div className="flex flex-col gap-3 px-5">
        <div className={`${cartao} flex flex-col p-4 gap-3`}>
          <div className="grid grid-cols-2 gap-2 text-xs font-extrabold tracking-[0.06em] uppercase">
            <span className="text-sol-texto2">Sem a Guia</span>
            <span className="text-sol-ok">Com a Guia</span>
          </div>
          {linhas.map(([titulo, sem, com]) => (
            <div key={titulo} className="flex flex-col gap-1.5 pt-3 border-t border-[#F0E9DD]">
              <span className="text-[15px] font-extrabold">{titulo}</span>
              <div className="grid grid-cols-2 gap-2 text-sm leading-snug">
                <span className="p-2.5 rounded-xl bg-[#F5F0E8]">{sem}</span>
                <span className="p-2.5 rounded-xl bg-sol-ok-claro text-sol-ok-texto font-semibold">{com}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="m-0 text-xs text-sol-texto2">Valores atualizados pelo servidor.</p>
        {!ativa && (
          <Link to="/app/guia" className={`${btnPrimario} no-underline`}>
            Ativar Guia Sol{r && !profile?.ofertas?.gratisDuranteTeste ? ` · a partir de ${reais(r.guiaPrecoDia)}` : ""}
          </Link>
        )}
      </div>
    </div>
  );
}
