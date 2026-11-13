import { Navigate, useSearchParams } from "react-router-dom";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { TopBar } from "@/components/app/ui";
import type { AbaAdmin } from "./admin/comum";
import VisaoGeral from "./admin/VisaoGeral";
import Saude from "./admin/Saude";
import Usuarios from "./admin/Usuarios";
import Conversas from "./admin/Conversas";
import Roteiros from "./admin/Roteiros";
import Logs from "./admin/Logs";
import Liberar from "./admin/Liberar";

// Painel de administração: só para os telefones em ADMIN_PHONES no servidor (a equipe).
// Clientes nunca chegam aqui: o servidor recusa (403) e esta tela volta para o perfil.
// A aba e o que está aberto ficam no endereço (?aba=usuarios&phone=...), então o
// botão voltar do aparelho funciona e dá para mandar o link para outro admin.
const ABAS: [AbaAdmin, string][] = [["geral", "Visão geral"], ["saude", "Saúde"], ["usuarios", "Usuários"], ["conversas", "Conversas"], ["roteiros", "Roteiros"], ["logs", "Logs"], ["liberar", "Liberar"]];

export default function AppAdmin() {
  const { profile } = useClientAuth();
  const [busca, setBusca] = useSearchParams();
  const aba = (ABAS.some(([id]) => id === busca.get("aba")) ? busca.get("aba") : "geral") as AbaAdmin;
  const v = (k: string) => busca.get(k) ?? "";

  if (profile && !profile.admin) return <Navigate to="/app/perfil" replace />;

  const ir = (nova: AbaAdmin, extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ aba: nova });
    for (const [k, valor] of Object.entries(extra)) if (valor) p.set(k, valor);
    setBusca(p);
    window.scrollTo(0, 0);
  };

  return (
    <div className="flex flex-col">
      <TopBar title="Administração" step="Área interna da equipe" back="/app/perfil" />
      <nav aria-label="Seções da administração" className="sticky top-0 z-30 flex gap-1.5 overflow-x-auto no-scrollbar px-5 py-2 bg-sol-areia border-b border-sol-linha">
        {ABAS.map(([id, rotulo]) => (
          <button key={id} type="button" aria-current={aba === id ? "page" : undefined} onClick={() => ir(id)}
            className={`flex-none min-h-[40px] px-3.5 rounded-full text-sm font-bold border-[1.5px] ${aba === id ? "bg-sol-fundo text-white border-sol-fundo" : "bg-white text-sol-fundo border-sol-borda"}`}>
            {rotulo}
          </button>
        ))}
      </nav>
      <div className="w-full max-w-5xl mx-auto px-5 pt-3">
        {!profile ? null
          : aba === "geral" ? <VisaoGeral ir={ir} />
          : aba === "saude" ? <Saude />
          : aba === "usuarios" ? <Usuarios phone={v("phone")} q={v("q")} ir={ir} />
          : aba === "conversas" ? <Conversas phone={v("phone")} q={v("q")} ir={ir} />
          : aba === "roteiros" ? <Roteiros id={v("id")} q={v("q")} ir={ir} />
          : aba === "logs" ? <Logs key={busca.toString()} inicial={{ nivel: v("nivel"), phone: v("phone"), etapa: v("etapa"), q: v("q") }} ir={ir} />
          : <Liberar inicial={v("phone")} />}
      </div>
    </div>
  );
}
