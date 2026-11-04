import { Capacitor } from "@capacitor/core";

// true quando o app roda dentro do invólucro nativo (Capacitor: Android/iPhone das lojas).
// No navegador/PWA é false. Usado para trocar o que é só do navegador (service worker,
// chamadas relativas à Vercel) pelo equivalente do app nativo.
export const ehNativo = Capacitor.isNativePlatform();
export const plataforma = Capacitor.getPlatform(); // "web" | "android" | "ios"

// Endereço da API quando não há a Vercel no meio (app nativo)
export const API_NATIVA = "https://sol-api.2-24-73-122.sslip.io";
