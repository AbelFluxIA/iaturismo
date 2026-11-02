import { useState } from "react";
import { MapPin, Route, X } from "lucide-react";
import { btnPrimario } from "@/components/app/ui";
import { queryDoMapa } from "@/lib/geo";

// Rota em outro app de mapas (RA-ROT-21): Google Maps, Waze ou Mapas (iPhone),
// com "Lembrar minha escolha".
const CHAVE = "sol_app_mapas";
type AppMapa = "google" | "waze" | "apple";

const ehIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

function link(app: AppMapa, mapUrl: string) {
  const q = queryDoMapa(mapUrl);
  if (!q || app === "google") return mapUrl;
  if (app === "waze") return `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`;
  return `https://maps.apple.com/?q=${encodeURIComponent(q)}`;
}

export function AbrirRota({ mapUrl, rotulo = "Ver rota", className = btnPrimario }: { mapUrl: string; rotulo?: string; className?: string }) {
  const [aberto, setAberto] = useState(false);
  const [lembrar, setLembrar] = useState(false);

  function abrir() {
    let salvo: AppMapa | null = null;
    try { salvo = localStorage.getItem(CHAVE) as AppMapa | null; } catch { /* ok */ }
    if (salvo) { window.open(link(salvo, mapUrl), "_blank", "noopener"); return; }
    setAberto(true);
  }
  function escolher(app: AppMapa) {
    if (lembrar) { try { localStorage.setItem(CHAVE, app); } catch { /* ok */ } }
    setAberto(false);
    window.open(link(app, mapUrl), "_blank", "noopener");
  }

  const opcoes: [AppMapa, string][] = [["google", "Google Maps"], ["waze", "Waze"], ...(ehIphone() ? [["apple", "Mapas"] as [AppMapa, string]] : [])];

  return (
    <>
      <button type="button" onClick={abrir} className={className}><Route size={18} /> {rotulo}</button>
      {aberto && (
        <div role="dialog" aria-modal="true" aria-label="Abrir rota em" className="fixed inset-0 z-[80] flex items-end bg-black/40" onClick={() => setAberto(false)}>
          <div className="w-full max-w-[480px] mx-auto flex flex-col gap-2 p-5 pb-[max(20px,env(safe-area-inset-bottom))] rounded-t-[24px] bg-white text-sol-fundo font-corpo" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-lg font-extrabold">Abrir rota em</h2>
              <button type="button" aria-label="Fechar" onClick={() => setAberto(false)} className="w-11 h-11 flex items-center justify-center"><X size={20} /></button>
            </div>
            {opcoes.map(([app, nome]) => (
              <button key={app} type="button" onClick={() => escolher(app)} className="flex items-center gap-3 min-h-[52px] px-4 rounded-xl border border-sol-linha text-left text-[15px] font-bold">
                <MapPin size={20} className="text-sol-mar" />{nome}
              </button>
            ))}
            <label className="flex items-center gap-3 min-h-[44px] mt-1">
              <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} className="w-5 h-5 accent-[#0B5F8A]" />
              <span className="text-sm font-semibold">Lembrar minha escolha</span>
            </label>
          </div>
        </div>
      )}
    </>
  );
}
