import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Calendar, MapPin, User, TrendingUp, RefreshCw, Users, Camera, LogOut, Shield, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import CustomersPanel from "@/components/CustomersPanel";
import MuralsPanel from "@/components/MuralsPanel";
import UsersPanel from "@/components/UsersPanel";

interface Itinerary {
  id: string;
  title: string | null;
  destination: string | null;
  traveler_name: string | null;
  pdf_url: string;
  file_name: string;
  text_length: number;
  created_at: string;
}

interface Stats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  avgTextLength: number;
}

const TABS = [
  { id: "roteiros",  label: "Roteiros",  Icon: FileText },
  { id: "clientes",  label: "Clientes",  Icon: Users    },
  { id: "murais",    label: "Murais",    Icon: Camera   },
  { id: "usuarios",  label: "Usuários",  Icon: Shield   },
] as const;

type TabId = typeof TABS[number]["id"];

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("roteiros");
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, today: 0, thisWeek: 0, thisMonth: 0, avgTextLength: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("generated_itineraries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data) {
        setItineraries(data);
        const now = new Date();
        const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart   = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
        const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);

        setStats({
          total:         data.length,
          today:         data.filter(i => new Date(i.created_at) >= todayStart).length,
          thisWeek:      data.filter(i => new Date(i.created_at) >= weekStart).length,
          thisMonth:     data.filter(i => new Date(i.created_at) >= monthStart).length,
          avgTextLength: data.length > 0
            ? Math.round(data.reduce((acc, i) => acc + i.text_length, 0) / data.length)
            : 0,
        });
      }
    } catch (error) {
      console.error("Error fetching itineraries:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img
              src="/logo-sol.png"
              alt="Sol Turismo"
              className="h-11 w-11 rounded-full border border-border bg-card object-contain"
            />
            <div>
              <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                Painel Sol
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                Roteiros · Clientes · Murais
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg bg-card hover:bg-muted transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-muted/50 rounded-lg p-1 w-fit flex-wrap">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "roteiros" ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total", value: stats.total,         sub: "PDFs gerados",         bg: "bg-vibrant-mint"     },
                { label: "Hoje",  value: stats.today,         sub: "gerados hoje",          bg: "bg-vibrant-lavender" },
                { label: "Semana",value: stats.thisWeek,      sub: "últimos 7 dias",        bg: "bg-vibrant-orange"   },
                { label: "Média", value: `${(stats.avgTextLength / 1000).toFixed(1)}k`, sub: "chars por roteiro", bg: "bg-vibrant-yellow" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl border border-border p-4`}>
                  <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide mb-1">{s.label}</p>
                  <p className="text-3xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-foreground/50 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Refresh */}
            <div className="flex justify-end mb-3">
              <button
                onClick={() => { setRefreshing(true); fetchData(); }}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg bg-card hover:bg-muted transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Atualizar
              </button>
            </div>

            {/* List */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Roteiros Recentes
                </h2>
              </div>
              <div className="divide-y divide-border">
                {itineraries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum roteiro gerado ainda</p>
                  </div>
                ) : itineraries.map(itinerary => (
                  <div
                    key={itinerary.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors flex-wrap"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="font-semibold text-sm text-foreground truncate">
                          {itinerary.title || "Roteiro sem título"}
                        </h3>
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {(itinerary.text_length / 1000).toFixed(1)}k
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {itinerary.destination && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {itinerary.destination}
                          </span>
                        )}
                        {itinerary.traveler_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {itinerary.traveler_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(itinerary.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <a href={itinerary.pdf_url} target="_blank" rel="noopener noreferrer" download={itinerary.file_name}>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </button>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : activeTab === "clientes" ? (
          <CustomersPanel />
        ) : activeTab === "murais" ? (
          <MuralsPanel />
        ) : (
          <UsersPanel />
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
