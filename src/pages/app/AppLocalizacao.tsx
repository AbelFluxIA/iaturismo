import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { Aviso, TopBar, btnPrimario, btnSecundario, cartao } from "@/components/app/ui";
import { posicaoAtual } from "@/lib/geo";
import { VERSAO_LOCALIZACAO, abrirAjustesLocalizacao, pedirPermissaoNativa, useLocalizacaoEmUso } from "@/lib/localizacao";
import { ehNativo } from "@/lib/nativo";
import AvisosNoCelular from "@/components/app/AvisosNoCelular";
import { abrirAjustesDeLocalizacaoDoCelular, explicarSemPosicao, motivoSemPosicao, podeAbrirAjustesDoCelular, type MotivoSemPosicao } from "@/lib/gps";

// Consentimento da localização durante a viagem (finalidades determinadas,
// revogável a qualquer momento). Texto provisório até a revisão jurídica.
export default function AppLocalizacao() {
  const { profile, token, isDemo, refreshProfile } = useClientAuth();
  const ligada = !!profile?.consentimentos?.localizacao_viagem?.aceito;
  const emUso = useLocalizacaoEmUso();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<MotivoSemPosicao | null>(null);
  // ?primeira=1: pergunta feita na entrada do app (quem já tinha cadastro); volta para o Início
  const primeira = useSearchParams()[0].get("primeira") === "1";
  // Depois de responder na entrada, volta para onde a pessoa ia (ex.: link de um roteiro)
  const navigate = useNavigate();
  const de = (useLocation().state as { de?: string } | null)?.de;
  const voltar = de && de.startsWith("/app") && !de.startsWith("/app/localizacao") ? de : "/app";

  async function mudar(aceito: boolean) {
    setErro(null); setMotivo(null);
    if (isDemo) { setErro("No modo demonstração nada é gravado."); return; }
    setOcupado(true);
    try {
      // Permissão do app E localização do celular ligada: sem as duas, nada funciona.
      // No app Android, o próprio celular mostra o aviso para ligar a localização.
      if (aceito && !(ehNativo ? await pedirPermissaoNativa() : await posicaoAtual(15000, { ligar: true }))) {
        setMotivo(motivoSemPosicao());
        setErro(explicarSemPosicao());
        return;
      }
      const r = await fetch(`${API_URL}/api/app/consentimento`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tipo: "localizacao_viagem", versao: VERSAO_LOCALIZACAO, aceito }),
      });
      if (!r.ok) { setErro("Não consegui salvar agora. Tente de novo."); return; }
      await refreshProfile();
      if (primeira) navigate(voltar, { replace: true });
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-col">
      <TopBar title="Localização durante a viagem" back={primeira ? voltar : "/app/perfil"} />
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
          <ol className="m-0 pl-5 flex flex-col gap-1 list-decimal">
            <li>Avisos, sugestões e a Guia Sol no lugar certo.</li>
            <li>Estatísticas de turismo <strong>agregadas e anônimas</strong> (por exemplo, quantas pessoas visitaram uma região num mês), entregues a prefeituras, órgãos de turismo e parceiros. Nenhum relatório identifica você.</li>
          </ol>
          <p className="m-0">Você pode desligar quando quiser, aqui ou em Perfil. Desligar não muda o resto do app.</p>
        </section>
        {erro && (
          <div role="alert" className="flex flex-col gap-2 px-3.5 py-3 rounded-[14px] border bg-sol-sos-claro border-[#F0B4AC] text-sm text-sol-sos">
            <span>{erro}</span>
            {motivo === "desligada" && podeAbrirAjustesDoCelular() && <button type="button" onClick={() => mudar(true)} disabled={ocupado} className="self-start min-h-[40px] px-3 rounded-xl bg-sol-fundo text-white font-bold">Ligar a localização</button>}
            {motivo === "desligada" && podeAbrirAjustesDoCelular() && <button type="button" onClick={abrirAjustesDeLocalizacaoDoCelular} className="self-start min-h-[36px] font-bold underline">Abrir os ajustes de localização do celular</button>}
            {motivo === "negada" && ehNativo && <button type="button" onClick={abrirAjustesLocalizacao} className="self-start min-h-[40px] px-3 rounded-xl bg-sol-fundo text-white font-bold">Abrir os ajustes do app</button>}
          </div>
        )}
        <div className={primeira ? "sticky bottom-[calc(var(--sol-nav)+8px)] z-10 -mx-5 px-5 py-3 bg-sol-areia/95 backdrop-blur flex flex-col gap-2" : "flex flex-col gap-2"}>
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
        <AvisosNoCelular compacto />
        <p className="m-0 text-[11px] text-sol-texto2">Texto provisório: a versão final, com o prazo de guarda dos dados, depende da revisão jurídica.</p>
      </div>
    </div>
  );
}
