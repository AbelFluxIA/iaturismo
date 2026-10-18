// Modo demonstração do app do cliente: abre as telas com uma viagem de exemplo,
// sem login. Temporário, enquanto o código pelo WhatsApp não chega (ver PENDENCIAS).
import type { ClientProfile } from "@/contexts/ClientAuthContext";

export const DEMO_TOKEN = "demo";

function dataISO(diasAPartirDeHoje: number) {
  const d = new Date();
  d.setDate(d.getDate() + diasAPartirDeHoje);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function demoProfile(): ClientProfile {
  return {
    name: "Visitante",
    phone: "5583900000000",
    destination: "João Pessoa - PB",
    arrivalDate: dataISO(0),
    departureDate: dataISO(2),
    hasPaid: false,
    hasCompanion: false,
    freeCredits: 1,
    referralCode: "EXEMPLO",
    referralStats: { totalReferrals: 3, convertedReferrals: 1, freeCredits: 1, referralCode: "EXEMPLO" },
    mural: null,
    itinerary: { id: "demo", days: 3, status: "ready", pdfUrl: null },
  };
}

// Viagens de exemplo para a lista "Minhas viagens" (uma atual e uma que já passou)
export function demoViagens() {
  return [
    { id: "demo", destination: "João Pessoa - PB", arrivalDate: dataISO(0), departureDate: dataISO(2), days: 3, pdfUrl: null },
    { id: "demo-passada", destination: "Cabedelo - PB", arrivalDate: dataISO(-40), departureDate: dataISO(-38), days: 3, pdfUrl: null },
  ];
}

const mapa = (lugar: string) => `📍 https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lugar)}`;

// Mesmo formato de texto que o bot gera, para passar pelo mesmo leitor do roteiro.
export const DEMO_ROTEIRO = [
  "Roteiro de exemplo — modo demonstração",
  "",
  "DIA 1 — Chegada e orla",
  "Manhã (09:00): Farol do Cabo Branco",
  "🚗 ~15 min de carro desde o hotel",
  mapa("Farol do Cabo Branco, João Pessoa"),
  "💬 Exemplo de descrição: vista do mar e caminhada pela falésia.",
  "Tarde (14:00): Estação Cabo Branco",
  "🚗 ~5 min de carro",
  mapa("Estação Cabo Branco, João Pessoa"),
  "💬 Exemplo de descrição: espaço de ciência, cultura e artes.",
  "Pôr do Sol (17:00): Praia do Jacaré",
  "🚗 ~30 min de carro",
  mapa("Praia do Jacaré, Cabedelo"),
  "💬 Exemplo de descrição: pôr do sol à beira do rio.",
  "",
  "DIA 2 — Centro histórico",
  "Manhã (09:30): Centro Histórico de João Pessoa",
  "🚗 ~20 min de carro",
  mapa("Centro Histórico, João Pessoa"),
  "💬 Exemplo de descrição: igrejas e casarões.",
  "Tarde (15:00): Mercado de Artesanato Paraibano",
  "🚗 ~15 min de carro",
  mapa("Mercado de Artesanato Paraibano, João Pessoa"),
  "💬 Exemplo de descrição: artesanato local.",
  "Noite (19:30): Orla de Tambaú",
  "🚗 ~5 min de carro",
  mapa("Praia de Tambaú, João Pessoa"),
  "💬 Exemplo de descrição: jantar e passeio pela orla.",
  "",
  "DIA 3 — Praia e volta",
  "Manhã (08:30): Ilha de Areia Vermelha",
  "🚗 ~30 min de carro até o píer",
  mapa("Praia de Camboinha, Cabedelo"),
  "💬 Exemplo de descrição: passeio de barco, depende da maré.",
  "Tarde (14:00): Praia de Manaíra",
  "🚗 ~25 min de carro",
  mapa("Praia de Manaíra, João Pessoa"),
  "💬 Exemplo de descrição: tarde livre antes da volta.",
].join("\n");

export const DEMO_RESPOSTA_CHAT =
  "Este é o modo demonstração, então eu não respondo de verdade aqui. Entre com seu WhatsApp para conversar com a Sol. ☀️";
