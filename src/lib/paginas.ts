import { ehNativo } from "@/lib/nativo";

// Páginas públicas da Sol (exigidas pelas lojas): Política de Privacidade, Termos de Uso,
// Suporte e Excluir conta. São arquivos próprios em /sol/..., fora das telas do app.
// No app nativo não existem dentro do pacote: abrem no endereço público.
export type PaginaSol = "privacidade" | "termos" | "suporte" | "excluir-conta";
export const paginaSol = (nome: PaginaSol) => `${ehNativo ? "https://painel.tripsol.com.br" : ""}/sol/${nome}`;
// Versão dos textos que a pessoa aceita no cadastro (a mesma do rodapé das páginas)
export const VERSAO_DOS_TEXTOS = "1.0-2026-11-22";
