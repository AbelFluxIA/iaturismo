import { useEffect, useState } from "react";

// Foto de uma cidade ou destino: a foto principal do artigo da Wikipédia,
// vinda do Wikimedia Commons (licença livre, com crédito do autor). Grátis e
// sem chave. Sem foto adequada (bandeira, brasão, mapa), mostra o fundo colorido.

export interface FotoLugar {
  url: string;
  autor: string;
  licenca: string;
  pagina: string;
}

export const UFS: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo",
  GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba",
  PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

const CHAVE = "sol_fotos_lugar_v2"; // v2: colagens deixaram de valer (14/11)
const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;
// Colagem de várias fotos (comum como imagem principal do artigo) fica cortada no cartão: também não serve
const NAO_E_FOTO = /\.svg$|bandeira|bras[aã]o|flag|coat|mapa|map[_ ]|locali[zs]a|locator|selo|logo|colagem|collage|montagem|montage|mosaico|landsat|sat[eé]lite|satellite|\.(gif|ogv|webm|pdf|tiff?)$/i;

const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const semHtml = (s: string) => new DOMParser().parseFromString(s, "text/html").body.textContent?.trim() ?? "";

type Guardado = Record<string, { foto: FotoLugar | null; em: number }>;
function lerGuardadas(): Guardado {
  try { return JSON.parse(localStorage.getItem(CHAVE) || "{}"); } catch { return {}; }
}

async function api(host: string, params: Record<string, string>) {
  const q = new URLSearchParams({ ...params, format: "json", origin: "*" });
  const r = await fetch(`https://${host}/w/api.php?${q}`);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

async function buscar(nome: string, uf: string): Promise<FotoLugar | null> {
  const busca = await api("pt.wikipedia.org", {
    action: "query", generator: "search", gsrsearch: `${nome} ${UFS[uf] ?? uf}`.trim(), gsrlimit: "1", prop: "pageimages|images", piprop: "name", imlimit: "40",
  });
  const pagina = Object.values(busca?.query?.pages ?? {})[0] as { title?: string; pageimage?: string; images?: { title?: string }[] } | undefined;
  // O artigo achado precisa ser do lugar pedido (ex.: "Conde (Paraíba)" para "Conde")
  if (!pagina?.title || !normalizar(pagina.title).startsWith(normalizar(nome))) return null;
  // A foto principal; se ela não servir (colagem, bandeira, mapa), a primeira foto comum do artigo
  const outras = (pagina.images ?? []).map((i) => (i.title ?? "").replace(/^[^:]+:/, "")).filter((n) => /\.(jpe?g|png|webp)$/i.test(n));
  const escolhida = [pagina.pageimage, ...outras].find((n): n is string => !!n && !NAO_E_FOTO.test(n));
  if (!escolhida) return null;

  const info = await api("commons.wikimedia.org", {
    action: "query", titles: `File:${escolhida}`, prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "640",
    iiextmetadatafilter: "Artist|LicenseShortName",
  });
  const arquivo = Object.values(info?.query?.pages ?? {})[0] as { imageinfo?: { thumburl?: string; descriptionurl?: string; extmetadata?: Record<string, { value: string }> }[] } | undefined;
  const ii = arquivo?.imageinfo?.[0];
  const licenca = ii?.extmetadata?.LicenseShortName?.value ?? "";
  // Só licenças livres que permitem uso com crédito
  if (!ii?.thumburl || !/^(cc|public domain|domínio público)/i.test(licenca)) return null;
  return {
    url: ii.thumburl,
    autor: semHtml(ii.extmetadata?.Artist?.value ?? "") || "autor no Wikimedia Commons",
    licenca,
    pagina: ii.descriptionurl ?? "https://commons.wikimedia.org",
  };
}

const emAndamento = new Map<string, Promise<FotoLugar | null>>();

export function fotoDoLugar(nome: string, uf: string): Promise<FotoLugar | null> {
  const chave = `${normalizar(nome)}|${uf}`;
  const g = lerGuardadas()[chave];
  if (g && Date.now() - g.em < VALIDADE_MS) return Promise.resolve(g.foto);
  if (!emAndamento.has(chave)) {
    emAndamento.set(chave, buscar(nome, uf)
      .then((foto) => {
        try { localStorage.setItem(CHAVE, JSON.stringify({ ...lerGuardadas(), [chave]: { foto, em: Date.now() } })); } catch { /* sem armazenamento */ }
        return foto;
      })
      .catch(() => null) // sem conexão: tenta de novo na próxima vez
      .finally(() => emAndamento.delete(chave)));
  }
  return emAndamento.get(chave)!;
}

export function useFotoLugar(nome: string | null | undefined, uf = "") {
  const [foto, setFoto] = useState<FotoLugar | null>(null);
  useEffect(() => {
    if (!nome) return;
    let cancelado = false;
    fotoDoLugar(nome, uf).then((f) => { if (!cancelado) setFoto(f); });
    return () => { cancelado = true; };
  }, [nome, uf]);
  return foto;
}
