import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Camera, CreditCard, ExternalLink, FileText, Gift, Image as ImageIcon, Map as MapIcon, MapPin, Mic, Share2, Trash2 } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { Carregando } from "@/components/app/ui";
import { DEMO_RESPOSTA_CHAT } from "@/lib/demo";

interface Message {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  fotoLocal?: string; // prévia da foto enquanto ela é enviada
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

// Fotos (do cliente, imagem para stories) aparecem como imagem na conversa
const IMAGEM_RE = /\.(jpe?g|png|webp|gif)(\?|$)/i;

function separar(conteudo: string) {
  const imagens: string[] = [];
  const urls: string[] = [];
  const semLinks = conteudo.replace(URL_RE, (bruta) => {
    const url = limparUrl(bruta);
    (IMAGEM_RE.test(url) ? imagens : urls).push(url);
    return bruta.slice(url.length); // devolve só a pontuação que não era do link
  });
  let texto = semLinks.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (imagens.length > 0 && texto === "📷 Foto") texto = "";
  return { texto, imagens, botoes: urls.map(classificar) };
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

// Quando a imagem termina de carregar a conversa cresce: rola de novo até o fim
const RolarAoCarregar = createContext<() => void>(() => {});

function Imagens({ urls, local }: { urls: string[]; local?: string }) {
  const rolar = useContext(RolarAoCarregar);
  const classe = "block w-[220px] max-w-full max-h-[260px] object-cover rounded-xl bg-black/5";
  if (local) {
    return <img src={local} alt="Foto enviada" onLoad={rolar} className={`${classe} opacity-80`} />;
  }
  if (urls.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="block">
          <img src={u} alt="Foto da conversa" onLoad={rolar} className={classe} />
        </a>
      ))}
    </div>
  );
}

function Balao({ msg }: { msg: Message }) {
  const { texto, imagens, botoes } = separar(msg.content);
  const temImagem = imagens.length > 0 || !!msg.fotoLocal;
  if (msg.role === "user") {
    return (
      <div className={`self-end max-w-[78%] rounded-[18px_18px_4px_18px] bg-sol-mar text-white text-[15px] leading-snug [overflow-wrap:anywhere] ${temImagem && !texto ? "p-1.5" : "px-3.5 py-3"}`}>
        <Imagens urls={imagens} local={msg.fotoLocal} />
        {msg.fotoLocal && <span className="block px-2 pt-1 text-xs text-white/80">Enviando...</span>}
        {texto && <div className={temImagem ? "mt-2" : ""} dangerouslySetInnerHTML={{ __html: formatar(texto) }} />}
        {botoes.length > 0 && <Botoes botoes={botoes} />}
      </div>
    );
  }
  return (
    <div className="self-start max-w-[86%] min-w-0 px-3.5 py-3 rounded-[18px_18px_18px_4px] bg-white border border-sol-linha text-[15px] leading-snug [overflow-wrap:anywhere]">
      {texto && <div className={temImagem ? "mb-2" : ""} dangerouslySetInnerHTML={{ __html: formatar(texto) }} />}
      <Imagens urls={imagens} />
      <Botoes botoes={botoes} />
    </div>
  );
}

// Foto do celular reduzida antes de enviar (lado maior até 1600 px, JPEG):
// fica leve para subir pela internet móvel e continua boa no mural.
async function reduzirFoto(arquivo: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(arquivo);
    const escala = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    return blob ?? arquivo;
  } catch {
    return arquivo;
  }
}

const TIPOS_AUDIO = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];
const AUDIO_MAX_S = 120;

function tempo(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
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
  const fotoRef = useRef<HTMLInputElement>(null);
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const gravador = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const descartar = useRef(false);

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

  // Depois de enviar: a conversa salva no banco é a fonte (tem o texto do áudio,
  // a foto já salva e todas as mensagens da Sol). Sem ela, mostra a resposta.
  async function mostrarResposta(res: Response, reply: string | null) {
    const historico = res.ok ? await carregarHistorico().catch(() => null) : null;
    const salvo = !reply || historico?.slice(-8).some((m) => m.role === "assistant" && reply.startsWith(m.content.slice(0, 40)));
    if (historico && salvo) setMessages(historico);
    else if (reply) setMessages((prev) => [...prev.filter((m) => !m.fotoLocal), { role: "assistant", content: reply }]);
  }

  function avisoNoChat(texto: string) {
    setMessages((prev) => [...prev.filter((m) => !m.fotoLocal), { role: "assistant", content: texto }]);
  }

  async function enviarFoto(arquivo: File) {
    if (sending) return;
    const foto = await reduzirFoto(arquivo);
    const previa = URL.createObjectURL(foto);
    setMessages((prev) => [...prev.filter((m) => m !== BOAS_VINDAS), { role: "user", content: "", fotoLocal: previa }]);
    setSending(true);
    enviando.current = true;
    try {
      if (isDemo) {
        await new Promise((ok) => setTimeout(ok, 700));
        setMessages((prev) => [
          ...prev.map((m) => (m.fotoLocal === previa ? { ...m, content: "📷 Foto", fotoLocal: undefined } : m)),
          { role: "assistant", content: "Foto salva 📸 Na viagem de verdade, com a Sol Guia ativa, ela entra no seu mural com um comentário meu." },
        ]);
        return;
      }
      const res = await fetch(`${API_URL}/api/app/chat/foto`, {
        method: "POST",
        headers: { "Content-Type": foto.type || "image/jpeg", Authorization: `Bearer ${token}` },
        body: foto,
      });
      if (res.status === 404) { avisoNoChat("O envio de fotos pelo app ainda não foi ligado. Por enquanto, mande a foto pelo WhatsApp da Sol."); return; }
      if (!res.ok) { avisoNoChat("Não consegui enviar a foto. Confira sua internet e tente de novo."); return; }
      await mostrarResposta(res, null);
    } catch {
      avisoNoChat("Não consegui enviar a foto. Confira sua internet e tente de novo.");
    } finally {
      URL.revokeObjectURL(previa);
      setSending(false);
      enviando.current = false;
    }
  }

  async function enviarAudio(audio: Blob) {
    if (audio.size < 1000) return; // toque sem fala
    setMessages((prev) => [...prev.filter((m) => m !== BOAS_VINDAS), { role: "user", content: "🎤 Áudio" }]);
    setSending(true);
    enviando.current = true;
    try {
      if (isDemo) {
        await new Promise((ok) => setTimeout(ok, 700));
        setMessages((prev) => [...prev, { role: "assistant", content: DEMO_RESPOSTA_CHAT }]);
        return;
      }
      const res = await fetch(`${API_URL}/api/app/chat/audio`, {
        method: "POST",
        headers: { "Content-Type": audio.type || "audio/webm", Authorization: `Bearer ${token}` },
        body: audio,
      });
      if (res.status === 404) { avisoNoChat("O envio de áudio pelo app ainda não foi ligado. Por enquanto, escreva a mensagem ou mande o áudio pelo WhatsApp da Sol."); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { avisoNoChat("Não consegui entender o áudio. Pode gravar de novo?"); return; }
      await mostrarResposta(res, data.reply ?? null);
    } catch {
      avisoNoChat("Não consegui enviar o áudio. Confira sua internet e tente de novo.");
    } finally {
      setSending(false);
      enviando.current = false;
    }
  }

  async function comecarGravacao() {
    if (sending || gravando) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      avisoNoChat("Este celular não deixa gravar áudio pelo app. Escreva a mensagem ou mande o áudio pelo WhatsApp da Sol.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      avisoNoChat("Preciso da permissão do microfone para gravar. Libere nas configurações do celular e tente de novo.");
      return;
    }
    const tipo = TIPOS_AUDIO.find((t) => MediaRecorder.isTypeSupported?.(t));
    const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
    pedacos.current = [];
    descartar.current = false;
    rec.ondataavailable = (e) => { if (e.data.size > 0) pedacos.current.push(e.data); };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      gravador.current = null;
      setGravando(false);
      if (descartar.current) return;
      enviarAudio(new Blob(pedacos.current, { type: (rec.mimeType || tipo || "audio/webm").split(";")[0] }));
    };
    rec.start(250);
    gravador.current = rec;
    setSegundos(0);
    setGravando(true);
  }

  function pararGravacao(enviar: boolean) {
    descartar.current = !enviar;
    if (gravador.current?.state === "recording") gravador.current.stop();
  }

  // Contador da gravação; para sozinho no limite
  useEffect(() => {
    if (!gravando) return;
    const id = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [gravando]);
  useEffect(() => {
    if (gravando && segundos >= AUDIO_MAX_S) pararGravacao(true);
  }, [gravando, segundos]);
  // Saiu da tela gravando: descarta
  useEffect(() => () => {
    descartar.current = true;
    if (gravador.current?.state === "recording") gravador.current.stop();
  }, []);

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
      await mostrarResposta(res, data.reply ?? "Tive um problema. Tenta de novo?");
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
        <RolarAoCarregar.Provider value={scrollToBottom}>
          {messages.map((msg, i) => <Balao key={i} msg={msg} />)}
        </RolarAoCarregar.Provider>
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

      <input
        ref={fotoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          e.target.value = "";
          if (arquivo) enviarFoto(arquivo);
        }}
      />

      {gravando ? (
        <div className="flex-none flex items-center gap-2 px-3 pt-2.5 pb-6 bg-white border-t border-sol-linha">
          <button
            type="button"
            aria-label="Apagar áudio"
            onClick={() => pararGravacao(false)}
            className="flex-none w-12 h-12 rounded-full flex items-center justify-center text-sol-sos"
          >
            <Trash2 size={22} />
          </button>
          <div role="status" className="flex-1 min-w-0 flex items-center gap-2.5 min-h-[48px] px-4 rounded-3xl bg-sol-sos-claro text-sol-fundo">
            <span className="w-2.5 h-2.5 rounded-full bg-sol-sos animate-pulse" aria-hidden />
            <span className="font-extrabold tabular-nums">{tempo(segundos)}</span>
            <span className="text-sm text-sol-texto2 truncate">Gravando...</span>
          </div>
          <button
            type="button"
            aria-label="Enviar áudio"
            onClick={() => pararGravacao(true)}
            className="flex-none w-12 h-12 rounded-full bg-sol-mar text-white flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowRight size={20} strokeWidth={2.2} />
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex-none flex items-end gap-1.5 px-3 pt-2.5 pb-6 bg-white border-t border-sol-linha"
        >
          <button
            type="button"
            aria-label="Enviar foto"
            onClick={() => fotoRef.current?.click()}
            disabled={sending}
            className="flex-none w-11 h-12 rounded-full flex items-center justify-center text-sol-mar disabled:opacity-40"
          >
            <Camera size={24} />
          </button>
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
          {input.trim() ? (
            <button
              type="submit"
              aria-label="Enviar"
              disabled={sending}
              className="flex-none w-12 h-12 rounded-full bg-sol-mar text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform"
            >
              <ArrowRight size={20} strokeWidth={2.2} />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Gravar áudio"
              onClick={comecarGravacao}
              disabled={sending}
              className="flex-none w-12 h-12 rounded-full bg-sol-mar text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform"
            >
              <Mic size={22} />
            </button>
          )}
        </form>
      )}
    </div>
  );
}
