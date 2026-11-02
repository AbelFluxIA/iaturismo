import { useEffect, useState } from "react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { useViagens } from "@/contexts/ViagensContext";
import { distanciaKm } from "@/lib/geo";
import { situacao } from "@/lib/roteiro";

// Localização durante a viagem (opcional, com consentimento).
// Nesta versão (PWA) só funciona com o app aberto; com o app nas lojas
// (Capacitor) passa a funcionar também em segundo plano, se a pessoa permitir.

export const VERSAO_LOCALIZACAO = "localizacao-v1-rascunho";
const DISTANCIA_MIN_KM = 0.25;
const INTERVALO_MAX_MS = 10 * 60 * 1000;

// Estado compartilhado: "a localização da viagem está sendo usada agora"
let ativoAgora = false;
const ouvintes = new Set<(v: boolean) => void>();
function definirAtivo(v: boolean) {
  if (v === ativoAgora) return;
  ativoAgora = v;
  ouvintes.forEach((f) => f(v));
}
export function useLocalizacaoEmUso() {
  const [v, setV] = useState(ativoAgora);
  useEffect(() => { ouvintes.add(setV); return () => { ouvintes.delete(setV); }; }, []);
  return v;
}

// Fica montado no layout do app: envia a posição quando a pessoa se move
// (250 m) ou a cada 10 minutos, só durante a viagem e com o consentimento.
export function RastreioViagem() {
  const { profile, token, isDemo } = useClientAuth();
  const { atual } = useViagens();
  const consentiu = !!profile?.consentimentos?.localizacao_viagem?.aceito;
  const emViagem = !!atual && situacao(atual) === "agora";
  const ligado = consentiu && emViagem && !!token && !isDemo && "geolocation" in navigator;

  useEffect(() => {
    if (!ligado) { definirAtivo(false); return; }
    // Última posição enviada fica no aparelho: reabrir o app não reenvia o mesmo ponto
    const CHAVE = "sol_ultima_posicao";
    let ultimo: { lat: number; lng: number; t: number } | null = null;
    try { ultimo = JSON.parse(sessionStorage.getItem(CHAVE) || "null"); } catch { /* ok */ }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        definirAtivo(true);
        const atualPos = { lat: p.coords.latitude, lng: p.coords.longitude, t: Date.now() };
        if (ultimo && distanciaKm(ultimo, atualPos) < DISTANCIA_MIN_KM && atualPos.t - ultimo.t < INTERVALO_MAX_MS) return;
        ultimo = atualPos;
        try { sessionStorage.setItem(CHAVE, JSON.stringify(atualPos)); } catch { /* ok */ }
        fetch(`${API_URL}/api/app/presenca`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tipo: "posicao", lat: atualPos.lat, lng: atualPos.lng, precisao: Math.round(p.coords.accuracy), itineraryId: atual?.id }),
        }).catch(() => { /* sem conexão: tenta no próximo ponto */ });
      },
      () => definirAtivo(false),
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 30000 },
    );
    return () => { navigator.geolocation.clearWatch(id); definirAtivo(false); };
  }, [ligado, token, atual?.id]);

  return null;
}
