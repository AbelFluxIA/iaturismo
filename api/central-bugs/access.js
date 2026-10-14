// Autorização do plugin Central de Bugs no app do cliente (/app).
// Contrato: INTEGRACAO-PARA-IA.md do repositório Ioseph-Hughes/Central-de-Bugs.
//
// O app da Sol identifica a pessoa pelo WhatsApp (código enviado pelo bot), não
// por e-mail. Por isso o servidor confirma a sessão no bot, obtém o telefone e
// só libera o plugin para telefones da equipe listados em CENTRAL_BUGS_EQUIPE,
// cada um ligado a um e-mail cadastrado como conta autorizada na Central.
// Turistas e o modo demonstração não veem o botão.
//
// Variáveis (só no servidor, nunca VITE_):
//   CENTRAL_BUGS_ORIGIN     ex.: https://central-de-bugs.vercel.app
//   CENTRAL_BUGS_ACCESS_ID  cb_... gerado no cadastro do sistema na Central
//   SAAS_ORIGIN             ex.: https://iaturismo.vercel.app
//   CENTRAL_BUGS_EQUIPE     "5583999990000=pessoa@empresa.com, 5583...=outra@..."

function responder(res, status, corpo) {
  res.setHeader("Cache-Control", "no-store");
  if (corpo === undefined) { res.status(status).end(); return; }
  res.status(status).json(corpo);
}

function equipe(texto) {
  const mapa = new Map();
  for (const item of (texto || "").split(/[,;\n]/)) {
    const [telefone, email] = item.split("=").map((s) => (s || "").trim());
    const digitos = (telefone || "").replace(/\D/g, "");
    if (digitos && email && email.includes("@")) mapa.set(digitos, email.toLowerCase());
  }
  return mapa;
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return responder(res, 405, { error: "Use POST." }); }

  const central = (process.env.CENTRAL_BUGS_ORIGIN || "").replace(/\/+$/, "");
  const accessId = process.env.CENTRAL_BUGS_ACCESS_ID;
  const origin = (process.env.SAAS_ORIGIN || "").replace(/\/+$/, "");
  const contas = equipe(process.env.CENTRAL_BUGS_EQUIPE);
  // Sem configuração: nenhum botão, sem erro para quem usa o app.
  if (!central || !accessId || !origin || contas.size === 0) return responder(res, 204);

  try {
    const origemPedido = req.headers.origin;
    if (origemPedido && origemPedido !== origin) return responder(res, 403, { error: "Origem inválida." });

    const token = (req.headers.authorization || "").match(/^Bearer (.+)$/)?.[1];
    if (!token) return responder(res, 401, { error: "Entre no app." });

    // A sessão é conferida pelo próprio bot (mesma rota que o app usa, via vercel.json).
    const perfil = await fetch(`${origin}/api/app/perfil`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (perfil.status === 401) return responder(res, 401, { error: "Sessão inválida." });
    if (!perfil.ok) return responder(res, 503, { error: "Não foi possível conferir a sessão." });
    const { phone } = await perfil.json();
    const email = contas.get(String(phone || "").replace(/\D/g, ""));
    if (!email) return responder(res, 403, { error: "Conta sem acesso ao plugin." });

    const resposta = await fetch(`${central}/api/reports?widget=access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessId, email, origin }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = await resposta.json().catch(() => null);
    if (!resposta.ok || !payload) {
      return responder(res, [401, 403].includes(resposta.status) ? 403 : 503, { error: "Conta não autorizada ou Central indisponível." });
    }
    return responder(res, 200, payload);
  } catch {
    return responder(res, 503, { error: "Integração indisponível." });
  }
}
