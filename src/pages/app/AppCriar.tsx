import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronRight, MessageCircle, Minus, Pencil, Plus, Sparkles, SlidersHorizontal } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { useViagens } from "@/contexts/ViagensContext";
import { Aviso, TopBar, btnPrimario, btnSecundario, cartao, formatarData } from "@/components/app/ui";
import { urlSegura } from "@/lib/utils";
import { useSugestoes } from "@/lib/sugestoes";
import { BuscaCidade } from "@/components/app/BuscaCidade";
import { posicaoSePermitida } from "@/lib/geo";
import { diasDaViagem, hojeISO, TIPOS_PASSEIO } from "@/lib/roteiro";

// Criar roteiro pelo app: destino → dados → hospedagem → revisão → gerando.
// O pedido vai para o bot (/api/app/roteiros/criar), que gera em segundo plano.

type Etapa = "inicio" | "dados" | "hospedagem" | "revisao" | "gerando";
type QuemVai = "sozinho" | "casal" | "família";
type Custos = "econômico" | "melhor custo-benefício" | "conforto";

interface Rascunho {
  destino: string;
  chegada: string;
  horaChegada: string;
  saida: string;
  horaVolta: string;
  quemVai: QuemVai;
  adultos: number;
  criancas: number;
  pet: { tipo: string; porte: string } | null;
  salvarPreferencia: boolean;
  tipos: string[];
  custos: Custos;
  temHospedagem: "sim" | "nao" | null;
  hospedagem: string;
  transporte?: Transporte | null; // como volta; sem resposta, o roteiro não supõe nada
}

// Tipos de roteiro (RA-ROT-11) e quem vai (RA-ROT-12)
const TIPOS = TIPOS_PASSEIO;
// Como a pessoa volta no último dia. A Sol não supõe: sem resposta, o roteiro vai até o horário de volta e pronto.
type Transporte = "carro" | "aviao" | "onibus" | "local";
const TRANSPORTES: [Transporte, string][] = [["carro", "De carro"], ["aviao", "De avião"], ["onibus", "De ônibus"], ["local", "Moro ou já estou na cidade"]];
const QUEM: [QuemVai, string][] = [["sozinho", "Sozinho"], ["casal", "Casal"], ["família", "Família"]];
const PETS = ["Cachorro", "Gato", "Outro"];
const PORTES = ["Pequeno", "Médio", "Grande"];
const CHAVE_PREF = "sol_preferencias";

interface Preferencias { tipos: string[]; custos: Custos; quemVai: QuemVai }

// Preferências padrão (Perfil ou "Salvar como preferência" na revisão, RA-ROT-10)
export function lerPreferencias(): Preferencias | null {
  try { return JSON.parse(localStorage.getItem(CHAVE_PREF) || "null"); } catch { return null; }
}
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
  return achados.length ? achados.slice(0, 3) : ["Natureza (inclui praia)", "Gastronomia"];
}

// Roteiro rápido (RA-ROT-09): sai em 1 hora e volta hoje às 22h. Tarde da noite,
// fica para amanhã de manhã.
function padrao(destino: string, perfil?: string | null): Rascunho {
  const prefs = lerPreferencias();
  // Das 20h às 5h não dá para "começar daqui a 1 hora": o roteiro rápido fica para as 9h (de hoje, se já passou da meia-noite; senão de amanhã)
  const tarde = new Date().getHours() >= 20 || new Date().getHours() < 5;
  const dia = tarde && new Date().getHours() >= 5 ? somarDias(hojeISO(), 1) : hojeISO();
  return {
    destino,
    chegada: dia,
    horaChegada: tarde ? "09:00" : daquiAUmaHora(),
    saida: dia,
    horaVolta: "22:00",
    quemVai: prefs?.quemVai ?? "sozinho",
    adultos: 2,
    criancas: 0,
    pet: null,
    tipos: prefs?.tipos?.length ? prefs.tipos : tiposDoPerfil(perfil),
    custos: prefs?.custos ?? "melhor custo-benefício",
    temHospedagem: null,
    hospedagem: "",
    salvarPreferencia: false,
  };
}

// Sair hoje e voltar amanhã é 1 dia (regra do fundador, 13/11): dias = volta − chegada, no mínimo 1
const diasEntre = (a: string, b: string) => diasDaViagem(a, b);

function textoQuemVai(r: Rascunho) {
  const base = r.quemVai === "família"
    ? `Família · ${r.adultos} ${r.adultos === 1 ? "adulto" : "adultos"}${r.criancas ? ` e ${r.criancas} ${r.criancas === 1 ? "criança" : "crianças"}` : ""}`
    : r.quemVai === "casal" ? "Casal" : "Sozinho";
  return r.pet ? `${base} · com pet (${r.pet.tipo.toLowerCase()}, ${r.pet.porte.toLowerCase()})` : base;
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
// Data e hora: no iPhone esses campos têm largura própria e um passava por cima do outro; appearance-none + min-w-0 resolvem
const campoData = "appearance-none h-12 w-full min-w-0 max-w-full box-border px-3 rounded-xl border-[1.5px] border-sol-borda bg-white text-[15px] text-sol-fundo focus:outline-none focus:border-sol-mar [&::-webkit-date-and-time-value]:text-left";
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
      if (salvo && "adultos" in salvo && (!vindo || salvo.destino === vindo)) return salvo;
    } catch { /* sem rascunho */ }
    // Datas vindas do onboarding ("já tem uma viagem em mente")
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    const chegadaQ = params.get("chegada") ?? "";
    const saidaQ = params.get("saida") ?? "";
    const base = padrao(vindo ?? "", profile?.touristProfile);
    return iso.test(chegadaQ) ? { ...base, chegada: chegadaQ, saida: iso.test(saidaQ) && saidaQ >= chegadaQ ? saidaQ : chegadaQ } : base;
  });
  const set = (p: Partial<Rascunho>) => setR((x) => ({ ...x, ...p }));
  useEffect(() => { try { sessionStorage.setItem(CHAVE, JSON.stringify(r)); } catch { /* ok */ } }, [r]);
  useEffect(() => { window.scrollTo(0, 0); }, [etapa]);

  const gratis = profile?.ofertas?.gratisDuranteTeste;
  const regras = profile?.regras;
  const comGuia = !!profile?.hasCompanion;
  const maxDias = (comGuia ? regras?.maxDiasComGuia : regras?.maxDiasSemGuia) ?? (comGuia ? 7 : 5);
  const pernoite = r.saida > r.chegada;
  // Preço do roteiro, a mesma conta do servidor: no modo de teste e com a Guia nada é cobrado;
  // senão o 1º dia é grátis (enquanto houver roteiro grátis na semana) e cada dia a mais é pago.
  const diasViagem = r.chegada && r.saida && r.saida >= r.chegada ? diasEntre(r.chegada, r.saida) : 1;
  const precoDia = regras?.diaRoteiroPreco ?? 4.9;
  const gratisNaSemana = !profile?.cota || profile.cota.usados < profile.cota.limite;
  const diasPagos = gratis || comGuia ? 0 : Math.max(0, diasViagem - (gratisNaSemana ? 1 : 0));
  const reais = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const valorTexto = reais(diasPagos * precoDia);
  const cota = gratis
    ? "Roteiros grátis enquanto o app está em fase de teste."
    : comGuia
      ? `Com a Guia: até ${regras?.guiaRoteirosSemana ?? 30} roteiros por semana, sem cobrança por dia.`
      : `Sem a Guia: ${regras?.roteirosGratisSemana ?? 2} roteiros grátis por semana, 1 dia cada. Cada dia a mais custa R$ ${(regras?.diaRoteiroPreco ?? 4.9).toFixed(2).replace(".", ",")}.`;

  // ─── Gerando ───
  const [gerando, setGerando] = useState<{ estado: "enviando" | "esperando" | "pronto" | "pagar" | "demorou" | "erro"; id?: string; texto?: string }>({ estado: "enviando" });
  const cancelado = useRef(false);
  const [tentou, setTentou] = useState(false);
  useEffect(() => () => { cancelado.current = true; }, []);

  async function gerar() {
    setEtapa("gerando");
    setGerando({ estado: "enviando" });
    if (r.salvarPreferencia) {
      try { localStorage.setItem(CHAVE_PREF, JSON.stringify({ tipos: r.tipos, custos: r.custos, quemVai: r.quemVai })); } catch { /* ok */ }
    }
    if (isDemo) {
      await new Promise((ok) => setTimeout(ok, 1800));
      setGerando({ estado: "pronto", id: "demo" });
      return;
    }
    const pedido = {
      destino: r.destino,
      chegada: r.chegada,
      saida: r.saida,
      horaChegada: r.horaChegada,
      horaVolta: r.horaVolta,
      quemVai: r.quemVai,
      adultos: r.quemVai === "família" ? r.adultos : undefined,
      criancas: r.quemVai === "família" ? r.criancas : undefined,
      pet: r.pet ?? undefined,
      tipos: r.tipos,
      custos: r.custos,
      hospedagem: pernoite && r.temHospedagem === "sim" ? r.hospedagem : undefined,
      transporte: r.transporte ?? undefined,
      // Sem hospedagem, o primeiro deslocamento do dia sai de onde a pessoa está (se ela já liberou a localização)
      partida: undefined as { lat: number; lng: number } | undefined,
    };
    if (!pedido.hospedagem) { const pos = await posicaoSePermitida().catch(() => null); if (pos) pedido.partida = { lat: pos.lat, lng: pos.lng }; }
    try {
      const res = await fetch(`${API_URL}/api/app/roteiros/criar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(pedido),
      });
      if (res.status === 404) {
        // Bot antigo: pede pela conversa
        navigate(`/app/chat?texto=${encodeURIComponent(`Quero um roteiro para ${r.destino}, de ${formatarData(r.chegada)} a ${formatarData(r.saida)}, ${r.quemVai}, foco em ${r.tipos.join(", ")}.`)}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      // Dias além do grátis: cria a cobrança e abre o Pix; o roteiro sai quando o pagamento cai
      if (res.status === 402 && data.pagamento) {
        const pg = await fetch(`${API_URL}/api/app/pagamento`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ tipo: "roteiro", pedido }) });
        const d = await pg.json().catch(() => ({}));
        if (!pg.ok || !d.ref) { setGerando({ estado: "erro", texto: d.error }); return; }
        try { sessionStorage.removeItem(CHAVE); } catch { /* ok */ }
        navigate(`/app/pagar/${d.ref}`);
        return;
      }
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
              <Link to="/app" className="min-h-[44px] flex items-center text-sm font-bold text-sol-mar no-underline">Voltar ao início</Link>
            </>
          )}
          {gerando.estado === "pagar" && (
            <>
              <h2 className="m-0 font-display font-extrabold text-2xl">Falta liberar o roteiro</h2>
              <p className="m-0 text-[15px] text-sol-texto2">Seus roteiros grátis acabaram. Depois do pagamento, a Sol gera e o roteiro aparece aqui.</p>
              {urlSegura(gerando.texto) && <a href={urlSegura(gerando.texto)!} target="_blank" rel="noopener noreferrer" className={`${btnPrimario} w-full !bg-sol-sun !text-sol-fundo no-underline`}>Pagar e liberar</a>}
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

  if (etapa === "inicio") return <Inicio r={r} set={set} cota={cota} irPara={setEtapa} rapido={() => { set({ ...padrao(r.destino, profile?.touristProfile), destino: r.destino, tipos: r.tipos, custos: r.custos, quemVai: r.quemVai }); setEtapa("revisao"); }} />;

  if (etapa === "dados") {
    const dias = r.chegada && r.saida ? diasEntre(r.chegada, r.saida) : 0;
    const faltas = [
      r.destino.trim().length < 2 ? "Escreva o destino." : "",
      !r.chegada || !r.saida ? "Escolha a data de chegada e a de volta." : "",
      r.chegada && r.saida && r.saida < r.chegada ? "A volta não pode ser antes da chegada." : "",
      r.tipos.length === 0 ? "Marque pelo menos um tipo de roteiro." : "",
      dias > maxDias ? `O roteiro pode ter até ${maxDias} dias${comGuia ? "" : " sem a Guia Sol"} (você escolheu ${dias}). Encurte as datas.` : "",
    ].filter(Boolean);
    return (
      <div className="flex flex-col">
        <TopBar title="Dados desta viagem" step="Criar roteiro" aoVoltar={() => setEtapa("inicio")} />
        <div className="flex flex-col gap-4 px-5">
          <label className="flex flex-col gap-1.5"><span className={rotuloCampo}>Destino</span>
            <BuscaCidade className={campo} value={r.destino} onChange={(destino) => set({ destino })} />
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2">
            <label className="flex flex-col gap-1.5 min-w-0"><span className={rotuloCampo}>Chegada</span>
              <input type="date" className={campoData} value={r.chegada} min={hojeISO()} onChange={(e) => set({ chegada: e.target.value, saida: r.saida < e.target.value ? e.target.value : r.saida })} />
            </label>
            <label className="flex flex-col gap-1.5 min-w-0"><span className={rotuloCampo}>Hora</span>
              <input type="time" className={campoData} value={r.horaChegada} onChange={(e) => set({ horaChegada: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5 min-w-0"><span className={rotuloCampo}>Volta</span>
              <input type="date" className={campoData} value={r.saida} min={r.chegada} onChange={(e) => set({ saida: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5 min-w-0"><span className={rotuloCampo}>Hora</span>
              <input type="time" className={campoData} value={r.horaVolta} onChange={(e) => set({ horaVolta: e.target.value })} />
            </label>
          </div>

          {gratis ? (
            <p className="m-0 -mt-2 text-xs text-sol-texto2">Durante o teste, o roteiro é grátis (até {maxDias} dias). Esta viagem: {diasViagem} {diasViagem === 1 ? "dia" : "dias"}.</p>
          ) : comGuia ? null : diasPagos === 0 ? (
            <p className="m-0 -mt-2 text-xs text-sol-texto2">
              Roteiro de 1 dia: grátis (voltar no mesmo dia ou no dia seguinte conta 1 dia). Cada dia a mais custa {reais(precoDia)}. Com a <Link to="/app/guia" className="font-bold text-sol-mar">Guia Sol</Link>, até 7 dias sem pagar por dia.
            </p>
          ) : (
            <div role="status" className="-mt-1 flex flex-col gap-2 px-3.5 py-3 rounded-[14px] border bg-sol-atencao border-sol-atencao-borda text-sm text-sol-atencao-texto">
              <span>
                <strong>Este roteiro custa {valorTexto}.</strong> Sua viagem tem {diasViagem} dias ({formatarData(r.chegada)} a {formatarData(r.saida)}).{" "}
                {gratisNaSemana ? `O 1º dia é grátis e ${diasPagos === 1 ? "o outro dia custa" : `os outros ${diasPagos} custam`} ${reais(precoDia)}${diasPagos === 1 ? "" : " cada"}.` : `Seus roteiros grátis desta semana já foram usados; cada dia custa ${reais(precoDia)}.`}{" "}
                Você paga por Pix no próximo passo e o roteiro sai em seguida.
              </span>
              {gratisNaSemana && (
                <button type="button" onClick={() => set({ saida: somarDias(r.chegada, 1) })} className="self-start min-h-[40px] px-3 rounded-xl bg-white border-[1.5px] border-sol-borda text-sol-fundo font-bold">
                  Fazer só 1 dia, grátis
                </button>
              )}
              <Link to="/app/guia" className="self-start font-bold text-sol-mar">Com a Guia Sol, até 7 dias sem pagar por dia</Link>
            </div>
          )}
          <fieldset className="flex flex-col gap-2 border-0 p-0 m-0"><legend className={`${rotuloCampo} mb-2`}>Como você volta (opcional)</legend>
            <div className="flex flex-wrap gap-2">{TRANSPORTES.map(([v, l]) => <Chip key={v} ativo={r.transporte === v} onClick={() => set({ transporte: r.transporte === v ? null : v })}>{l}</Chip>)}</div>
            <span className="text-xs text-sol-texto2">{r.transporte === "aviao" ? "A Sol reserva o tempo de ir ao aeroporto antes do voo." : r.transporte === "onibus" ? "A Sol reserva o tempo de ir à rodoviária." : "A hora de volta é quando o seu passeio termina no último dia."}</span>
          </fieldset>
          <fieldset className="flex flex-col gap-2 border-0 p-0 m-0"><legend className={`${rotuloCampo} mb-2`}>Quem vai com você</legend>
            <div className="flex flex-wrap gap-2">{QUEM.map(([v, l]) => <Chip key={v} ativo={r.quemVai === v} onClick={() => set({ quemVai: v })}>{l}</Chip>)}</div>
            {r.quemVai === "família" && ([["adultos", "Adultos", 1], ["criancas", "Crianças (até 12 anos)", 0]] as const).map(([k, rot, min]) => (
              <div key={k} className="flex items-center gap-3 mt-1">
                <span className="flex-1 text-sm">{rot}</span>
                <span className="flex items-center gap-2">
                  <button type="button" aria-label={`Menos ${rot.toLowerCase()}`} onClick={() => set({ [k]: Math.max(min, r[k] - 1) } as Partial<Rascunho>)} className="w-11 h-11 rounded-full border-[1.5px] border-sol-borda bg-white flex items-center justify-center"><Minus size={18} /></button>
                  <span className="w-6 text-center font-extrabold">{r[k]}</span>
                  <button type="button" aria-label={`Mais ${rot.toLowerCase()}`} onClick={() => set({ [k]: Math.min(6, r[k] + 1) } as Partial<Rascunho>)} className="w-11 h-11 rounded-full border-[1.5px] border-sol-borda bg-white flex items-center justify-center"><Plus size={18} /></button>
                </span>
              </div>
            ))}
            <label className="flex items-center gap-3 mt-1 min-h-[44px]">
              <input type="checkbox" checked={!!r.pet} onChange={(e) => set({ pet: e.target.checked ? { tipo: PETS[0], porte: PORTES[1] } : null })} className="w-5 h-5 accent-[#0B5F8A]" />
              <span className="text-sm font-semibold">Vai levar pet</span>
            </label>
            {r.pet && (
              <div className="grid grid-cols-2 gap-2">
                <select aria-label="Tipo do pet" className={campo} value={r.pet.tipo} onChange={(e) => set({ pet: { ...r.pet!, tipo: e.target.value } })}>{PETS.map((p) => <option key={p}>{p}</option>)}</select>
                <select aria-label="Porte do pet" className={campo} value={r.pet.porte} onChange={(e) => set({ pet: { ...r.pet!, porte: e.target.value } })}>{PORTES.map((p) => <option key={p}>{p}</option>)}</select>
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

          {/* O botão nunca fica travado sem explicação: ao tocar, mostra exatamente o que falta */}
          {tentou && faltas.length > 0 && (
            <div role="alert" className="flex flex-col gap-1 px-3.5 py-3 rounded-[14px] border border-sol-sos/40 bg-[#FDECEA] text-sm text-sol-sos">
              <strong>Falta pouco para continuar:</strong>
              <ul className="m-0 pl-5 list-disc">{faltas.map((f) => <li key={f}>{f}</li>)}</ul>
              {dias > maxDias && !comGuia && <Link to="/app/guia" className="font-extrabold text-sol-mar">Conhecer a Guia Sol (roteiros de até 7 dias)</Link>}
            </div>
          )}
          <button type="button" onClick={() => { if (faltas.length) { setTentou(true); return; } setEtapa(pernoite ? "hospedagem" : "revisao"); }} className={`${btnPrimario} ${faltas.length ? "opacity-60" : ""}`}>Continuar</button>
        </div>
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
          {tentou && (!r.temHospedagem || (r.temHospedagem === "sim" && !r.hospedagem.trim())) && (
            <p role="alert" className="m-0 text-sm font-bold text-sol-sos">{!r.temHospedagem ? "Escolha se você já tem hospedagem." : "Escreva onde você vai ficar."}</p>
          )}
          <button type="button" onClick={() => { if (!r.temHospedagem || (r.temHospedagem === "sim" && !r.hospedagem.trim())) { setTentou(true); return; } setTentou(false); setEtapa("revisao"); }} className={btnPrimario}>Ir à revisão</button>
        </div>
      </div>
    );
  }

  // Revisão
  const linhas: [string, string, Etapa][] = [
    ["Destino", r.destino || "Escolha o destino", "inicio"],
    ["Chegada", `${formatarData(r.chegada, { weekday: "short", day: "2-digit", month: "2-digit" })}, ${r.horaChegada}`, "dados"],
    ["Volta", `${formatarData(r.saida, { weekday: "short", day: "2-digit", month: "2-digit" })}, ${r.horaVolta}${r.transporte ? ` · ${TRANSPORTES.find(([v]) => v === r.transporte)?.[1].toLowerCase()}` : ""}`, "dados"],
    ["Quem vai", textoQuemVai(r), "dados"],
    ["Tipos", r.tipos.join(", "), "dados"],
    ["Custos", CUSTOS.find(([v]) => v === r.custos)?.[1] ?? r.custos, "dados"],
    ["Valor", diasPagos > 0 ? `${valorTexto} (${diasViagem} dias; ${gratisNaSemana ? "o 1º é grátis" : "sem roteiro grátis nesta semana"})` : "Grátis", "dados"],
    ...(pernoite ? [["Hospedagem", r.temHospedagem === "sim" ? r.hospedagem : "Sem hospedagem definida", "hospedagem"] as [string, string, Etapa]] : []),
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
        <label className="flex items-center gap-3 min-h-[44px]">
          <input type="checkbox" checked={r.salvarPreferencia} onChange={(e) => set({ salvarPreferencia: e.target.checked })} className="w-5 h-5 accent-[#0B5F8A]" />
          <span className="text-sm font-semibold">Salvar tipos, custos e quem vai como preferência</span>
        </label>
        <Aviso>{cota}</Aviso>
        <button type="button" disabled={r.destino.trim().length < 2 || r.saida < r.chegada || diasEntre(r.chegada, r.saida) > maxDias} onClick={gerar} className={btnPrimario}>
          <Sparkles size={18} /> {diasPagos > 0 ? `Pagar ${valorTexto} e gerar` : "Gerar roteiro"}
        </button>
        <button type="button" onClick={() => setEtapa("inicio")} className={btnSecundario}>Outro destino</button>
      </div>
    </div>
  );
}

function Inicio({ r, set, cota, irPara, rapido }: {
  r: Rascunho;
  set: (p: Partial<Rascunho>) => void;
  cota: string;
  irPara: (e: Etapa) => void;
  rapido: () => void;
}) {
  // Sugestões pela localização da pessoa (as mesmas de "Para onde ir"), não mais uma lista fixa da Paraíba
  const { lista, recomendado } = useSugestoes();
  const perto = [...(lista ?? [])].sort((a, b) => (a.km ?? 9e9) - (b.km ?? 9e9)).slice(0, 4);
  const [tentou, setTentou] = useState(false);
  const topo = useRef<HTMLDivElement>(null);
  const montar = useRef<HTMLHeadingElement>(null);
  const escolher = (destino: string) => {
    set({ destino });
    setTentou(false);
    window.setTimeout(() => montar.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };
  const temDestino = r.destino.trim().length >= 2;

  return (
    <div className="flex flex-col">
      <TopBar title="Criar roteiro" back="/app" />
      <div ref={topo} className="flex flex-col gap-3 px-5 scroll-mt-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-display font-extrabold text-xl">Para onde você vai?</span>
          <BuscaCidade className={campo} value={r.destino} placeholder="Cidade, estado ou país" onChange={(destino) => set({ destino })} />
        </label>
        {tentou && !temDestino && (
          <div role="alert" className="rounded-xl border-[1.5px] border-[#E8B4A8] bg-[#FCE7E2] px-3.5 py-3 text-sm font-semibold text-sol-fundo">
            Primeiro escreva o destino aqui em cima (ou toque em uma sugestão). Depois escolha como montar.
          </div>
        )}
        {!temDestino && !tentou && <span className="-mt-1 text-xs text-sol-texto2">Digite a cidade ou toque em uma sugestão.</span>}
        {temDestino && (
          <p className="m-0 -mt-1 flex items-center gap-1.5 text-sm font-bold text-sol-mar"><Check size={16} /> Destino: {r.destino}. Agora escolha abaixo como montar.</p>
        )}
        {perto.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-sol-texto2">{recomendado ? "Perto de você:" : "Destinos na Paraíba:"}</span>
            {perto.map((d) => (
              <Chip key={d.slug} ativo={r.destino === `${d.nome} - ${d.uf}`} onClick={() => escolher(`${d.nome} - ${d.uf}`)}>{d.nome}{d.uf !== "PB" || recomendado ? ` - ${d.uf}` : ""}</Chip>
            ))}
          </div>
        )}
        <Link to="/app/destinos" className="flex items-center gap-1 min-h-[44px] text-sm font-bold text-sol-mar no-underline">Ver destinos sugeridos <ChevronRight size={16} /></Link>

        <section className={`${cartao} flex flex-col gap-1.5 p-4`}>
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-xs font-extrabold tracking-[0.06em] uppercase text-sol-texto2">Suas preferências</h2>
            <button type="button" onClick={() => irPara("dados")} className="text-sm font-bold text-sol-mar min-h-[44px] px-2">Editar</button>
          </div>
          <dl className="m-0 grid grid-cols-[88px_1fr] gap-x-2 gap-y-1 text-sm">
            <dt className="text-sol-texto2">Tipos</dt><dd className="m-0 font-bold">{r.tipos.join(", ")}</dd>
            <dt className="text-sol-texto2">Custos</dt><dd className="m-0 font-bold">{CUSTOS.find(([v]) => v === r.custos)?.[1] ?? r.custos}</dd>
            <dt className="text-sol-texto2">Quem vai</dt><dd className="m-0 font-bold">{textoQuemVai(r)}</dd>
          </dl>
          <p className="m-0 text-xs text-sol-texto2">Padrão do seu perfil. Editar aqui muda só esta busca.</p>
        </section>

        <h2 ref={montar} className="m-0 mt-1 text-base font-extrabold scroll-mt-4">Como você quer montar?</h2>
        {[
          { titulo: "Roteiro rápido", texto: "A Sol completa com padrões: começa daqui a 1 hora e termina às 22h (à noite, fica para amanhã às 9h), com as preferências acima. Você revisa antes de gerar.", Icon: Sparkles, acao: rapido },
          { titulo: "Personalizar", texto: "Escolha datas, quem vai, tipos de passeio e custos.", Icon: SlidersHorizontal, acao: () => irPara("dados") },
        ].map(({ titulo, texto, Icon, acao }) => (
          <button key={titulo} type="button" onClick={() => { if (!temDestino) { setTentou(true); topo.current?.scrollIntoView({ behavior: "smooth", block: "start" }); return; } acao(); }} className={`${cartao} flex items-start gap-3 p-4 text-left`}>
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
        <p className="m-0 text-xs text-sol-texto2">{cota}</p>
      </div>
    </div>
  );
}
