import { registerPlugin } from "@capacitor/core";
import { ehNativo } from "@/lib/nativo";

// Localização (GPS) do CELULAR ligada ou desligada. É diferente da permissão do app:
// a pessoa pode ter permitido e mesmo assim nada funcionar porque a localização do
// aparelho está desligada. No app Android dá para pedir para ligar com um toque (aviso
// do próprio sistema). No iPhone e no site (PWA) o app não consegue abrir essa chave:
// só dá para explicar onde ela fica.

interface LocalizacaoSolPlugin {
  estado(): Promise<{ ligada: boolean }>;
  ligar(): Promise<{ ligada: boolean; como: "ja-ligada" | "aviso" | "ajustes" | "falhou" }>;
  abrirAjustes(): Promise<{ ligada: boolean }>;
}
const nativo = () => registerPlugin<LocalizacaoSolPlugin>("LocalizacaoSol");
const ehAndroidNativo = () => ehNativo && /android/i.test(navigator.userAgent);

// Por que a última leitura de posição não veio
export type MotivoSemPosicao = "desligada" | "negada" | "indisponivel";
let ultimoMotivo: MotivoSemPosicao | null = null;
export const motivoSemPosicao = () => ultimoMotivo;
export const anotarMotivo = (m: MotivoSemPosicao | null) => { ultimoMotivo = m; };

// true/false no app Android; null quando não dá para saber (iPhone, site)
export async function localizacaoDoCelularLigada(): Promise<boolean | null> {
  if (!ehAndroidNativo()) return null;
  try { return (await nativo().estado()).ligada; } catch { return null; }
}

// Pede para ligar a localização do celular e espera a pessoa responder (até ~25 s).
// Devolve true se está ligada no fim. Fora do app Android devolve true (não há o que abrir).
export async function ligarLocalizacaoDoCelular(): Promise<boolean> {
  if (!ehAndroidNativo()) return true;
  try {
    const r = await nativo().ligar();
    if (r.ligada) return true;
    if (r.como === "falhou") return false;
    // O aviso do sistema (ou a tela de ajustes) está aberto por cima do app. Confere até a
    // pessoa ligar. Se o app volta para a frente (o aviso fechou) e a localização segue
    // desligada, ela recusou. Sem sinal de ida e volta, espera até o limite.
    const inicio = Date.now();
    const limite = r.como === "ajustes" ? 90000 : 30000;
    let saiu = false;
    let voltouEm = 0;
    const aoSair = () => { saiu = true; voltouEm = 0; };
    const aoVoltar = () => { if (saiu) voltouEm = Date.now(); };
    window.addEventListener("blur", aoSair);
    window.addEventListener("focus", aoVoltar);
    const aoMudar = () => (document.visibilityState === "hidden" ? aoSair() : aoVoltar());
    document.addEventListener("visibilitychange", aoMudar);
    try {
      while (Date.now() - inicio < limite) {
        await new Promise((ok) => setTimeout(ok, 600));
        if ((await nativo().estado()).ligada) return true;
        if (voltouEm && Date.now() - voltouEm > 1800) return false;
      }
    } finally {
      window.removeEventListener("blur", aoSair);
      window.removeEventListener("focus", aoVoltar);
      document.removeEventListener("visibilitychange", aoMudar);
    }
    return false;
  } catch {
    return true; // plugin ausente (versão antiga do app): segue o caminho normal
  }
}

export function abrirAjustesDeLocalizacaoDoCelular() {
  if (ehAndroidNativo()) nativo().abrirAjustes().catch(() => { /* ok */ });
}
export const podeAbrirAjustesDoCelular = () => ehAndroidNativo();

// Texto para a pessoa, conforme o motivo e o aparelho
export function explicarSemPosicao(motivo: MotivoSemPosicao | null = ultimoMotivo): string {
  const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (motivo === "desligada" || motivo === "indisponivel") {
    if (ehAndroidNativo()) return "A localização do celular está desligada. Toque em \"Ligar a localização\" e confirme no aviso que aparecer.";
    return iphone
      ? "Não consegui ler sua localização. Confira se a localização do iPhone está ligada: Ajustes → Privacidade e Segurança → Serviços de Localização. Depois tente de novo."
      : "Não consegui ler sua localização. Confira se a localização (GPS) do celular está ligada: deslize a tela de cima para baixo e toque em \"Localização\". Depois tente de novo.";
  }
  if (motivo === "negada") {
    if (ehNativo) return "A localização está bloqueada para o app Sol. Libere nos ajustes do celular (Apps → Sol → Permissões → Localização) e tente de novo.";
    return iphone
      ? "A localização está bloqueada. Confira se a localização do iPhone está ligada (Ajustes → Privacidade e Segurança → Serviços de Localização) e se o Safari pode usar a localização. Depois tente de novo."
      : "A localização está bloqueada para este site. Toque no cadeado ao lado do endereço, libere \"Localização\" e confira se a localização (GPS) do celular está ligada.";
  }
  return "Não consegui ler sua localização agora. Confira se a localização do celular está ligada e tente de novo.";
}
