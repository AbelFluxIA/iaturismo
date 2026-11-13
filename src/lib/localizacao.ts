import { useEffect, useState } from "react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { useViagens } from "@/contexts/ViagensContext";
import { distanciaKm } from "@/lib/geo";
import { situacao } from "@/lib/roteiro";
import { ehNativo } from "@/lib/nativo";
import { anotarMotivo, ligarLocalizacaoDoCelular } from "@/lib/gps";
import { registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";

// Localização durante a viagem (opcional, com consentimento).
// No site (PWA) só funciona com o app aberto; no app das lojas (Capacitor)
// funciona também com o app fechado, pelo plugin de segundo plano.

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

const vigiaNativo = () => registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");
const TEXTO_NOTIFICACAO = { backgroundTitle: "Sol está acompanhando sua viagem", backgroundMessage: "Toque para abrir o app. Desligue em Perfil → Localização." };

// App das lojas: abre o pedido de permissão do celular (no Android 10+ o "o tempo todo"
// é escolhido nos ajustes; o plugin leva a pessoa até lá). true = liberou ao menos em uso.
export async function pedirPermissaoNativa(): Promise<boolean> {
  if (!ehNativo) return false;
  anotarMotivo(null);
  // Primeiro a localização do CELULAR: desligada, a permissão sozinha não adianta
  if (!(await ligarLocalizacaoDoCelular())) { anotarMotivo("desligada"); return false; }
  const BG = vigiaNativo();
  const desligada = (e: unknown) => /disabled|desligad/i.test(String((e as { message?: string })?.message ?? e));
  return new Promise((ok) => {
    let id: string | null = null;
    let fim = false;
    const terminar = (r: boolean) => {
      if (fim) return;
      fim = true;
      if (id) BG.removeWatcher({ id }).catch(() => { /* ok */ });
      ok(r);
    };
    BG.addWatcher({ ...TEXTO_NOTIFICACAO, requestPermissions: true, stale: true }, (pos, erro) => {
      if (erro) { if (erro.code === "NOT_AUTHORIZED") anotarMotivo(desligada(erro) ? "desligada" : "negada"); terminar(erro.code !== "NOT_AUTHORIZED"); }
      else if (pos) terminar(true);
    })
      .then((i) => { id = i; if (fim) BG.removeWatcher({ id: i }).catch(() => { /* ok */ }); })
      .catch((e) => { anotarMotivo(desligada(e) ? "desligada" : "negada"); terminar(false); });
    window.setTimeout(() => terminar(true), 20000);
  });
}

// Ajustes de localização do app no celular (para mudar para "o tempo todo")
export function abrirAjustesLocalizacao() {
  if (ehNativo) vigiaNativo().openSettings().catch(() => { /* ok */ });
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
    const enviar = (lat: number, lng: number, precisao: number | null) => {
      definirAtivo(true);
      const atualPos = { lat, lng, t: Date.now() };
      if (ultimo && distanciaKm(ultimo, atualPos) < DISTANCIA_MIN_KM && atualPos.t - ultimo.t < INTERVALO_MAX_MS) return;
      ultimo = atualPos;
      try { sessionStorage.setItem(CHAVE, JSON.stringify(atualPos)); } catch { /* ok */ }
      fetch(`${API_URL}/api/app/presenca`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tipo: "posicao", lat, lng, precisao: precisao === null ? undefined : Math.round(precisao), itineraryId: atual?.id }),
      }).catch(() => { /* sem conexão: tenta no próximo ponto */ });
    };

    // App das lojas: o plugin nativo continua mandando a posição com o app fechado
    // (no Android aparece uma notificação fixa enquanto acompanha; no iPhone pede "Sempre").
    if (ehNativo) {
      let idVigia: string | null = null;
      let cancelado = false;
      const BackgroundGeolocation = vigiaNativo();
      BackgroundGeolocation.addWatcher(
        { ...TEXTO_NOTIFICACAO, requestPermissions: true, stale: false, distanceFilter: DISTANCIA_MIN_KM * 1000 },
        (pos, erro) => {
          if (erro) { if (erro.code === "NOT_AUTHORIZED") definirAtivo(false); return; }
          if (pos) enviar(pos.latitude, pos.longitude, pos.accuracy);
        },
      ).then((id) => { if (cancelado) BackgroundGeolocation.removeWatcher({ id }); else idVigia = id; })
        .catch(() => definirAtivo(false));
      return () => {
        cancelado = true;
        if (idVigia) BackgroundGeolocation.removeWatcher({ id: idVigia }).catch(() => { /* ok */ });
        definirAtivo(false);
      };
    }

    const id = navigator.geolocation.watchPosition(
      (p) => enviar(p.coords.latitude, p.coords.longitude, p.coords.accuracy),
      () => definirAtivo(false),
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 30000 },
    );
    return () => { navigator.geolocation.clearWatch(id); definirAtivo(false); };
  }, [ligado, token, atual?.id]);

  return null;
}
