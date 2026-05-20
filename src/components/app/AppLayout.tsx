import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useClientAuth } from "@/contexts/ClientAuthContext";

const tabs = [
  { to: "/app", label: "Início", icon: "🏠", exact: true },
  { to: "/app/roteiro", label: "Roteiro", icon: "📄", exact: false },
  { to: "/app/mural", label: "Mural", icon: "📸", exact: false },
  { to: "/app/creditos", label: "Créditos", icon: "⭐", exact: false },
];

export default function AppLayout() {
  const { logout, name } = useClientAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/app/entrar", { replace: true });
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#ece8e3]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#e0d9d0] safe-top">
        <div className="flex items-center gap-2">
          <span className="text-xl">☀️</span>
          <span className="font-bold text-[#1a1a1a]">Sol</span>
        </div>
        <div className="flex items-center gap-3">
          {name && <span className="text-sm text-[#666]">{name.split(" ")[0]}</span>}
          <button onClick={handleLogout} className="text-xs text-[#999] underline">
            Sair
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e0d9d0] flex safe-bottom z-50">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
                isActive ? "text-[#c8a96e]" : "text-[#aaa]"
              }`
            }
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
