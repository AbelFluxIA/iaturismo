import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Info, AlertTriangle, CheckCircle2 } from "lucide-react";

// Peças visuais do app do cliente, seguindo o protótipo Sol (185 telas).

export const btnPrimario =
  "flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-[14px] bg-sol-mar text-white text-[15px] font-bold active:scale-[.98] transition-transform disabled:bg-[#DDD5C7] disabled:text-[#4E5B60]";
export const btnSecundario =
  "flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-[14px] bg-white border-[1.5px] border-sol-borda text-sol-fundo text-[15px] font-bold active:scale-[.98] transition-transform";
export const cartao = "rounded-2xl bg-white border border-sol-linha";

export function TopBar({ title, step, back }: { title: string; step?: string; back?: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-1 px-4 pt-6 pb-1.5">
      <button
        type="button"
        aria-label="Voltar"
        onClick={() => (back ? navigate(back) : navigate(-1))}
        className="flex-none flex items-center justify-center w-12 h-12 -ml-2 text-sol-fundo"
      >
        <ChevronLeft size={24} />
      </button>
      <div className="flex-1 min-w-0 flex flex-col">
        {step && <span className="text-xs font-semibold text-sol-texto2">{step}</span>}
        <h1 className="m-0 font-display font-extrabold text-[21px] leading-tight tracking-tight">{title}</h1>
      </div>
    </div>
  );
}

export function TituloTela({ children }: { children: ReactNode }) {
  return <h1 className="m-0 font-display font-extrabold text-2xl tracking-tight">{children}</h1>;
}

type Tom = "info" | "atencao" | "erro" | "ok" | "neutro";

const TONS: Record<Tom, string> = {
  info: "bg-sol-claro text-sol-claro-texto border-[#CDE6F0]",
  atencao: "bg-sol-atencao text-sol-atencao-texto border-sol-atencao-borda",
  erro: "bg-sol-sos-claro text-[#7A1A12] border-[#F1CFCA]",
  ok: "bg-sol-ok-claro text-sol-ok-texto border-[#B9DCCB]",
  neutro: "bg-white text-sol-fundo border-sol-linha",
};

export function Aviso({ tom = "info", children }: { tom?: Tom; children: ReactNode }) {
  const Icone = tom === "atencao" || tom === "erro" ? AlertTriangle : tom === "ok" ? CheckCircle2 : Info;
  return (
    <div role="status" className={`flex gap-2.5 items-start px-3.5 py-3 rounded-[14px] border text-sm leading-snug ${TONS[tom]}`}>
      <Icone size={20} className="flex-none mt-px" />
      <span>{children}</span>
    </div>
  );
}

export function Carregando() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sol-mar" />
    </div>
  );
}

export function Vazio({ icone, titulo, texto, children }: { icone: ReactNode; titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 px-3 pt-9 pb-2">
      <div className="w-[72px] h-[72px] rounded-[22px] bg-sol-creme flex items-center justify-center text-sol-fundo">{icone}</div>
      <h2 className="mt-1 font-display font-extrabold text-[22px] leading-tight">{titulo}</h2>
      {texto && <p className="max-w-[300px] text-sm leading-snug text-sol-texto2">{texto}</p>}
      {children}
    </div>
  );
}

export function Selo({ tom = "info", children }: { tom?: Tom; children: ReactNode }) {
  return <span className={`flex-none text-xs font-extrabold px-2 py-1 rounded-full border-0 ${TONS[tom]}`}>{children}</span>;
}

export function formatarData(d: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" }) {
  if (!d) return null;
  const data = new Date(d);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC", ...opts });
}

export function mascararTelefone(phone: string | null | undefined) {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length < 10) return phone;
  return `+${d.slice(0, 2)} ${d.slice(2, 4)} *****-${d.slice(-4)}`;
}
