import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { iniciarAtualizacao } from "./lib/atualizacao";
import { ehNativo } from "./lib/nativo";
import { iniciarCapturaDeErros } from "./lib/erros";

iniciarCapturaDeErros();

// Endereços antigos da Vercel apontam para outro banco: o oficial é painel.tripsol.com.br
// (a Vercel já redireciona no servidor; isto cobre o PWA instalado com service worker antigo)
if (/^iaturismo(-two)?\.vercel\.app$/.test(window.location.hostname)) {
  window.location.replace(`https://painel.tripsol.com.br${window.location.pathname}${window.location.search}${window.location.hash}`);
}

// PWA: Prevent service worker from running in iframes or preview environments
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

// No app nativo (lojas) não há service worker: a atualização vem pela loja
if (isPreviewHost || isInIframe || ehNativo) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
} else if ("serviceWorker" in navigator) {
  // Register PWA service worker in production (com aviso de versão nova)
  iniciarAtualizacao();
}

createRoot(document.getElementById("root")!).render(<App />);
