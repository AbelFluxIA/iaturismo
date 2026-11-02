import { useState } from "react";
import { MapPin } from "lucide-react";
import { useFotoLugar } from "@/lib/fotoLugar";
import { CORES_TIPO } from "@/lib/sugestoes";

// Foto do destino (Wikimedia Commons) ou, sem foto, o fundo colorido do tipo.
// Nas miniaturas o crédito fica na tela do destino; com `credito`, aparece embaixo.
export function ImagemLugar({ nome, uf, tipo, className, icone = 22, credito = false }: {
  nome: string;
  uf: string;
  tipo: string;
  className: string;
  icone?: number;
  credito?: boolean;
}) {
  const foto = useFotoLugar(nome, uf);
  const [falhou, setFalhou] = useState(false);
  const mostrar = foto && !falhou;

  return (
    <>
      <span className={`relative overflow-hidden flex items-center justify-center ${className}`} style={{ background: CORES_TIPO[tipo] ?? "#EDE7DC" }}>
        <MapPin size={icone} className="text-sol-fundo/50" />
        {mostrar && (
          <img src={foto.url} alt="" loading="lazy" decoding="async" onError={() => setFalhou(true)} className="absolute inset-0 w-full h-full object-cover" />
        )}
      </span>
      {credito && mostrar && (
        <a href={foto.pagina} target="_blank" rel="noopener noreferrer" className="-mt-2 text-[11px] text-sol-texto2 no-underline truncate">
          Foto: {foto.autor} · {foto.licenca} · Wikimedia Commons
        </a>
      )}
    </>
  );
}
