import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Search, ShieldCheck } from "lucide-react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { Aviso, TopBar, btnPrimario, btnSecundario, cartao, mascararTelefone } from "@/components/app/ui";

// Administração (só para os telefones em ADMIN_PHONES no servidor): consulta um
// cliente e libera recursos para testes (Guia Sol, créditos, roteiro pago).
interface Cliente {
  name: string | null; phone: string; hasCompanion: boolean; hasPaid: boolean; freeCredits: number;
  destination: string | null; arrivalDate: string | null; departureDate: string | null;
  cota: { usados: number; limite?: number; renovaEm: string };
  cadastro: { concluidoEm: string | null; gostos: string[] };
  ultimoRoteiro: { destino: string | null; chegada: string | null; saida: string | null; status: string; pdf: boolean } | null;
  album: { podeEnviar: boolean; motivo: string | null };
}

export default function AppAdmin() {
  const { profile, token } = useClientAuth();
  const [phone, setPhone] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  if (profile && !profile.admin) return <Navigate to="/app/perfil" replace />;

  const cab = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  async function buscar(alvo = phone) {
    setErro(null); setAviso(null); setOcupado(true);
    try {
      const r = await fetch(`${API_URL}/api/app/admin/cliente?phone=${encodeURIComponent(alvo)}`, { headers: cab });
      const d = await r.json();
      if (!r.ok || !d?.phone || !d.cota || !d.cadastro || !d.album) { setCliente(null); setErro(d?.error ?? "Não consegui carregar este cliente."); return; }
      setCliente(d);
    } catch { setErro("Sem conexão."); } finally { setOcupado(false); }
  }
  async function acao(caminho: string, corpo: object, mensagem: string) {
    if (!cliente) return;
    setOcupado(true); setErro(null);
    try {
      const r = await fetch(`${API_URL}/api/app/admin/cliente/${caminho}`, { method: "POST", headers: cab, body: JSON.stringify({ phone: cliente.phone, ...corpo }) });
      if (!r.ok) { setErro((await r.json().catch(() => ({}))).error ?? "Erro"); return; }
      setAviso(mensagem);
      await buscar(cliente.phone);
    } catch { setErro("Sem conexão."); } finally { setOcupado(false); }
  }

  return (
    <div className="flex flex-col">
      <TopBar title="Administração" back="/app/perfil" />
      <div className="flex flex-col gap-3 px-5">
        <Aviso tom="atencao">Área interna para testes. Tudo que você liberar aqui vale de verdade para o cliente.</Aviso>
        <form onSubmit={(e) => { e.preventDefault(); if (phone.replace(/\D/g, "").length >= 12) buscar(); }} className="flex gap-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="WhatsApp com DDI, ex. 5583999999999" className="flex-1 min-w-0 h-12 px-3.5 rounded-xl border-[1.5px] border-sol-borda bg-white text-[15px] focus:outline-none focus:border-sol-mar" />
          <button type="submit" disabled={ocupado} aria-label="Buscar cliente" className="flex-none w-12 h-12 rounded-xl bg-sol-fundo text-white flex items-center justify-center disabled:opacity-40"><Search size={20} /></button>
        </form>
        {profile?.phone && <button type="button" onClick={() => { setPhone(profile.phone); buscar(profile.phone); }} className="self-start min-h-[44px] text-sm font-bold text-sol-mar">Usar meu próprio número</button>}
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        {aviso && <Aviso tom="ok">{aviso}</Aviso>}

        {cliente && (
          <>
            <section className={`${cartao} p-4 flex flex-col gap-1 text-[14px]`}>
              <span className="font-display font-extrabold text-lg">{cliente.name ?? "Sem nome"} · {mascararTelefone(cliente.phone)}</span>
              <span>Guia Sol: <strong>{cliente.hasCompanion ? "ativa" : "desligada"}</strong> · Pagou: <strong>{cliente.hasPaid ? "sim" : "não"}</strong> · Créditos: <strong>{cliente.freeCredits}</strong></span>
              <span>Roteiros na semana: <strong>{cliente.cota.usados}{cliente.cota.limite ? ` de ${cliente.cota.limite}` : ""}</strong></span>
              <span>Cadastro: {cliente.cadastro.concluidoEm ? "concluído" : "incompleto"}{cliente.cadastro.gostos.length ? ` · gostos: ${cliente.cadastro.gostos.join(", ")}` : ""}</span>
              <span>Último roteiro: {cliente.ultimoRoteiro ? `${cliente.ultimoRoteiro.destino ?? "?"} (${cliente.ultimoRoteiro.chegada ?? "?"} a ${cliente.ultimoRoteiro.saida ?? "?"}) · ${cliente.ultimoRoteiro.status}${cliente.ultimoRoteiro.pdf ? " · PDF" : ""}` : "nenhum"}</span>
              <span>Álbum: {cliente.album.podeEnviar ? "pode enviar fotos" : `bloqueado (${cliente.album.motivo})`}</span>
            </section>
            <div className="flex flex-col gap-2">
              <button type="button" disabled={ocupado} onClick={() => acao("guia", { ativa: !cliente.hasCompanion }, cliente.hasCompanion ? "Guia Sol desligada." : "Guia Sol ativada.")} className={`${cliente.hasCompanion ? btnSecundario : btnPrimario} w-full`}>
                <ShieldCheck size={18} /> {cliente.hasCompanion ? "Desligar Guia Sol" : "Ativar Guia Sol"}
              </button>
              <button type="button" disabled={ocupado} onClick={() => acao("credito", { quantidade: 1 }, "1 crédito adicionado.")} className={`${btnSecundario} w-full`}>+1 crédito de roteiro</button>
              <button type="button" disabled={ocupado || cliente.hasPaid} onClick={() => acao("pago", {}, "Marcado como pago.")} className={`${btnSecundario} w-full`}>Marcar roteiro como pago</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
