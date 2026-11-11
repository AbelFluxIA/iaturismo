// Convite de amigo (RA-IND): o código do link /convite/CÓDIGO fica guardado no aparelho
// até a pessoa entrar pelo WhatsApp e concluir o cadastro; aí vai junto para o servidor.
// A chave não começa com "sol_" de propósito: sair da conta não apaga o convite.
const CHAVE = "convite_sol";
const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;

export function guardarConvite(codigo: string) {
  const c = codigo.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(c)) return;
  try { localStorage.setItem(CHAVE, JSON.stringify({ c, t: Date.now() })); } catch { /* sem armazenamento */ }
}

export function conviteGuardado(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) || "null");
    return v && Date.now() - v.t < VALIDADE_MS ? (v.c as string) : null;
  } catch { return null; }
}

export function limparConvite() {
  try { localStorage.removeItem(CHAVE); } catch { /* ok */ }
}
