// Leitura do roteiro gerado pela Sol (texto) e regras de viagem usadas em
// várias telas: dia atual, próxima atividade, situação da viagem.

export interface Activity {
  period: string;
  time: string;
  name: string;
  travel: string;
  description: string;
  mapUrl: string;
  // Linhas novas do roteiro (13/11/2026). Roteiros antigos não têm: ficam vazias.
  hours?: string;      // 🕒 horário de funcionamento e tempo no local
  cost?: string;       // 💰 custo
  rain?: string;       // ☔ plano B se chover
  tip?: string;        // 💡 curiosidade
  event?: string;      // 🎫 evento (com a fonte)
  alert?: string;      // ⚠️ alerta da própria parada
  checked?: "ok" | "aviso" | "fechado"; // ✅ conferido no Google Maps / ⚠️ não deu para conferir / ⚠️ consta fechado nesse horário
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
  groupType?: string | null;
}

// Formato do texto: "DIA N — ...", períodos "Manhã (09:00): Nome", 🚗 deslocamento,
// 📍 link do mapa, 💬 descrição.
export function parseItinerary(text: string): Day[] {
  const days: Day[] = [];
  let currentDay: Day | null = null;
  let currentActivity: Partial<Activity> | null = null;
  let descBuffer: string[] = [];
  // Texto sem nenhuma linha "DIA N": tudo vira o Dia 1 em vez de sumir
  let inIntro = /DIA\s*\d+/i.test(text);

  const flush = () => {
    if (currentActivity && currentDay) {
      currentDay.activities.push({
        period: currentActivity.period || "",
        time: currentActivity.time || "",
        name: currentActivity.name || "",
        travel: currentActivity.travel || "",
        description: descBuffer.join(" ").trim(),
        mapUrl: currentActivity.mapUrl || "",
        hours: currentActivity.hours, cost: currentActivity.cost, rain: currentActivity.rain, tip: currentActivity.tip,
        event: currentActivity.event, alert: currentActivity.alert, checked: currentActivity.checked,
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
    if (inIntro) continue;
    // Linhas com marca própria dentro de uma parada (o rótulo "Horário:", "Custo:" etc. sai)
    if (currentActivity) {
      const semRotulo = (t: string) => t.replace(/^[^\p{L}\d(]+/u, "").replace(/^(Hor[aá]rio|Custo|Se chover|Curiosidade|Evento|Conferido no Google Maps)\s*:\s*/i, "").trim();
      if (line.startsWith("🕒")) { currentActivity.hours = semRotulo(line); continue; }
      if (line.startsWith("💰")) { currentActivity.cost = semRotulo(line); continue; }
      if (line.startsWith("☔")) { currentActivity.rain = semRotulo(line); continue; }
      if (line.startsWith("💡")) { currentActivity.tip = [currentActivity.tip, semRotulo(line)].filter(Boolean).join(" "); continue; }
      if (line.startsWith("🎫")) { currentActivity.event = semRotulo(line); continue; }
      if (line.startsWith("✅")) { currentActivity.checked = "ok"; continue; }
      if (line.startsWith("⚠️")) { if (/Confirme o funcionamento/i.test(line)) currentActivity.checked = /fechad/i.test(line) ? "fechado" : "aviso"; else currentActivity.alert = [currentActivity.alert, semRotulo(line)].filter(Boolean).join(" "); continue; }
    }
    if (line.startsWith("⚠️")) continue;
    // Início de parada: "Manhã (09:00): Nome". A Sol às vezes escreve "Almoço (12:30)"
    // ou "Jantar (19:30)", e põe 🚗 na frente de um traslado: tudo isso é parada também.
    const pm = s.match(/^(Manh[aã]|Tarde|Noite|P[oô]r\s*do\s*Sol|Dia\s*Inteiro|Almo[cç]o|Jantar|Caf[eé](?:\s*da\s*manh[aã])?|Lanche|Madrugada)\s*\(([^)]+)\)[:\s-]+(.+)/i);
    if (pm) {
      flush();
      if (!currentDay) { currentDay = { label: "Dia 1", activities: [] }; days.push(currentDay); }
      currentActivity = { period: pm[1], time: pm[2].trim(), name: pm[3].trim(), travel: "", mapUrl: "" };
      continue;
    }
    if (line.startsWith("🚗") || /^~\s*\d+/i.test(s)) {
      if (currentActivity) currentActivity.travel = line.replace(/^🚗\s*/, "").trim();
      continue;
    }
    if (line.startsWith("📍") || /^https?:\/\//i.test(s)) {
      // Mais de um link na mesma parada: fica o primeiro (é o do local)
      if (currentActivity && !currentActivity.mapUrl) {
        const url = line.replace(/^📍\s*/, "").trim();
        if (/^https?:\/\//i.test(url)) currentActivity.mapUrl = url;
      }
      continue;
    }
    if (line.startsWith("💬")) {
      if (currentActivity) descBuffer.push(line.replace(/^💬\s*/, "").trim());
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

// Tipos de passeio (RA-ROT-11): usados em Criar roteiro e no onboarding ("o que você mais gosta")
// Dias de uma viagem, como o app conta para o limite e o preço: sair hoje e voltar amanhã
// é 1 dia (dias = volta − chegada; ir e voltar no mesmo dia também é 1). Mesma conta do servidor.
export function diasDaViagem(chegada: string | null | undefined, saida: string | null | undefined, reserva = 1): number {
  const iso = /^\d{4}-\d{2}-\d{2}/;
  if (!chegada || !saida || !iso.test(chegada) || !iso.test(saida)) return reserva;
  const n = Math.round((Date.parse(`${saida.slice(0, 10)}T12:00:00Z`) - Date.parse(`${chegada.slice(0, 10)}T12:00:00Z`)) / 86400000);
  return Number.isFinite(n) ? Math.max(1, n) : reserva;
}

export const TIPOS_PASSEIO = ["Natureza (inclui praia)", "Gastronomia", "Cultura", "Aventura", "Bares e pubs", "Negócios", "Inovação e tech"];

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

// Lista fixa por tipo de viagem (RA-ROT-22): nacional, internacional, com criança, com pet
export function itensChecklist(v?: Pick<Viagem, "destination" | "groupType"> | null): { tipo: string; itens: string[] } {
  const destino = v?.destination ?? "";
  const nacional = !destino || /\s-\s[A-Z]{2}$/.test(destino) || /brasil/i.test(destino);
  const grupo = (v?.groupType ?? "").toLowerCase();
  const itens = [...ITENS_CHECKLIST];
  const tipos = [nacional ? "nacional" : "internacional"];
  if (!nacional) itens.push("Passaporte válido", "Seguro viagem", "Internet no exterior (chip ou plano)");
  if (/crian/.test(grupo)) { tipos.push("com criança"); itens.push("Documento das crianças", "Remédios e itens das crianças"); }
  if (/\bpet\b/.test(grupo)) { tipos.push("com pet"); itens.push("Carteira de vacinação do pet", "Comida, água e caminha do pet"); }
  return { tipo: tipos.join(", "), itens };
}

export const chaveChecklist = (id: string) => `sol_checklist_${id}`;

export function lerChecklist(id: string | null): boolean[] {
  if (!id) return [];
  try { return JSON.parse(localStorage.getItem(chaveChecklist(id)) || "[]"); } catch { return []; }
}
