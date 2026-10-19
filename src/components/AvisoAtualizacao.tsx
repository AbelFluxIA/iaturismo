import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { aoTerNovaVersao, atualizarAgora, novaVersaoPronta } from "@/lib/atualizacao";

// Aviso fixo no topo quando há versão nova publicada (app do cliente e painel).
export function AvisoAtualizacao() {
  const [visivel, setVisivel] = useState(novaVersaoPronta);
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => aoTerNovaVersao(() => setVisivel(true)), []);

  if (!visivel) return null;

  return (
    <div
      role="status"
      className="fixed top-[max(12px,env(safe-area-inset-top))] left-4 right-4 z-[70] mx-auto max-w-md flex items-center gap-3 rounded-2xl bg-sol-fundo text-white py-2.5 pl-4 pr-2 shadow-lg font-corpo"
    >
      <RefreshCw size={20} className="flex-none text-sol-sun" aria-hidden />
      <span className="flex-1 text-sm font-semibold leading-snug">Nova versão do app disponível</span>
      <button
        type="button"
        disabled={atualizando}
        onClick={async () => {
          setAtualizando(true);
          await atualizarAgora();
        }}
        className="flex-none min-h-[44px] px-4 rounded-xl bg-sol-sun text-sol-fundo text-sm font-extrabold disabled:opacity-70"
      >
        {atualizando ? "Atualizando..." : "Atualizar"}
      </button>
      <button
        type="button"
        aria-label="Agora não"
        onClick={() => setVisivel(false)}
        className="flex-none w-10 h-11 flex items-center justify-center text-white/70"
      >
        <X size={18} />
      </button>
    </div>
  );
}
