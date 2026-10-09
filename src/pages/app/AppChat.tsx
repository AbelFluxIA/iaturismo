import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { Carregando } from "@/components/app/ui";

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
  if (msg.role === "user") {
    return (
      <div
        className="self-end max-w-[78%] px-3.5 py-3 rounded-[18px_18px_4px_18px] bg-sol-mar text-white text-[15px] leading-snug"
        dangerouslySetInnerHTML={{ __html: formatar(msg.content) }}
      />
    );
  }
  return (
    <div
      className="self-start max-w-[86%] px-3.5 py-3 rounded-[18px_18px_18px_4px] bg-white border border-sol-linha text-[15px] leading-snug"
      dangerouslySetInnerHTML={{ __html: formatar(msg.content) }}
    />
  );
}

const BOAS_VINDAS: Message = {
  role: "assistant",
  content: "Oi! Sou a Sol, sua assistente de viagens. ☀️\n\nPosso montar seu roteiro personalizado, tirar dúvidas sobre o destino ou te ajudar com o que precisar. Como posso ajudar?",
};

export default function AppChat() {
  const { token, profile } = useClientAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!token) { setLoadingHistory(false); return; }
    fetch(`${API_URL}/api/app/chat/historico`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : { messages: [] })
      .then((data) => {
        const msgs: Message[] = (data.messages ?? []).filter(
          (m: Message) => m.role === "user" || m.role === "assistant"
        );
        setMessages(msgs.length > 0 ? msgs : [BOAS_VINDAS]);
      })
      .catch(() => setMessages([BOAS_VINDAS]))
      .finally(() => setLoadingHistory(false));
  }, [token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);

    try {
      const res = await fetch(`${API_URL}/api/app/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const reply = data.reply ?? "Tive um problema. Tenta de novo?";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sem conexão agora. Confira sua internet e tente de novo. Em emergência, use o SOS ou ligue 190." },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (loadingHistory) return <Carregando />;

  const guiaAtiva = !!profile?.hasCompanion;

  return (
    <div className="flex flex-col h-[calc(100dvh-100px)]">
      <header className="flex items-center gap-2.5 px-5 pt-8 pb-3.5 bg-white border-b border-sol-linha">
        <img src="/sol-mark.png" alt="" className="w-10 h-10 object-contain" />
        <div className="flex flex-col">
          <h1 className="m-0 font-display font-extrabold text-[22px]">Guia Sol</h1>
          {guiaAtiva ? (
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-sol-ok">
              <span className="w-2 h-2 rounded-full bg-sol-ok" />Ativa na sua viagem
            </span>
          ) : (
            <span className="text-[13px] font-semibold text-sol-texto2">Converse com a Sol · também no WhatsApp</span>
          )}
        </div>
      </header>

      <div role="log" aria-label="Conversa com a Sol" className="flex-1 overflow-y-auto flex flex-col gap-3.5 px-4 py-4">
        {messages.map((msg, i) => <Balao key={i} msg={msg} />)}
        {sending && <Digitando />}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
        className="flex items-end gap-2 px-3 py-2.5 bg-white border-t border-sol-linha"
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
