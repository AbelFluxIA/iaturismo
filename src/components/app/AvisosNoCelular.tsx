import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { cartao } from "@/components/app/ui";
import { desligarPush, estadoDoPush, ligarPush, type EstadoPush } from "@/lib/push";

// Convite para ligar os avisos no celular (com o app fechado). Aparece no Início para quem
// tem a Guia Sol, enquanto não ligou. "compacto": linha de liga/desliga para a tela de Localização/ajustes.
const CHAVE = "sol_push_dispensado";

export default function AvisosNoCelular({ compacto = false }: { compacto?: boolean }) {
  const { token, profile } = useClientAuth();
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [dispensado, setDispensado] = useState(() => { try { return localStorage.getItem(CHAVE) === "1"; } catch { return false; } });

  useEffect(() => { let vivo = true; estadoDoPush().then((e) => { if (vivo) setEstado(e); }); return () => { vivo = false; }; }, []);

  if (!token || !profile?.hasCompanion || !estado || estado === "indisponivel") return null;
  if (!compacto && (estado === "ligado" || dispensado)) return null;

  async function ligar() {
    setOcupado(true); setAviso(null);
    const r = await ligarPush(token!);
    setEstado(r.estado); setAviso(r.erro ?? (r.estado === "ligado" ? "Pronto. Mandei um aviso de teste para este celular." : null));
    setOcupado(false);
  }
  async function desligar() { setOcupado(true); setEstado(await desligarPush(token!)); setAviso(null); setOcupado(false); }

  const texto = estado === "precisa-instalar" ? "No iPhone, os avisos chegam quando o app está na tela inicial: toque em Compartilhar e em \"Adicionar à Tela de Início\", abra o app por lá e volte aqui."
    : estado === "bloqueado" ? "As notificações estão bloqueadas para o app neste celular. Libere nos ajustes do navegador (ou do celular) e volte aqui."
    : estado === "ligado" ? "Avisos da viagem chegam neste celular mesmo com o app fechado: no máximo 3 por dia, das 8h às 21h."
    : "Receba no celular, mesmo com o app fechado: alerta de chuva forte, lugar do roteiro fechado e o resumo da manhã. No máximo 3 por dia, das 8h às 21h.";

  return (
    <section aria-label="Avisos no celular" className={`${cartao} relative flex gap-3 p-4 ${compacto ? "" : "pr-11"}`}>
      <span className="flex-none w-11 h-11 rounded-xl bg-sol-creme flex items-center justify-center"><BellRing size={22} /></span>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <strong className="text-[15px] leading-tight">Avisos no celular{estado === "ligado" ? ": ligados" : ""}</strong>
        <span className="text-[13px] leading-snug text-sol-texto2">{texto}</span>
        {aviso && <span role="status" className="text-[13px] font-semibold text-sol-fundo">{aviso}</span>}
        {estado === "desligado" && <button type="button" disabled={ocupado} onClick={ligar} className="self-start min-h-[44px] px-4 rounded-xl bg-sol-mar text-white text-sm font-bold disabled:opacity-50">{ocupado ? "Ligando…" : "Ligar avisos"}</button>}
        {estado === "ligado" && compacto && <button type="button" disabled={ocupado} onClick={desligar} className="self-start min-h-[44px] px-4 rounded-xl border-[1.5px] border-sol-borda bg-white text-sm font-bold disabled:opacity-50">Desligar avisos</button>}
      </div>
      {!compacto && (
        <button type="button" aria-label="Agora não" onClick={() => { setDispensado(true); try { localStorage.setItem(CHAVE, "1"); } catch { /* ok */ } }} className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center rounded-full"><X size={18} /></button>
      )}
    </section>
  );
}
