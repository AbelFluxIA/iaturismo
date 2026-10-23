import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Copy, Mic, Play, QrCode, Square, Users } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { TopBar, btnPrimario, btnSecundario, cartao } from "@/components/app/ui";

// Tradutor: texto ou áudio de qualquer idioma para o escolhido, com "Ouvir".
const IDIOMAS: [string, string, string][] = [
  ["pt", "Português", "pt-BR"],
  ["en", "Inglês", "en-US"],
  ["es", "Espanhol", "es-ES"],
  ["fr", "Francês", "fr-FR"],
  ["it", "Italiano", "it-IT"],
  ["de", "Alemão", "de-DE"],
  ["ar", "Árabe", "ar-SA"],
  ["zh", "Chinês", "zh-CN"],
];
const nomeDe = (c: string) => IDIOMAS.find(([k]) => k === c)?.[1] ?? "Idioma detectado";
const vozDe = (c: string) => IDIOMAS.find(([k]) => k === c)?.[2] ?? "pt-BR";
const TIPOS_AUDIO = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];

export default function AppTradutor() {
  const { token, isDemo } = useClientAuth();
  const [de, setDe] = useState("auto");
  const [para, setPara] = useState("en");
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<{ original: string; origem: string; traducao: string } | null>(null);
  const [ocupado, setOcupado] = useState<"traduzindo" | "ouvindo" | "transcrevendo" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const gravador = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);

  useEffect(() => () => { gravador.current?.state === "recording" && gravador.current.stop(); window.speechSynthesis?.cancel(); }, []);

  async function traduzir(t = texto) {
    const limpo = t.trim();
    if (!limpo) return;
    setErro(null);
    setOcupado("traduzindo");
    try {
      if (isDemo) {
        setResultado({ original: limpo, origem: de === "auto" ? "pt" : de, traducao: "[No modo demonstração a tradução não é feita]" });
        return;
      }
      const r = await fetch(`${API_URL}/api/app/traduzir`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ texto: limpo, para, de: de === "auto" ? undefined : de }),
      });
      if (r.status === 404) { setErro("O tradutor ainda não foi ligado neste servidor."); return; }
      const d = await r.json();
      if (!r.ok) { setErro(d.error ?? "Não consegui traduzir agora. Veja o original e tente de novo."); return; }
      setResultado({ original: limpo, origem: d.origem, traducao: d.traducao });
    } catch {
      setErro("Sem internet. O tradutor precisa de conexão.");
    } finally {
      setOcupado(null);
    }
  }

  async function gravar() {
    if (ocupado === "ouvindo") { gravador.current?.stop(); return; }
    setErro(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setErro("Este celular não deixa gravar áudio pelo app. Digite o texto."); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { setErro("Libere o microfone nas configurações do celular para gravar."); return; }
    const tipo = TIPOS_AUDIO.find((t) => MediaRecorder.isTypeSupported?.(t));
    const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
    pedacos.current = [];
    rec.ondataavailable = (e) => { if (e.data.size) pedacos.current.push(e.data); };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      window.setTimeout(async () => {
        const audio = new Blob(pedacos.current, { type: (rec.mimeType || tipo || "audio/webm").split(";")[0] });
        if (audio.size < 1000) { setOcupado(null); setErro("O áudio saiu vazio. Tente de novo."); return; }
        setOcupado("transcrevendo");
        try {
          const r = await fetch(`${API_URL}/api/app/transcrever`, {
            method: "POST",
            headers: { "Content-Type": audio.type || "audio/webm", Authorization: `Bearer ${token}` },
            body: audio,
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok || !d.texto) { setOcupado(null); setErro("Não consegui entender o áudio. Pode repetir ou escrever?"); return; }
          setTexto(d.texto);
          setOcupado(null);
          traduzir(d.texto);
        } catch {
          setOcupado(null);
          setErro("Sem internet. O tradutor precisa de conexão.");
        }
      }, 400);
    };
    rec.start(250);
    gravador.current = rec;
    setOcupado("ouvindo");
  }

  function ouvir() {
    if (!resultado || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(resultado.traducao);
    fala.lang = vozDe(para);
    window.speechSynthesis.speak(fala);
  }

  const seletor = "flex-1 min-w-0 flex flex-col justify-center px-3.5 py-1.5 rounded-2xl border-[1.5px] border-sol-borda bg-white";

  return (
    <div className="flex flex-col">
      <TopBar title="Tradutor" back="/app" />
      <div className="flex flex-col gap-3 px-5">
        <div className="flex items-center gap-2">
          <label className={seletor}>
            <span className="text-xs font-bold text-sol-texto2">De</span>
            <select value={de} onChange={(e) => setDe(e.target.value)} className="bg-transparent text-[15px] font-extrabold text-sol-fundo focus:outline-none">
              <option value="auto">{resultado && de === "auto" ? `Detectar: ${nomeDe(resultado.origem).toLowerCase()}` : "Detectar"}</option>
              {IDIOMAS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select>
          </label>
          <button
            type="button"
            aria-label="Inverter idiomas"
            onClick={() => { const origem = de === "auto" ? resultado?.origem ?? "pt" : de; setDe(para); setPara(IDIOMAS.some(([c]) => c === origem) ? origem : "pt"); if (resultado) setTexto(resultado.traducao); setResultado(null); }}
            className="flex-none w-12 h-12 rounded-full bg-sol-claro text-sol-fundo flex items-center justify-center"
          >
            <ArrowLeftRight size={20} />
          </button>
          <label className={seletor}>
            <span className="text-xs font-bold text-sol-texto2">Para</span>
            <select value={para} onChange={(e) => { setPara(e.target.value); setResultado(null); }} className="bg-transparent text-[15px] font-extrabold text-sol-fundo focus:outline-none">
              {IDIOMAS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select>
          </label>
        </div>

        <label className="sr-only" htmlFor="tr-texto">Texto para traduzir</label>
        <textarea
          id="tr-texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={2000}
          placeholder="Digite ou grave o que quer traduzir"
          className="min-h-[110px] resize-none px-4 py-3 rounded-2xl border-[1.5px] border-sol-borda bg-white text-[16px] text-sol-fundo focus:outline-none focus:border-sol-mar"
        />
        <div className="flex gap-2">
          <button
            type="button"
            aria-label={ocupado === "ouvindo" ? "Parar e traduzir" : "Gravar áudio"}
            onClick={gravar}
            disabled={ocupado === "traduzindo" || ocupado === "transcrevendo"}
            className={`flex-none w-16 min-h-[52px] rounded-2xl border-[1.5px] flex items-center justify-center ${ocupado === "ouvindo" ? "bg-sol-sos border-sol-sos text-white" : "bg-white border-sol-borda text-sol-fundo"}`}
          >
            {ocupado === "ouvindo" ? <Square size={20} fill="currentColor" /> : <Mic size={22} />}
          </button>
          <button type="button" onClick={() => traduzir()} disabled={!texto.trim() || !!ocupado} className={`${btnPrimario} flex-1 !min-h-[52px]`}>
            {ocupado === "traduzindo" ? "Traduzindo..." : ocupado === "transcrevendo" ? "Entendendo o áudio..." : ocupado === "ouvindo" ? "Ouvindo... toque no quadrado" : "Traduzir"}
          </button>
        </div>
        {erro && <p role="status" className="m-0 text-sm text-sol-sos">{erro}</p>}

        {resultado && (
          <section aria-live="polite" className={`${cartao} flex flex-col gap-2 p-4`}>
            <span className="text-xs font-extrabold tracking-[0.06em] uppercase text-sol-texto2">{nomeDe(resultado.origem)} · original</span>
            <p className="m-0 text-[15px] text-sol-texto2">{resultado.original}</p>
            <hr className="w-full border-0 border-t border-[#E8DFD0] my-1" />
            <span className="text-xs font-extrabold tracking-[0.06em] uppercase text-sol-texto2">{nomeDe(para)}</span>
            <p lang={vozDe(para)} dir={para === "ar" ? "rtl" : undefined} className="m-0 font-display font-extrabold text-[24px] leading-tight">{resultado.traducao}</p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button type="button" onClick={() => navigator.clipboard?.writeText(resultado.traducao).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); })} className={btnSecundario}>
                <Copy size={18} /> {copiado ? "Copiado" : "Copiar"}
              </button>
              <button type="button" onClick={ouvir} className={btnPrimario}><Play size={18} /> Ouvir</button>
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1 p-4 rounded-2xl bg-sol-fundo text-white opacity-90" aria-disabled="true">
            <Users size={24} />
            <span className="text-base font-extrabold leading-tight">Conversa traduzida</span>
            <span className="text-xs text-sol-azul-suave">Cada um no seu celular · em breve</span>
          </div>
          <div className={`${cartao} flex flex-col gap-1 p-4 opacity-80`} aria-disabled="true">
            <QrCode size={24} />
            <span className="text-base font-extrabold leading-tight">Entrar na conversa</span>
            <span className="text-xs text-sol-texto2">Com QR ou código · em breve</span>
          </div>
        </div>
      </div>
    </div>
  );
}
