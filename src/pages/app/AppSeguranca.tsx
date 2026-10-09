import { Phone, Users } from "lucide-react";
import { TituloTela, cartao } from "@/components/app/ui";

const TELEFONES = [
  { numero: "190", nome: "Polícia" },
  { numero: "192", nome: "SAMU" },
  { numero: "193", nome: "Bombeiros" },
  { numero: "199", nome: "Defesa Civil" },
];

export default function AppSeguranca() {
  return (
    <div className="flex flex-col gap-2.5 px-5 pt-8">
      <TituloTela>Segurança</TituloTela>

      <a
        href="tel:190"
        className="flex items-center gap-4 p-[18px] rounded-[20px] bg-sol-sos text-white no-underline"
      >
        <span className="flex-none w-16 h-16 rounded-full border-[3px] border-white flex items-center justify-center font-display font-extrabold text-lg">SOS</span>
        <span className="flex flex-col gap-1">
          <span className="text-[17px] font-extrabold">Ligar para a polícia · 190</span>
          <span className="text-sm leading-snug text-[#FFE3DF]">Em risco imediato, ligue agora. A ligação funciona mesmo sem internet.</span>
        </span>
      </a>

      <section aria-label="Telefones úteis" className="flex flex-col gap-2.5">
        <h2 className="m-0 text-base font-extrabold">Telefones úteis</h2>
        <div className="grid grid-cols-2 gap-2">
          {TELEFONES.map((t) => (
            <a key={t.numero} href={`tel:${t.numero}`} className={`${cartao} flex items-center gap-3 px-3.5 py-3 text-sol-fundo no-underline`}>
              <Phone size={18} className="text-sol-mar" />
              <span className="flex flex-col">
                <span className="font-display font-extrabold text-[22px] leading-none">{t.numero}</span>
                <span className="text-sm text-sol-texto2">{t.nome}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section aria-label="Contatos de emergência" className={`${cartao} flex gap-3 p-3.5 opacity-80`}>
        <Users size={22} className="flex-none text-sol-texto2 mt-0.5" />
        <span className="flex flex-col gap-1">
          <span className="text-[15px] font-bold">Contatos de emergência</span>
          <span className="text-[13px] leading-snug text-sol-texto2">
            Em breve: cadastre até 3 pessoas de confiança para a Sol avisar, com a sua localização, quando você acionar o SOS.
          </span>
        </span>
      </section>

      <p className="m-0 text-[13px] leading-snug text-sol-texto2">
        A Sol é um apoio informativo. Não presta atendimento de emergência, não envia socorro e não substitui a orientação de autoridades.
      </p>
    </div>
  );
}
