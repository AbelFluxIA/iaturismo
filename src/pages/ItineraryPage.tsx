import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Download, ChevronDown, ChevronUp, MessageSquare, X, Share2, Link } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Itinerary {
  destination: string;
  traveler_name: string;
  pdf_url: string;
  text_content: string;
}

interface Activity {
  period: string;
  time: string;
  name: string;
  travel: string;
  description: string;
  mapUrl: string;
}

interface Day {
  label: string;
  activities: Activity[];
}

interface ParsedItinerary {
  intro: { paragraphs: string[] };
  days: Day[];
}

type VisitState = "pending" | "done" | "skipped";

interface ActivityMeta {
  state: VisitState;
  note: string;
}

// ─── Parser ──────────────────────────────────────────────────────────────────

function cleanLine(raw: string) {
  return raw.replace(/\*/g, "").trim();
}

function stripLeadingSymbols(s: string) {
  return s.replace(/^[^\p{L}\d(]+/u, "").trim();
}

function parseItinerary(text: string): ParsedItinerary {
  const days: Day[] = [];
  const introParagraphs: string[] = [];
  let currentDay: Day | null = null;
  let currentActivity: Partial<Activity> | null = null;
  let descBuffer: string[] = [];
  let inIntro = true;

  const flushActivity = () => {
    if (currentActivity && currentDay) {
      currentDay.activities.push({
        period: currentActivity.period || "",
        time: currentActivity.time || "",
        name: currentActivity.name || "",
        travel: currentActivity.travel || "",
        description: descBuffer.join(" ").trim(),
        mapUrl: currentActivity.mapUrl || "",
      });
    }
    currentActivity = null;
    descBuffer = [];
  };

  for (const raw of text.split("\n")) {
    const line = cleanLine(raw);
    if (!line) continue;
    if (/^---+$/.test(line) || /^(Com carinho|Sol)$/i.test(line)) continue;

    const stripped = stripLeadingSymbols(line);

    // Day header
    if (/^DIA\s*\d+/i.test(stripped)) {
      inIntro = false;
      flushActivity();
      currentDay = { label: stripped, activities: [] };
      days.push(currentDay);
      continue;
    }

    if (inIntro) {
      if (stripped.length > 20) introParagraphs.push(stripped);
      continue;
    }

    if (line.startsWith("⚠️")) continue;

    // Travel
    if (line.startsWith("🚗") || /^~\s*\d+/i.test(stripped)) {
      if (currentActivity) currentActivity.travel = line.replace(/^🚗\s*/, "").trim();
      continue;
    }

    // Map URL
    if (line.startsWith("📍") || /^https?:\/\//i.test(stripped)) {
      if (currentActivity) {
        const url = line.replace(/^📍\s*/, "").trim();
        if (/^https?:\/\//i.test(url)) currentActivity.mapUrl = url;
      }
      continue;
    }

    // Description
    if (line.startsWith("💬")) {
      if (currentActivity) descBuffer.push(line.replace(/^💬\s*/, "").trim());
      continue;
    }

    // Period/time header: "Manhã (10:00): Nome"
    const periodMatch = stripped.match(
      /^(Manh[aã]|Tarde|Noite|P[oô]r\s*do\s*Sol|Dia\s*Inteiro)\s*\(([^)]+)\)[:\s-]+(.+)/i
    );
    if (periodMatch) {
      flushActivity();
      currentActivity = {
        period: periodMatch[1],
        time: periodMatch[2].trim(),
        name: periodMatch[3].trim(),
        travel: "",
        mapUrl: "",
      };
      continue;
    }

    if (currentActivity && stripped.length > 10) {
      if (!/^(Ver no mapa|Google Maps|Waze)/i.test(stripped)) descBuffer.push(stripped);
    }
  }

  flushActivity();
  return { intro: { paragraphs: introParagraphs }, days };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PERIOD_EMOJI: Record<string, string> = {
  manhã: "☀️", manha: "☀️", tarde: "🌤️", noite: "🌙",
  "pôr do sol": "🌅", "por do sol": "🌅", "dia inteiro": "🗓️",
};
const getPeriodEmoji = (p: string) => PERIOD_EMOJI[p.toLowerCase()] ?? "📍";

const PEXELS_KEY = "V44MUGPGiCRMtaLLcm2R6K8oMlGMXzgG85S3xbxMYe1n7tXw8WFLfKNP";

async function fetchDestinationImage(destination: string): Promise<string | null> {
  try {
    const query = destination.split(/\s*[-–]\s*/)[0].trim();
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + " travel")}&per_page=5&orientation=landscape`,
      { headers: { Authorization: PEXELS_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const photos = data.photos as { src: { large2x: string } }[];
    if (!photos?.length) return null;
    return photos[Math.floor(Math.random() * Math.min(3, photos.length))].src.large2x;
  } catch { return null; }
}

function isNightTime() {
  const h = new Date().getHours();
  return h >= 19 || h < 6;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeedbackBox({
  label, placeholder, value, onSave, onCancel, dark,
}: {
  label: string; placeholder: string; value: string;
  onSave: (v: string) => void; onCancel: () => void; dark: boolean;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <div className="mt-3 space-y-2">
      <p className={`text-xs font-medium ${dark ? "text-slate-300" : "text-gray-500"}`}>{label}</p>
      <textarea
        autoFocus
        rows={2}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder={placeholder}
        className={`w-full text-sm border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(152,42%,35%)] placeholder:text-gray-300 ${
          dark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-gray-800"
        }`}
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave(draft)}
          className="text-xs px-3 py-1.5 bg-[hsl(152,42%,18%)] text-white rounded-lg hover:bg-[hsl(152,42%,28%)] transition-colors"
        >
          Salvar
        </button>
        <button
          onClick={onCancel}
          className={`text-xs px-3 py-1.5 rounded-lg ${dark ? "text-slate-400" : "text-gray-400"}`}
        >
          Pular
        </button>
      </div>
    </div>
  );
}

function VisitButton({
  meta, onChange, dark,
}: {
  meta: ActivityMeta;
  onChange: (m: ActivityMeta) => void;
  dark: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "ask" | "feedback-done" | "feedback-skip">("idle");

  // Sync if external reset
  useEffect(() => {
    if (meta.state === "pending") setPhase("idle");
  }, [meta.state]);

  if (phase === "idle" && meta.state === "pending") {
    return (
      <button
        onClick={() => setPhase("ask")}
        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
          dark ? "border-slate-500 text-slate-300 hover:border-slate-300" : "border-gray-300 text-gray-500 hover:border-gray-500"
        }`}
      >
        Marcar visita
      </button>
    );
  }

  if (phase === "ask") {
    return (
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => setPhase("feedback-done")}
          className="text-xs px-3 py-1.5 bg-[hsl(152,42%,18%)] text-white rounded-full font-medium"
        >
          ✓ Visitei
        </button>
        <button
          onClick={() => setPhase("feedback-skip")}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
            dark ? "border-slate-500 text-slate-300" : "border-gray-300 text-gray-500"
          }`}
        >
          ✗ Não fui
        </button>
        <button onClick={() => setPhase("idle")} className="text-gray-300 hover:text-gray-500">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (phase === "feedback-done") {
    return (
      <FeedbackBox
        label="Como foi a experiência?"
        placeholder="Conta um pouco... (opcional)"
        value={meta.note}
        dark={dark}
        onSave={note => { onChange({ state: "done", note }); setPhase("idle"); }}
        onCancel={() => { onChange({ state: "done", note: "" }); setPhase("idle"); }}
      />
    );
  }

  if (phase === "feedback-skip") {
    return (
      <FeedbackBox
        label="Por que não foi?"
        placeholder="Fechado, cansaço, mudança de plano... (opcional)"
        value={meta.note}
        dark={dark}
        onSave={note => { onChange({ state: "skipped", note }); setPhase("idle"); }}
        onCancel={() => { onChange({ state: "skipped", note: "" }); setPhase("idle"); }}
      />
    );
  }

  // Already marked
  const isDone = meta.state === "done";
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium ${isDone ? "text-[hsl(152,42%,35%)]" : "text-gray-400"}`}>
        {isDone ? "✓ Visitei" : "✗ Não fui"}
      </span>
      {meta.note && (
        <span className={`text-xs italic ${dark ? "text-slate-400" : "text-gray-400"}`}>
          · {meta.note.slice(0, 40)}{meta.note.length > 40 ? "…" : ""}
        </span>
      )}
      <button
        onClick={() => { onChange({ state: "pending", note: "" }); setPhase("idle"); }}
        className="text-gray-300 hover:text-gray-500"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Canvas image generator for sharing ──────────────────────────────────────

async function generateShareImage(destination: string, name: string, imageUrl: string | null): Promise<Blob> {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#0f3d2e";
  ctx.fillRect(0, 0, W, H);

  // Background photo
  if (imageUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); img.src = imageUrl; });
      if (img.width > 0) {
        const scale = Math.max(W / img.width, H / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      }
    } catch { /* fail silently */ }
  }

  // Gradient overlay
  const grad = ctx.createLinearGradient(0, H * 0.25, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.55, "rgba(15,61,46,0.75)");
  grad.addColorStop(1, "rgba(15,61,46,0.97)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Top brand
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "500 50px sans-serif";
  ctx.fillText("☀️  Sol Roteiros", W / 2, 110);

  // Destination
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${destination.length > 14 ? 76 : 96}px serif`;
  ctx.fillText(destination, W / 2, H * 0.72);

  // Traveler
  ctx.font = "500 52px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.fillText(`Roteiro de ${name}`, W / 2, H * 0.80);

  // CTA
  ctx.font = "bold 46px sans-serif";
  ctx.fillStyle = "#f59e0b";
  ctx.fillText("Quero o meu! ✈️", W / 2, H * 0.89);

  ctx.font = "38px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.fillText("tripsol.com.br", W / 2, H * 0.94);

  return new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.92));
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

function ShareModal({
  destination, travelerName, shareCode, coverImage, onClose,
}: {
  destination: string; travelerName: string; shareCode: string;
  coverImage: string | null; onClose: () => void;
}) {
  const link = `https://iaturismo-two.vercel.app/r/${shareCode}`;
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({ title: `Meu roteiro para ${destination}`, text: `Confira meu roteiro para ${destination} feito pela Sol! ☀️`, url: link });
    } else {
      copyLink();
    }
  };

  // Gera imagem via canvas e compartilha via Web Share API (mobile) ou baixa (desktop)
  const shareWithImage = async () => {
    setSharing(true);
    try {
      const blob = await generateShareImage(destination, travelerName, coverImage);
      const file = new File([blob], "roteiro-sol.jpg", { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Roteiro: ${destination}`, text: `Meu roteiro para ${destination} pela Sol! ☀️\n${link}` });
      } else {
        // Fallback desktop: baixa a imagem
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "roteiro-sol.jpg"; a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden shadow-2xl">

        {/* Card preview — estilo Instagram */}
        <div
          className="relative h-64 bg-[hsl(152,42%,18%)] flex flex-col items-center justify-end pb-8 px-6 text-center overflow-hidden"
        >
          {coverImage && (
            <>
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coverImage})` }} />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />
            </>
          )}
          <div className="relative">
            <p className="text-white/60 text-xs tracking-widest uppercase mb-1">☀️ Sol Roteiros</p>
            <h2 className="text-white text-2xl font-bold leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {destination}
            </h2>
            <p className="text-white/80 text-sm mt-1">Meu roteiro está pronto ✈️</p>
            <p className="text-white/50 text-xs mt-0.5">tripsol.com.br</p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500 text-center">
            Compartilhe e mostre pra todo mundo onde você vai!
          </p>

          {/* Ações */}
          <button
            onClick={shareNative}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[hsl(152,42%,18%)] text-white rounded-xl font-medium text-sm"
          >
            <Share2 className="h-4 w-4" />
            Compartilhar roteiro
          </button>

          <button
            onClick={shareWithImage}
            disabled={sharing}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium text-sm disabled:opacity-60"
          >
            <span className="text-base">📸</span>
            {sharing ? "Gerando imagem..." : "Compartilhar com foto (Stories)"}
          </button>

          <button
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm"
          >
            <Link className="h-4 w-4" />
            {copied ? "Link copiado ✓" : "Copiar link"}
          </button>

          <button onClick={onClose} className="w-full py-2 text-sm text-gray-400">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ItineraryPage() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [parsed, setParsed] = useState<ParsedItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expandedIntro, setExpandedIntro] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [meta, setMeta] = useState<Record<string, ActivityMeta>>({});
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [dark, setDark] = useState(isNightTime());
  const [showShare, setShowShare] = useState(false);

  // Recheck dark mode every minute
  useEffect(() => {
    const id = setInterval(() => setDark(isNightTime()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!shareCode) return;
    try {
      const saved = localStorage.getItem(`itin-${shareCode}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.meta) setMeta(parsed.meta);
        if (parsed.expanded) setExpanded(parsed.expanded);
      }
    } catch {}
  }, [shareCode]);

  useEffect(() => {
    if (!shareCode) return;
    localStorage.setItem(`itin-${shareCode}`, JSON.stringify({ meta, expanded }));
  }, [meta, expanded, shareCode]);

  // Load itinerary
  useEffect(() => {
    if (!shareCode) return;
    supabase
      .from("generated_itineraries")
      .select("destination,traveler_name,pdf_url,text_content")
      .eq("share_code", shareCode)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error || !data?.text_content) { setNotFound(true); setLoading(false); return; }
        setItinerary(data as Itinerary);
        setParsed(parseItinerary(data.text_content));
        const img = await fetchDestinationImage(data.destination || "");
        setCoverImage(img);
        setLoading(false);
      });
  }, [shareCode]);

  const updateMeta = useCallback((key: string, m: ActivityMeta) => {
    setMeta(prev => ({ ...prev, [key]: m }));
  }, []);

  const toggleExpand = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  // ─── Theme colors ────────────────────────────────────────────────
  const bg       = dark ? "bg-slate-900"         : "bg-[hsl(40,35%,93%)]";
  const card     = dark ? "bg-slate-800"         : "bg-white";
  const cardBorder = dark ? "border-slate-700"   : "border-gray-100";
  const textMain = dark ? "text-slate-100"       : "text-gray-900";
  const textMid  = dark ? "text-slate-300"       : "text-gray-600";
  const textDim  = dark ? "text-slate-500"       : "text-gray-400";
  const lineColor = dark ? "bg-white/10"         : "bg-[hsl(152,42%,18%)]/15";
  const sepLine  = dark ? "bg-white/10"          : "bg-[hsl(152,42%,18%)]/15";

  // ─── Loading / not found ─────────────────────────────────────────
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[hsl(152,42%,18%)]" />
      </div>
    );
  }

  if (notFound || !itinerary || !parsed) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg} text-center px-4`}>
        <div>
          <p className="text-4xl mb-4">🗺️</p>
          <h1 className="text-2xl font-bold text-[hsl(152,42%,18%)] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Roteiro não encontrado
          </h1>
          <p className="text-gray-500">O link que você acessou não existe ou expirou.</p>
        </div>
      </div>
    );
  }

  const totalActivities = parsed.days.reduce((s, d) => s + d.activities.length, 0);
  const doneCount = Object.values(meta).filter(m => m.state === "done").length;
  const progress = totalActivities > 0 ? (doneCount / totalActivities) * 100 : 0;

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-700`}>

      {/* ── Header (z-50 para não ser coberto pelos dots) ── */}
      <div
        className="relative text-white px-4 py-8 sticky top-0 z-50 shadow-lg overflow-hidden"
        style={{ background: coverImage ? "transparent" : "hsl(152,42%,18%)" }}
      >
        {coverImage && (
          <>
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coverImage})` }} />
            <div className="absolute inset-0 bg-[hsl(152,42%,10%)]/80" />
          </>
        )}

        <div className="relative max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span>☀️</span>
                <span className="text-[10px] font-medium opacity-60 tracking-widest uppercase">Sol Roteiros</span>
                {dark && <span className="text-[10px] opacity-40">🌙 modo noturno</span>}
              </div>
              <h1 className="text-xl font-bold leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                {itinerary.destination}
              </h1>
              <p className="text-xs opacity-60 mt-0.5">Para {itinerary.traveler_name}</p>
            </div>
            {/* Botão de compartilhar */}
            <button
              onClick={() => setShowShare(true)}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center"
            >
              <Share2 className="h-4 w-4 text-white" />
            </button>
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-[11px] opacity-50 mb-1">
              <span>{doneCount} de {totalActivities} visitados</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[hsl(45,90%,55%)] rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-lg mx-auto px-4 py-5">

        {/* Intro */}
        {parsed.intro.paragraphs.length > 0 && (
          <div className={`mb-6 ${card} rounded-2xl shadow-sm overflow-hidden border ${cardBorder}`}>
            <button
              onClick={() => setExpandedIntro(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <span className={`font-semibold text-sm ${textMain}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                Sobre este roteiro
              </span>
              {expandedIntro
                ? <ChevronUp className={`h-4 w-4 ${textDim}`} />
                : <ChevronDown className={`h-4 w-4 ${textDim}`} />}
            </button>
            {expandedIntro && (
              <div className={`px-5 pb-5 space-y-3 border-t ${cardBorder}`}>
                {parsed.intro.paragraphs.map((p, i) => (
                  <p key={i} className={`text-sm leading-relaxed ${textMid}`}>{p}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timeline por dia */}
        {parsed.days.map((day, di) => {
          const dayDone = day.activities.filter((_, ai) => meta[`${di}-${ai}`]?.state === "done").length;

          return (
            <div key={di}>
              {/* Separador de dia */}
              <div className="flex items-center gap-3 mb-4 mt-2">
                <div className={`flex-1 h-px ${sepLine}`} />
                <div className="flex items-center gap-2 px-3 py-1 bg-[hsl(152,42%,18%)] rounded-full">
                  <span className="text-xs font-bold text-white tracking-wide">DIA {di + 1}</span>
                  {dayDone > 0 && (
                    <span className="text-[10px] text-white/60">{dayDone}/{day.activities.length}</span>
                  )}
                </div>
                <div className={`flex-1 h-px ${sepLine}`} />
              </div>

              {day.label && (
                <p className={`text-center text-[10px] uppercase tracking-widest mb-4 -mt-2 ${textDim}`}>
                  {day.label.replace(/^DIA\s*\d+\s*[-–—]?\s*/i, "")}
                </p>
              )}

              {/* Atividades em timeline */}
              <div className="relative">
                {day.activities.length > 1 && (
                  <div
                    className={`absolute left-[19px] top-6 bottom-6 w-0.5 ${lineColor}`}
                    aria-hidden
                  />
                )}

                {day.activities.map((act, ai) => {
                  const key = `${di}-${ai}`;
                  const actMeta: ActivityMeta = meta[key] ?? { state: "pending", note: "" };
                  const isExpanded = expanded[key] ?? ai === 0;
                  const isDone = actMeta.state === "done";
                  const isSkipped = actMeta.state === "skipped";

                  return (
                    <div key={ai} className="flex gap-3 mb-4">
                      {/* Dot — sem z-index alto para não cobrir o header */}
                      <button
                        onClick={() => toggleExpand(key)}
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base shadow-sm transition-all border-2 ${
                          isDone
                            ? "bg-[hsl(152,42%,18%)] border-[hsl(152,42%,18%)] text-white"
                            : isSkipped
                            ? "bg-gray-200 border-gray-300 text-gray-400"
                            : dark
                            ? "bg-slate-700 border-slate-600"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        {isDone ? "✓" : isSkipped ? "✗" : getPeriodEmoji(act.period)}
                      </button>

                      {/* Card */}
                      <div className={`flex-1 ${card} rounded-2xl shadow-sm overflow-hidden border ${cardBorder} transition-all ${isDone || isSkipped ? "opacity-60" : ""}`}>
                        {/* Header sempre visível */}
                        <button
                          onClick={() => toggleExpand(key)}
                          className="w-full text-left px-4 pt-3 pb-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className={`text-[10px] font-semibold uppercase tracking-widest mb-0.5 ${textDim}`}>
                                {act.period} · {act.time}
                              </p>
                              <h3
                                className={`font-semibold text-sm leading-snug ${isDone ? "line-through " + textDim : textMain}`}
                                style={{ fontFamily: "'Playfair Display', serif" }}
                              >
                                {act.name}
                              </h3>
                            </div>
                            {isExpanded
                              ? <ChevronUp className={`h-4 w-4 ${textDim} shrink-0 mt-1`} />
                              : <ChevronDown className={`h-4 w-4 ${textDim} shrink-0 mt-1`} />}
                          </div>
                        </button>

                        {/* Conteúdo expandido */}
                        {isExpanded && (
                          <div className={`px-4 pb-4 border-t ${cardBorder} pt-3 space-y-3`}>
                            {act.travel && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-amber-500 font-bold">▶</span>
                                <span className={`text-xs italic ${textDim}`}>{act.travel}</span>
                              </div>
                            )}

                            {act.description && (
                              <p className={`text-sm leading-relaxed ${textMid}`}>{act.description}</p>
                            )}

                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              {act.mapUrl ? (
                                <a
                                  href={act.mapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(152,42%,35%)] bg-[hsl(152,42%,18%)]/10 px-3 py-1.5 rounded-full hover:bg-[hsl(152,42%,18%)]/20 transition-colors"
                                >
                                  <MapPin className="h-3 w-3" />
                                  Ver no mapa
                                </a>
                              ) : <span />}

                              <VisitButton
                                meta={actMeta}
                                onChange={m => updateMeta(key, m)}
                                dark={dark}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* PDF */}
        {itinerary.pdf_url && (
          <div className="pt-2 pb-2">
            <a
              href={itinerary.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 font-medium text-sm transition-colors ${
                dark
                  ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                  : "border-[hsl(152,42%,18%)] text-[hsl(152,42%,18%)] hover:bg-[hsl(152,42%,18%)] hover:text-white"
              }`}
            >
              <Download className="h-4 w-4" />
              Baixar PDF do roteiro
            </a>
          </div>
        )}

        {/* Footer personalizado — CTA de conversão */}
        <footer className={`text-center py-8 px-4 mt-2 border-t ${cardBorder}`}>
          <p className={`text-sm font-semibold ${textMain} mb-1`}>
            Este roteiro é personalizado para {itinerary.traveler_name}.
          </p>
          <p className={`text-sm ${textMid} mb-5`}>Quer o seu? 👇</p>
          <a
            href={`https://wa.me/${import.meta.env.VITE_SOL_PHONE || ""}?text=${encodeURIComponent("Oi Sol! Quero meu roteiro de viagem")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[hsl(152,42%,18%)] text-white px-7 py-3 rounded-full font-semibold text-sm shadow-md hover:bg-[hsl(152,42%,14%)] transition-colors"
          >
            ☀️ Criar meu roteiro com a Sol
          </a>
          <p className={`text-xs mt-6 ${textDim}`}>Criado com carinho por Sol ☀️</p>
        </footer>
      </div>

      {/* Modal de compartilhamento */}
      {showShare && shareCode && (
        <ShareModal
          destination={itinerary.destination}
          travelerName={itinerary.traveler_name}
          shareCode={shareCode}
          coverImage={coverImage}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
