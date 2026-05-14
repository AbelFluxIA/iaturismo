import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Download, ChevronDown, ChevronUp, MessageSquare, X, Check } from "lucide-react";

interface Itinerary {
  title: string;
  destination: string;
  traveler_name: string;
  pdf_url: string;
  text_content: string;
  created_at: string;
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

type VisitState = "pending" | "going" | "arrived" | "done";

const VISIT_STATES: { key: VisitState; label: string; color: string; dot: string }[] = [
  { key: "pending",  label: "A fazer",   color: "border-gray-300 bg-white",               dot: "bg-white border-2 border-gray-300" },
  { key: "going",   label: "A caminho",  color: "border-amber-400 bg-amber-50",            dot: "bg-amber-400 border-2 border-amber-400" },
  { key: "arrived", label: "Chegou!",    color: "border-[hsl(152,42%,18%)] bg-emerald-50", dot: "bg-[hsl(152,42%,18%)] border-2 border-[hsl(152,42%,18%)]" },
  { key: "done",    label: "Concluído",  color: "border-[hsl(152,42%,18%)] bg-[hsl(152,42%,18%)]/5", dot: "bg-[hsl(152,42%,18%)] border-2 border-[hsl(152,42%,18%)]" },
];

// Remove todos os asteriscos e trim
function cleanLine(raw: string): string {
  return raw.replace(/\*/g, "").trim();
}

// Remove emojis e símbolos do início da linha para facilitar regex
function stripLeadingSymbols(s: string): string {
  // Remove qualquer caractere que não seja letra, dígito ou parêntese no início
  return s.replace(/^[^\p{L}\d(]+/u, "").trim();
}

function parseItinerary(text: string): ParsedItinerary {
  const rawLines = text.split("\n");
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

  for (const raw of rawLines) {
    const line = cleanLine(raw);
    if (!line) continue;

    // Pula separadores e assinatura
    if (/^---+$/.test(line) || /^(Com carinho|Sol)$/i.test(line)) continue;

    // Day header: "DIA 1 - Sábado, 16 de Maio" (pode vir com ou sem emoji/asterisco)
    const stripped = stripLeadingSymbols(line);
    const dayMatch = stripped.match(/^(DIA\s*\d+.*)/i);
    if (dayMatch) {
      inIntro = false;
      flushActivity();
      currentDay = { label: stripped, activities: [] };
      days.push(currentDay);
      continue;
    }

    if (inIntro) {
      // Inclui apenas parágrafos substantivos (>20 chars)
      if (stripped.length > 20) introParagraphs.push(stripped);
      continue;
    }

    // Pula alertas de clima (⚠️) e linhas descritivas do dia sem período
    if (line.startsWith("⚠️")) continue;

    // Linha de deslocamento: começa com 🚗 ou ~Xmin
    if (line.startsWith("🚗") || /^~\s*\d+/i.test(stripped)) {
      if (currentActivity) {
        currentActivity.travel = line.replace(/^🚗\s*/, "").trim();
      }
      continue;
    }

    // URL de mapa: começa com 📍 ou https://
    if (line.startsWith("📍") || /^https?:\/\//i.test(stripped)) {
      if (currentActivity) {
        const url = line.replace(/^📍\s*/, "").trim();
        if (/^https?:\/\//i.test(url)) currentActivity.mapUrl = url;
      }
      continue;
    }

    // Descrição: começa com 💬
    if (line.startsWith("💬")) {
      if (currentActivity) descBuffer.push(line.replace(/^💬\s*/, "").trim());
      continue;
    }

    // Period/time header: "☀️ Manhã (10:00): Nome do Local"
    // A linha pode começar com emoji de período — stripLeadingSymbols resolve
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

    // Texto solto dentro de uma atividade → descrição
    if (currentActivity && stripped.length > 10) {
      if (!/^(Ver no mapa|Google Maps|Waze)/i.test(stripped)) {
        descBuffer.push(stripped);
      }
    }
  }

  flushActivity();
  return { intro: { paragraphs: introParagraphs }, days };
}

const PERIOD_EMOJI: Record<string, string> = {
  manhã: "☀️", manha: "☀️", tarde: "🌤️", noite: "🌙",
  "pôr do sol": "🌅", "por do sol": "🌅", "dia inteiro": "🗓️",
};
const getPeriodEmoji = (p: string) => PERIOD_EMOJI[p.toLowerCase()] || "📍";

const DOT_COLORS: Record<VisitState, string> = {
  pending:  "bg-white border-2 border-gray-300",
  going:    "bg-amber-400 border-2 border-amber-300",
  arrived:  "bg-[hsl(152,42%,18%)] border-2 border-[hsl(152,42%,35%)] ring-2 ring-[hsl(152,42%,18%)]/30",
  done:     "bg-[hsl(152,42%,18%)] border-2 border-[hsl(152,42%,18%)]",
};

function StateButton({ current, onChange }: { current: VisitState; onChange: (s: VisitState) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const info = VISIT_STATES.find(s => s.key === current) || VISIT_STATES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all flex items-center gap-1 ${info.color}`}
      >
        {current === "done" && <Check className="h-3 w-3" />}
        {info.label}
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden w-36">
          {VISIT_STATES.map(s => (
            <button
              key={s.key}
              onClick={() => { onChange(s.key); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 ${current === s.key ? "text-[hsl(152,42%,18%)]" : "text-gray-600"}`}
            >
              <span className={`w-2 h-2 rounded-full ${s.dot.replace("border-2 ", "")}`} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing && !value) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Adicionar observação
      </button>
    );
  }

  if (!editing) {
    return (
      <div
        onClick={() => { setDraft(value); setEditing(true); }}
        className="mt-3 flex items-start gap-1.5 cursor-pointer group"
      >
        <MessageSquare className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
        <p className="text-xs text-gray-500 italic group-hover:text-gray-700 transition-colors">{value}</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1.5">
      <textarea
        autoFocus
        rows={2}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="O que você achou desse lugar?"
        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(152,42%,18%)] placeholder:text-gray-300"
      />
      <div className="flex gap-2">
        <button
          onClick={() => { onChange(draft); setEditing(false); }}
          className="text-xs px-3 py-1 bg-[hsl(152,42%,18%)] text-white rounded-lg hover:bg-[hsl(152,42%,25%)] transition-colors"
        >
          Salvar
        </button>
        <button
          onClick={() => { setDraft(value); setEditing(false); }}
          className="text-xs px-3 py-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancelar
        </button>
        {value && (
          <button
            onClick={() => { onChange(""); setEditing(false); }}
            className="text-xs text-red-400 hover:text-red-500 transition-colors ml-auto flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Apagar
          </button>
        )}
      </div>
    </div>
  );
}

const PEXELS_KEY = "V44MUGPGiCRMtaLLcm2R6K8oMlGMXzgG85S3xbxMYe1n7tXw8WFLfKNP";

async function fetchDestinationImage(destination: string): Promise<string | null> {
  try {
    // Usa apenas o nome do lugar principal (antes do traço)
    const query = destination.split(/\s*[-–]\s*/)[0].trim();
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + " travel landscape")}&per_page=5&orientation=landscape`,
      { headers: { Authorization: PEXELS_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const photos = data.photos as { src: { large: string } }[];
    if (!photos?.length) return null;
    // Pega uma foto aleatória das 5 primeiras
    const idx = Math.floor(Math.random() * Math.min(3, photos.length));
    return photos[idx].src.large;
  } catch {
    return null;
  }
}

export default function ItineraryPage() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [parsed, setParsed] = useState<ParsedItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expandedIntro, setExpandedIntro] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [states, setStates] = useState<Record<string, VisitState>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [coverImage, setCoverImage] = useState<string | null>(null);

  // Persist state to localStorage
  useEffect(() => {
    if (!shareCode) return;
    const saved = localStorage.getItem(`itinerary-${shareCode}`);
    if (saved) {
      try {
        const { s, n } = JSON.parse(saved);
        if (s) setStates(s);
        if (n) setNotes(n);
      } catch {}
    }
  }, [shareCode]);

  useEffect(() => {
    if (!shareCode) return;
    localStorage.setItem(`itinerary-${shareCode}`, JSON.stringify({ s: states, n: notes }));
  }, [states, notes, shareCode]);

  useEffect(() => {
    if (!shareCode) return;
    supabase
      .from("generated_itineraries")
      .select("title,destination,traveler_name,pdf_url,text_content,created_at")
      .eq("share_code", shareCode)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error || !data || !data.text_content) {
          setNotFound(true);
        } else {
          setItinerary(data as Itinerary);
          setParsed(parseItinerary(data.text_content));
          // Busca imagem do destino no Pexels
          const img = await fetchDestinationImage(data.destination || "");
          setCoverImage(img);
        }
        setLoading(false);
      });
  }, [shareCode]);

  const setActivityState = (key: string, s: VisitState) =>
    setStates(prev => ({ ...prev, [key]: s }));

  const setNote = (key: string, note: string) =>
    setNotes(prev => ({ ...prev, [key]: note }));

  const toggleExpand = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(40,35%,93%)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[hsl(152,42%,18%)]" />
      </div>
    );
  }

  if (notFound || !itinerary || !parsed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(40,35%,93%)] text-center px-4">
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
  const doneCount = Object.values(states).filter(s => s === "done").length;
  const progress = totalActivities > 0 ? (doneCount / totalActivities) * 100 : 0;

  return (
    <div className="min-h-screen bg-[hsl(40,35%,93%)]">
      {/* Header com imagem de fundo do destino */}
      <div
        className="relative text-white px-4 py-8 sticky top-0 z-10 shadow-md overflow-hidden"
        style={{ background: coverImage ? "transparent" : "hsl(152,42%,18%)" }}
      >
        {/* Imagem de fundo */}
        {coverImage && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${coverImage})` }}
            />
            <div className="absolute inset-0 bg-[hsl(152,42%,10%)]/75" />
          </>
        )}

        <div className="relative max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">☀️</span>
            <span className="text-xs font-medium opacity-70 tracking-widest uppercase">Sol Roteiros</span>
          </div>
          <h1 className="text-2xl font-bold leading-tight drop-shadow-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
            {itinerary.destination}
          </h1>
          <p className="text-xs opacity-70 mt-0.5">Para {itinerary.traveler_name}</p>

          <div className="mt-3">
            <div className="flex justify-between text-xs opacity-60 mb-1">
              <span>{doneCount} de {totalActivities} concluídos</span>
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

      <div className="max-w-lg mx-auto px-4 py-5 space-y-0">
        {/* Intro */}
        {parsed.intro.paragraphs.length > 0 && (
          <div className="mb-6 bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedIntro(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <span className="font-semibold text-[hsl(152,42%,18%)] text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
                Sobre este roteiro
              </span>
              {expandedIntro ? <ChevronUp className="h-4 w-4 opacity-40" /> : <ChevronDown className="h-4 w-4 opacity-40" />}
            </button>
            {expandedIntro && (
              <div className="px-5 pb-5 space-y-3 border-t border-gray-100">
                {parsed.intro.paragraphs.map((p, i) => (
                  <p key={i} className="text-sm text-gray-600 leading-relaxed">{p}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timeline */}
        {parsed.days.map((day, di) => {
          const dayDone = day.activities.filter((_, ai) => states[`${di}-${ai}`] === "done").length;

          return (
            <div key={di}>
              {/* Day separator */}
              <div className="flex items-center gap-3 mb-4 mt-2">
                <div className="flex-1 h-px bg-[hsl(152,42%,18%)]/15" />
                <div className="flex items-center gap-2 px-3 py-1 bg-[hsl(152,42%,18%)] rounded-full">
                  <span className="text-xs font-bold text-white tracking-wide">
                    DIA {di + 1}
                  </span>
                  {dayDone > 0 && (
                    <span className="text-[10px] text-white/60">
                      {dayDone}/{day.activities.length}
                    </span>
                  )}
                </div>
                <div className="flex-1 h-px bg-[hsl(152,42%,18%)]/15" />
              </div>

              {day.label && (
                <p className="text-center text-xs text-gray-400 -mt-2 mb-4 uppercase tracking-widest">
                  {day.label.replace(/^DIA\s*\d+\s*[-–—]?\s*/i, "")}
                </p>
              )}

              {/* Activities as timeline nodes */}
              <div className="relative">
                {/* Vertical connecting line */}
                {day.activities.length > 1 && (
                  <div
                    className="absolute left-[19px] top-5 bottom-5 w-0.5 bg-gradient-to-b from-[hsl(152,42%,18%)]/30 to-[hsl(152,42%,18%)]/10"
                    aria-hidden
                  />
                )}

                {day.activities.map((act, ai) => {
                  const key = `${di}-${ai}`;
                  const state = states[key] || "pending";
                  const isExpanded = expanded[key] ?? ai === 0;
                  const isDone = state === "done";

                  return (
                    <div key={ai} className="flex gap-3 mb-4 relative">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center shrink-0 z-10">
                        <button
                          onClick={() => toggleExpand(key)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-base shadow-sm transition-all ${DOT_COLORS[state]}`}
                        >
                          {state === "done"
                            ? <Check className="h-4 w-4 text-white" />
                            : state === "going"
                            ? <span className="text-white text-base">→</span>
                            : state === "arrived"
                            ? <span className="text-white text-sm">📍</span>
                            : <span>{getPeriodEmoji(act.period)}</span>
                          }
                        </button>
                      </div>

                      {/* Card */}
                      <div
                        className={`flex-1 bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-200 ${isDone ? "opacity-60" : ""}`}
                      >
                        {/* Card header — always visible, tap to expand */}
                        <button
                          onClick={() => toggleExpand(key)}
                          className="w-full text-left px-4 pt-3 pb-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                                  {act.period} · {act.time}
                                </span>
                              </div>
                              <h3 className={`font-semibold text-sm leading-snug ${isDone ? "line-through text-gray-400" : "text-gray-900"}`}
                                style={{ fontFamily: "'Playfair Display', serif" }}>
                                {act.name}
                              </h3>
                            </div>
                            {isExpanded
                              ? <ChevronUp className="h-4 w-4 text-gray-300 shrink-0 mt-1" />
                              : <ChevronDown className="h-4 w-4 text-gray-300 shrink-0 mt-1" />
                            }
                          </div>
                        </button>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
                            {act.travel && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-amber-500 font-bold">▶</span>
                                <span className="text-xs text-gray-400 italic">{act.travel}</span>
                              </div>
                            )}

                            {act.description && (
                              <p className="text-sm text-gray-600 leading-relaxed">{act.description}</p>
                            )}

                            <div className="flex items-center justify-between gap-3 pt-1">
                              {act.mapUrl ? (
                                <a
                                  href={act.mapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(152,42%,18%)] bg-[hsl(152,42%,18%)]/8 px-3 py-1.5 rounded-full hover:bg-[hsl(152,42%,18%)]/15 transition-colors"
                                >
                                  <MapPin className="h-3 w-3" />
                                  Ver no mapa
                                </a>
                              ) : <span />}

                              <StateButton current={state} onChange={s => setActivityState(key, s)} />
                            </div>

                            <NoteField
                              value={notes[key] || ""}
                              onChange={note => setNote(key, note)}
                            />
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

        {/* PDF button */}
        {itinerary.pdf_url && (
          <div className="pt-4">
            <a
              href={itinerary.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-[hsl(152,42%,18%)] text-[hsl(152,42%,18%)] font-medium text-sm hover:bg-[hsl(152,42%,18%)] hover:text-white transition-colors"
            >
              <Download className="h-4 w-4" />
              Baixar PDF do roteiro
            </a>
          </div>
        )}

        <footer className="text-center text-xs text-gray-400 py-6">
          Criado com carinho por <span className="font-semibold">Sol ☀️</span>
        </footer>
      </div>
    </div>
  );
}
