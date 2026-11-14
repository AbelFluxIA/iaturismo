import { API_URL } from "@/contexts/ClientAuthContext";
import { ehNativo } from "@/lib/nativo";

// Avisos no celular com o app fechado, pelo PWA (web push). Não vale para o app das lojas
// (lá depende do Firebase). No iPhone só funciona com o app adicionado à tela inicial (iOS 16.4+).

export type EstadoPush = "indisponivel" | "precisa-instalar" | "bloqueado" | "desligado" | "ligado";

const iphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalado = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export async function estadoDoPush(): Promise<EstadoPush> {
  if (ehNativo || !("serviceWorker" in navigator) || !("Notification" in window)) return iphone() && !ehNativo && !instalado() ? "precisa-instalar" : "indisponivel";
  if (!("PushManager" in window)) return iphone() && !instalado() ? "precisa-instalar" : "indisponivel";
  if (Notification.permission === "denied") return "bloqueado";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const s = reg ? await reg.pushManager.getSubscription() : null;
    return s && Notification.permission === "granted" ? "ligado" : "desligado";
  } catch { return "desligado"; }
}

// Chave do servidor (texto) → bytes, como o navegador pede
function bytesDaChave(base64: string): Uint8Array {
  const b = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(b);
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)));
}

// Pede a permissão (precisa vir de um toque da pessoa), inscreve o aparelho e avisa o servidor.
// Devolve o novo estado e, se falhar, o motivo em palavras simples.
export async function ligarPush(token: string): Promise<{ estado: EstadoPush; erro?: string }> {
  try {
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") return { estado: permissao === "denied" ? "bloqueado" : "desligado", erro: "Você não permitiu as notificações. Dá para liberar depois nos ajustes do celular." };
    const reg = await navigator.serviceWorker.ready;
    const r = await fetch(`${API_URL}/api/app/push/chave`, { headers: { Authorization: `Bearer ${token}` } });
    const chave = r.status === 200 ? (await r.json().catch(() => null))?.chave : null;
    if (typeof chave !== "string" || chave.length < 40) return { estado: "desligado", erro: "As notificações estão indisponíveis agora. Tente mais tarde." };
    const inscricao = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesDaChave(chave) }));
    const salvo = await fetch(`${API_URL}/api/app/push/inscrever`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ inscricao: inscricao.toJSON(), testar: true }) });
    if (!salvo.ok) { await inscricao.unsubscribe().catch(() => { /* ok */ }); return { estado: "desligado", erro: "Não consegui ligar agora. Tente de novo." }; }
    return { estado: "ligado" };
  } catch {
    return { estado: "desligado", erro: "Não consegui ligar as notificações neste aparelho." };
  }
}

export async function desligarPush(token: string): Promise<EstadoPush> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const s = reg ? await reg.pushManager.getSubscription() : null;
    if (s) {
      await fetch(`${API_URL}/api/app/push/sair`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ endpoint: s.endpoint }) }).catch(() => { /* ok */ });
      await s.unsubscribe();
    }
  } catch { /* segue */ }
  return "desligado";
}
