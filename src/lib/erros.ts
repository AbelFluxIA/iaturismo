import { API_NATIVA, ehNativo } from "@/lib/nativo";

// Erros que acontecem no aparelho da pessoa (tela que quebrou, promessa sem tratamento).
// Vão para o bot (/api/app/erro-cliente) e aparecem no painel de administração, em Logs.
// Com freio: no máximo 6 por sessão e sem repetir a mesma mensagem.

const API_URL = import.meta.env.VITE_API_URL || (ehNativo ? API_NATIVA : "");
const enviados = new Set<string>();
const RUIDO = /ResizeObserver loop|Script error\.?$|Load failed|Failed to fetch|NetworkError|AbortError|The operation was aborted|cancelled/i;

export function relatarErro(origem: string, erro: unknown, extra?: Record<string, unknown>) {
  try {
    const e = erro instanceof Error ? erro : new Error(typeof erro === "string" ? erro : JSON.stringify(erro ?? "erro"));
    const mensagem = String(e.message || "erro").slice(0, 500);
    if (origem !== "tela" && RUIDO.test(mensagem)) return;
    const chave = `${origem}:${mensagem}`;
    if (enviados.has(chave) || enviados.size >= 6) return;
    enviados.add(chave);
    let token: string | null = null;
    try { token = localStorage.getItem("sol_client_token"); } catch { /* sem armazenamento */ }
    fetch(`${API_URL}/api/app/erro-cliente`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        origem,
        mensagem,
        pilha: String(e.stack || "").slice(0, 3000),
        tela: `${location.pathname}${location.search}`.slice(0, 300),
        versao: typeof __VERSAO_APP__ !== "undefined" ? __VERSAO_APP__.commit : "",
        aparelho: navigator.userAgent.slice(0, 250),
        nativo: ehNativo,
        ...extra,
      }),
    }).catch(() => { /* sem conexão: fica só no aparelho */ });
  } catch { /* relatar erro nunca pode causar outro erro */ }
}

export function iniciarCapturaDeErros() {
  window.addEventListener("error", (ev) => { if (ev.error || ev.message) relatarErro("janela", ev.error ?? ev.message); });
  window.addEventListener("unhandledrejection", (ev) => relatarErro("promessa", ev.reason));
}
