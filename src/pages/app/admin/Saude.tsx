import { Estado, Etiqueta, Numero, Secao, dataHora, duracao, haQuanto, numero, tamanho, useAdmin } from "./comum";

interface DadosSaude {
  banco: { pingMs: number; bytes: number; maxConexoes: number; conexoes: { estado: string; n: number }[]; tabelas: { tabela: string; linhas: number; bytes: number }[] };
  processo: { iniciadoEm: string; noArSegundos: number; memoriaMb: number; heapMb: number; atraso: { mediaMs: number; p99Ms: number; maxMs: number }; node: string; versao: string; operacoesEmAndamento: number };
  servidor: { cpus: number; carga: number[]; memoriaTotalMb: number; memoriaLivreMb: number; disco: { totalGb: number; livreGb: number } | null };
  whatsapp: { ultimoWebhook: string | null; ultimaMensagem: string | null; assinaturaConferida: boolean };
  servicos: { nome: string; estado: "ok" | "falhando" | "recuperado" | "sem-uso"; chamadas48h: number; erros48h: number; ultimoErro: string | null; ultimoOk: string | null; mensagem: string | null }[];
  etapas: { etapa: string; total: number; erros: number; ultimo_erro: string | null; ultimo_ok: string | null; mensagem: string | null; media_ms: number | null }[];
  rotas: { rota: string; pedidos: number; erros: number; mediaMs: number; maxMs: number; ultimoErro: string | null }[];
  logs: { ligado: boolean; naFila: number; descartadas: number };
  ajustes: { enviosDiarios: boolean; modoGratis: boolean; administradores: number };
}
const ESTADO: Record<string, ["ok" | "erro" | "aviso" | "info", string]> = { ok: ["ok", "funcionando"], falhando: ["erro", "com falha"], recuperado: ["aviso", "falhou e voltou"], "sem-uso": ["info", "sem uso em 48 h"] };
const CONEXAO: Record<string, string> = { active: "trabalhando", idle: "paradas", "idle in transaction": "presas em transação", outra: "do sistema" };

export default function Saude() {
  const { dados: d, erro, carregando, recarregar } = useAdmin<DadosSaude>("/saude", (x) => !!x.banco && Array.isArray(x.banco.conexoes) && Array.isArray(x.banco.tabelas) && !!x.processo?.atraso && !!x.servidor && Array.isArray(x.servidor.carga) && !!x.whatsapp && Array.isArray(x.servicos) && Array.isArray(x.etapas) && Array.isArray(x.rotas) && !!x.logs && !!x.ajustes);
  if (!d) return <Estado carregando={carregando} erro={erro} aoTentar={recarregar} />;
  const conexoes = d.banco.conexoes.reduce((s, c) => s + c.n, 0);
  const memUsada = d.servidor.memoriaTotalMb - d.servidor.memoriaLivreMb;
  const carga = d.servidor.carga[0] / d.servidor.cpus;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-sol-texto2">Versão do servidor: {d.processo.versao || "?"} · no ar há {duracao(d.processo.noArSegundos)}</span>
        <button type="button" onClick={recarregar} disabled={carregando} className="min-h-[40px] px-3 rounded-xl border-[1.5px] border-sol-borda bg-white text-sm font-bold disabled:opacity-50">{carregando ? "Atualizando…" : "Atualizar"}</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Numero rotulo="Banco de dados" valor={`${d.banco.pingMs} ms`} tom={d.banco.pingMs > 800 ? "erro" : d.banco.pingMs > 300 ? "aviso" : "ok"} detalhe={`tempo de resposta · ${tamanho(d.banco.bytes)}`} />
        <Numero rotulo="Conexões no banco" valor={`${conexoes} de ${d.banco.maxConexoes}`} tom={conexoes > d.banco.maxConexoes * 0.8 ? "erro" : undefined} detalhe={d.banco.conexoes.map((c) => `${c.n} ${CONEXAO[c.estado] ?? c.estado}`).join(" · ")} />
        <Numero rotulo="Processador" valor={`${Math.round(carga * 100)}%`} tom={carga > 1.5 ? "erro" : carga > 0.9 ? "aviso" : "ok"} detalhe={`carga média de 1 min · ${d.servidor.cpus} núcleo${d.servidor.cpus > 1 ? "s" : ""}`} />
        <Numero rotulo="Memória do servidor" valor={`${Math.round((memUsada / d.servidor.memoriaTotalMb) * 100)}%`} tom={memUsada / d.servidor.memoriaTotalMb > 0.9 ? "erro" : undefined} detalhe={`a Sol usa ${d.processo.memoriaMb} MB de ${numero(d.servidor.memoriaTotalMb)} MB`} />
        <Numero rotulo="Travamento do processo" valor={`${d.processo.atraso.p99Ms} ms`} tom={d.processo.atraso.p99Ms > 500 ? "erro" : d.processo.atraso.p99Ms > 150 ? "aviso" : "ok"} detalhe={`pior momento: ${d.processo.atraso.maxMs} ms`} />
        <Numero rotulo="Disco livre" valor={d.servidor.disco ? `${d.servidor.disco.livreGb} GB` : "?"} tom={d.servidor.disco && d.servidor.disco.livreGb < 5 ? "erro" : undefined} detalhe={d.servidor.disco ? `de ${d.servidor.disco.totalGb} GB` : undefined} />
        <Numero rotulo="Última mensagem do WhatsApp" valor={haQuanto(d.whatsapp.ultimaMensagem ?? d.whatsapp.ultimoWebhook)} detalhe={d.whatsapp.assinaturaConferida ? "assinatura da Meta conferida" : "assinatura NÃO conferida"} tom={d.whatsapp.assinaturaConferida ? undefined : "erro"} />
        <Numero rotulo="Trabalhos em andamento" valor={numero(d.processo.operacoesEmAndamento)} detalhe="roteiros sendo gerados agora" />
      </div>

      <Secao titulo="Serviços de fora (últimas 48 h)">
        <ul className="m-0 p-0 list-none flex flex-col">
          {d.servicos.map((s) => (
            <li key={s.nome} className="flex flex-col gap-0.5 py-2 border-t border-sol-linha first:border-t-0">
              <span className="flex items-center justify-between gap-2"><strong className="text-sm">{s.nome}</strong><Etiqueta tom={ESTADO[s.estado][0]}>{ESTADO[s.estado][1]}</Etiqueta></span>
              <span className="text-xs text-sol-texto2">{s.chamadas48h} usos · {s.erros48h} falhas{s.ultimoErro ? ` · última falha ${dataHora(s.ultimoErro)}` : ""}{s.ultimoOk ? ` · último sucesso ${dataHora(s.ultimoOk)}` : ""}</span>
              {s.mensagem && s.estado !== "ok" && <span className="text-xs text-sol-sos break-words">{s.mensagem}</span>}
            </li>
          ))}
        </ul>
      </Secao>

      <div className="grid md:grid-cols-2 gap-3">
        <Secao titulo="Ajustes ligados">
          <ul className="m-0 p-0 list-none flex flex-col gap-1.5 text-sm">
            <li className="flex justify-between gap-2"><span>Envios diários pelo WhatsApp</span><Etiqueta tom={d.ajustes.enviosDiarios ? "ok" : "aviso"}>{d.ajustes.enviosDiarios ? "ligados" : "desligados"}</Etiqueta></li>
            <li className="flex justify-between gap-2"><span>Modo grátis de teste</span><Etiqueta tom={d.ajustes.modoGratis ? "aviso" : "ok"}>{d.ajustes.modoGratis ? "ligado (ninguém paga)" : "desligado"}</Etiqueta></li>
            <li className="flex justify-between gap-2"><span>Números com acesso a este painel</span><strong>{d.ajustes.administradores}</strong></li>
            <li className="flex justify-between gap-2"><span>Gravação dos logs</span><Etiqueta tom={d.logs.descartadas ? "aviso" : "ok"}>{d.logs.descartadas ? `${d.logs.descartadas} linhas perdidas` : "em dia"}</Etiqueta></li>
          </ul>
        </Secao>
        <Secao titulo="Tabelas do banco">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="text-left text-xs text-sol-texto2"><th className="py-1 font-bold">Tabela</th><th className="py-1 font-bold text-right">Linhas</th><th className="py-1 font-bold text-right">Tamanho</th></tr></thead>
            <tbody>{d.banco.tabelas.map((t) => <tr key={t.tabela} className="border-t border-sol-linha"><td className="py-1.5 break-all">{t.tabela}</td><td className="py-1.5 text-right">{numero(t.linhas)}</td><td className="py-1.5 text-right">{tamanho(t.bytes)}</td></tr>)}</tbody>
          </table>
        </Secao>
      </div>

      <Secao titulo="Etapas do sistema (48 h)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm border-collapse">
            <thead><tr className="text-left text-xs text-sol-texto2"><th className="py-1 font-bold">Etapa</th><th className="py-1 font-bold text-right">Vezes</th><th className="py-1 font-bold text-right">Falhas</th><th className="py-1 font-bold text-right">Tempo médio</th><th className="py-1 pl-3 font-bold">Última falha</th></tr></thead>
            <tbody>{d.etapas.map((e) => (
              <tr key={e.etapa} className="border-t border-sol-linha align-top"><td className="py-1.5">{e.etapa}</td><td className="py-1.5 text-right">{e.total}</td><td className={`py-1.5 text-right font-bold ${e.erros ? "text-sol-sos" : ""}`}>{e.erros}</td><td className="py-1.5 text-right">{e.media_ms ? `${numero(e.media_ms)} ms` : "-"}</td><td className="py-1.5 pl-3 text-xs">{e.ultimo_erro ? `${dataHora(e.ultimo_erro)}: ${e.mensagem ?? ""}` : "-"}</td></tr>
            ))}</tbody>
          </table>
        </div>
        {d.etapas.length === 0 && <p className="m-0 text-sm text-sol-texto2">Sem atividade registrada em 48 h.</p>}
      </Secao>

      <Secao titulo={`Pedidos ao servidor desde que subiu (${duracao(d.processo.noArSegundos)})`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm border-collapse">
            <thead><tr className="text-left text-xs text-sol-texto2"><th className="py-1 font-bold">Rota</th><th className="py-1 font-bold text-right">Pedidos</th><th className="py-1 font-bold text-right">Erros</th><th className="py-1 font-bold text-right">Média</th><th className="py-1 font-bold text-right">Pior</th></tr></thead>
            <tbody>{d.rotas.map((r) => (
              <tr key={r.rota} className="border-t border-sol-linha"><td className="py-1.5 break-all">{r.rota}</td><td className="py-1.5 text-right">{numero(r.pedidos)}</td><td className={`py-1.5 text-right font-bold ${r.erros ? "text-sol-sos" : ""}`}>{r.erros}</td><td className="py-1.5 text-right">{numero(r.mediaMs)} ms</td><td className="py-1.5 text-right">{numero(r.maxMs)} ms</td></tr>
            ))}</tbody>
          </table>
        </div>
      </Secao>
    </div>
  );
}
