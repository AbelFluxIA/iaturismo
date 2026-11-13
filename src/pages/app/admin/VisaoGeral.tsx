import { BarrasPorDia, Estado, Etiqueta, Numero, Secao, dataHora, numero, reais, useAdmin, type AbaAdmin } from "./comum";

interface Resumo {
  usuarios: { total: number; novos7: number; guias: number; pagaram: number; conversaram24h: number; conversaram7d: number; ativos24h: number; ativos7d: number; cadastroIniciado: number; cadastroConcluido: number };
  roteiros: { prontos: number; incompletos: number; prontos7: number };
  pagamentos: { status: string; n: number; centavos: number; centavos30: number }[];
  logins7d: { entraram: number; falhas: number; codigos: number };
  ultimas24h: { erros: number; avisos: number };
  topErros7d: { etapa: string; msg: string; n: number; ultimo: string }[];
  custoIa30d: { tipo: string; chamadas: number; usd: number }[];
  porDia: { dia: string; novos: number; roteiros: number; msg_whatsapp: number; msg_app: number; logins: number; erros: number; custo_usd: number }[];
  modoGratis: boolean;
}
const PAG: Record<string, string> = { pago: "pagos", pendente: "pendentes", expirado: "expirados", cancelado: "cancelados" };
const dolar = (n: number) => `US$ ${n.toFixed(n < 10 ? 2 : 0)}`;

export default function VisaoGeral({ ir }: { ir: (aba: AbaAdmin, extra?: Record<string, string>) => void }) {
  const { dados: d, erro, carregando, recarregar } = useAdmin<Resumo>("/resumo?dias=14", (x) => !!x.usuarios && !!x.roteiros && Array.isArray(x.porDia) && Array.isArray(x.pagamentos) && Array.isArray(x.custoIa30d) && Array.isArray(x.topErros7d) && !!x.logins7d && !!x.ultimas24h);
  if (!d) return <Estado carregando={carregando} erro={erro} aoTentar={recarregar} />;
  const u = d.usuarios;
  const pagos = d.pagamentos.find((p) => p.status === "pago");
  const custoTotal = d.custoIa30d.reduce((s, c) => s + c.usd, 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Numero rotulo="Contatos" valor={numero(u.total)} detalhe={`${u.novos7} novos em 7 dias`} />
        <Numero rotulo="Usaram em 24 h" valor={numero(Math.max(u.ativos24h, u.conversaram24h))} detalhe={`${Math.max(u.ativos7d, u.conversaram7d)} em 7 dias`} />
        <Numero rotulo="Roteiros prontos" valor={numero(d.roteiros.prontos)} detalhe={`${d.roteiros.prontos7} em 7 dias · ${d.roteiros.incompletos} pedidos que não terminaram`} />
        <Numero rotulo="Erros em 24 h" valor={numero(d.ultimas24h.erros)} tom={d.ultimas24h.erros ? "erro" : "ok"} detalhe={<button type="button" className="font-bold text-sol-mar underline" onClick={() => ir("logs", { nivel: "problemas" })}>{d.ultimas24h.avisos} avisos · ver logs</button>} />
        <Numero rotulo="Cadastro no app" valor={`${u.cadastroConcluido} de ${u.cadastroIniciado}`} detalhe="concluíram o cadastro" />
        <Numero rotulo="Guia Sol ativa" valor={numero(u.guias)} detalhe={d.modoGratis ? "modo grátis de teste ligado" : undefined} />
        <Numero rotulo="Pagamentos" valor={pagos ? reais(pagos.centavos) : "R$ 0,00"} detalhe={d.pagamentos.length ? d.pagamentos.map((p) => `${p.n} ${PAG[p.status] ?? p.status}`).join(" · ") : "nenhuma cobrança ainda"} />
        <Numero rotulo="Entradas no app (7 dias)" valor={numero(d.logins7d.entraram)} tom={d.logins7d.falhas > d.logins7d.entraram ? "aviso" : undefined} detalhe={`${d.logins7d.codigos} códigos enviados · ${d.logins7d.falhas} tentativas sem sucesso`} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <BarrasPorDia titulo="Mensagens das pessoas por dia" pontos={d.porDia.map((x) => ({ dia: x.dia, a: x.msg_whatsapp, b: x.msg_app }))} rotuloA="WhatsApp" rotuloB="App" />
        <BarrasPorDia titulo="Roteiros gerados por dia" pontos={d.porDia.map((x) => ({ dia: x.dia, a: x.roteiros }))} rotuloA="Roteiros" />
        <BarrasPorDia titulo="Contatos novos por dia" pontos={d.porDia.map((x) => ({ dia: x.dia, a: x.novos }))} rotuloA="Contatos" />
        <BarrasPorDia titulo="Erros do sistema por dia" pontos={d.porDia.map((x) => ({ dia: x.dia, a: x.erros }))} rotuloA="Erros" />
        <BarrasPorDia titulo="Custo de IA por dia" pontos={d.porDia.map((x) => ({ dia: x.dia, a: x.custo_usd }))} rotuloA="Custo" formato={dolar} />
        <Secao titulo={`Custo de IA em 30 dias: ${dolar(custoTotal)}`}>
          {d.custoIa30d.length === 0 ? <p className="m-0 text-sm text-sol-texto2">Nenhuma chamada de IA em 30 dias.</p> : (
            <table className="w-full text-sm border-collapse">
              <thead><tr className="text-left text-xs text-sol-texto2"><th className="py-1 font-bold">Uso</th><th className="py-1 font-bold text-right">Chamadas</th><th className="py-1 font-bold text-right">Custo</th></tr></thead>
              <tbody>{d.custoIa30d.map((c) => <tr key={c.tipo} className="border-t border-sol-linha"><td className="py-1.5">{c.tipo}</td><td className="py-1.5 text-right">{numero(c.chamadas)}</td><td className="py-1.5 text-right font-bold">{dolar(c.usd)}</td></tr>)}</tbody>
            </table>
          )}
        </Secao>
      </div>
      <Secao titulo="Erros mais repetidos em 7 dias">
        {d.topErros7d.length === 0 ? <p className="m-0 text-sm text-sol-texto2">Nenhum erro em 7 dias.</p> : (
          <ul className="m-0 p-0 list-none flex flex-col">
            {d.topErros7d.map((e) => (
              <li key={e.etapa + e.msg} className="border-t border-sol-linha first:border-t-0">
                <button type="button" onClick={() => ir("logs", { nivel: "erro", etapa: e.etapa === "-" ? "" : e.etapa })} className="w-full flex items-center gap-2 py-2 text-left">
                  <Etiqueta tom="erro">{e.n}×</Etiqueta>
                  <span className="flex-1 min-w-0 text-sm"><strong className="break-words">{e.msg}</strong><span className="block text-xs text-sol-texto2">{e.etapa} · último em {dataHora(e.ultimo)}</span></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}
