import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { DEMO_TOKEN, demoProfile } from "@/lib/demo";
import { API_NATIVA, ehNativo } from "@/lib/nativo";

// No site, as chamadas são relativas (a Vercel repassa /api/app para o bot).
// No app nativo não há Vercel: vai direto para o endereço do bot.
const API_URL = import.meta.env.VITE_API_URL || (ehNativo ? API_NATIVA : "");

export interface ClientProfile {
  name: string | null;
  phone: string;
  destination: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
  arrivalTime?: string | null;
  departureTime?: string | null;
  originCity?: string | null;
  groupType?: string | null;
  touristProfile?: string | null;
  ofertas?: { gratisDuranteTeste: boolean; guiaPreco: string };
  cota?: { usados: number; limite: number; renovaEm: string };
  cadastro?: {
    nascimento: string | null;
    concluidoEm: string | null;
    gostos?: string[];
    viagem?: { destino: string; chegada: string | null; saida: string | null } | null;
    lugaresDesejados?: string[];
    fotoUrl?: string | null;
    instagram?: string | null;
  };
  consentimentos?: Record<"termos" | "sos" | "localizacao_viagem", { versao: string; aceito: boolean; em: string } | null>;
  // Parâmetros das regras, vindos do servidor (o app só mostra)
  regras?: {
    roteirosGratisSemana: number;
    diaRoteiroPreco: number;
    maxDiasSemGuia: number;
    guiaRoteirosSemana: number;
    maxDiasComGuia: number;
    guiaPrecoDia: number;
    guiaPrecoMes: number;
    chatMensagensDia: number;
    guiaMensagensDia: number;
    tradutorMensagensDia: number;
  };
  // Recursos ligados no servidor (ex.: fotos dos locais pelo Google Maps)
  recursos?: { fotosLocais: boolean };
  admin?: boolean; // telefone em ADMIN_PHONES: vê a tela de administração
  hasPaid: boolean;
  hasCompanion: boolean;
  freeCredits: number;
  referralCode: string | null;
  referralStats: {
    totalReferrals: number;
    convertedReferrals: number;
    freeCredits: number;
    referralCode: string | null;
  } | null;
  mural: { id: string; share_code: string; title: string | null; cover_photo_url: string | null } | null;
  itinerary: { id: string; days: number; status: string; pdfUrl: string | null } | null;
}

interface ClientAuthState {
  token: string | null;
  phone: string | null;
  name: string | null;
  profile: ClientProfile | null;
  profileLoading: boolean;
  isDemo: boolean;
  login: (token: string, phone: string, name: string) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const ClientAuthContext = createContext<ClientAuthState | null>(null);

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("sol_client_token"));
  const [phone, setPhone] = useState<string | null>(() => localStorage.getItem("sol_client_phone"));
  const [name, setName] = useState<string | null>(() => localStorage.getItem("sol_client_name"));
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const login = (newToken: string, newPhone: string, newName: string) => {
    localStorage.setItem("sol_client_token", newToken);
    localStorage.setItem("sol_client_phone", newPhone);
    localStorage.setItem("sol_client_name", newName);
    setToken(newToken);
    setPhone(newPhone);
    setName(newName);
  };

  const logout = () => {
    // Apaga tudo que é da pessoa (sessão, feitas, checklist, contatos de emergência...):
    // num celular emprestado, quem entra depois não vê nada de quem saiu
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith("sol_")) localStorage.removeItem(k);
      sessionStorage.clear();
    } catch { /* sem armazenamento */ }
    setToken(null);
    setPhone(null);
    setName(null);
    setProfile(null);
  };

  const isDemo = token === DEMO_TOKEN;

  const refreshProfile = async () => {
    if (!token) return;
    if (token === DEMO_TOKEN) { setProfile(demoProfile()); return; }
    setProfileLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/app/perfil`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { logout(); return; }
      if (!res.ok) return;
      const data = await res.json();
      setProfile(data);
      if (data.name) {
        setName(data.name);
        localStorage.setItem("sol_client_name", data.name);
      }
    } catch {
      // silently fail — show cached data
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (token) refreshProfile();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ClientAuthContext.Provider value={{ token, phone, name, profile, profileLoading, isDemo, login, logout, refreshProfile }}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  const ctx = useContext(ClientAuthContext);
  if (!ctx) throw new Error("useClientAuth must be used inside ClientAuthProvider");
  return ctx;
}

export { API_URL };
