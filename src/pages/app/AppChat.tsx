import { useState, useEffect, useRef, useCallback } from "react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 max-w-[80%]">
      <div className="w-7 h-7 rounded-full bg-[#c8a96e] flex items-center justify-center text-sm flex-shrink-0">
        ☀️
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          <span className="w-2 h-2 bg-[#c8a96e] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-[#c8a96e] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-[#c8a96e] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  // Formata texto: *negrito* e quebras de linha
  const formatted = msg.content
    .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm text-white text-sm leading-relaxed shadow-sm"
          style={{ backgroundColor: "#c8a96e" }}
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 max-w-[80%]">
      <div className="w-7 h-7 rounded-full bg-[#c8a96e] flex items-center justify-center text-sm flex-shrink-0">
        ☀️
      </div>
      <div
        className="bg-white px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm text-[#1a1a1a] leading-relaxed shadow-sm"
        dangerouslySetInnerHTML={{ __html: formatted }}
      />
    </div>
  );
}

const WELCOME: Message = {
  role: "assistant",
  content: "Oi! Sou a Sol, sua assistente de viagens em João Pessoa. ☀️\n\nPosso montar seu roteiro personalizado, tirar dúvidas sobre a cidade ou te ajudar com o que precisar. Como posso te ajudar?",
};

export default function AppChat() {
  const { token } = useClientAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load history
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
        setMessages(msgs.length > 0 ? msgs : [WELCOME]);
      })
      .catch(() => setMessages([WELCOME]))
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
        { role: "assistant", content: "Erro de conexão. Verifica sua internet e tenta de novo." },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (loadingHistory) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c8a96e]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {sending && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-[#e8e2db] bg-[#ece8e3]">
        <div className="flex items-end gap-2 bg-white rounded-2xl px-4 py-2 shadow-sm border border-[#e0d9d0]">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder="Mensagem..."
            rows={1}
            disabled={sending}
            className="flex-1 resize-none bg-transparent text-sm text-[#1a1a1a] placeholder-[#aaa] focus:outline-none py-1.5 max-h-28"
            style={{ lineHeight: "1.5" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 active:scale-90 transition-transform mb-0.5"
            style={{ backgroundColor: "#c8a96e" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-[#bbb] text-center mt-1.5">Enter para enviar · Shift+Enter para quebrar linha</p>
      </div>
    </div>
  );
}
