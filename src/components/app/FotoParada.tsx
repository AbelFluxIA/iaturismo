import { useEffect, useRef, useState } from "react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { queryDoMapa } from "@/lib/geo";
import { urlSegura } from "@/lib/utils";

// Foto de um local do roteiro, do Google Maps (só a foto, sem nota). O servidor
// busca; o app só pede quando a parada aparece na tela e guarda a resposta só
// enquanto o app está aberto (regra do Google: foto não fica guardada).

interface Foto { url: string; autor: string; autorUrl: string | null; mapsUrl: string | null }

const naMemoria = new Map<string, Promise<Foto | null>>();

function pedirFoto(token: string, local: string, cidade: string): Promise<Foto | null> {
  const chave = `${local}|${cidade}`;
  if (!naMemoria.has(chave)) {
    const q = new URLSearchParams({ local, cidade });
    const p = fetch(`${API_URL}/api/app/foto-local?${q}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.status === 200 ? (r.json() as Promise<Foto>) : null))
      .catch(() => { naMemoria.delete(chave); return null; });
    naMemoria.set(chave, p);
  }
  return naMemoria.get(chave)!;
}

// Nome usado na busca: o do link do mapa, que a Sol escreve só para lugares de verdade.
// Sem link ("Almoço livre", "Descanso"), não há foto: o Google acharia um lugar qualquer.
export const localDaParada = (a: { mapUrl: string }) => (a.mapUrl ? queryDoMapa(a.mapUrl) : null);

export function useFotosLocaisLigadas() {
  const { profile, token, isDemo } = useClientAuth();
  return !!profile?.recursos?.fotosLocais && !!token && !isDemo;
}

function useFotoParada(local: string | null, cidade: string, visivel: boolean) {
  const { token } = useClientAuth();
  const ligadas = useFotosLocaisLigadas();
  const [foto, setFoto] = useState<Foto | null>(null);
  useEffect(() => {
    if (!ligadas || !visivel || !token || !local) return;
    let cancelado = false;
    pedirFoto(token, local, cidade).then((f) => { if (!cancelado) setFoto(f); });
    return () => { cancelado = true; };
  }, [ligadas, visivel, token, local, cidade]);
  return foto;
}

// Miniatura na lista do dia: só aparece quando há foto (o crédito fica na tela da atividade)
export function MiniFotoParada({ local, cidade }: { local: string | null; cidade: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visivel, setVisivel] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const foto = useFotoParada(local, cidade, visivel);

  useEffect(() => {
    const el = ref.current;
    if (!el || visivel) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisivel(true); obs.disconnect(); } }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [visivel]);

  if (!foto || falhou) return <span ref={ref} aria-hidden className="flex-none w-0 h-12" />;
  return (
    <span ref={ref} className="flex-none w-12 h-12 rounded-lg overflow-hidden bg-sol-creme">
      <img src={foto.url} alt="" loading="lazy" decoding="async" onError={() => setFalhou(true)} className="w-full h-full object-cover" />
    </span>
  );
}

// Foto grande na tela da atividade, com o crédito pedido pelo Google
export function FotoParada({ local, cidade }: { local: string | null; cidade: string }) {
  const foto = useFotoParada(local, cidade, true);
  const [falhou, setFalhou] = useState(false);
  if (!foto || falhou) return null;
  return (
    <figure className="m-0 flex flex-col gap-1">
      <img src={foto.url} alt={local ?? ""} decoding="async" onError={() => setFalhou(true)} className="w-full h-52 rounded-2xl object-cover bg-sol-creme" />
      <figcaption className="text-[11px] text-sol-texto2 truncate">
        Foto:{" "}
        {urlSegura(foto.autorUrl) ? <a href={urlSegura(foto.autorUrl)!} target="_blank" rel="noopener noreferrer" className="text-sol-texto2">{foto.autor}</a> : foto.autor}
        {" · "}
        {urlSegura(foto.mapsUrl) ? <a href={urlSegura(foto.mapsUrl)!} target="_blank" rel="noopener noreferrer" className="text-sol-texto2">Google Maps</a> : "Google Maps"}
      </figcaption>
    </figure>
  );
}
