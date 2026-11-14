import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, TriangleAlert, Ticket, X } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";

// Avisos no Início: comunicados da equipe (por cidade) e avisos automáticos da Guia Sol
// (evento hoje na cidade, parada do roteiro que consta fechada, tempo ruim). A pessoa
// dispensa com o X. O servidor avalia as regras em segundo plano, então a tela pergunta
// de novo uma vez, 25 segundos depois.

interface Aviso { id: string; origem: "equipe" | "sol"; tipo: string; nivel: "info" | "atencao" | "urgente"; titulo: string; texto: string; link: string | null; em: string }
const ESTILO: Record<Aviso["nivel"], string> = {
  urgente: "bg-sol-sos-claro border-[#F1CFCA] text-[#7A1A12]",
  atencao: "bg-sol-atencao border-sol-atencao-borda text-sol-atencao-texto",
  info: "bg-white border-sol-linha text-sol-fundo",
};

function cidadeDaSessao(): string {
  try { return String(JSON.parse(sessionStorage.getItem("sol_cidade_posicao") || "null")?.nome ?? ""); } catch { return ""; }
}

// semClima: no Início o alerta de chuva da viagem já aparece em outro cartão
export default function AvisosDaSol({ semClima = false }: { semClima?: boolean }) {
  const { token } = useClientAuth();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [todos, setTodos] = useState(false);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    if (!token) return;
    const buscar = async () => {
      try {
        const r = await fetch(`${API_URL}/api/app/avisos?cidade=${encodeURIComponent(cidadeDaSessao())}`, { headers: { Authorization: `Bearer ${token}` } });
        const d = r.ok ? await r.json().catch(() => null) : null;
        // Resposta incompleta não pode quebrar o Início: só entram avisos com título e texto
        const lista: Aviso[] = Array.isArray(d?.avisos) ? d.avisos.filter((a: Aviso) => a && typeof a.id === "string" && typeof a.titulo === "string" && typeof a.texto === "string") : [];
        if (vivo.current) setAvisos(lista);
      } catch { /* sem conexão: sem avisos */ }
    };
    buscar();
    const depois = window.setTimeout(buscar, 25000);
    return () => { vivo.current = false; window.clearTimeout(depois); };
  }, [token]);

  async function dispensar(id: string) {
    setAvisos((l) => l.filter((a) => a.id !== id));
    fetch(`${API_URL}/api/app/avisos/lido`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) }).catch(() => { /* volta na próxima abertura */ });
  }

  const lista = avisos.filter((a) => !(semClima && a.tipo === "clima"));
  if (!lista.length) return null;
  const visiveis = todos ? lista : lista.slice(0, 2);

  return (
    <section aria-label="Avisos" className="flex flex-col gap-2">
      {visiveis.map((a) => {
        const Icone = a.tipo === "evento" ? Ticket : a.nivel === "info" ? Megaphone : TriangleAlert;
        const externo = !!a.link && /^https:\/\//.test(a.link);
        const interno = !!a.link && a.link.startsWith("/app");
        return (
          <article key={a.id} role={a.nivel === "info" ? "status" : "alert"} className={`relative flex gap-2.5 p-3.5 pr-11 rounded-2xl border ${ESTILO[a.nivel] ?? ESTILO.info}`}>
            <Icone size={20} className="flex-none mt-0.5" />
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <strong className="text-[15px] leading-tight break-words">{a.titulo}</strong>
              <span className="text-[13px] leading-snug break-words">{a.texto}</span>
              <span className="flex flex-wrap items-center gap-x-3 text-xs">
                <span className="opacity-80">{a.origem === "equipe" ? "Comunicado da equipe Sol" : a.tipo === "evento" ? "Achado pela Sol" : "Aviso da Guia Sol"}</span>
                {externo && <a href={a.link!} target="_blank" rel="noopener noreferrer" className="min-h-[32px] flex items-center font-bold underline">{a.tipo === "evento" ? "Ver a fonte" : "Saber mais"}</a>}
                {interno && <Link to={a.link!} className="min-h-[32px] flex items-center font-bold underline">Abrir</Link>}
              </span>
            </div>
            <button type="button" onClick={() => dispensar(a.id)} aria-label={`Dispensar aviso: ${a.titulo}`} className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center rounded-full"><X size={18} /></button>
          </article>
        );
      })}
      {lista.length > 2 && (
        <button type="button" onClick={() => setTodos(!todos)} className="self-start min-h-[40px] text-sm font-bold text-sol-mar">{todos ? "Mostrar menos" : `Ver mais ${lista.length - 2} ${lista.length - 2 === 1 ? "aviso" : "avisos"}`}</button>
      )}
    </section>
  );
}
