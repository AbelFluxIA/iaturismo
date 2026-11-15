import { useSyncExternalStore } from "react";
import { ehNativo } from "@/lib/nativo";

// Instalar o app (PWA) com um toque. No Android (Chrome, Edge, Samsung) o navegador entrega
// um "convite de instalação" (beforeinstallprompt) que só pode ser usado dentro de um toque:
// ele é guardado aqui, desde a abertura da página, para o botão "Instalar o app" usar.
// No iPhone a Apple não deixa o site instalar sozinho: o botão abre o passo a passo.

type Convite = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
export type Aparelho = "iphone" | "android" | "computador";

let convite: Convite | null = null;
let instalouAgora = false;
let versao = 0;
const ouvintes = new Set<() => void>();
const avisar = () => { versao++; ouvintes.forEach((f) => f()); };

export function iniciarInstalacao() {
  if (ehNativo) return;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); convite = e as Convite; avisar(); });
  window.addEventListener("appinstalled", () => { convite = null; instalouAgora = true; avisar(); });
}

const ua = () => navigator.userAgent;
export function aparelho(): Aparelho {
  // iPad novo se apresenta como Mac: o toque na tela denuncia
  if (/iPad|iPhone|iPod/.test(ua()) || (/Macintosh/.test(ua()) && navigator.maxTouchPoints > 1)) return "iphone";
  return /Android/i.test(ua()) ? "android" : "computador";
}
// Navegador de dentro de outro app (Instagram, Facebook, TikTok...): ali não dá para instalar
export function dentroDeOutroApp(): boolean {
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly|Snapchat|; wv\)/i.test(ua())) return true;
  return aparelho() === "iphone" && !/Safari\//.test(ua());
}
export const safariDoIphone = () => aparelho() === "iphone" && !dentroDeOutroApp() && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua());

export function jaInstalado(): boolean {
  if (ehNativo) return true;
  try {
    return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  } catch { return false; }
}

// Só funciona chamado direto de um toque. "sem_convite": o navegador não ofereceu (mostrar o passo a passo)
export async function instalarComUmToque(): Promise<"instalou" | "recusou" | "sem_convite"> {
  const c = convite;
  if (!c) return "sem_convite";
  convite = null; // cada convite do navegador só vale uma vez
  avisar();
  try {
    await c.prompt();
    return (await c.userChoice).outcome === "accepted" ? "instalou" : "recusou";
  } catch { return "sem_convite"; }
}

export function useInstalacao() {
  useSyncExternalStore((f) => { ouvintes.add(f); return () => ouvintes.delete(f); }, () => versao);
  return { instalado: jaInstalado() || instalouAgora, umToque: !!convite, instalouAgora };
}
