import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { Aviso, TopBar, btnPrimario, btnSecundario, cartao } from "@/components/app/ui";
import { posicaoAtual } from "@/lib/geo";
import { VERSAO_LOCALIZACAO, abrirAjustesLocalizacao, pedirPermissaoNativa, useLocalizacaoEmUso } from "@/lib/localizacao";
import { ehNativo } from "@/lib/nativo";

// Consentimento da localização durante a viagem (finalidades determinadas,
// revogável a qualquer momento). Texto provisório até a revisão jurídica.
export default function AppLocalizacao() {
  const { profile, token, isDemo, refreshProfile } = useClientAuth();
  const ligada = !!profile?.consentimentos?.localizacao_viagem?.aceito;
  const emUso = useLocalizacaoEmUso();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // ?primeira=1: pergunta feita na entrada do app (quem já tinha cadastro); volta para o Início
  const primeira = useSearchParams()[0].get("primeira") === "1";

  async function mudar(aceito: boolean) {
    setErro(null);
    if (isDemo) { setErro("No modo demonstração nada é gravado."); return; }
    setOcupado(true);
    try {
      if (aceito && !(ehNativo ? await pedirPermissaoNativa() : await posicaoAtual(15000))) {
        setErro("O celular não liberou a localização. Permita a localização para o app e tente de novo.");
        return;
      }
      const r = await fetch(`${API_URL}/api/app/consentimento`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tipo: "localizacao_viagem", versao: VERSAO_LOCALIZACAO, aceito }),
      });
      if (!r.ok) { setErro("Não consegui salvar agora. Tente de novo."); return; }
      await refreshProfile();
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-col">
      <TopBar title="Localização durante a viagem" back={primeira ? "/app" : "/app/perfil"} />
      <div className="flex flex-col gap-3 px-5">
        <div className={`flex items-center gap-3 p-4 rounded-2xl ${ligada ? "bg-sol-ok-claro text-sol-ok-texto" : "bg-[#F5F0E8]"}`}>
          <MapPin size={24} className="flex-none" />
          <span className="flex-1 flex flex-col">
            <span className="text-[15px] font-extrabold">{ligada ? "Ligada" : "Desligada"}</span>
            <span className="text-[13px]">{ligada ? (emUso ? "Em uso agora, durante a sua viagem." : "Usada só nos dias de uma viagem com roteiro.") : "Nada da sua localização é guardado."}</span>
          </span>
        </div>

        <section className={`${cartao} flex flex-col gap-2 p-4 text-[15px] leading-snug`}>
          {ehNativo ? (
            <>
              <p className="m-0">Quando ligada, a Sol registra onde você está <strong>mesmo com o app fechado</strong>, só nos dias de uma viagem com roteiro. No Android, uma notificação fixa mostra que a Sol está acompanhando.</p>
              <p className="m-0">Quando o celular perguntar, escolha <strong>"Permitir o tempo todo"</strong> (Android) ou <strong>"Sempre"</strong> (iPhone). Sem isso, só registra com o app aberto.</p>
            </>
          ) : (
            <p className="m-0">Quando ligada, a Sol registra onde você está <strong>enquanto o app está aberto</strong>, só nos dias de uma viagem com roteiro.</p>
          )}
          <p className="m-0 font-extrabold">Para quê</p>
          <ol className="m-0 pl-5 flex flex-col gap-1">
            <li>Avisos, sugestões e a Guia Sol no lugar certo.</li>
            <li>Estatísticas de turismo <strong>agregadas e anônimas</strong> (por exemplo, quantas pessoas visitaram uma região num mês), entregues a prefeituras, órgãos de turismo e parceiros. Nenhum relatório identifica você.</li>
          </ol>
          <p className="m-0">Você pode desligar quando quiser, aqui ou em Perfil. Desligar não muda o resto do app.</p>
        </section>
        <Aviso tom="atencao">Texto provisório: a versão final, com o prazo de guarda dos dados, depende da revisão jurídica.</Aviso>

        {erro && <p role="status" className="m-0 text-sm text-sol-sos">{erro}</p>}
        {ligada ? (
          <>
            {ehNativo && <button type="button" onClick={abrirAjustesLocalizacao} className={btnSecundario}>Abrir ajustes do celular ("o tempo todo")</button>}
            <button type="button" disabled={ocupado} onClick={() => mudar(false)} className={btnSecundario}>{ocupado ? "Salvando..." : "Desligar"}</button>
          </>
        ) : (
          <>
            <button type="button" disabled={ocupado} onClick={() => mudar(true)} className={btnPrimario}>{ocupado ? "Salvando..." : "Concordo e quero ligar"}</button>
            {primeira && <button type="button" disabled={ocupado} onClick={() => mudar(false)} className={btnSecundario}>Agora não</button>}
          </>
        )}
      </div>
    </div>
  );
}
