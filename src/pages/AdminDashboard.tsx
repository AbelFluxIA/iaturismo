import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, MapPin, User, TrendingUp, RefreshCw, Users, Camera, LogOut, Shield } from "lucide-react";
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

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<"roteiros" | "clientes" | "murais" | "usuarios">("roteiros");
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0, today: 0, thisWeek: 0, thisMonth: 0, avgTextLength: 0,
  });
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
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        setStats({
          total: data.length,
          today: data.filter((i) => new Date(i.created_at) >= todayStart).length,
          thisWeek: data.filter((i) => new Date(i.created_at) >= weekStart).length,
          thisMonth: data.filter((i) => new Date(i.created_at) >= monthStart).length,
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

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/logo-sol.png"
              alt="Sol Turismo"
              className="h-14 w-14 rounded-full border-2 border-foreground bg-card object-contain"
            />
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-foreground">
                Painel Sol
              </h1>
              <p className="text-foreground/70 mt-1 font-medium">
                Roteiros, clientes e murais
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="rounded-full border-2 border-foreground bg-card hover:bg-foreground hover:text-background font-bold uppercase"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {[
            { id: "roteiros", label: "Roteiros", icon: FileText },
            { id: "clientes", label: "Clientes", icon: Users },
            { id: "murais", label: "Murais", icon: Camera },
            { id: "usuarios", label: "Usuários", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`rounded-full border-2 border-foreground font-bold uppercase ${
                  active
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary-hover"
                    : "bg-card text-foreground hover:bg-foreground hover:text-background"
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {activeTab === "roteiros" ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total de Roteiros", value: stats.total, sub: "PDFs gerados", icon: FileText, bg: "bg-vibrant-lavender" },
                { label: "Hoje", value: stats.today, sub: "gerados hoje", icon: Calendar, bg: "bg-vibrant-mint" },
                { label: "Esta Semana", value: stats.thisWeek, sub: "últimos 7 dias", icon: TrendingUp, bg: "bg-vibrant-orange" },
                { label: "Tamanho Médio", value: `${(stats.avgTextLength / 1000).toFixed(1)}k`, sub: "caracteres por roteiro", icon: FileText, bg: "bg-vibrant-yellow" },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <Card key={s.label} className={`${s.bg} border-2 border-foreground rounded-3xl shadow-none`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">{s.label}</CardTitle>
                      <Icon className="h-5 w-5 text-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-black text-foreground">{s.value}</div>
                      <p className="text-xs text-foreground/70 mt-1 font-medium">{s.sub}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Refresh */}
            <div className="flex justify-end mb-4">
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-full bg-card hover:bg-foreground hover:text-background border-2 border-foreground text-foreground font-bold uppercase"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>

            {/* Itineraries List */}
            <Card className="bg-card border-2 border-foreground rounded-3xl shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-bold uppercase tracking-wide text-foreground">Roteiros Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {itineraries.length === 0 ? (
                  <div className="text-center py-12 text-foreground/60">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Nenhum roteiro gerado ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itineraries.map((itinerary) => (
                      <div
                        key={itinerary.id}
                        className="flex items-center justify-between gap-3 p-4 bg-background rounded-2xl border-2 border-foreground/10 hover:border-secondary transition-colors flex-wrap"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-foreground truncate">
                              {itinerary.title || "Roteiro sem título"}
                            </h3>
                            <Badge className="bg-vibrant-yellow text-foreground border border-foreground text-[10px] uppercase">
                              {(itinerary.text_length / 1000).toFixed(1)}k chars
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-foreground/70 flex-wrap">
                            {itinerary.destination && (
                              <span className="flex items-center gap-1 font-medium">
                                <MapPin className="h-3 w-3" />
                                {itinerary.destination}
                              </span>
                            )}
                            {itinerary.traveler_name && (
                              <span className="flex items-center gap-1 font-medium">
                                <User className="h-3 w-3" />
                                {itinerary.traveler_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(itinerary.created_at), "dd/MM/yyyy HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                        </div>
                        <a href={itinerary.pdf_url} target="_blank" rel="noopener noreferrer" download={itinerary.file_name}>
                          <Button
                            size="sm"
                            className="rounded-full bg-secondary hover:bg-secondary-hover text-secondary-foreground font-bold uppercase border-2 border-foreground"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
