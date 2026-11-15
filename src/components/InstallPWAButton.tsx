import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Download, X } from "lucide-react";
import { Instalar } from "@/components/Instalar";
import { useInstalacao } from "@/lib/instalar";

// Cartão que oferece instalar o app (some por 7 dias quando a pessoa fecha). O botão é o
// mesmo "Instalar o app" das outras telas: um toque no Android, passo a passo no iPhone.
const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function InstallPWAButton() {
  const { instalado, instalouAgora } = useInstalacao();
  const [fechado, setFechado] = useState(true);
  const { pathname } = useLocation();

  useEffect(() => {
    let quando = 0;
    try { quando = Number(localStorage.getItem(DISMISS_KEY) || 0); } catch { /* sem armazenamento */ }
    setFechado(!!quando && Date.now() - quando < DISMISS_TTL_MS);
  }, []);

  function fechar() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* sem armazenamento */ }
    setFechado(true);
  }

  // A tela de entrada já tem o botão "Instalar o app": o cartão por cima só atrapalharia
  if (fechado || instalado || instalouAgora || /^\/app\/entrar/.test(pathname)) return null;

  return (
    <div className="fixed top-[max(12px,env(safe-area-inset-top))] left-4 right-4 z-[60] mx-auto max-w-md flex items-center gap-3 rounded-2xl border border-sol-linha bg-white p-3 shadow-lg font-corpo text-sol-fundo">
      <img src="/sol-mark.png" alt="" className="flex-none w-10 h-10 object-contain" />
      <div className="flex-1 min-w-0">
        <strong className="block text-sm leading-tight">Instale o app Sol</strong>
        <span className="block text-xs text-sol-texto2">Abre direto pelo ícone, sem procurar o site.</span>
      </div>
      <Instalar>
        {(instalar) => (
          <button type="button" onClick={instalar} className="flex-none flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl bg-sol-mar text-white text-sm font-bold"><Download size={16} /> Instalar</button>
        )}
      </Instalar>
      <button type="button" onClick={fechar} aria-label="Fechar" className="flex-none w-9 h-11 -mr-1.5 flex items-center justify-center text-sol-texto2"><X size={18} /></button>
    </div>
  );
}
