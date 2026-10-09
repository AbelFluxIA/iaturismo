import { useState, useEffect } from "react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { TopBar, Aviso, btnPrimario, cartao } from "@/components/app/ui";

function Field({
  label, value, onChange, type = "text", placeholder, readOnly,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-sm font-bold">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full min-w-0 h-12 px-3.5 rounded-xl border-[1.5px] text-base focus:outline-none focus:border-sol-mar ${
          readOnly ? "bg-sol-bege border-sol-linha text-sol-texto2" : "bg-white border-sol-borda text-sol-fundo"
        }`}
      />
    </div>
  );
}

export default function AppConfig() {
  const { profile, token, refreshProfile } = useClientAuth();

  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [originCity, setOriginCity] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Preenche os campos com os dados do perfil atual
  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setDestination(profile.destination ?? "");
    setArrivalDate(profile.arrivalDate?.slice(0, 10) ?? "");
    setDepartureDate(profile.departureDate?.slice(0, 10) ?? "");
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nome é obrigatório"); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/app/perfil`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, destination, arrivalDate, departureDate, arrivalTime, originCity }),
      });
      if (!res.ok) { setError("Não foi possível salvar. Tente de novo."); return; }
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Sem conexão. Conecte-se para salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col">
      <TopBar title="Minha conta e viagem" back="/app/perfil" />
      <form onSubmit={handleSave} className="flex flex-col gap-2.5 px-5">
        <section className={`${cartao} flex flex-col gap-3 p-4`}>
          <h2 className="m-0 text-base font-extrabold">Seus dados</h2>
          <Field label="Nome" value={name} onChange={setName} placeholder="Seu nome" />
          <Field label="WhatsApp da conta" value={profile?.phone ?? ""} readOnly />
        </section>

        <section className={`${cartao} flex flex-col gap-3 p-4`}>
          <h2 className="m-0 text-base font-extrabold">Sua viagem</h2>
          <Field label="Destino" value={destination} onChange={setDestination} placeholder="Ex.: João Pessoa - PB" />
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Chegada" value={arrivalDate} onChange={setArrivalDate} type="date" />
            <Field label="Partida" value={departureDate} onChange={setDepartureDate} type="date" />
          </div>
          <Field label="Horário de chegada" value={arrivalTime} onChange={setArrivalTime} type="time" />
          <Field label="Cidade de origem" value={originCity} onChange={setOriginCity} placeholder="Ex.: São Paulo - SP" />
          <p className="m-0 text-[13px] text-sol-texto2">A mudança vale para os próximos roteiros. O roteiro já gerado não muda.</p>
        </section>

        {error && <Aviso tom="erro">{error}</Aviso>}
        {saved && <Aviso tom="ok">Dados salvos.</Aviso>}

        <button type="submit" disabled={saving} className={btnPrimario}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
