import { useEffect } from "react";
import { useRouteError } from "react-router-dom";
import { relatarErro } from "@/lib/erros";

// Quando uma tela quebra, a pessoa não pode ficar presa: esta tela aparece no lugar,
// com saída, e o erro vai sozinho para a equipe (painel de administração, em Logs).
// "inteira": o erro foi fora das abas do app (não há barra de navegação por baixo).
export default function TelaErro({ inteira = false }: { inteira?: boolean }) {
  const erro = useRouteError();
  const mensagem = erro instanceof Error ? erro.message : String((erro as { statusText?: string })?.statusText ?? erro ?? "");
  // Versão nova publicada com esta tela ainda aberta: o pedaço antigo do app não existe mais
  const versaoAntiga = /dynamically imported module|Importing a module script failed|error loading dynamically|ChunkLoadError/i.test(mensagem);

  useEffect(() => { relatarErro("tela", erro); }, [erro]);

  return (
    <div role="alert" className={`flex flex-col items-center text-center gap-3 px-6 bg-sol-areia font-corpo text-sol-fundo ${inteira ? "min-h-screen justify-center" : "pt-16"}`}>
      <img src="/sol-mark.png" alt="" className="w-16 h-16 object-contain" />
      <h1 className="m-0 font-display font-extrabold text-2xl">{versaoAntiga ? "O app foi atualizado" : "Algo deu errado nesta tela"}</h1>
      <p className="m-0 max-w-[320px] text-[15px] text-sol-texto2">
        {versaoAntiga
          ? "Toque em recarregar para abrir a versão nova. Seus roteiros continuam salvos."
          : "Seus roteiros e dados continuam salvos. Já avisamos a equipe sobre este erro."}
      </p>
      <button type="button" onClick={() => window.location.reload()} className="w-full max-w-[320px] min-h-[52px] rounded-2xl bg-sol-fundo text-white font-extrabold text-base">
        {versaoAntiga ? "Recarregar" : "Tentar de novo"}
      </button>
      <button type="button" onClick={() => window.location.assign("/app")} className="w-full max-w-[320px] min-h-[52px] rounded-2xl border-[1.5px] border-sol-borda bg-white text-sol-fundo font-extrabold text-base">
        Voltar ao início
      </button>
      <a href="/app/chat" className="min-h-[44px] flex items-center text-sm font-bold text-sol-mar">Falar com a Sol</a>
    </div>
  );
}
