import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { Award, Copy, Share2 } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { Aviso, Carregando, TopBar, btnPrimario, btnSecundario, cartao, formatarData } from "@/components/app/ui";

// Créditos e indicações (RA-IND): link de convite com QR Code, convidados e convertidos,
// próximo patamar e os dias de Guia Sol ganhos (com o botão para usar na viagem).
interface Indicacao {
  codigo: string | null;
  link: string | null;
  convidados: number;
  convertidos: number;
  embaixador: boolean;
  proximoPatamar: { faltam: number; em: number; dias: number } | null;
  diasGuia: { disponiveis: number; pendentes: number; itens: { dias: number; origem: string; liberaEm: string; expiraEm: string; liberado: boolean }[] };
  guiaAte: string | null;
  regras: { maxDiasPorViagem: number; maxDiasPorMes: number; validadeDias: number };
}

const ORIGEM: Record<string, string> = { convite: "Presente do convite", patamar_3: "3 amigos convertidos", patamar_10: "10 amigos convertidos" };
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export default function AppCreditos() {
  const { profile, token, isDemo, refreshProfile } = useClientAuth();
  const [ind, setInd] = useState<Indicacao | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<{ tom: "ok" | "erro"; texto: string } | null>(null);
  const creditos = profile?.freeCredits ?? 0;

  async function carregar() {
    if (!token || isDemo) return;
    try {
      const r = await fetch(`${API_URL}/api/app/indicacao`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { setFalhou(true); return; }
      // Resposta incompleta (servidor antigo ou falha) não pode derrubar a tela
      const d = await r.json().catch(() => null);
      if (!d || !d.diasGuia || !Array.isArray(d.diasGuia.itens) || !d.regras) { setFalhou(true); return; }
      setInd(d);
    } catch { setFalhou(true); }
  }
  useEffect(() => { carregar(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ind?.link) return;
    QRCode.toDataURL(ind.link, { margin: 1, width: 360, color: { dark: "#0E2F45", light: "#FFFFFF" } }).then(setQr).catch(() => setQr(null));
  }, [ind?.link]);

  const texto = ind?.link ? `Monte seu roteiro de viagem com a Sol ☀️ Entrando pelo meu convite você ganha 1 dia de Guia Sol: ${ind.link}` : "";
  async function compartilhar() {
    if (!ind?.link) return;
    try {
      if (navigator.share) { await navigator.share({ text: texto }); return; }
    } catch { return; }
    copiar();
  }
  function copiar() {
    if (!ind?.link) return;
    navigator.clipboard?.writeText(ind.link).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); });
  }
  async function usar(dias: number) {
    setOcupado(true); setMsg(null);
    try {
      const r = await fetch(`${API_URL}/api/app/indicacao/resgatar`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ dias }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ tom: "erro", texto: d.error ?? "Não consegui usar o crédito agora." }); return; }
      setMsg({ tom: "ok", texto: `Guia Sol ativada até ${formatarData(d.guiaAte)}.` });
      await Promise.all([carregar(), refreshProfile()]);
    } catch { setMsg({ tom: "erro", texto: "Sem conexão. Tente de novo." }); } finally { setOcupado(false); }
  }

  if (!ind && !falhou && !isDemo) return <Carregando />;
  const dias = ind?.diasGuia;

  return (
    <div className="flex flex-col">
      <TopBar title="Créditos e indicações" back="/app/perfil" />
      <div className="flex flex-col gap-3 px-5">
        {/* Dias de Guia ganhos por indicação */}
        <section className="flex flex-col gap-1 px-4 py-3.5 rounded-2xl bg-sol-fundo text-white">
          <span className="font-display font-extrabold text-[30px] leading-none text-sol-sun">{plural(dias?.disponiveis ?? 0, "dia", "dias")} de Guia Sol</span>
          <span className="text-[13px] leading-snug">
            {dias?.pendentes ? `Mais ${plural(dias.pendentes, "dia libera", "dias liberam")} em até 24 horas. ` : ""}
            {ind?.guiaAte ? `Guia ativa por crédito até ${formatarData(ind.guiaAte)}.` : "Ganhe dias convidando amigos e use na sua viagem."}
          </span>
          {!!dias?.disponiveis && (
            <button type="button" disabled={ocupado} onClick={() => usar(1)} className="mt-2 self-start min-h-[44px] px-4 rounded-xl bg-sol-sun text-sol-fundo text-sm font-extrabold disabled:opacity-50">
              {ocupado ? "Ativando…" : "Usar 1 dia na minha viagem"}
            </button>
          )}
        </section>
        {msg && <Aviso tom={msg.tom}>{msg.texto}</Aviso>}
        {!!dias?.itens.length && (
          <ul className={`${cartao} m-0 p-4 list-none flex flex-col gap-2 text-[14px]`}>
            {dias.itens.map((c, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span><strong>{plural(c.dias, "dia", "dias")}</strong> · {ORIGEM[c.origem] ?? c.origem}</span>
                <span className="flex-none text-xs text-sol-texto2">{c.liberado ? `vale até ${formatarData(c.expiraEm.slice(0, 10))}` : `libera ${formatarData(c.liberaEm.slice(0, 10))}`}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Convite */}
        {falhou ? (
          <Aviso tom="erro">Não consegui carregar suas indicações agora. Tente de novo em instantes.</Aviso>
        ) : ind?.link ? (
          <section className={`${cartao} flex flex-col gap-3 p-4`}>
            <div>
              <h2 className="m-0 text-base font-extrabold">Convide amigos</h2>
              <p className="m-0 mt-1 text-sm text-sol-texto2">Quem entrar pelo seu link ganha 1 dia de Guia Sol. Você ganha dias quando seus amigos criam o primeiro roteiro.</p>
            </div>
            {qr && <img src={qr} alt="QR Code do seu convite" className="self-center w-44 h-44 rounded-xl border border-sol-linha" />}
            <div className="flex items-center gap-2 p-1.5 pl-3.5 rounded-[14px] bg-sol-areia border border-sol-linha">
              <span className="flex-1 min-w-0 text-[13px] font-bold truncate">{ind.link.replace(/^https?:\/\//, "")}</span>
              <button type="button" onClick={copiar} aria-label="Copiar link do convite" className="flex-none flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-[10px] bg-sol-claro text-sol-claro-texto text-sm font-extrabold">
                <Copy size={15} /> {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>
            <button type="button" onClick={compartilhar} className={btnPrimario}><Share2 size={18} /> Compartilhar convite</button>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-sol-linha text-center">
              <div>
                <p className="m-0 font-display font-extrabold text-2xl">{ind.convidados}</p>
                <p className="m-0 text-xs text-sol-texto2">Entraram pelo seu link</p>
              </div>
              <div>
                <p className="m-0 font-display font-extrabold text-2xl text-sol-ok">{ind.convertidos}</p>
                <p className="m-0 text-xs text-sol-texto2">Criaram um roteiro</p>
              </div>
            </div>
            {ind.embaixador ? (
              <p className="m-0 flex items-center gap-2 text-sm font-extrabold text-sol-ok"><Award size={18} /> Você é Embaixador Sol</p>
            ) : ind.proximoPatamar && (
              <div className="flex flex-col gap-1.5">
                <div className="h-2 rounded-full bg-[#E8DFD0] overflow-hidden" aria-hidden>
                  <div className="h-full bg-sol-sun" style={{ width: `${Math.min(100, (ind.convertidos / ind.proximoPatamar.em) * 100)}%` }} />
                </div>
                <p className="m-0 text-[13px] text-sol-texto2">
                  {plural(ind.proximoPatamar.faltam, "amigo", "amigos")} para {ind.proximoPatamar.dias ? `ganhar ${plural(ind.proximoPatamar.dias, "dia", "dias")} de Guia Sol` : "virar Embaixador Sol"} ({ind.convertidos} de {ind.proximoPatamar.em}).
                </p>
              </div>
            )}
          </section>
        ) : (
          <div className={`${cartao} p-4 text-sm text-sol-texto2`}>Seu link de convite aparece aqui depois que você concluir o cadastro.</div>
        )}

        <section className={`${cartao} flex flex-col gap-2.5 p-4`}>
          <h2 className="m-0 text-base font-extrabold">Como funciona</h2>
          {[
            "Mande seu link ou mostre o QR Code. Seu amigo entra com o WhatsApp dele e ganha 1 dia de Guia Sol.",
            "Conta como convertido quando ele conclui o cadastro e cria o primeiro roteiro com data futura.",
            "3 amigos convertidos: você ganha 1 dia de Guia Sol. 10 amigos: mais 3 dias. 25: Embaixador Sol.",
            `O dia ganho libera em 24 horas e vale por ${ind?.regras.validadeDias ?? 30} dias. Use até ${ind?.regras.maxDiasPorViagem ?? 3} por viagem e ${ind?.regras.maxDiasPorMes ?? 5} por mês.`,
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex-none w-7 h-7 rounded-full bg-sol-claro text-sol-claro-texto text-sm font-extrabold flex items-center justify-center">{i + 1}</span>
              <p className="m-0 text-sm text-sol-fundo pt-1">{t}</p>
            </div>
          ))}
        </section>

        {creditos > 0 && (
          <p className="m-0 text-[13px] text-sol-texto2">Você também tem {plural(creditos, "crédito", "créditos")} de roteiro. <Link to="/app/criar" className="font-bold text-sol-mar">Criar roteiro</Link></p>
        )}
        {!profile?.hasCompanion && <Link to="/app/guia" className={`${btnSecundario} no-underline`}>Conhecer a Guia Sol</Link>}
      </div>
    </div>
  );
}
