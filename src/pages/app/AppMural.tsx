import { useState } from "react";
import { Image as ImageIcon, Link2, Share2 } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { TopBar, Carregando, Vazio, Aviso, btnSecundario, formatarData } from "@/components/app/ui";
import { EnviarFotos, GradeFotos, useAlbum, type GrupoAlbum, type LinkViagem } from "@/components/app/Album";

// "16 a 17/05/2026", "30/05 a 02/06/2026" ou "09/08/2026"
function periodo(g: GrupoAlbum) {
  const dia = (d: string) => new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
  const ini = dia(g.inicio);
  const fim = dia(g.fim);
  if (ini === fim) return ini;
  if (ini.slice(3) === fim.slice(3)) return `${ini.slice(0, 2)} a ${fim}`;
  if (ini.slice(6) === fim.slice(6)) return `${ini.slice(0, 5)} a ${fim}`;
  return `${ini} a ${fim}`;
}

// Compartilhar UMA viagem (RA-FOT-05): o link é secreto, vale 7 dias e pode ser desligado.
// Nunca existe link do álbum inteiro: quem recebe vê só as fotos daquela viagem.
function CompartilharViagem({ grupo }: { grupo: GrupoAlbum }) {
  const { token, isDemo } = useClientAuth();
  const [link, setLink] = useState<LinkViagem | null>(grupo.link ?? null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  if (!token || isDemo) return null;

  const pedir = (caminho: string, corpo: object) =>
    fetch(`${API_URL}${caminho}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(corpo) });

  async function copiar(url: string) {
    try { await navigator.clipboard.writeText(url); setAviso("Link copiado."); } catch { setAviso(url); }
  }
  // Devolve false quando o celular não abriu a tela de compartilhar (aí o botão fica à mão)
  async function abrirCompartilhar(url: string): Promise<boolean> {
    if (!navigator.share) return false;
    try { await navigator.share({ title: grupo.titulo, text: `Minha viagem: ${grupo.titulo}`, url }); return true; }
    catch (e) { return (e as Error)?.name === "AbortError"; }
  }

  async function criar() {
    setOcupado(true); setAviso(null);
    try {
      const r = await pedir("/api/app/viagem/link", { inicio: grupo.inicio });
      if (!r.ok) throw new Error();
      const novo = (await r.json()) as LinkViagem;
      setLink(novo);
      if (!(await abrirCompartilhar(novo.url))) await copiar(novo.url);
    } catch { setAviso("Não consegui criar o link agora. Tente de novo."); }
    setOcupado(false);
  }

  async function desligar() {
    if (!link || !window.confirm("Desligar o link desta viagem? Quem recebeu não consegue mais abrir.")) return;
    setOcupado(true); setAviso(null);
    try {
      const r = await pedir("/api/app/viagem/link/desativar", { codigo: link.codigo });
      if (!r.ok && r.status !== 404) throw new Error();
      setLink(null);
      setAviso("Link desligado.");
    } catch { setAviso("Não consegui desligar agora. Tente de novo."); }
    setOcupado(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {link ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={ocupado} onClick={async () => { setAviso(null); if (!(await abrirCompartilhar(link.url))) await copiar(link.url); }} className={`${btnSecundario} !text-sm`}>
              <Share2 size={16} /> Compartilhar
            </button>
            <button type="button" disabled={ocupado} onClick={() => copiar(link.url)} className={`${btnSecundario} !text-sm`}>
              <Link2 size={16} /> Copiar link
            </button>
          </div>
          <p className="m-0 text-xs text-sol-texto2">
            Link desta viagem ativo até {formatarData(link.expiraEm)}.{" "}
            <button type="button" disabled={ocupado} onClick={desligar} className="min-h-[32px] font-bold text-sol-mar underline">Desligar link</button>
          </p>
        </>
      ) : (
        <button type="button" disabled={ocupado} onClick={criar} className={`${btnSecundario} !text-sm`}>
          <Share2 size={16} /> {ocupado ? "Criando o link..." : "Compartilhar esta viagem"}
        </button>
      )}
      {aviso && <p role="status" className="m-0 text-xs text-sol-texto2 break-all">{aviso}</p>}
    </div>
  );
}

export default function AppMural() {
  const { album, loading, recarregar, apagar } = useAlbum();

  if (loading) return <Carregando />;

  const total = album?.total ?? 0;

  return (
    <div className="flex flex-col">
      <TopBar title="Álbum" step={total ? `${total} ${total === 1 ? "foto" : "fotos"}` : undefined} back="/app" />
      <div className="flex flex-col gap-4 px-5">
        <EnviarFotos aoTerminar={recarregar} envio={album?.envio} />

        {total === 0 ? (
          <Vazio
            icone={<ImageIcon size={32} />}
            titulo="Seu álbum ainda não tem fotos"
            texto="Mande fotos da viagem para a Sol, por aqui, pela câmera no chat ou pelo WhatsApp. Elas aparecem separadas por viagem."
          />
        ) : (
          album!.grupos.map((g) => (
            <section key={g.inicio} aria-label={g.titulo} className="flex flex-col gap-2">
              <div className="flex flex-col">
                <h2 className="m-0 text-base font-extrabold">{g.titulo}</h2>
                <span className="text-xs text-sol-texto2">{periodo(g)} · {g.fotos.length} {g.fotos.length === 1 ? "foto" : "fotos"}</span>
              </div>
              <GradeFotos fotos={g.fotos} aoApagar={apagar} />
              <CompartilharViagem key={`${g.inicio}:${g.link?.codigo ?? ""}`} grupo={g} />
            </section>
          ))
        )}

        <Aviso tom="neutro">
          Só você vê o álbum inteiro. O link de cada viagem mostra só as fotos daquela viagem, vale 7 dias e pode ser desligado. Com a Sol Guia ativa, cada foto ganha um comentário da Sol.
        </Aviso>
      </div>
    </div>
  );
}
