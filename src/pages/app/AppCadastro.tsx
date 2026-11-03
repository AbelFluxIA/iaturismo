import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Check, ChevronLeft, MapPin, Phone, Shield } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { Aviso, Carregando, Selo, btnPrimario, btnSecundario, cartao, mascararTelefone } from "@/components/app/ui";
import { posicaoAtual } from "@/lib/geo";

// Cadastro em etapas depois do código (RA-CAD-04 e RA-CAD-05):
// WhatsApp e dados → Termos → Data de nascimento → Localização → Concluído.
// Textos dos termos são o resumo provisório do protótipo, até a revisão jurídica.

export const VERSAO_TERMOS = "termos-rascunho-1";
type Etapa = "dados" | "termos" | "recusa" | "nascimento" | "menor" | "localizacao" | "concluido";
const ETAPAS: Etapa[] = ["dados", "termos", "nascimento", "localizacao"];

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

  if (isDemo) return <Navigate to="/app" replace />;
  if (profileLoading && !profile) return <div className="min-h-screen bg-sol-areia"><Carregando /></div>;
  if (profile?.cadastro?.concluidoEm && etapa !== "concluido") return <Navigate to="/app" replace />;

  async function enviar(url: string, corpo: object) {
    const r = await fetch(`${API_URL}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(corpo),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "erro");
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
              {([["d", "Dia", "DD", 2], ["m", "Mês", "MM", 2], ["a", "Ano", "AAAA", 4]] as const).map(([k, rot, ph, max]) => (
                <label key={k} className="min-w-0 flex flex-col gap-1.5"><span className="text-[13px] font-bold">{rot}</span>
                  <input inputMode="numeric" placeholder={ph} maxLength={max} value={data[k]} onChange={(e) => setData({ ...data, [k]: e.target.value.replace(/\D/g, "") })} className={`${campo} text-center`} />
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
            <ol className={`${cartao} mt-4 mb-0 p-4 pl-8 flex flex-col gap-2 text-[15px]`}>
              {USOS_LOCALIZACAO.map((u) => <li key={u}>{u}</li>)}
            </ol>
            <p className="mt-2 mb-0 text-xs text-sol-texto2">Guardar o trajeto durante a viagem é outra escolha, que você liga ou não em Perfil.</p>
            {erro && <div className="mt-3"><Aviso tom="erro">{erro}</Aviso></div>}
            <div className="mt-auto pt-8 flex flex-col gap-2">
              <button
                type="button"
                disabled={ocupado}
                onClick={() => passo(async () => { await posicaoAtual(15000); await enviar("/api/app/cadastro", { concluir: true }); await refreshProfile(); }, "concluido")}
                className={`${btnPrimario} w-full`}
              >
                <MapPin size={18} /> Permitir
              </button>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => passo(async () => { await enviar("/api/app/cadastro", { concluir: true }); await refreshProfile(); }, "concluido")}
                className={`${btnSecundario} w-full`}
              >
                Agora não
              </button>
            </div>
          </>
        )}

        {etapa === "concluido" && (
          <>
            <div className="flex justify-center mt-10"><span className="w-20 h-20 rounded-full bg-sol-ok-claro text-sol-ok flex items-center justify-center"><Check size={40} strokeWidth={3} /></span></div>
            <h1 className="mt-5 mb-0 text-center font-display font-extrabold text-[26px] leading-tight">Cadastro concluído</h1>
            <p className="mt-2 mb-0 text-center text-[15px] text-sol-texto2">Tudo pronto, {nome.split(" ")[0] || "viajante"}. Vamos para a sua primeira viagem?</p>
            <div className="mt-auto pt-8 flex flex-col gap-2">
              <button type="button" onClick={() => navigate("/app/criar", { replace: true })} className={`${btnPrimario} w-full`}>Criar meu primeiro roteiro</button>
              <button type="button" onClick={() => navigate("/app", { replace: true })} className={`${btnSecundario} w-full`}>Ir para o Início</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
