import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, Megaphone, TriangleAlert, Ticket, X } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";

// Avisos no Início: comunicados da equipe (por cidade) e avisos automáticos da Guia Sol
// (alerta de tempo, evento hoje na cidade, parada do roteiro que consta fechada).
// Cada aviso aparece SÓ COM O TÍTULO; o toque abre o texto e o link (pedido de quem testou:
// três avisos abertos empurravam o resto da tela para baixo). A pessoa dispensa com o X.
// O servidor avalia as regras em segundo plano, então a tela pergunta de novo uma vez,
// 25 segundos depois. A notificação do celular abre o Início com "?aviso=a12": esse aviso
// vem primeiro e já aberto.

interface Aviso { id: string; origem: "equipe" | "sol"; tipo: string; nivel: "info" | "atencao" | "urgente"; titulo: string; texto: string; link: string | null; em: string }
const ESTILO: Record<Aviso["nivel"], string> = {
  urgente: "bg-sol-sos-claro border-[#F1CFCA] text-[#7A1A12]",
  atencao: "bg-sol-atencao border-sol-atencao-borda text-sol-atencao-texto",
  info: "bg-white border-sol-linha text-sol-fundo",
};
const FECHADOS = 3; // quantos títulos aparecem antes do "Ver mais"

function cidadeDaSessao(): string {
  try { return String(JSON.parse(sessionStorage.getItem("sol_cidade_posicao") || "null")?.nome ?? ""); } catch { return ""; }
}

// aoCarregar: avisa o Início se há aviso de tempo (para não repetir o cartão de previsão de chuva)
export default function AvisosDaSol({ aoCarregar }: { aoCarregar?: (temClima: boolean) => void }) {
  const { token } = useClientAuth();
  const [params] = useSearchParams();
  const destaque = params.get("aviso");
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [todos, setTodos] = useState(false);
  const [aberto, setAberto] = useState<string | null>(destaque);
  const vivo = useRef(true);
  const avisar = useRef(aoCarregar);
  avisar.current = aoCarregar;
  const rolou = useRef(false);

  useEffect(() => {
    vivo.current = true;
    if (!token) return;
    const buscar = async () => {
      try {
        const r = await fetch(`${API_URL}/api/app/avisos?cidade=${encodeURIComponent(cidadeDaSessao())}`, { headers: { Authorization: `Bearer ${token}` } });
        const d = r.ok ? await r.json().catch(() => null) : null;
        // Resposta incompleta não pode quebrar o Início: só entram avisos com título e texto
        const lista: Aviso[] = Array.isArray(d?.avisos) ? d.avisos.filter((a: Aviso) => a && typeof a.id === "string" && typeof a.titulo === "string" && typeof a.texto === "string") : [];
        if (!vivo.current) return;
        setAvisos(lista);
        avisar.current?.(lista.some((a) => a.tipo === "clima"));
      } catch { /* sem conexão: sem avisos */ }
    };
    buscar();
    const depois = window.setTimeout(buscar, 25000);
    return () => { vivo.current = false; window.clearTimeout(depois); };
  }, [token]);

  // Veio da notificação: o aviso tocado abre e a tela rola até ele
  useEffect(() => { if (destaque) setAberto(destaque); }, [destaque]);
  useEffect(() => {
    if (!destaque || rolou.current || !avisos.some((a) => a.id === destaque)) return;
    rolou.current = true;
    document.getElementById(`aviso-${destaque}`)?.scrollIntoView({ block: "center" });
  }, [destaque, avisos]);

  async function dispensar(id: string) {
    const resto = avisos.filter((a) => a.id !== id);
    setAvisos(resto);
    avisar.current?.(resto.some((a) => a.tipo === "clima"));
    fetch(`${API_URL}/api/app/avisos/lido`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) }).catch(() => { /* volta na próxima abertura */ });
  }

  if (!avisos.length) return null;
  // O aviso da notificação vem primeiro
  const lista = destaque ? [...avisos.filter((a) => a.id === destaque), ...avisos.filter((a) => a.id !== destaque)] : avisos;
  const visiveis = todos ? lista : lista.slice(0, FECHADOS);
  const resto = lista.length - FECHADOS;

  return (
    <section aria-label="Avisos" className="flex flex-col gap-2">
      {visiveis.map((a) => {
        const Icone = a.tipo === "evento" ? Ticket : a.nivel === "info" ? Megaphone : TriangleAlert;
        const externo = !!a.link && /^https:\/\//.test(a.link);
        const interno = !!a.link && a.link.startsWith("/app");
        const estaAberto = aberto === a.id;
        return (
          <article key={a.id} id={`aviso-${a.id}`} role={a.nivel === "info" ? "status" : "alert"} className={`relative rounded-2xl border ${ESTILO[a.nivel] ?? ESTILO.info}`}>
            <button
              type="button"
              aria-expanded={estaAberto}
              aria-controls={`aviso-texto-${a.id}`}
              onClick={() => setAberto(estaAberto ? null : a.id)}
              className="w-full flex items-center gap-2.5 min-h-[52px] py-2.5 pl-3.5 pr-12 text-left text-inherit bg-transparent"
            >
              <Icone size={20} className="flex-none" />
              <strong className="flex-1 min-w-0 text-[15px] leading-tight break-words">{a.titulo}</strong>
              <ChevronDown size={18} className={`flex-none transition-transform ${estaAberto ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {estaAberto && (
              <div id={`aviso-texto-${a.id}`} className="flex flex-col gap-1 pl-[44px] pr-3.5 pb-3">
                <span className="text-[13px] leading-snug break-words">{a.texto}</span>
                <span className="flex flex-wrap items-center gap-x-3 text-xs">
                  <span className="opacity-80">{a.origem === "equipe" ? "Comunicado da equipe Sol" : a.tipo === "evento" ? "Achado pela Sol" : "Aviso da Guia Sol"}</span>
                  {externo && <a href={a.link!} target="_blank" rel="noopener noreferrer" className="min-h-[32px] flex items-center font-bold underline">{a.tipo === "evento" ? "Ver a fonte" : "Saber mais"}</a>}
                  {interno && <Link to={a.link!} className="min-h-[32px] flex items-center font-bold underline">{a.tipo === "roteiro" ? "Ver e trocar a atividade" : "Abrir"}</Link>}
                </span>
              </div>
            )}
            <button type="button" onClick={() => dispensar(a.id)} aria-label={`Dispensar aviso: ${a.titulo}`} className="absolute top-1 right-0.5 w-11 h-11 flex items-center justify-center rounded-full"><X size={18} /></button>
          </article>
        );
      })}
      {resto > 0 && (
        <button type="button" onClick={() => setTodos(!todos)} className="self-start min-h-[40px] text-sm font-bold text-sol-mar">{todos ? "Mostrar menos" : `Ver mais ${resto} ${resto === 1 ? "aviso" : "avisos"}`}</button>
      )}
    </section>
  );
}
