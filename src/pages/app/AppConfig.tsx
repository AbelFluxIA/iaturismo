import { useState, useEffect } from "react";
import { useClientAuth, API_URL } from "@/contexts/ClientAuthContext";
import { useNavigate } from "react-router-dom";

function Field({
  label, value, onChange, type = "text", placeholder, readOnly,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c8a96e] transition ${
          readOnly
            ? "bg-[#f5f2ee] border-[#e8e2db] text-[#aaa] cursor-not-allowed"
            : "bg-white border-[#d0c9c0]"
        }`}
      />
    </div>
  );
}

export default function AppConfig() {
  const { profile, token, refreshProfile, logout } = useClientAuth();
  const navigate = useNavigate();

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
      if (!res.ok) { setError("Erro ao salvar. Tente novamente."); return; }
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/app/entrar", { replace: true });
  }

  return (
    <div className="px-4 pt-6 pb-8 space-y-6">
      <h2 className="text-xl font-bold text-[#1a1a1a]">Meu perfil</h2>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Dados pessoais */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#999] uppercase tracking-wide">Dados pessoais</p>
          <Field label="Nome" value={name} onChange={setName} placeholder="Seu nome" />
          <Field label="Telefone (WhatsApp)" value={profile?.phone ?? ""} readOnly />
        </div>

        {/* Viagem */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#999] uppercase tracking-wide">Viagem</p>
          <Field
            label="Destino"
            value={destination}
            onChange={setDestination}
            placeholder="Ex: João Pessoa - PB"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Chegada" value={arrivalDate} onChange={setArrivalDate} type="date" />
            <Field label="Partida" value={departureDate} onChange={setDepartureDate} type="date" />
          </div>
          <Field
            label="Horário de chegada"
            value={arrivalTime}
            onChange={setArrivalTime}
            type="time"
            placeholder="Ex: 14:00"
          />
          <Field
            label="Cidade de origem"
            value={originCity}
            onChange={setOriginCity}
            placeholder="Ex: São Paulo - SP"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-[#c8a96e] text-white font-semibold text-sm disabled:opacity-50 active:scale-95 transition-transform"
        >
          {saving ? "Salvando..." : saved ? "✓ Salvo!" : "Salvar alterações"}
        </button>
      </form>

      {/* Zona de perigo */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <p className="text-xs font-bold text-[#999] uppercase tracking-wide">Conta</p>
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl border border-red-200 text-red-500 font-semibold text-sm active:scale-95 transition-transform"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}
