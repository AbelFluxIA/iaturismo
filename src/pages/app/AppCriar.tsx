import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronRight, MessageCircle, Minus, Pencil, Plus, Sparkles, SlidersHorizontal } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { useViagens } from "@/contexts/ViagensContext";
import { Aviso, TopBar, btnPrimario, btnSecundario, cartao, formatarData } from "@/components/app/ui";
import { CAPITAL, DESTINOS } from "@/lib/destinos";
import { distanciaKm, posicaoSePermitida } from "@/lib/geo";
import { hojeISO } from "@/lib/roteiro";

// Criar roteiro pelo app: destino → dados → hospedagem → revisão → gerando.
// O pedido vai para o bot (/api/app/roteiros/criar), que gera em segundo plano.

type Etapa = "inicio" | "dados" | "hospedagem" | "revisao" | "gerando";
type QuemVai = "sozinho" | "casal" | "família" | "amigos";
type Custos = "econômico" | "melhor custo-benefício" | "conforto";

interface Rascunho {
  destino: string;
  chegada: string;
  horaChegada: string;
  saida: string;
  horaVolta: string;
  quemVai: QuemVai;
  pessoas: number;
  criancas: number;
  tipos: string[];
  custos: Custos;
  temHospedagem: "sim" | "nao" | null;
  hospedagem: string;
}

const TIPOS = ["Natureza (praia)", "Gastronomia", "Cultura e história", "Aventura", "Compras", "Vida noturna", "Bem-estar", "Com crianças"];
const QUEM: [QuemVai, string][] = [["sozinho", "Sozinho"], ["casal", "Casal"], ["família", "Família"], ["amigos", "Amigos"]];
const CUSTOS: [Custos, string][] = [["econômico", "Econômico"], ["melhor custo-benefício", "Melhor custo-benefício"], ["conforto", "Conforto"]];
const CHAVE = "sol_rascunho_roteiro";

const somarDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function daquiAUmaHora() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${d.getMinutes() < 30 ? "00" : "30"}`;
}

// Tipos de passeio já usados nos roteiros anteriores ("foco em X, Y, orçamento ...")
function tiposDoPerfil(perfil: string | null | undefined) {
  const m = perfil?.match(/foco em ([^|]+?)(?:, orçamento|\||$)/i);
  const achados = m ? TIPOS.filter((t) => m[1].toLowerCase().includes(t.toLowerCase().split(" ")[0])) : [];
  return achados.length ? achados.slice(0, 3) : ["Natureza (praia)", "Gastronomia"];
}

function padrao(destino: string, perfil?: string | null): Rascunho {
  const hoje = hojeISO();
  return {
    destino,
    chegada: hoje,
    horaChegada: daquiAUmaHora(),
    saida: somarDias(hoje, 1),
    horaVolta: "22:00",
    quemVai: "sozinho",
    pessoas: 2,
    criancas: 1,
    tipos: tiposDoPerfil(perfil),
    custos: "melhor custo-benefício",
    temHospedagem: null,
    hospedagem: "",
  };
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full border-[1.5px] text-sm font-bold ${
        ativo ? "bg-sol-fundo text-white border-sol-fundo" : "bg-white text-sol-fundo border-sol-borda"
      }`}
    >
      {ativo && <Check size={15} strokeWidth={3} />}{children}
    </button>
  );
}

const rotuloCampo = "text-[13px] font-extrabold";
const campo = "h-12 w-full box-border px-3.5 rounded-xl border-[1.5px] border-sol-borda bg-white text-[15px] text-sol-fundo focus:outline-none focus:border-sol-mar";

export default function AppCriar() {
  const { profile, token, isDemo } = useClientAuth();
  const { recarregar } = useViagens();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [etapa, setEtapa] = useState<Etapa>("inicio");
  const [r, setR] = useState<Rascunho>(() => {
    const vindo = params.get("destino");
    try {
      const salvo = JSON.parse(sessionStorage.getItem(CHAVE) || "null") as Rascunho | null;
      if (salvo && (!vindo || salvo.destino === vindo)) return salvo;
    } catch { /* sem rascunho */ }
    return padrao(vindo ?? "", profile?.touristProfile);
  });
  const set = (p: Partial<Rascunho>) => setR((x) => ({ ...x, ...p }));
  useEffect(() => { try { sessionStorage.setItem(CHAVE, JSON.stringify(r)); } catch { /* ok */ } }, [r]);
  useEffect(() => { window.scrollTo(0, 0); }, [etapa]);

  const gratis = profile?.ofertas?.gratisDuranteTeste;
  const creditos = profile?.freeCredits ?? 0;
  const cota = gratis ? "Roteiros grátis durante o teste." : creditos > 0 ? `Usa 1 dos seus ${creditos} roteiros grátis.` : "Sem roteiros grátis: a Sol envia o link de pagamento antes de gerar.";

  // ─── Gerando ───
  const [gerando, setGerando] = useState<{ estado: "enviando" | "esperando" | "pronto" | "pagar" | "demorou" | "erro"; id?: string; texto?: string }>({ estado: "enviando" });
  const cancelado = useRef(false);
  useEffect(() => () => { cancelado.current = true; }, []);

  async function gerar() {
    setEtapa("gerando");
    setGerando({ estado: "enviando" });
    if (isDemo) {
      await new Promise((ok) => setTimeout(ok, 1800));
      setGerando({ estado: "pronto", id: "demo" });
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/app/roteiros/criar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          destino: r.destino,
          chegada: r.chegada,
          saida: r.saida,
          horaChegada: r.horaChegada,
          horaVolta: r.horaVolta,
          quemVai: r.quemVai,
          pessoas: r.quemVai === "amigos" ? r.pessoas : undefined,
          criancas: r.quemVai === "família" ? r.criancas : undefined,
          tipos: r.tipos,
          custos: r.custos,
          hospedagem: r.temHospedagem === "sim" ? r.hospedagem : undefined,
        }),
      });
      if (res.status === 404) {
        // Bot antigo: pede pela conversa
        navigate(`/app/chat?texto=${encodeURIComponent(`Quero um roteiro para ${r.destino}, de ${formatarData(r.chegada)} a ${formatarData(r.saida)}, ${r.quemVai}, foco em ${r.tipos.join(", ")}.`)}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setGerando({ estado: "erro", texto: data.error }); return; }
      const reply: string = data.reply ?? "";
      const link = reply.match(/https?:\/\/\S+/)?.[0];
      if (link && /pag|abacate|R\$/i.test(reply)) { setGerando({ estado: "pagar", texto: link }); return; }
      setGerando({ estado: "esperando" });
      const antes = Number(data.roteirosAntes ?? 0);
      const inicio = Date.now();
      while (!cancelado.current && Date.now() - inicio < 4 * 60 * 1000) {
        await new Promise((ok) => setTimeout(ok, 6000));
        const lista = await recarregar();
        if (lista.length > antes) {
          try { sessionStorage.removeItem(CHAVE); } catch { /* ok */ }
          setGerando({ estado: "pronto", id: lista[0].id });
          return;
        }
      }
      if (!cancelado.current) setGerando({ estado: "demorou" });
    } catch {
      setGerando({ estado: "erro" });
    }
  }

  // ─── Telas ───
  if (etapa === "gerando") {
    return (
      <div className="flex flex-col">
        <TopBar title="Gerando seu roteiro" back="/app" />
        <div className="flex flex-col items-center text-center gap-4 px-6 pt-10">
          {(gerando.estado === "enviando" || gerando.estado === "esperando") && (
            <>
              <div className="w-20 h-20 rounded-full border-[6px] border-sol-creme border-t-sol-sun animate-spin" aria-hidden />
              <h2 className="m-0 font-display font-extrabold text-2xl">Montando {r.destino}</h2>
              <p className="m-0 text-[15px] text-sol-texto2 max-w-[300px]">
                {formatarData(r.chegada)} a {formatarData(r.saida)}. A Sol consulta o clima e os lugares abertos. Leva de 1 a 2 minutos.
              </p>
              <Link to="/app" className={`${btnSecundario} w-full no-underline`}>Continuar em segundo plano</Link>
              <p className="m-0 text-xs text-sol-texto2">O roteiro aparece em Meus roteiros e no chat quando ficar pronto.</p>
            </>
          )}
          {gerando.estado === "pronto" && (
            <>
              <div className="w-20 h-20 rounded-full bg-sol-ok-claro text-sol-ok flex items-center justify-center"><Check size={40} strokeWidth={3} /></div>
              <h2 className="m-0 font-display font-extrabold text-2xl">Seu roteiro está pronto</h2>
              <button type="button" onClick={() => navigate(`/app/roteiro?id=${encodeURIComponent(gerando.id ?? "")}`)} className={`${btnPrimario} w-full`}>Abrir roteiro</button>
              {!profile?.hasCompanion && <Link to="/app/guia" className={`${btnSecundario} w-full no-underline`}>Conhecer a Guia Sol</Link>}
            </>
          )}
          {gerando.estado === "pagar" && (
            <>
              <h2 className="m-0 font-display font-extrabold text-2xl">Falta liberar o roteiro</h2>
              <p className="m-0 text-[15px] text-sol-texto2">Seus roteiros grátis acabaram. Depois do pagamento, a Sol gera e o roteiro aparece aqui.</p>
              <a href={gerando.texto} target="_blank" rel="noopener noreferrer" className={`${btnPrimario} w-full !bg-sol-sun !text-sol-fundo no-underline`}>Pagar e liberar</a>
              <Link to="/app/roteiro" className={`${btnSecundario} w-full no-underline`}>Agora não</Link>
            </>
          )}
          {gerando.estado === "demorou" && (
            <>
              <h2 className="m-0 font-display font-extrabold text-2xl">Está demorando um pouco</h2>
              <p className="m-0 text-[15px] text-sol-texto2">A Sol continua montando. O roteiro aparece em Meus roteiros e no chat assim que ficar pronto.</p>
              <Link to="/app/roteiro" className={`${btnPrimario} w-full no-underline`}>Ir para Meus roteiros</Link>
            </>
          )}
          {gerando.estado === "erro" && (
            <>
              <h2 className="m-0 font-display font-extrabold text-2xl">Não consegui pedir agora</h2>
              <p className="m-0 text-[15px] text-sol-texto2">{gerando.texto ?? "Confira sua internet."} Nada foi cobrado.</p>
              <button type="button" onClick={gerar} className={`${btnPrimario} w-full`}>Tentar de novo</button>
              <button type="button" onClick={() => setEtapa("revisao")} className={`${btnSecundario} w-full`}>Revisar o pedido</button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (etapa === "inicio") return <Inicio r={r} set={set} cota={cota} irPara={setEtapa} rapido={() => { set({ ...padrao(r.destino, profile?.touristProfile), destino: r.destino }); setEtapa("revisao"); }} />;

  if (etapa === "dados") {
    const valido = r.destino.trim().length >= 2 && r.chegada && r.saida && r.saida >= r.chegada && r.tipos.length > 0;
    return (
      <div className="flex flex-col">
        <TopBar title="Dados desta viagem" step="Criar roteiro" aoVoltar={() => setEtapa("inicio")} />
        <div className="flex flex-col gap-4 px-5">
          <label className="flex flex-col gap-1.5"><span className={rotuloCampo}>Destino</span>
            <input className={campo} value={r.destino} onChange={(e) => set({ destino: e.target.value })} list="sol-destinos" />
          </label>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <label className="flex flex-col gap-1.5"><span className={rotuloCampo}>Chegada</span>
              <input type="date" className={campo} value={r.chegada} min={hojeISO()} onChange={(e) => set({ chegada: e.target.value, saida: r.saida < e.target.value ? e.target.value : r.saida })} />
            </label>
            <label className="flex flex-col gap-1.5"><span className={rotuloCampo}>Hora</span>
              <input type="time" className={campo} value={r.horaChegada} onChange={(e) => set({ horaChegada: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5"><span className={rotuloCampo}>Volta</span>
              <input type="date" className={campo} value={r.saida} min={r.chegada} onChange={(e) => set({ saida: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5"><span className={rotuloCampo}>Hora</span>
              <input type="time" className={campo} value={r.horaVolta} onChange={(e) => set({ horaVolta: e.target.value })} />
            </label>
          </div>

          <fieldset className="flex flex-col gap-2 border-0 p-0 m-0"><legend className={`${rotuloCampo} mb-2`}>Quem vai com você</legend>
            <div className="flex flex-wrap gap-2">{QUEM.map(([v, l]) => <Chip key={v} ativo={r.quemVai === v} onClick={() => set({ quemVai: v })}>{l}</Chip>)}</div>
            {(r.quemVai === "família" || r.quemVai === "amigos") && (
              <div className="flex items-center gap-3 mt-1">
                <span className="flex-1 text-sm">{r.quemVai === "família" ? "Crianças (até 12 anos)" : "Pessoas no grupo"}</span>
                {(() => {
                  const k = r.quemVai === "família" ? "criancas" : "pessoas";
                  const v = r[k];
                  const min = k === "criancas" ? 0 : 2;
                  return (
                    <span className="flex items-center gap-2">
                      <button type="button" aria-label="Menos" onClick={() => set({ [k]: Math.max(min, v - 1) } as Partial<Rascunho>)} className="w-11 h-11 rounded-full border-[1.5px] border-sol-borda bg-white flex items-center justify-center"><Minus size={18} /></button>
                      <span className="w-6 text-center font-extrabold">{v}</span>
                      <button type="button" aria-label="Mais" onClick={() => set({ [k]: Math.min(k === "criancas" ? 6 : 20, v + 1) } as Partial<Rascunho>)} className="w-11 h-11 rounded-full border-[1.5px] border-sol-borda bg-white flex items-center justify-center"><Plus size={18} /></button>
                    </span>
                  );
                })()}
              </div>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-2 border-0 p-0 m-0"><legend className={`${rotuloCampo} mb-2`}>Tipo do roteiro · {r.tipos.length} de 3</legend>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map((t) => {
                const ativo = r.tipos.includes(t);
                return (
                  <Chip key={t} ativo={ativo} onClick={() => set({ tipos: ativo ? r.tipos.filter((x) => x !== t) : r.tipos.length < 3 ? [...r.tipos, t] : r.tipos })}>{t}</Chip>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2 border-0 p-0 m-0"><legend className={`${rotuloCampo} mb-2`}>Perfil de custos</legend>
            <div className="flex flex-wrap gap-2">{CUSTOS.map(([v, l]) => <Chip key={v} ativo={r.custos === v} onClick={() => set({ custos: v })}>{l}</Chip>)}</div>
          </fieldset>

          <button type="button" disabled={!valido} onClick={() => setEtapa("hospedagem")} className={btnPrimario}>Continuar</button>
          {!valido && <span className="text-xs text-sol-texto2 -mt-2">Preencha destino, datas e pelo menos um tipo de roteiro.</span>}
        </div>
        <ListaDestinos />
      </div>
    );
  }

  if (etapa === "hospedagem") {
    return (
      <div className="flex flex-col">
        <TopBar title="Você já tem hospedagem?" step="Criar roteiro" aoVoltar={() => setEtapa("dados")} />
        <div className="flex flex-col gap-3 px-5">
          <div className="grid grid-cols-2 gap-2">
            <Chip ativo={r.temHospedagem === "sim"} onClick={() => set({ temHospedagem: "sim" })}>Já tenho</Chip>
            <Chip ativo={r.temHospedagem === "nao"} onClick={() => set({ temHospedagem: "nao", hospedagem: "" })}>Ainda não tenho</Chip>
          </div>
          {r.temHospedagem === "sim" && (
            <label className="flex flex-col gap-1.5"><span className={rotuloCampo}>Onde você vai ficar</span>
              <input className={campo} value={r.hospedagem} placeholder="Nome do hotel, pousada ou bairro" onChange={(e) => set({ hospedagem: e.target.value })} />
            </label>
          )}
          {r.temHospedagem === "nao" && (
            <Aviso>A Sol monta o roteiro sem ponto de partida fixo. Se quiser sugestões de hospedagem, peça no chat depois.</Aviso>
          )}
          <button type="button" disabled={!r.temHospedagem || (r.temHospedagem === "sim" && !r.hospedagem.trim())} onClick={() => setEtapa("revisao")} className={btnPrimario}>Ir à revisão</button>
        </div>
      </div>
    );
  }

  // Revisão
  const linhas: [string, string, Etapa][] = [
    ["Destino", r.destino || "Escolha o destino", "inicio"],
    ["Chegada", `${formatarData(r.chegada, { weekday: "short", day: "2-digit", month: "2-digit" })}, ${r.horaChegada}`, "dados"],
    ["Volta", `${formatarData(r.saida, { weekday: "short", day: "2-digit", month: "2-digit" })}, ${r.horaVolta}`, "dados"],
    ["Quem vai", r.quemVai === "família" ? `Família · ${r.criancas} ${r.criancas === 1 ? "criança" : "crianças"}` : r.quemVai === "amigos" ? `Amigos · ${r.pessoas} pessoas` : r.quemVai === "casal" ? "Casal" : "Sozinho", "dados"],
    ["Tipos", r.tipos.join(", "), "dados"],
    ["Custos", CUSTOS.find(([v]) => v === r.custos)?.[1] ?? r.custos, "dados"],
    ["Hospedagem", r.temHospedagem === "sim" ? r.hospedagem : "Sem hospedagem definida", "hospedagem"],
  ];
  return (
    <div className="flex flex-col">
      <TopBar title="Revisão" step="Criar roteiro" aoVoltar={() => setEtapa("inicio")} />
      <div className="flex flex-col gap-3 px-5">
        <div className={`${cartao} flex flex-col overflow-hidden`}>
          {linhas.map(([rot, val, et]) => (
            <button key={rot} type="button" onClick={() => setEtapa(et)} className="flex items-center gap-3 min-h-[56px] px-4 py-2 border-b border-[#F0E9DD] last:border-b-0 text-left">
              <span className="flex-none w-24 text-[13px] font-extrabold text-sol-texto2">{rot}</span>
              <span className="flex-1 text-[15px] font-semibold">{val}</span>
              <Pencil size={16} className="flex-none text-sol-texto2" />
            </button>
          ))}
        </div>
        <Aviso>{cota}</Aviso>
        <button type="button" disabled={r.destino.trim().length < 2 || r.saida < r.chegada} onClick={gerar} className={btnPrimario}>
          <Sparkles size={18} /> Gerar roteiro
        </button>
        <button type="button" onClick={() => setEtapa("inicio")} className={btnSecundario}>Outro destino</button>
      </div>
    </div>
  );
}

function ListaDestinos() {
  return (
    <datalist id="sol-destinos">
      {DESTINOS.map((d) => <option key={d.slug} value={`${d.nome} - PB`} />)}
    </datalist>
  );
}

function Inicio({ r, set, cota, irPara, rapido }: {
  r: Rascunho;
  set: (p: Partial<Rascunho>) => void;
  cota: string;
  irPara: (e: Etapa) => void;
  rapido: () => void;
}) {
  const [perto, setPerto] = useState(DESTINOS.slice(0, 4));
  useEffect(() => {
    posicaoSePermitida().then((c) => {
      const origem = c ?? CAPITAL;
      setPerto([...DESTINOS].sort((a, b) => distanciaKm(origem, a) - distanciaKm(origem, b)).slice(0, 4));
    });
  }, []);
  const temDestino = r.destino.trim().length >= 2;

  return (
    <div className="flex flex-col">
      <TopBar title="Criar roteiro" back="/app" />
      <div className="flex flex-col gap-3 px-5">
        <label className="flex flex-col gap-1.5">
          <span className="font-display font-extrabold text-xl">Para onde você vai?</span>
          <input className={campo} value={r.destino} placeholder="Cidade da Paraíba ou outro destino" onChange={(e) => set({ destino: e.target.value })} list="sol-destinos" />
        </label>
        <ListaDestinos />
        <div className="flex flex-wrap gap-2">
          {perto.map((d) => (
            <Chip key={d.slug} ativo={r.destino === `${d.nome} - PB`} onClick={() => set({ destino: `${d.nome} - PB` })}>{d.nome}</Chip>
          ))}
        </div>
        <Link to="/app/destinos" className="flex items-center gap-1 text-sm font-bold text-sol-mar no-underline">Ver destinos sugeridos <ChevronRight size={16} /></Link>

        <h2 className="m-0 mt-1 text-base font-extrabold">Como você quer montar?</h2>
        {[
          { titulo: "Roteiro rápido", texto: "A Sol completa com padrões: sai em 1 hora, volta amanhã às 22h, sozinho. Você revisa antes de gerar.", Icon: Sparkles, acao: rapido },
          { titulo: "Personalizar", texto: "Escolha datas, quem vai, tipos de passeio e custos.", Icon: SlidersHorizontal, acao: () => irPara("dados") },
        ].map(({ titulo, texto, Icon, acao }) => (
          <button key={titulo} type="button" disabled={!temDestino} onClick={acao} className={`${cartao} flex items-start gap-3 p-4 text-left disabled:opacity-50`}>
            <span className="flex-none w-11 h-11 rounded-xl bg-sol-creme flex items-center justify-center"><Icon size={22} /></span>
            <span className="flex-1 flex flex-col gap-0.5"><span className="text-base font-extrabold">{titulo}</span><span className="text-[13px] leading-snug text-sol-texto2">{texto}</span></span>
            <ChevronRight size={20} className="flex-none self-center text-sol-texto2" />
          </button>
        ))}
        <Link
          to={`/app/chat?texto=${encodeURIComponent(temDestino ? `Quero um roteiro para ${r.destino}` : "Quero montar um roteiro")}`}
          className={`${cartao} flex items-start gap-3 p-4 text-sol-fundo no-underline`}
        >
          <span className="flex-none w-11 h-11 rounded-xl bg-sol-claro flex items-center justify-center"><MessageCircle size={22} /></span>
          <span className="flex-1 flex flex-col gap-0.5"><span className="text-base font-extrabold">Pedir conversando</span><span className="text-[13px] leading-snug text-sol-texto2">Escreva ou mande um áudio no chat e a Sol pergunta o que faltar.</span></span>
          <ChevronRight size={20} className="flex-none self-center text-sol-texto2" />
        </Link>
        {!temDestino && <span className="text-xs text-sol-texto2">Escolha o destino para continuar.</span>}
        <p className="m-0 text-xs text-sol-texto2">{cota}</p>
      </div>
    </div>
  );
}
