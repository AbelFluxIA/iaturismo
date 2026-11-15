import { useState, type ReactNode } from "react";
import { Download, MoreVertical, PlusSquare, Share, X } from "lucide-react";
import { aparelho, dentroDeOutroApp, instalarComUmToque, safariDoIphone, useInstalacao } from "@/lib/instalar";

// Botão "Instalar o app": no Android instala com um toque (o celular só pede a confirmação);
// onde o navegador não deixa (iPhone, navegador de dentro de outro app), abre o passo a passo
// daquele aparelho. Some sozinho quando o app já está instalado.

const ENDERECO = "painel.tripsol.com.br/app";

function Passo({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex-none w-7 h-7 rounded-full bg-sol-fundo text-white flex items-center justify-center text-sm font-extrabold">{n}</span>
      <span className="pt-0.5 text-[15px] leading-snug">{children}</span>
    </li>
  );
}
const icone = "inline-block align-[-3px] mx-0.5";

export function ComoInstalar({ fechar }: { fechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const ap = aparelho();
  const outroApp = dentroDeOutroApp();
  const navegador = ap === "iphone" ? "Safari" : "Chrome";

  async function copiar() {
    try { await navigator.clipboard.writeText(`https://${ENDERECO}`); setCopiado(true); setTimeout(() => setCopiado(false), 2500); } catch { /* a pessoa copia o endereço escrito */ }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="instalar-titulo" className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 font-corpo" onClick={fechar}>
      <div className="w-full max-w-[430px] flex flex-col gap-4 p-5 pb-[max(20px,env(safe-area-inset-bottom))] rounded-t-3xl sm:rounded-3xl bg-white text-sol-fundo" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <img src="/sol-mark.png" alt="" className="flex-none w-11 h-11 object-contain" />
          <h2 id="instalar-titulo" className="flex-1 m-0 font-display font-extrabold text-[20px] leading-tight">Instalar o app Sol</h2>
          <button type="button" aria-label="Fechar" onClick={fechar} className="flex-none w-11 h-11 -mr-2 flex items-center justify-center"><X size={22} /></button>
        </div>

        {outroApp ? (
          <>
            <p className="m-0 text-[15px] leading-snug text-sol-texto2">Você abriu a Sol por dentro de outro aplicativo, e daqui não dá para instalar. É rápido:</p>
            <ol className="m-0 p-0 list-none flex flex-col gap-3">
              <Passo n={1}>Copie o endereço da Sol no botão abaixo.</Passo>
              <Passo n={2}>Abra o <strong>{navegador}</strong> e cole o endereço.</Passo>
              <Passo n={3}>Lá, toque em <strong>Instalar o app</strong> de novo.</Passo>
            </ol>
            <button type="button" onClick={copiar} className="flex items-center justify-center min-h-[48px] px-4 rounded-[14px] bg-sol-mar text-white text-[15px] font-bold">{copiado ? "Endereço copiado" : `Copiar ${ENDERECO}`}</button>
          </>
        ) : ap === "iphone" ? (
          <>
            <p className="m-0 text-[15px] leading-snug text-sol-texto2">No iPhone a instalação é feita pelo próprio {safariDoIphone() ? "Safari" : "navegador"}, em 3 toques:</p>
            <ol className="m-0 p-0 list-none flex flex-col gap-3">
              <Passo n={1}>Toque em <Share size={18} className={icone} aria-hidden /> <strong>Compartilhar</strong>, {safariDoIphone() ? "na barra do Safari" : "ao lado do endereço"}. Se não aparecer, toque antes nos três pontinhos.</Passo>
              <Passo n={2}>Role a lista e toque em <PlusSquare size={18} className={icone} aria-hidden /> <strong>Adicionar à Tela de Início</strong>.</Passo>
              <Passo n={3}>Toque em <strong>Adicionar</strong>. O ícone da Sol aparece junto dos seus apps.</Passo>
            </ol>
            <p className="m-0 text-[13px] leading-snug text-sol-texto2">Depois, abra a Sol pelo ícone novo e entre com o seu WhatsApp.</p>
          </>
        ) : ap === "android" ? (
          <ol className="m-0 p-0 list-none flex flex-col gap-3">
            <Passo n={1}>Toque nos três pontinhos <MoreVertical size={18} className={icone} aria-hidden /> do navegador, no canto de cima.</Passo>
            <Passo n={2}>Toque em <strong>Instalar app</strong> (ou <strong>Adicionar à tela inicial</strong>).</Passo>
            <Passo n={3}>Confirme em <strong>Instalar</strong>. O ícone da Sol aparece junto dos seus apps.</Passo>
          </ol>
        ) : (
          <ol className="m-0 p-0 list-none flex flex-col gap-3">
            <Passo n={1}>No Chrome ou no Edge, clique no ícone de instalar <Download size={18} className={icone} aria-hidden /> no fim da barra de endereço.</Passo>
            <Passo n={2}>Confirme em <strong>Instalar</strong>.</Passo>
            <Passo n={3}>No celular é ainda melhor: abra <strong>{ENDERECO}</strong> nele.</Passo>
          </ol>
        )}
        <button type="button" onClick={fechar} className="flex items-center justify-center min-h-[48px] px-4 rounded-[14px] bg-white border-[1.5px] border-sol-borda text-[15px] font-bold">Entendi</button>
      </div>
    </div>
  );
}

// `children(instalar)` desenha o botão no formato de cada tela; nada aparece com o app já instalado
export function Instalar({ children }: { children: (instalar: () => void, rotulo: string) => ReactNode }) {
  const { instalado, instalouAgora } = useInstalacao();
  const [passos, setPassos] = useState(false);
  if (instalado && !instalouAgora) return null;
  if (instalouAgora) return <p role="status" className="m-0 text-center text-sm font-bold text-sol-ok">App instalado. Abra a Sol pelo ícone na tela do celular.</p>;

  async function instalar() {
    if ((await instalarComUmToque()) === "sem_convite") setPassos(true);
  }
  return (
    <>
      {children(instalar, "Instalar o app")}
      {passos && <ComoInstalar fechar={() => setPassos(false)} />}
    </>
  );
}
