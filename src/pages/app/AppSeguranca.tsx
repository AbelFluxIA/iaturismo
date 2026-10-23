import { useEffect, useRef, useState } from "react";
import { CloudRain, MapPin, MessageSquare, Pencil, Phone, Plus, Shield, Trash2, X } from "lucide-react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { useViagens } from "@/contexts/ViagensContext";
import { TopBar, TituloSecao, btnPrimario, btnSecundario, cartao } from "@/components/app/ui";
import { geocode, posicaoAtual, previsao, type PrevisaoDia } from "@/lib/geo";
import { hojeISO } from "@/lib/roteiro";

// Segurança: SOS (avisa contatos pelo WhatsApp ou SMS com a localização),
// contatos de emergência, mensagem de socorro, alerta de chuva e telefones.
// Contatos e mensagem ficam guardados neste aparelho.

interface Contato { nome: string; telefone: string; parentesco: string }

const TELEFONES = [
  ["190", "Polícia"], ["192", "SAMU"], ["193", "Bombeiros"], ["199", "Defesa Civil"],
] as const;
const CHAVE_CONTATOS = "sol_contatos_emergencia";
const CHAVE_MENSAGEM = "sol_mensagem_socorro";

function ler<T>(chave: string, padrao: T): T {
  try { const v = localStorage.getItem(chave); return v ? (JSON.parse(v) as T) : padrao; } catch { return padrao; }
}
function gravar(chave: string, valor: unknown) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem armazenamento */ }
}
const soDigitos = (t: string) => t.replace(/\D/g, "");
// Número no formato internacional para WhatsApp/SMS (assume Brasil sem DDI)
const internacional = (t: string) => { const d = soDigitos(t); return d.length <= 11 ? `55${d}` : d; };
const mascarar = (t: string) => { const d = soDigitos(t); return d.length >= 10 ? `+55 ${d.slice(-11, -9)} *****-${d.slice(-4)}` : t; };

export default function AppSeguranca() {
  const { profile, name } = useClientAuth();
  const { atual } = useViagens();
  const nome = (name || profile?.name || "Uma pessoa").split(" ")[0];
  const padraoMsg = `${nome} precisa de ajuda. Localização: [link]. Ligue ou chame ajuda. Enviado pela Sol.`;
  const [contatos, setContatos] = useState<Contato[]>(() => ler(CHAVE_CONTATOS, []));
  const [mensagem, setMensagem] = useState<string>(() => ler(CHAVE_MENSAGEM, padraoMsg));
  const [editandoMsg, setEditandoMsg] = useState(false);
  const [novo, setNovo] = useState<Contato | null>(null);
  const [erroNovo, setErroNovo] = useState<string | null>(null);
  const [sos, setSos] = useState(false);
  const [chuva, setChuva] = useState<PrevisaoDia | null>(null);

  useEffect(() => { gravar(CHAVE_CONTATOS, contatos); }, [contatos]);
  useEffect(() => {
    if (!atual?.destination) return;
    geocode(atual.destination).then(async (c) => {
      if (!c) return;
      const p = await previsao(c, 3);
      setChuva(p?.find((d) => d.data >= hojeISO() && d.chuva >= 60) ?? null);
    });
  }, [atual?.destination]);

  function salvarNovo() {
    if (!novo) return;
    const d = soDigitos(novo.telefone);
    if (novo.nome.trim().length < 2) { setErroNovo("Escreva o nome do contato."); return; }
    if (d.length < 10 || d.length > 13) { setErroNovo("Telefone com DDD, ex.: 83 99999-0000."); return; }
    if (profile?.phone && internacional(d).slice(-8) === soDigitos(profile.phone).slice(-8)) { setErroNovo("Use o telefone de outra pessoa. Este é o seu número."); return; }
    setContatos([...contatos, { nome: novo.nome.trim(), telefone: d, parentesco: novo.parentesco.trim() }]);
    setNovo(null);
    setErroNovo(null);
  }

  if (sos) return <TelaSOS contatos={contatos} mensagem={mensagem} fechar={() => setSos(false)} />;

  return (
    <div className="flex flex-col">
      <TopBar title="Segurança" back="/app" sos={false} />
      <div className="flex flex-col gap-3 px-5">
        <button type="button" onClick={() => setSos(true)} className="flex items-center gap-4 p-[18px] rounded-[20px] bg-sol-sos text-white text-left">
          <span className="flex-none w-16 h-16 rounded-full border-[3px] border-white flex items-center justify-center font-display font-extrabold text-lg">SOS</span>
          <span className="flex flex-col gap-1">
            <span className="text-[17px] font-extrabold">Pedir ajuda</span>
            <span className="text-sm leading-snug text-[#FFE3DF]">Avisa seus contatos com a sua localização e mostra polícia (190) e bombeiros (193).</span>
          </span>
        </button>

        <div className="flex items-baseline justify-between">
          <TituloSecao>Contatos de emergência</TituloSecao>
          <span className="text-[13px] font-bold text-sol-texto2">{contatos.length} de 3</span>
        </div>
        {contatos.length > 0 && (
          <ol className={`${cartao} m-0 p-0 list-none flex flex-col overflow-hidden`}>
            {contatos.map((c, i) => (
              <li key={`${c.telefone}-${i}`} className="flex items-center gap-3 min-h-[60px] px-3.5 border-b border-[#F0E9DD] last:border-b-0">
                <span className="flex-none w-8 h-8 rounded-full bg-sol-fundo text-white flex items-center justify-center text-sm font-extrabold">{i + 1}</span>
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="text-[15px] font-bold truncate">{c.nome}</span>
                  <span className="text-[13px] text-sol-texto2">{[c.parentesco, mascarar(c.telefone)].filter(Boolean).join(" · ")}</span>
                </span>
                <button type="button" aria-label={`Remover ${c.nome}`} onClick={() => setContatos(contatos.filter((_, j) => j !== i))} className="flex-none w-11 h-11 flex items-center justify-center text-sol-texto2">
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ol>
        )}
        {novo ? (
          <div className={`${cartao} flex flex-col gap-2.5 p-4`}>
            <span className="text-[15px] font-extrabold">Novo contato</span>
            {([["nome", "Nome", "text"], ["telefone", "Telefone com DDD", "tel"], ["parentesco", "Parentesco (opcional)", "text"]] as const).map(([k, rot, tipo]) => (
              <label key={k} className="flex flex-col gap-1">
                <span className="text-[13px] font-bold">{rot}</span>
                <input type={tipo} value={novo[k]} onChange={(e) => setNovo({ ...novo, [k]: e.target.value })} className="h-12 px-3.5 rounded-xl border-[1.5px] border-sol-borda bg-white text-[15px] focus:outline-none focus:border-sol-mar" />
              </label>
            ))}
            {erroNovo && <span role="status" className="text-sm text-sol-sos">{erroNovo}</span>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setNovo(null); setErroNovo(null); }} className={btnSecundario}>Cancelar</button>
              <button type="button" onClick={salvarNovo} className={btnPrimario}>Salvar</button>
            </div>
          </div>
        ) : contatos.length < 3 ? (
          <button type="button" onClick={() => setNovo({ nome: "", telefone: "", parentesco: "" })} className={btnSecundario}>
            <Plus size={18} /> Adicionar contato
          </button>
        ) : null}
        <p className="m-0 text-xs text-sol-texto2">Até 3 pessoas de confiança. Os contatos ficam guardados neste celular.</p>

        <TituloSecao>Mensagem de socorro</TituloSecao>
        {editandoMsg ? (
          <div className={`${cartao} flex flex-col gap-2 p-3`}>
            <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} maxLength={300} className="min-h-[96px] resize-none p-2 text-[15px] focus:outline-none" />
            <span className="text-xs text-sol-texto2">"[link]" vira o link da sua localização na hora do envio.</span>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMensagem(padraoMsg)} className={btnSecundario}>Texto padrão</button>
              <button type="button" onClick={() => { gravar(CHAVE_MENSAGEM, mensagem); setEditandoMsg(false); }} className={btnPrimario}>Salvar</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setEditandoMsg(true)} className={`${cartao} flex items-start gap-3 p-3.5 text-left`}>
            <MessageSquare size={20} className="flex-none mt-0.5 text-sol-mar" />
            <span className="flex-1 text-sm leading-snug">{mensagem}</span>
            <Pencil size={16} className="flex-none text-sol-texto2" />
          </button>
        )}

        <TituloSecao>Alertas de risco</TituloSecao>
        {chuva ? (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-sol-atencao border-[1.5px] border-sol-atencao-borda text-sol-atencao-texto text-sm leading-snug">
            <CloudRain size={20} className="flex-none" />
            <span><strong>Chuva</strong> · {chuva.chuva}% de chance {chuva.data === hojeISO() ? "hoje" : "nos próximos dias"} em {atual?.destination}. Em emergência, ligue 193 ou 199.<span className="block text-xs opacity-80">Fonte: previsão Open-Meteo</span></span>
          </div>
        ) : (
          <p className={`${cartao} m-0 p-3.5 text-sm text-sol-texto2`}>{atual ? `Sem previsão de chuva forte em ${atual.destination} nos próximos dias.` : "Os alertas aparecem quando você tem uma viagem marcada."}</p>
        )}
        <p className="m-0 text-xs text-sol-texto2">Alertas oficiais da Defesa Civil e do INMET chegam em breve.</p>

        <TituloSecao>Telefones úteis</TituloSecao>
        <div className="grid grid-cols-2 gap-2">
          {TELEFONES.map(([n, nomeTel]) => (
            <a key={n} href={`tel:${n}`} className={`${cartao} flex items-center gap-2.5 min-h-[56px] px-3.5 text-sol-fundo no-underline`}>
              <Phone size={18} className="text-sol-sos" />
              <span className="flex flex-col"><span className="font-display font-extrabold text-lg leading-none">{n}</span><span className="text-xs text-sol-texto2">{nomeTel}</span></span>
            </a>
          ))}
        </div>
        <p className="m-0 text-[13px] leading-snug text-sol-texto2">
          A Sol e a Guia Sol são um apoio informativo. Não prestam atendimento de emergência, não enviam socorro e não substituem a orientação de autoridades.
        </p>
      </div>
    </div>
  );
}

// SOS: segura 2 segundos, pega a localização e abre a mensagem pronta para cada contato
function TelaSOS({ contatos, mensagem, fechar }: { contatos: Contato[]; mensagem: string; fechar: () => void }) {
  const [progresso, setProgresso] = useState(0);
  const [pronto, setPronto] = useState<string | null>(null); // mensagem final com o link
  const [buscando, setBuscando] = useState(false);
  const timer = useRef<number | null>(null);

  const soltar = () => { if (timer.current) { window.clearInterval(timer.current); timer.current = null; } if (!pronto && !buscando) setProgresso(0); };
  const segurar = () => {
    if (pronto || buscando) return;
    const inicio = Date.now();
    timer.current = window.setInterval(async () => {
      const p = Math.min(1, (Date.now() - inicio) / 2000);
      setProgresso(p);
      if (p >= 1) {
        soltar();
        setBuscando(true);
        const c = await posicaoAtual(8000);
        const link = c ? `https://maps.google.com/?q=${c.lat.toFixed(6)},${c.lng.toFixed(6)}` : "(localização indisponível)";
        setPronto(mensagem.includes("[link]") ? mensagem.replace("[link]", link) : `${mensagem} ${link}`);
        setBuscando(false);
      }
    }, 50);
  };
  useEffect(() => () => soltar(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-6 pb-1.5">
        <Shield size={22} className="text-sol-sos" />
        <h1 className="flex-1 m-0 font-display font-extrabold text-[22px]">SOS</h1>
        <button type="button" onClick={fechar} className="flex items-center gap-1 min-h-[44px] px-3 font-bold text-sol-fundo"><X size={18} /> Cancelar</button>
      </div>
      <div className="flex flex-col gap-3 px-5">
        <p className="m-0 text-sm leading-snug text-sol-texto2">O SOS prepara a mensagem com a sua localização para seus contatos e mostra os telefones da polícia e dos bombeiros. A Sol não presta atendimento de emergência nem envia socorro.</p>

        {!pronto ? (
          <>
            <button
              type="button"
              onPointerDown={segurar}
              onPointerUp={soltar}
              onPointerLeave={soltar}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); segurar(); } }}
              onKeyUp={soltar}
              aria-label="Segure por 2 segundos para preparar o aviso aos contatos"
              className="relative self-center w-52 h-52 rounded-full bg-sol-sos text-white flex flex-col items-center justify-center gap-1 select-none touch-none shadow-[0_8px_24px_rgba(180,35,24,0.35)]"
            >
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden>
                <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="4" />
                <circle cx="50" cy="50" r="47" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray={`${progresso * 295} 295`} />
              </svg>
              <span className="font-display font-extrabold text-2xl">{buscando ? "Localizando..." : "Avisar"}</span>
              <span className="text-sm">meus contatos</span>
            </button>
            <p className="m-0 text-center text-sm text-sol-texto2">Segure por 2 segundos. Soltou antes? Nada acontece.</p>
          </>
        ) : (
          <>
            <div className="p-3.5 rounded-2xl bg-white border border-sol-linha text-sm leading-snug"><MapPin size={16} className="inline mr-1 text-sol-sos" />{pronto}</div>
            {contatos.length === 0 ? (
              <p className="m-0 text-sm text-sol-texto2">Você ainda não tem contatos de emergência. Cadastre na tela de Segurança.</p>
            ) : (
              contatos.map((c, i) => (
                <div key={i} className={`${cartao} flex flex-col gap-2 p-3.5`}>
                  <span className="text-[15px] font-bold">{i + 1}. {c.nome}</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <a href={`https://wa.me/${internacional(c.telefone)}?text=${encodeURIComponent(pronto)}`} target="_blank" rel="noopener noreferrer" className={`${btnPrimario} !min-h-[44px] !text-sm !px-2 no-underline`}>WhatsApp</a>
                    <a href={`sms:+${internacional(c.telefone)}?&body=${encodeURIComponent(pronto)}`} className={`${btnSecundario} !min-h-[44px] !text-sm !px-2 no-underline`}>SMS</a>
                    <a href={`tel:+${internacional(c.telefone)}`} className={`${btnSecundario} !min-h-[44px] !text-sm !px-2 no-underline`}>Ligar</a>
                  </div>
                </div>
              ))
            )}
            <p className="m-0 text-xs text-sol-texto2">Toque em WhatsApp ou SMS: a mensagem abre pronta e você só confirma o envio.</p>
          </>
        )}

        <div className="grid grid-cols-2 gap-2">
          <a href="tel:190" className="flex items-center justify-center gap-2 min-h-[56px] rounded-2xl bg-sol-sos text-white font-extrabold no-underline"><Phone size={18} /> Polícia 190</a>
          <a href="tel:193" className="flex items-center justify-center gap-2 min-h-[56px] rounded-2xl bg-sol-sos text-white font-extrabold no-underline"><Phone size={18} /> Bombeiros 193</a>
        </div>
      </div>
    </div>
  );
}
