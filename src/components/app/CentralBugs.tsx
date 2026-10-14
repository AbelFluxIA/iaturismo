import { useEffect } from "react";
import { useClientAuth } from "@/contexts/ClientAuthContext";

// Plugin Central de Bugs (relatar bug, melhoria ou ajuste com prints).
// Carregado da própria Central para receber atualizações automáticas.
// Quem decide se o botão aparece é o servidor (/api/central-bugs/access):
// só telefones da equipe; turistas e modo demonstração não veem nada.
const CENTRAL_ORIGIN = "https://central-de-bugs.vercel.app";

interface Instancia { destroy: () => void }
interface CentralBugsApi {
  connect: (config: {
    accessEndpoint: string;
    signal?: AbortSignal;
    position?: string;
    accessHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  }) => Promise<Instancia | null>;
}
declare global {
  interface Window { CentralBugs?: CentralBugsApi }
}

let carregando: Promise<void> | null = null;
function carregarScript() {
  if (window.CentralBugs) return Promise.resolve();
  if (!carregando) {
    carregando = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `${CENTRAL_ORIGIN}/central-bugs.js`;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { carregando = null; reject(new Error("Central de Bugs indisponível")); };
      document.head.appendChild(s);
    });
  }
  return carregando;
}

export default function CentralBugs() {
  const { token, isDemo } = useClientAuth();

  useEffect(() => {
    if (!token || isDemo) return;
    const ciclo = new AbortController();
    let instancia: Instancia | null = null;

    carregarScript()
      .then(() => {
        if (ciclo.signal.aborted || !window.CentralBugs) return null;
        return window.CentralBugs.connect({
          accessEndpoint: "/api/central-bugs/access",
          signal: ciclo.signal,
          position: "top-right", // embaixo fica a barra de abas
          accessHeaders: () => ({ Authorization: `Bearer ${token}` }),
        });
      })
      .then((inst) => {
        if (ciclo.signal.aborted) inst?.destroy();
        else instancia = inst ?? null;
      })
      .catch((err) => console.warn("[Central de Bugs]", err?.message || err));

    // Sair, trocar de conta ou entrar no modo demonstração remove o botão.
    return () => { ciclo.abort(); instancia?.destroy(); };
  }, [token, isDemo]);

  return null;
}
