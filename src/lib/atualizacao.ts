// Versão nova do app (PWA). Quando uma versão nova é publicada, o service worker
// novo fica esperando; o app mostra o aviso "Atualizar" e, ao tocar, ativa a
// versão nova e recarrega a página. Nada muda sozinho no meio do uso.
// A transição a partir do app antigo (sem botão) está em public/sol-sw-versao.js.

type Ouvinte = () => void;

const VERIFICAR_A_CADA_MS = 5 * 60 * 1000;

let pronta = false;
let pedida = false;
let registro: ServiceWorkerRegistration | undefined;
let aplicar: ((recarregar?: boolean) => Promise<void>) | null = null;
const ouvintes = new Set<Ouvinte>();

function avisar() {
  pronta = true;
  ouvintes.forEach((f) => f());
}

export function iniciarAtualizacao() {
  // Se outra versão assumir esta página sem o toque no botão (ex.: aba que ficou
  // aberta durante a transição), oferece recarregar para não misturar versões.
  const tinhaControle = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (tinhaControle && !pedida) avisar();
  });

  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      aplicar = registerSW({
        immediate: true,
        onNeedRefresh: avisar,
        // Procura versão nova de tempos em tempos e sempre que o app volta para a tela
        onRegisteredSW(_url, reg) {
          if (!reg) return;
          registro = reg;
          const verificar = () => {
            if (navigator.onLine) reg.update().catch(() => { /* tenta de novo depois */ });
          };
          setInterval(verificar, VERIFICAR_A_CADA_MS);
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") verificar();
          });
        },
      });
    })
    .catch(() => {
      // módulo virtual indisponível (ambiente de desenvolvimento) — pode ignorar
    });
}

export function novaVersaoPronta() {
  return pronta;
}

export function aoTerNovaVersao(f: Ouvinte) {
  ouvintes.add(f);
  return () => { ouvintes.delete(f); };
}

export async function atualizarAgora() {
  pedida = true;
  // Versão nova já ativa (sem nada esperando): basta recarregar
  if (!aplicar || !registro?.waiting) {
    window.location.reload();
    return;
  }
  // Se a troca não recarregar a página sozinha em alguns segundos, recarrega aqui
  window.setTimeout(() => window.location.reload(), 4000);
  await aplicar(true);
}
