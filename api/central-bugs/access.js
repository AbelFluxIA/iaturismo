// Autorização do plugin Central de Bugs no app do cliente (/app).
// Contrato: INTEGRACAO-PARA-IA.md (v0.10) de Ioseph-Hughes/Central-de-Bugs.
// Cadastro na Central: empresa Sol, sistema "SOl 2" (domínio painel.tripsol.com.br),
// disponível para todas as contas autenticadas. Quem decide a permissão é a Central.
//
// A conta do app da Sol é o número de WhatsApp confirmado pelo código que o bot
// envia; não existe e-mail. O servidor confere a sessão no próprio bot e envia
// à Central uma identidade derivada desse número: <telefone>@whatsapp.invalid.
// ".invalid" é reservado (RFC 2606): nunca é um e-mail real. Nada vem do navegador.
// Visitantes sem sessão e o modo demonstração não recebem autorização.
//
// Variável obrigatória (só no servidor da Vercel, nunca VITE_):
//   CENTRAL_BUGS_ACCESS_ID  cb_... gerado no cadastro do sistema na Central
// Opcionais (têm valor padrão):
//   CENTRAL_BUGS_ORIGIN     https://central-de-bugs.vercel.app
//   SAAS_ORIGIN             https://iaturismo.vercel.app (no site oficial: https://painel.tripsol.com.br)

const CENTRAL_PADRAO = "https://central-de-bugs.vercel.app";
const SAAS_PADRAO = "https://iaturismo.vercel.app";

function responder(res, status, corpo) {
  res.setHeader("Cache-Control", "no-store");
  if (corpo === undefined) { res.status(status).end(); return; }
  res.status(status).json(corpo);
}

export function identidade(phone) {
  const digitos = String(phone || "").replace(/\D/g, "");
  return digitos.length >= 10 ? `${digitos}@whatsapp.invalid` : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return responder(res, 405, { error: "Use POST." }); }

  const accessId = process.env.CENTRAL_BUGS_ACCESS_ID;
  const central = (process.env.CENTRAL_BUGS_ORIGIN || CENTRAL_PADRAO).replace(/\/+$/, "");
  const origin = (process.env.SAAS_ORIGIN || SAAS_PADRAO).replace(/\/+$/, "");
  // Sem o ID configurado: nenhum botão, sem erro para quem usa o app.
  if (!accessId) return responder(res, 204);

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
    const email = identidade((await perfil.json()).phone);
    if (!email) return responder(res, 401, { error: "Sessão sem conta confirmada." });

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
