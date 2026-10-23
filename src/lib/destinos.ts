// Destinos da Paraíba usados só quando a recomendação da Sol não está
// disponível (sem internet ou bot fora do ar). Sem textos: a recomendação de
// verdade vem da Sol (src/lib/sugestoes.ts), conferida na busca do Google.

export interface Destino {
  slug: string;
  nome: string;
  tipo: "Praia" | "Cultura" | "Serra" | "Sertão";
  lat: number;
  lng: number;
}

export const DESTINOS: Destino[] = [
  { slug: "joao-pessoa", nome: "João Pessoa", tipo: "Praia", lat: -7.1153, lng: -34.861 },
  { slug: "cabedelo", nome: "Cabedelo", tipo: "Praia", lat: -6.9811, lng: -34.8338 },
  { slug: "conde", nome: "Conde", tipo: "Praia", lat: -7.2597, lng: -34.9075 },
  { slug: "lucena", nome: "Lucena", tipo: "Praia", lat: -6.9006, lng: -34.8686 },
  { slug: "baia-da-traicao", nome: "Baía da Traição", tipo: "Praia", lat: -6.6883, lng: -34.9356 },
  { slug: "areia", nome: "Areia", tipo: "Cultura", lat: -6.9631, lng: -35.6919 },
  { slug: "bananeiras", nome: "Bananeiras", tipo: "Serra", lat: -6.7503, lng: -35.6333 },
  { slug: "campina-grande", nome: "Campina Grande", tipo: "Cultura", lat: -7.2306, lng: -35.8811 },
  { slug: "cabaceiras", nome: "Cabaceiras", tipo: "Sertão", lat: -7.4889, lng: -36.2869 },
  { slug: "inga", nome: "Ingá", tipo: "Cultura", lat: -7.2811, lng: -35.6047 },
  { slug: "sousa", nome: "Sousa", tipo: "Sertão", lat: -6.7592, lng: -38.2283 },
];

export const CAPITAL = { lat: -7.1153, lng: -34.861 };
