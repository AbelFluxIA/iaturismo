import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Check, ChevronLeft, Compass, Heart, MapPin, Phone, Plane, Plus, Shield } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { Aviso, Carregando, Selo, btnPrimario, btnSecundario, cartao, mascararTelefone } from "@/components/app/ui";
import { posicaoAtual } from "@/lib/geo";
import { VERSAO_LOCALIZACAO, pedirPermissaoNativa } from "@/lib/localizacao";
import { ehNativo } from "@/lib/nativo";
import { conviteGuardado, limparConvite } from "@/lib/convite";
import { DESTINOS } from "@/lib/destinos";
import { TIPOS_PASSEIO, hojeISO } from "@/lib/roteiro";
import { BuscaCidade } from "@/components/app/BuscaCidade";

// Cadastro em etapas depois do código (RA-CAD-04 e RA-CAD-05):
// WhatsApp e dados → Termos → Data de nascimento → Localização → Gostos →
// Viagem em mente → Lugares que quer conhecer → Concluído (guia para o 1º roteiro).
// Textos dos termos são o resumo provisório do protótipo, até a revisão jurídica.

export const VERSAO_TERMOS = "termos-rascunho-1";
type Etapa = "dados" | "termos" | "recusa" | "nascimento" | "menor" | "localizacao" | "gostos" | "viagem" | "lugares" | "concluido";
const ETAPAS: Etapa[] = ["dados", "termos", "nascimento", "localizacao", "gostos", "viagem", "lugares"];
const chip = (ativo: boolean) =>
  `flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full border-[1.5px] text-sm font-bold ${ativo ? "bg-sol-fundo text-white border-sol-fundo" : "bg-white text-sol-fundo border-sol-borda"}`;

const RESUMO_TERMOS = [
  "Usamos seu número de WhatsApp para identificar sua conta. Uma conta por número.",
  "Guardamos seus roteiros e os usos da Guia Sol num registro que ninguém altera, por 10 anos.",
  "Você pode pedir a anonimização dos seus dados quando quiser.",
  "A Sol e a Guia Sol são um apoio informativo. Não substituem a orientação de autoridades nem garantem que um lugar ou atividade esteja livre de risco. As informações de segurança e clima vêm de fontes oficiais e podem estar atrasadas ou incompletas.",
];
const USOS_LOCALIZACAO = [
  "Mostrar o tempo e a cidade onde você está",
  "Sugerir destinos perto de você",
  "Mostrar sua posição no mapa do roteiro",
  "Dar respostas de perto na Guia Sol",
  "Enviar sua localização no SOS",
  "Registrar seu trajeto nos dias da viagem, para estatísticas de turismo agregadas e anônimas (nenhum relatório identifica você)",
];

function idade(nasc: string) {
  const [a, m, d] = nasc.split("-").map(Number);
  const hoje = new Date();
  let i = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) i--;
  return i;
}

export default function AppCadastro() {
  const { profile, profileLoading, token, phone, name, isDemo, refreshProfile } = useClientAuth();
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>("dados");
  const [nome, setNome] = useState(name || profile?.name || "");
  const [aceite, setAceite] = useState(false);
  const [data, setData] = useState({ d: "", m: "", a: "" });
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gostos, setGostos] = useState<string[]>([]);
  const [temViagem, setTemViagem] = useState<boolean | null>(null);
  const [viagem, setViagem] = useState({ destino: "", chegada: "", saida: "" });
  const [lugares, setLugares] = useState<string[]>([]);
  const [outroLugar, setOutroLugar] = useState("");
  const camposData = useRef<(HTMLInputElement | null)[]>([]);

  if (isDemo) return <Navigate to="/app" replace />;
  if (profileLoading && !profile) return <div className="min-h-screen bg-sol-areia"><Carregando /></div>;
  if (profile?.cadastro?.concluidoEm && etapa !== "concluido") return <Navigate to="/app" replace />;

  async function enviar(url: string, corpo: object) {
    const concluindo = (corpo as { concluir?: boolean }).concluir === true;
    const r = await fetch(`${API_URL}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      // Ao concluir, manda junto o convite guardado no aparelho (link /convite/CÓDIGO)
      body: JSON.stringify(concluindo && conviteGuardado() ? { ...corpo, convite: conviteGuardado() } : corpo),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "erro");
    if (concluindo) limparConvite();
  }

  async function passo(acao: () => Promise<void>, proxima: Etapa) {
    setErro(null);
    setOcupado(true);
    try { await acao(); setEtapa(proxima); } catch (e) { setErro((e as Error).message === "erro" ? "Não consegui salvar agora. Tente de novo." : (e as Error).message); } finally { setOcupado(false); }
  }

  const nascimento = data.a.length === 4 && data.m && data.d ? `${data.a}-${data.m.padStart(2, "0")}-${data.d.padStart(2, "0")}` : "";
  // Data de verdade (31/02 não passa), no passado e com até 120 anos
  const nascValido = (() => {
    if (!nascimento) return false;
    const t = Date.parse(`${nascimento}T12:00:00Z`);
    if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== nascimento) return false;
    const hoje = new Date().toISOString().slice(0, 10);
    return nascimento < hoje && nascimento > `${new Date().getUTCFullYear() - 120}-01-01`;
  })();
  const n = ETAPAS.indexOf(etapa);
  const voltar = n > 0 ? () => { setErro(null); setEtapa(ETAPAS[n - 1]); } : null;
  const campo = "h-14 w-full min-w-0 box-border px-4 rounded-xl border-[1.5px] border-sol-borda bg-white text-[18px] font-semibold focus:outline-none focus:border-sol-mar";
  // Campo de data: no iPhone o date input tem largura própria e estourava a grade; appearance-none e fonte menor resolvem
  const campoData = "appearance-none h-12 w-full min-w-0 box-border px-3 rounded-xl border-[1.5px] border-sol-borda bg-white text-[15px] font-semibold text-sol-fundo focus:outline-none focus:border-sol-mar [&::-webkit-date-and-time-value]:text-left";

  return (
    <div className="min-h-screen flex flex-col bg-sol-areia font-corpo text-sol-fundo">
      <div className="flex-1 flex flex-col w-full max-w-[430px] mx-auto px-6 pt-8 pb-10">
        {n >= 0 && (
          <div className="flex items-center gap-2 mb-4">
            {voltar ? (
              <button type="button" aria-label="Voltar" onClick={voltar} className="flex items-center justify-center w-11 h-11 -ml-3"><ChevronLeft size={24} /></button>
            ) : <span className="w-8" />}
            <span className="flex-1 text-sm font-bold text-sol-texto2">Etapa {n + 1} de {ETAPAS.length}</span>
          </div>
        )}

        {etapa === "dados" && (
          <>
            <h1 className="m-0 font-display font-extrabold text-[24px] leading-tight">Confira seus dados</h1>
            <label className="mt-5 flex flex-col gap-2"><span className="text-[15px] font-bold">Como podemos te chamar?</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} autoComplete="given-name" className={campo} />
            </label>
            <div className={`${cartao} mt-4 flex items-center gap-3 p-4`}>
              <Phone size={20} className="text-sol-mar" />
              <span className="flex-1 flex flex-col"><span className="text-xs font-bold text-sol-texto2">WhatsApp</span><span className="text-[16px] font-bold">{mascararTelefone(profile?.phone || phone)}</span></span>
              <Selo tom="ok">Verificado</Selo>
            </div>
            {erro && <div className="mt-3"><Aviso tom="erro">{erro}</Aviso></div>}
            <div className="mt-auto pt-8">
              <button type="button" disabled={ocupado || nome.trim().length < 2} onClick={() => passo(() => enviar("/api/app/cadastro", { nome: nome.trim() }), "termos")} className={`${btnPrimario} w-full`}>Continuar</button>
            </div>
          </>
        )}

        {etapa === "termos" && (
          <>
            <h1 className="m-0 font-display font-extrabold text-[24px] leading-tight">Antes de começar</h1>
            <p className="mt-2 mb-0 text-[15px] text-sol-texto2">Um resumo em linguagem simples.</p>
            <ul className={`${cartao} mt-4 mb-0 p-4 pl-8 flex flex-col gap-2.5 text-[15px] leading-snug list-disc`}>
              {RESUMO_TERMOS.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <p className="mt-2 mb-0 text-xs text-sol-texto2">Os textos completos dos termos e da política de privacidade estão em revisão jurídica.</p>
            <label className="mt-4 flex items-start gap-3 min-h-[44px]">
              <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-1 w-5 h-5 accent-[#0B5F8A]" />
              <span className="text-[15px] font-semibold">Li e aceito os termos e a política de privacidade</span>
            </label>
            {erro && <div className="mt-3"><Aviso tom="erro">{erro}</Aviso></div>}
            <div className="mt-auto pt-8 flex flex-col gap-2">
              <button type="button" disabled={ocupado || !aceite} onClick={() => passo(() => enviar("/api/app/consentimento", { tipo: "termos", versao: VERSAO_TERMOS, aceito: true }), "nascimento")} className={`${btnPrimario} w-full`}>Continuar</button>
              <button type="button" onClick={() => setEtapa("recusa")} className="min-h-[44px] text-[15px] font-bold text-sol-texto2">Não aceito</button>
            </div>
          </>
        )}

        {etapa === "recusa" && (
          <>
            <h1 className="m-0 font-display font-extrabold text-[24px] leading-tight">Sem aceite, não dá para criar a conta</h1>
            <p className="mt-3 mb-0 text-[15px] leading-snug text-sol-texto2">Para usar a Sol, é preciso aceitar os termos e a política de privacidade. Você pode ler e decidir com calma.</p>
            <div className={`${cartao} mt-4 p-4 flex flex-col gap-1`}>
              <span className="text-[15px] font-bold">Telefones úteis, sempre disponíveis</span>
              <span className="text-sm text-sol-texto2">190 Polícia · 192 SAMU · 193 Bombeiros</span>
            </div>
            <div className="mt-auto pt-8 flex flex-col gap-2">
              <button type="button" onClick={() => setEtapa("termos")} className={`${btnPrimario} w-full`}>Rever os termos</button>
            </div>
          </>
        )}

        {etapa === "nascimento" && (
          <>
            <h1 className="m-0 font-display font-extrabold text-[24px] leading-tight">Qual é a sua data de nascimento?</h1>
            <p className="mt-2 mb-0 text-[15px] text-sol-texto2">Menores de 18 anos usam a Sol com o cadastro de um responsável.</p>
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)] gap-2">
              {([["d", "Dia", "DD", 2], ["m", "Mês", "MM", 2], ["a", "Ano", "AAAA", 4]] as const).map(([k, rot, ph, max], i) => (
                <label key={k} className="min-w-0 flex flex-col gap-1.5"><span className="text-[13px] font-bold">{rot}</span>
                  <input
                    ref={(el) => { camposData.current[i] = el; }}
                    inputMode="numeric"
                    placeholder={ph}
                    maxLength={max}
                    value={data[k]}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, max);
                      setData({ ...data, [k]: v });
                      // Completou o campo: pula para o próximo (dia → mês → ano)
                      if (v.length === max) camposData.current[i + 1]?.focus();
                    }}
                    onKeyDown={(e) => {
                      // Apagar num campo vazio volta para o anterior
                      if (e.key === "Backspace" && !data[k] && i > 0) { e.preventDefault(); camposData.current[i - 1]?.focus(); }
                    }}
                    onBeforeInput={(e) => {
                      // Teclado do Android não informa a tecla: usa o tipo do evento
                      if ((e.nativeEvent as InputEvent).inputType === "deleteContentBackward" && !data[k] && i > 0) { e.preventDefault(); camposData.current[i - 1]?.focus(); }
                    }}
                    onPaste={(e) => {
                      // Colou a data inteira (08/11/1990 ou 08111990): distribui nos três campos
                      const dig = e.clipboardData.getData("text").replace(/\D/g, "");
                      if (dig.length >= 8) { e.preventDefault(); setData({ d: dig.slice(0, 2), m: dig.slice(2, 4), a: dig.slice(4, 8) }); camposData.current[2]?.focus(); }
                    }}
                    className={`${campo} text-center`}
                  />
                </label>
              ))}
            </div>
            {nascimento && !nascValido && <span className="mt-2 text-sm text-sol-sos">Data inválida</span>}
            {erro && <div className="mt-3"><Aviso tom="erro">{erro}</Aviso></div>}
            <div className="mt-auto pt-8">
              <button
                type="button"
                disabled={ocupado || !nascValido}
                onClick={() => passo(() => enviar("/api/app/cadastro", { nascimento }), idade(nascimento) < 18 ? "menor" : "localizacao")}
                className={`${btnPrimario} w-full`}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {etapa === "menor" && (
          <>
            <h1 className="m-0 font-display font-extrabold text-[24px] leading-tight">Conta restrita</h1>
            <p className="mt-3 mb-0 text-[15px] leading-snug text-sol-texto2">Você tem {idade(nascimento)} anos. Roteiros, Guia Sol e compras ficam liberados depois do cadastro e do aceite do seu responsável. Esse cadastro chega ao app em breve.</p>
            <div className={`${cartao} mt-4 p-4 flex items-center gap-3`}>
              <Shield size={22} className="text-sol-sos" />
              <span className="flex-1 text-[15px]"><strong>SOS e telefones úteis</strong> continuam disponíveis.</span>
            </div>
            <div className="mt-auto pt-8">
              <Link to="/app/seguranca" className={`${btnPrimario} w-full no-underline`}>Ir para Segurança</Link>
            </div>
          </>
        )}

        {etapa === "localizacao" && (
          <>
            <h1 className="m-0 font-display font-extrabold text-[24px] leading-tight">Por que a Sol pede sua localização</h1>
            <p className="mt-2 mb-0 text-[15px] text-sol-texto2">O app funciona sem ela, com menos recursos. Usamos para:</p>
            <ol className={`${cartao} mt-4 mb-0 p-4 pl-8 flex flex-col gap-2 text-[15px] list-decimal`}>
              {USOS_LOCALIZACAO.map((u) => <li key={u}>{u}</li>)}
            </ol>
            <p className="mt-2 mb-0 text-xs text-sol-texto2">
              Só nos dias de uma viagem com roteiro{ehNativo ? ", mesmo com o app fechado. Quando o celular perguntar, escolha \"Permitir o tempo todo\"" : ""}. Você desliga quando quiser em Perfil → Localização.
            </p>
            {erro && <div className="mt-3"><Aviso tom="erro">{erro}</Aviso></div>}
            <div className="mt-auto pt-8 flex flex-col gap-2">
              <button
                type="button"
                disabled={ocupado}
                onClick={() => passo(async () => {
                  await enviar("/api/app/consentimento", { tipo: "localizacao_viagem", versao: VERSAO_LOCALIZACAO, aceito: true });
                  if (ehNativo) await pedirPermissaoNativa(); else await posicaoAtual(15000);
                }, "gostos")}
                className={`${btnPrimario} w-full`}
              >
                <MapPin size={18} /> Permitir
              </button>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => passo(async () => { await enviar("/api/app/consentimento", { tipo: "localizacao_viagem", versao: VERSAO_LOCALIZACAO, aceito: false }); }, "gostos")}
                className={`${btnSecundario} w-full`}
              >
                Agora não
              </button>
            </div>
          </>
        )}

        {etapa === "gostos" && (
          <>
            <h1 className="m-0 font-display font-extrabold text-[24px] leading-tight">O que você mais gosta numa viagem?</h1>
            <p className="mt-2 mb-0 text-[15px] text-sol-texto2">{gostos.length >= 4 ? "Máximo de 4 escolhidos. Desmarque um para trocar." : "Escolha até 4. A Sol usa isso para montar roteiros com a sua cara. Dá para mudar depois em Criar roteiro."}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {TIPOS_PASSEIO.map((t) => {
                const ativo = gostos.includes(t);
                return (
                  <button key={t} type="button" aria-pressed={ativo} aria-disabled={!ativo && gostos.length >= 4} onClick={() => setGostos((g) => ativo ? g.filter((x) => x !== t) : g.length < 4 ? [...g, t] : g)} className={`${chip(ativo)} ${!ativo && gostos.length >= 4 ? "opacity-40" : ""}`}>
                    {ativo && <Heart size={14} fill="currentColor" />}{t}
                  </button>
                );
              })}
            </div>
            {erro && <div className="mt-3"><Aviso tom="erro">{erro}</Aviso></div>}
            <div className="mt-auto pt-8">
              <button
                type="button"
                disabled={ocupado || gostos.length === 0}
                onClick={() => passo(async () => {
                  await enviar("/api/app/cadastro", { gostos });
                  // Vira o padrão de Criar roteiro neste aparelho (RA-ROT-10), se ainda não houver um
                  try { if (!localStorage.getItem("sol_preferencias")) localStorage.setItem("sol_preferencias", JSON.stringify({ tipos: gostos.slice(0, 3), custos: "melhor custo-benefício", quemVai: "sozinho" })); } catch { /* ok */ }
                }, "viagem")}
                className={`${btnPrimario} w-full disabled:opacity-40`}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {etapa === "viagem" && (
          <>
            <h1 className="m-0 font-display font-extrabold text-[24px] leading-tight">Já tem uma viagem em mente?</h1>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" aria-pressed={temViagem === true} onClick={() => setTemViagem(true)} className={`${chip(temViagem === true)} justify-center min-h-[52px] text-[15px]`}><Plane size={18} /> Sim, já sei para onde</button>
              <button type="button" disabled={ocupado} onClick={() => { setTemViagem(false); setErro(null); setEtapa("lugares"); }} className={`${chip(false)} justify-center min-h-[52px] text-[15px]`}>Ainda não</button>
            </div>
            {temViagem && (
              <div className="mt-5 flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-[13px] font-extrabold">Para onde?
                  <BuscaCidade value={viagem.destino} onChange={(destino) => setViagem({ ...viagem, destino })} placeholder="Cidade ou lugar" className={campo} />
                </label>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                  <label className="min-w-0 flex flex-col gap-1 text-[13px] font-extrabold">Chegada (opcional)
                    <input type="date" min={hojeISO()} value={viagem.chegada} onChange={(e) => setViagem({ ...viagem, chegada: e.target.value })} className={campoData} />
                  </label>
                  <label className="min-w-0 flex flex-col gap-1 text-[13px] font-extrabold">Volta (opcional)
                    <input type="date" min={viagem.chegada || hojeISO()} value={viagem.saida} onChange={(e) => setViagem({ ...viagem, saida: e.target.value })} className={campoData} />
                  </label>
                </div>
              </div>
            )}
            {erro && <div className="mt-3"><Aviso tom="erro">{erro}</Aviso></div>}
            {temViagem && (
              <div className="mt-auto pt-8">
                <button
                  type="button"
                  disabled={ocupado || viagem.destino.trim().length < 2}
                  onClick={() => passo(async () => {
                    await enviar("/api/app/cadastro", { viagem: { destino: viagem.destino.trim(), chegada: viagem.chegada || undefined, saida: viagem.saida || viagem.chegada || undefined }, concluir: true });
                    await refreshProfile();
                  }, "concluido")}
                  className={`${btnPrimario} w-full disabled:opacity-40`}
                >
                  Continuar
                </button>
              </div>
            )}
          </>
        )}

        {etapa === "lugares" && (
          <>
            <h1 className="m-0 font-display font-extrabold text-[24px] leading-tight">Quais lugares você tem vontade de conhecer?</h1>
            <p className="mt-2 mb-0 text-[15px] text-sol-texto2">A Sol vai sugerir roteiros e novidades desses lugares. Pode escolher vários ou escrever outro.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[...DESTINOS.map((d) => d.nome), ...lugares.filter((l) => !DESTINOS.some((d) => d.nome === l))].map((nome) => {
                const ativo = lugares.includes(nome);
                return (
                  <button key={nome} type="button" aria-pressed={ativo} onClick={() => setLugares((l) => ativo ? l.filter((x) => x !== nome) : [...l, nome])} className={chip(ativo)}>
                    {ativo && <Compass size={14} />}{nome}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <input value={outroLugar} onChange={(e) => setOutroLugar(e.target.value)} placeholder="Outro lugar" aria-label="Outro lugar" autoComplete="off" className={`${campo} flex-1 !h-12 !text-[15px]`} />
              <button
                type="button"
                aria-label="Adicionar lugar"
                disabled={outroLugar.trim().length < 2}
                onClick={() => { const n = outroLugar.trim(); setLugares((l) => (l.includes(n) ? l : [...l, n])); setOutroLugar(""); }}
                className="flex-none w-12 h-12 rounded-xl bg-sol-fundo text-white flex items-center justify-center disabled:opacity-40"
              >
                <Plus size={20} />
              </button>
            </div>
            {erro && <div className="mt-3"><Aviso tom="erro">{erro}</Aviso></div>}
            <div className="mt-auto pt-8 flex flex-col gap-2">
              <button
                type="button"
                disabled={ocupado}
                onClick={() => passo(async () => { await enviar("/api/app/cadastro", { lugaresDesejados: lugares, viagem: null, concluir: true }); await refreshProfile(); }, "concluido")}
                className={`${btnPrimario} w-full`}
              >
                {lugares.length ? "Continuar" : "Pular"}
              </button>
            </div>
          </>
        )}

        {etapa === "concluido" && (
          <>
            <div className="flex justify-center mt-10"><span className="w-20 h-20 rounded-full bg-sol-ok-claro text-sol-ok flex items-center justify-center"><Check size={40} strokeWidth={3} /></span></div>
            <h1 className="mt-5 mb-0 text-center font-display font-extrabold text-[26px] leading-tight">Cadastro concluído</h1>
            <p className="mt-2 mb-0 text-center text-[15px] text-sol-texto2">
              {temViagem && viagem.destino.trim()
                ? `Tudo pronto, ${nome.split(" ")[0] || "viajante"}. A Sol monta o roteiro de ${viagem.destino.trim()} em um minuto: é só confirmar as datas e quem vai.`
                : `Tudo pronto, ${nome.split(" ")[0] || "viajante"}. Vamos para a sua primeira viagem?`}
            </p>
            <div className="mt-auto pt-8 flex flex-col gap-2">
              {temViagem && viagem.destino.trim() ? (
                <button
                  type="button"
                  onClick={() => navigate(`/app/criar?destino=${encodeURIComponent(viagem.destino.trim())}${viagem.chegada ? `&chegada=${viagem.chegada}&saida=${viagem.saida || viagem.chegada}` : ""}`, { replace: true })}
                  className={`${btnPrimario} w-full`}
                >
                  Montar roteiro para {viagem.destino.trim()}
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => navigate("/app/criar", { replace: true })} className={`${btnPrimario} w-full`}>Criar meu primeiro roteiro</button>
                  {lugares.length > 0 && <button type="button" onClick={() => navigate("/app/destinos", { replace: true })} className={`${btnSecundario} w-full`}>Ver lugares para conhecer</button>}
                </>
              )}
              <button type="button" onClick={() => navigate("/app", { replace: true })} className={`${btnSecundario} w-full`}>Ir para o Início</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
