// Leitura do roteiro gerado pela Sol (texto) e regras de viagem usadas em
// várias telas: dia atual, próxima atividade, situação da viagem.

export interface Activity {
  period: string;
  time: string;
  name: string;
  travel: string;
  description: string;
  mapUrl: string;
}

export interface Day {
  label: string;
  activities: Activity[];
}

export interface Viagem {
  id: string;
  destination: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
  days: number;
  pdfUrl: string | null;
}

// Formato do texto: "DIA N — ...", períodos "Manhã (09:00): Nome", 🚗 deslocamento,
// 📍 link do mapa, 💬 descrição.
export function parseItinerary(text: string): Day[] {
  const days: Day[] = [];
  let currentDay: Day | null = null;
  let currentActivity: Partial<Activity> | null = null;
  let descBuffer: string[] = [];
  let inIntro = true;

  const flush = () => {
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
    const line = raw.replace(/\*/g, "").trim();
    if (!line || /^---+$/.test(line) || /^(Com carinho|Sol)$/i.test(line)) continue;
    const s = line.replace(/^[^\p{L}\d(]+/u, "").trim();

    if (/^DIA\s*\d+/i.test(s)) {
      inIntro = false; flush();
      currentDay = { label: s, activities: [] };
      days.push(currentDay);
      continue;
    }
    if (inIntro || line.startsWith("⚠️")) continue;
    if (line.startsWith("🚗") || /^~\s*\d+/i.test(s)) {
      if (currentActivity) currentActivity.travel = line.replace(/^🚗\s*/, "").trim();
      continue;
    }
    if (line.startsWith("📍") || /^https?:\/\//i.test(s)) {
      if (currentActivity) {
        const url = line.replace(/^📍\s*/, "").trim();
        if (/^https?:\/\//i.test(url)) currentActivity.mapUrl = url;
      }
      continue;
    }
    if (line.startsWith("💬")) {
      if (currentActivity) descBuffer.push(line.replace(/^💬\s*/, "").trim());
      continue;
    }
    const pm = s.match(/^(Manh[aã]|Tarde|Noite|P[oô]r\s*do\s*Sol|Dia\s*Inteiro)\s*\(([^)]+)\)[:\s-]+(.+)/i);
    if (pm) {
      flush();
      currentActivity = { period: pm[1], time: pm[2].trim(), name: pm[3].trim(), travel: "", mapUrl: "" };
      continue;
    }
    if (currentActivity && !currentActivity.name) currentActivity.name = s;
    else if (currentActivity) descBuffer.push(s);
  }
  flush();
  return days;
}

// "DIA 1 — Sábado, 04/10" → "Dia 1"
export function rotuloCurto(label: string, i: number) {
  const m = label.match(/DIA\s*(\d+)/i);
  return `Dia ${m ? m[1] : i + 1}`;
}

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Botão do dia: "Sáb 04" quando a data de chegada é conhecida, senão "Dia 1"
export function rotuloDia(chegada: string | null, i: number, label: string) {
  if (!chegada || !/^\d{4}-\d{2}-\d{2}$/.test(chegada)) return rotuloCurto(label, i);
  const d = new Date(`${chegada}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + i);
  return `${SEMANA[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, "0")}`;
}

// "09:00 - 11:00" → "09:00"
export function horaInicio(a: Activity) {
  return a.time.split(/[-–]/)[0].trim() || a.period;
}

// "João Pessoa - PB" → "João Pessoa" (títulos curtos)
export const nomeCurto = (destino: string | null | undefined) => (destino ?? "").replace(/\s*[-–]\s*[A-Z]{2}$/, "");

export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Datas no formato AAAA-MM-DD (como o bot grava): dá para comparar como texto.
export function situacao(v: Pick<Viagem, "arrivalDate" | "departureDate">): "passada" | "agora" | "proxima" {
  const hoje = hojeISO();
  if (v.departureDate && v.departureDate < hoje) return "passada";
  if (v.arrivalDate && v.arrivalDate > hoje) return "proxima";
  return "agora";
}

// Dia da viagem hoje (1 = chegada) e total de dias; null fora do período
export function diaDaViagem(chegada: string | null, saida: string | null) {
  if (!chegada || !/^\d{4}-\d{2}-\d{2}$/.test(chegada)) return null;
  const um = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  const hoje = hojeISO();
  const dia = Math.round((um(hoje) - um(chegada)) / 86400000) + 1;
  const total = saida && /^\d{4}-\d{2}-\d{2}$/.test(saida) ? Math.round((um(saida) - um(chegada)) / 86400000) + 1 : null;
  if (dia < 1 || (total && dia > total)) return null;
  return { dia, total };
}

// Viagem que o app trata como "a de agora": em andamento; senão a próxima
export function escolherAtual(viagens: Viagem[]): Viagem | null {
  const agora = viagens.find((v) => situacao(v) === "agora");
  if (agora) return agora;
  const proximas = viagens.filter((v) => situacao(v) === "proxima").sort((a, b) => (a.arrivalDate ?? "").localeCompare(b.arrivalDate ?? ""));
  return proximas[0] ?? null;
}

// ─── Atividades marcadas como feitas (guardadas neste aparelho) ───────────────

export const chaveFeitas = (id: string) => `sol_feitas_${id}`;
export const chaveAtividade = (dia: number, atividade: number) => `d${dia}-${atividade}`;

export function lerFeitas(id: string | null): Record<string, boolean> {
  if (!id) return {};
  try { return JSON.parse(localStorage.getItem(chaveFeitas(id)) || "{}"); } catch { return {}; }
}

export function gravarFeitas(id: string, feitas: Record<string, boolean>) {
  try { localStorage.setItem(chaveFeitas(id), JSON.stringify(feitas)); } catch { /* sem armazenamento */ }
  window.dispatchEvent(new CustomEvent("sol-feitas", { detail: id }));
}

// Índice do dia do roteiro que corresponde a hoje (0 se a viagem ainda não começou)
export function indiceDoDia(chegada: string | null, totalDias: number) {
  const d = diaDaViagem(chegada, null);
  if (!d) return 0;
  return Math.min(d.dia - 1, Math.max(totalDias - 1, 0));
}

// ─── Checklist da viagem (lista fixa, marcações neste aparelho) ───────────────

export const ITENS_CHECKLIST = [
  "Documento com foto",
  "Confirmar a hospedagem",
  "Protetor solar e água",
  "Contatos de emergência cadastrados",
  "Roteiro aberto pelo menos uma vez com internet",
  "Carregador do celular",
  "Dinheiro e cartão",
];

export const chaveChecklist = (id: string) => `sol_checklist_${id}`;

export function lerChecklist(id: string | null): boolean[] {
  if (!id) return [];
  try { return JSON.parse(localStorage.getItem(chaveChecklist(id)) || "[]"); } catch { return []; }
}
