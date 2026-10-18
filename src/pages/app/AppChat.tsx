import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CreditCard, ExternalLink, FileText, Gift, Image as ImageIcon, Map as MapIcon, MapPin, Share2 } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { Carregando } from "@/components/app/ui";
import { DEMO_RESPOSTA_CHAT } from "@/lib/demo";

interface Message {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

// Escapa o HTML antes de aplicar *negrito* e quebras de linha,
// para que nenhum texto da conversa seja interpretado como código.
function formatar(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

// ─── Links viram botões ───────────────────────────────────────────────────────
// A Sol manda links longos (roteiro interativo, PDF, Google Maps, pagamento).
// No app eles aparecem como botões; roteiro, mural e conta abrem dentro do app.

type Icone = "pdf" | "mapa" | "link" | "pagar" | "roteiro" | "mural" | "conta" | "indicar";
type Botao =
  | { tipo: "interno"; para: string; rotulo: string; icone: Icone }
  | { tipo: "externo"; url: string; rotulo: string; icone: Icone }
  | { tipo: "compartilhar"; url: string; rotulo: string; icone: Icone };

const URL_RE = /https?:\/\/[^\s<>"]+/g;

// Tira pontuação colada no fim do link e o ")" que fecha o texto, mas mantém
// parênteses que fazem parte do link (ex.: "(ref:ABC123)" no link de indicação).
function limparUrl(bruta: string) {
  let url = bruta.replace(/[.,;:!?]+$/, "");
  while (url.endsWith(")") && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)) {
    url = url.slice(0, -1).replace(/[.,;:!?]+$/, "");
  }
  return url;
}

function classificar(url: string): Botao {
  const roteiro = url.match(/\/r\/([0-9a-f-]{8,})/i);
  if (roteiro) return { tipo: "interno", para: `/app/roteiro?codigo=${roteiro[1]}`, rotulo: "Abrir o roteiro no app", icone: "roteiro" };
  if (/\/mural\/[\w-]+/.test(url)) return { tipo: "interno", para: "/app/mural", rotulo: "Ver meu mural", icone: "mural" };
  if (/\/stats\/[\w-]+/.test(url)) return { tipo: "interno", para: "/app/creditos", rotulo: "Ver minha conta", icone: "conta" };
  if (/\.pdf(\?|$)/i.test(url) || /travel-pdfs/.test(url)) return { tipo: "externo", url, rotulo: "Baixar o PDF do roteiro", icone: "pdf" };
  if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/.test(url)) return { tipo: "externo", url, rotulo: "Abrir no mapa", icone: "mapa" };
  if (/abacatepay\.com/.test(url)) return { tipo: "externo", url, rotulo: "Pagar e liberar", icone: "pagar" };
  if (/wa\.me\/.*ref(%3A|:)/i.test(url)) return { tipo: "compartilhar", url, rotulo: "Compartilhar meu link de indicação", icone: "indicar" };
  let host = "link";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* fica "link" */ }
  return { tipo: "externo", url, rotulo: `Abrir ${host}`, icone: "link" };
}

async function compartilhar(url: string) {
  try {
    if (navigator.share) { await navigator.share({ text: "Monte seu roteiro com a Sol ☀️", url }); return; }
  } catch { /* cancelou ou não suportado: copia */ }
  try { await navigator.clipboard.writeText(url); alert("Link copiado."); } catch { window.open(url, "_blank", "noopener"); }
}

function separar(conteudo: string) {
  const urls: string[] = [];
  const semLinks = conteudo.replace(URL_RE, (bruta) => {
    const url = limparUrl(bruta);
    urls.push(url);
    return bruta.slice(url.length); // devolve só a pontuação que não era do link
  });
  const texto = semLinks.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { texto, botoes: urls.map(classificar) };
}

const ICONES = { pdf: FileText, mapa: MapPin, link: ExternalLink, pagar: CreditCard, roteiro: MapIcon, mural: ImageIcon, conta: Gift, indicar: Share2 };

function Botoes({ botoes }: { botoes: Botao[] }) {
  const navigate = useNavigate();
  if (botoes.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 mt-2.5">
      {botoes.map((b, i) => {
        const classe = "flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-xl text-sm font-bold no-underline";
        const Icone = ICONES[b.icone];
        if (b.tipo === "interno") {
          return (
            <button key={i} type="button" onClick={() => navigate(b.para)} className={`${classe} bg-sol-mar text-white`}>
              <Icone size={18} /> {b.rotulo}
            </button>
          );
        }
        if (b.tipo === "compartilhar") {
          return (
            <button key={i} type="button" onClick={() => compartilhar(b.url)} className={`${classe} bg-white border-[1.5px] border-sol-borda text-sol-fundo`}>
              <Icone size={18} /> {b.rotulo}
            </button>
          );
        }
        const destaque = b.icone === "pagar" ? "bg-sol-sun text-sol-fundo" : "bg-white border-[1.5px] border-sol-borda text-sol-fundo";
        return (
          <a key={i} href={b.url} target="_blank" rel="noopener noreferrer" className={`${classe} ${destaque}`}>
            <Icone size={18} /> {b.rotulo}
          </a>
        );
      })}
    </div>
  );
}

function Digitando() {
  return (
    <div aria-live="polite" className="self-start flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white border border-sol-linha text-sm text-sol-texto2">
      <span className="flex gap-1">
        {[0, 150, 300].map((d) => (
          <span key={d} className="w-1.5 h-1.5 rounded-full bg-sol-sun animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </span>
      A Sol está respondendo
    </div>
  );
}

function Balao({ msg }: { msg: Message }) {
  const { texto, botoes } = separar(msg.content);
  if (msg.role === "user") {
    return (
      <div className="self-end max-w-[78%] px-3.5 py-3 rounded-[18px_18px_4px_18px] bg-sol-mar text-white text-[15px] leading-snug [overflow-wrap:anywhere]">
        {texto && <div dangerouslySetInnerHTML={{ __html: formatar(texto) }} />}
        {botoes.length > 0 && <Botoes botoes={botoes} />}
      </div>
    );
  }
  return (
    <div className="self-start max-w-[86%] min-w-0 px-3.5 py-3 rounded-[18px_18px_18px_4px] bg-white border border-sol-linha text-[15px] leading-snug [overflow-wrap:anywhere]">
      {texto && <div dangerouslySetInnerHTML={{ __html: formatar(texto) }} />}
      <Botoes botoes={botoes} />
    </div>
  );
}

// Respostas rápidas para perguntas de sim/não da Sol (ex.: ativar a Sol Guia).
// "guia" vai direto para o bot (mesmo efeito dos botões do WhatsApp).
type Rapida = { texto: string; guia?: boolean };
function respostasRapidas(ultima?: Message): Rapida[] {
  if (!ultima || ultima.role !== "assistant") return [];
  if (/ativar a sol guia\s*\?/i.test(ultima.content)) {
    return [{ texto: "Sim, quero ativar", guia: true }, { texto: "Agora não", guia: false }];
  }
  return [];
}

const BOAS_VINDAS: Message = {
  role: "assistant",
  content: "Oi! Sou a Sol, sua assistente de viagens. ☀️\n\nPosso montar seu roteiro personalizado, tirar dúvidas sobre o destino ou te ajudar com o que precisar. Como posso ajudar?",
};

const INTERVALO_ATUALIZACAO = 5000;

export default function AppChat() {
  const { token, profile, isDemo } = useClientAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  const enviando = useRef(false);

  // Rola só a área das mensagens (rolar a página inteira empurrava o campo de texto)
  const scrollToBottom = useCallback(() => {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  const carregarHistorico = useCallback(async () => {
    const r = await fetch(`${API_URL}/api/app/chat/historico`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const data = await r.json();
    return ((data.messages ?? []) as Message[]).filter((m) => m.role === "user" || m.role === "assistant");
  }, [token]);

  useEffect(() => {
    if (!token) { setLoadingHistory(false); return; }
    if (isDemo) { setMessages([BOAS_VINDAS]); setLoadingHistory(false); return; }
    carregarHistorico()
      .then((msgs) => setMessages(msgs && msgs.length > 0 ? msgs : [BOAS_VINDAS]))
      .catch(() => setMessages([BOAS_VINDAS]))
      .finally(() => setLoadingHistory(false));
  }, [token, isDemo, carregarHistorico]);

  // Mensagens que chegam depois (links do roteiro, avisos, conversa pelo WhatsApp)
  // aparecem sozinhas: a conversa é a mesma do WhatsApp, guardada no banco.
  useEffect(() => {
    if (!token || isDemo) return;
    const id = setInterval(async () => {
      if (enviando.current || document.visibilityState !== "visible") return;
      try {
        const msgs = await carregarHistorico();
        if (!msgs || msgs.length === 0) return;
        setMessages((atual) => {
          const reais = atual.filter((m) => m !== BOAS_VINDAS);
          const igual = reais.length === msgs.length && reais[reais.length - 1]?.content === msgs[msgs.length - 1]?.content;
          return igual ? atual : msgs;
        });
      } catch { /* tenta de novo no próximo ciclo */ }
    }, INTERVALO_ATUALIZACAO);
    return () => clearInterval(id);
  }, [token, isDemo, carregarHistorico]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  async function sendMessage(textoDireto?: string, guia?: boolean) {
    const text = (textoDireto ?? input).trim();
    if (!text || sending) return;

    if (!textoDireto) setInput("");
    setMessages((prev) => [...prev.filter((m) => m !== BOAS_VINDAS), { role: "user", content: text }]);
    setSending(true);
    enviando.current = true;

    if (isDemo) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "assistant", content: DEMO_RESPOSTA_CHAT }]);
        setSending(false);
        enviando.current = false;
      }, 700);
      return;
    }

    try {
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      let res: Response | null = null;
      if (guia !== undefined) {
        res = await fetch(`${API_URL}/api/app/guia`, { method: "POST", headers, body: JSON.stringify({ aceitar: guia }) });
        if (res.status === 404) res = null; // bot antigo: manda como mensagem comum
      }
      if (!res) {
        res = await fetch(`${API_URL}/api/app/chat`, { method: "POST", headers, body: JSON.stringify({ message: text }) });
      }
      const data = await res.json();
      const reply: string = data.reply ?? "Tive um problema. Tenta de novo?";
      // A conversa salva no banco é a fonte: inclui todas as mensagens que a Sol mandou
      const historico = res.ok ? await carregarHistorico().catch(() => null) : null;
      const salvo = historico?.slice(-8).some((m) => m.role === "assistant" && reply.startsWith(m.content.slice(0, 40)));
      setMessages((prev) => (historico && salvo ? historico : [...prev, { role: "assistant", content: reply }]));
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sem conexão agora. Confira sua internet e tente de novo. Em emergência, use o SOS ou ligue 190." },
      ]);
    } finally {
      setSending(false);
      enviando.current = false;
    }
  }

  if (loadingHistory) return <Carregando />;

  const guiaAtiva = !!profile?.hasCompanion;
  const rapidas = sending ? [] : respostasRapidas(messages[messages.length - 1]);

  return (
    <div className="flex flex-col h-[calc(100dvh-var(--sol-topo,0px)-var(--sol-nav,88px))]">
      <header className="flex-none flex items-center gap-2.5 px-5 pt-6 pb-3 bg-white border-b border-sol-linha">
        <img src="/sol-mark.png" alt="" className="w-10 h-10 object-contain" />
        <div className="flex flex-col">
          <h1 className="m-0 font-display font-extrabold text-[22px]">Guia Sol</h1>
          {guiaAtiva ? (
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-sol-ok">
              <span className="w-2 h-2 rounded-full bg-sol-ok" />Ativa na sua viagem
            </span>
          ) : (
            <span className="text-[13px] font-semibold text-sol-texto2">A mesma conversa do seu WhatsApp</span>
          )}
        </div>
      </header>

      <div ref={logRef} role="log" aria-label="Conversa com a Sol" className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-3.5 px-4 py-4">
        {messages.map((msg, i) => <Balao key={i} msg={msg} />)}
        {sending && <Digitando />}
        {rapidas.length > 0 && (
          <div className="self-start flex flex-wrap gap-2">
            {rapidas.map((r) => (
              <button
                key={r.texto}
                type="button"
                onClick={() => sendMessage(r.texto, r.guia)}
                className="min-h-[44px] px-4 rounded-full border-[1.5px] border-sol-mar bg-white text-sol-mar text-sm font-extrabold"
              >
                {r.texto}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
        className="flex-none flex items-end gap-2 px-3 pt-2.5 pb-6 bg-white border-t border-sol-linha"
      >
        <label htmlFor="msg" className="sr-only">Mensagem para a Sol</label>
        <textarea
          id="msg"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
          }}
          placeholder="Pergunte à Sol"
          rows={1}
          disabled={sending}
          className="flex-1 min-w-0 min-h-[48px] max-h-28 resize-none px-4 py-3 rounded-3xl border-[1.5px] border-sol-borda bg-sol-areia text-[15px] text-sol-fundo placeholder-[#8A9599] focus:outline-none focus:border-sol-mar"
        />
        <button
          type="submit"
          aria-label="Enviar"
          disabled={!input.trim() || sending}
          className="flex-none w-12 h-12 rounded-full bg-sol-mar text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform"
        >
          <ArrowRight size={20} strokeWidth={2.2} />
        </button>
      </form>
    </div>
  );
}
