import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface ClientProfile {
  name: string | null;
  phone: string;
  destination: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
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
    localStorage.removeItem("sol_client_token");
    localStorage.removeItem("sol_client_phone");
    localStorage.removeItem("sol_client_name");
    setToken(null);
    setPhone(null);
    setName(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!token) return;
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
    <ClientAuthContext.Provider value={{ token, phone, name, profile, profileLoading, login, logout, refreshProfile }}>
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
