import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { buscarCidades, type CidadeAchada } from "@/lib/geo";

// Campo de destino com sugestões de cidades do Brasil enquanto digita ("Curit" → "Curitiba - PR").
// Sem datalist nativo: no iPhone ele brigava com a lista. A pessoa também pode seguir com o
// texto livre (país, bairro, lugar), como antes.
export function BuscaCidade({ value, onChange, placeholder, className, autoFocus }: {
  value: string;
  onChange: (texto: string) => void;
  placeholder?: string;
  className: string;
  autoFocus?: boolean;
}) {
  const [sugestoes, setSugestoes] = useState<CidadeAchada[]>([]);
  const [aberto, setAberto] = useState(false);
  const escolhido = useRef<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const idLista = useId();

  useEffect(() => {
    if (!aberto || value.trim().length < 3 || value === escolhido.current) { setSugestoes([]); return; }
    let cancelado = false;
    const t = window.setTimeout(() => {
      buscarCidades(value).then((lista) => { if (!cancelado) setSugestoes(lista.filter((c) => c.rotulo !== value)); });
    }, 450);
    return () => { cancelado = true; window.clearTimeout(t); };
  }, [value, aberto]);

  return (
    <div ref={caixa} className="relative">
      <input
        className={className}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={aberto && sugestoes.length > 0}
        aria-controls={idLista}
        aria-autocomplete="list"
        onFocus={() => setAberto(true)}
        onBlur={(e) => { if (!caixa.current?.contains(e.relatedTarget as Node | null)) window.setTimeout(() => setAberto(false), 150); }}
        onChange={(e) => { escolhido.current = null; onChange(e.target.value); }}
      />
      {aberto && sugestoes.length > 0 && (
        <ul id={idLista} role="listbox" aria-label="Cidades encontradas" className="absolute left-0 right-0 top-full z-20 m-0 mt-1 p-1 list-none rounded-xl bg-white border border-sol-borda shadow-lg">
          {sugestoes.map((c) => (
            <li key={c.rotulo} role="none">
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onBlur={(e) => { if (!caixa.current?.contains(e.relatedTarget as Node | null)) setAberto(false); }}
                onClick={() => { escolhido.current = c.rotulo; onChange(c.rotulo); setSugestoes([]); setAberto(false); }}
                className="w-full flex items-center gap-2 min-h-[44px] px-3 rounded-lg text-left text-[15px] font-semibold text-sol-fundo hover:bg-sol-areia"
              >
                <MapPin size={16} className="flex-none text-sol-mar" />{c.rotulo}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
