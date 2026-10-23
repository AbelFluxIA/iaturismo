// Destinos sugeridos na Paraíba ("Para onde ir"). Informações gerais e públicas
// dos lugares; clima e distância são calculados na hora (Open-Meteo / posição).

export interface Destino {
  slug: string;
  nome: string;
  tipo: "Praia" | "Cultura" | "Serra" | "Sertão";
  lat: number;
  lng: number;
  resumo: string;
  destaques: string[];
  cor: string; // fundo do cartão
}

export const DESTINOS: Destino[] = [
  {
    slug: "joao-pessoa", nome: "João Pessoa", tipo: "Praia", lat: -7.1153, lng: -34.861, cor: "#DFF3F7",
    resumo: "Capital com orla urbana arborizada, centro histórico e a Ponta do Seixas, o ponto mais oriental das Américas.",
    destaques: ["Orla de Tambaú e Cabo Branco", "Centro Histórico e Igreja de São Francisco", "Estação Cabo Branco"],
  },
  {
    slug: "cabedelo", nome: "Cabedelo", tipo: "Praia", lat: -6.9811, lng: -34.8338, cor: "#DFF3F7",
    resumo: "Pôr do sol no Rio Paraíba ao som do Bolero de Ravel, fortaleza colonial e passeio de barco às piscinas naturais.",
    destaques: ["Pôr do sol na Praia do Jacaré", "Fortaleza de Santa Catarina", "Ilha de Areia Vermelha (depende da maré)"],
  },
  {
    slug: "conde", nome: "Conde", tipo: "Praia", lat: -7.2597, lng: -34.9075, cor: "#E2F1E8",
    resumo: "Litoral sul com falésias coloridas, coqueirais e praias de águas calmas.",
    destaques: ["Praia de Coqueirinho", "Praia de Tabatinga", "Falésias de Tambaba"],
  },
  {
    slug: "lucena", nome: "Lucena", tipo: "Praia", lat: -6.9006, lng: -34.8686, cor: "#E2F1E8",
    resumo: "Litoral norte tranquilo, com acesso por balsa a partir de Cabedelo.",
    destaques: ["Praia de Lucena", "Travessia de balsa pelo Rio Paraíba", "Igreja de Nossa Senhora da Guia"],
  },
  {
    slug: "baia-da-traicao", nome: "Baía da Traição", tipo: "Praia", lat: -6.6883, lng: -34.9356, cor: "#E2F1E8",
    resumo: "Praias rústicas no litoral norte, em território do povo Potiguara.",
    destaques: ["Praias de águas calmas", "Cultura Potiguara", "Mirantes e falésias"],
  },
  {
    slug: "areia", nome: "Areia", tipo: "Cultura", lat: -6.9631, lng: -35.6919, cor: "#FEF1CC",
    resumo: "Cidade histórica do Brejo, com casario tombado, engenhos de cachaça e clima de serra.",
    destaques: ["Teatro Minerva", "Casa de Pedro Américo", "Engenhos e alambiques"],
  },
  {
    slug: "bananeiras", nome: "Bananeiras", tipo: "Serra", lat: -6.7503, lng: -35.6333, cor: "#EDE7DC",
    resumo: "Clima ameno no Brejo paraibano, casarões e o antigo túnel ferroviário.",
    destaques: ["Túnel da antiga ferrovia", "Centro histórico", "Festival de inverno (meio do ano)"],
  },
  {
    slug: "campina-grande", nome: "Campina Grande", tipo: "Cultura", lat: -7.2306, lng: -35.8811, cor: "#FEF1CC",
    resumo: "Terra do Maior São João do Mundo, com museus e o Açude Velho no centro.",
    destaques: ["Parque do Povo (São João em junho)", "Açude Velho", "Museu de Arte Popular da Paraíba"],
  },
  {
    slug: "cabaceiras", nome: "Cabaceiras", tipo: "Sertão", lat: -7.4889, lng: -36.2869, cor: "#F6E3D3",
    resumo: "A \"Roliúde Nordestina\", cenário de filmes, com formações rochosas no Cariri.",
    destaques: ["Lajedo de Pai Mateus", "Cenários de cinema", "Paisagem do Cariri"],
  },
  {
    slug: "inga", nome: "Ingá", tipo: "Cultura", lat: -7.2811, lng: -35.6047, cor: "#EDE7DC",
    resumo: "Sítio arqueológico com a Pedra do Ingá, gravuras rupestres milenares.",
    destaques: ["Pedra do Ingá (itacoatiaras)", "Museu do sítio", "Trilha à beira do rio"],
  },
  {
    slug: "sousa", nome: "Sousa", tipo: "Sertão", lat: -6.7592, lng: -38.2283, cor: "#F6E3D3",
    resumo: "Sertão paraibano com o Vale dos Dinossauros, pegadas fossilizadas a céu aberto.",
    destaques: ["Vale dos Dinossauros", "Paisagem do sertão", "Culinária sertaneja"],
  },
];

export const CAPITAL = { lat: -7.1153, lng: -34.861 };

export function destinoPorSlug(slug: string | undefined) {
  return DESTINOS.find((d) => d.slug === slug) ?? null;
}
