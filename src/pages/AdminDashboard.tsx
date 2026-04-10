import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, MapPin, User, TrendingUp, RefreshCw, Users, Camera } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import CustomersPanel from "@/components/CustomersPanel";
import MuralsPanel from "@/components/MuralsPanel";

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
  const [activeTab, setActiveTab] = useState<"roteiros" | "clientes" | "murais">("roteiros");
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Painel Administrativo</h1>
            <p className="text-slate-600 mt-1">Gerencie roteiros e clientes</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={activeTab === "roteiros" ? "default" : "outline"}
            onClick={() => setActiveTab("roteiros")}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Roteiros
          </Button>
          <Button
            variant={activeTab === "clientes" ? "default" : "outline"}
            onClick={() => setActiveTab("clientes")}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Clientes
          </Button>
          <Button
            variant={activeTab === "murais" ? "default" : "outline"}
            onClick={() => setActiveTab("murais")}
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            Murais
          </Button>
        </div>

        {activeTab === "roteiros" ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="bg-white border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total de Roteiros</CardTitle>
                  <FileText className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                  <p className="text-xs text-slate-500 mt-1">PDFs gerados</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Hoje</CardTitle>
                  <Calendar className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-800">{stats.today}</div>
                  <p className="text-xs text-slate-500 mt-1">roteiros gerados hoje</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Esta Semana</CardTitle>
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-800">{stats.thisWeek}</div>
                  <p className="text-xs text-slate-500 mt-1">últimos 7 dias</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Tamanho Médio</CardTitle>
                  <FileText className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-800">
                    {(stats.avgTextLength / 1000).toFixed(1)}k
                  </div>
                  <p className="text-xs text-slate-500 mt-1">caracteres por roteiro</p>
                </CardContent>
              </Card>
            </div>

            {/* Refresh */}
            <div className="flex justify-end mb-4">
              <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>

            {/* Itineraries List */}
            <Card className="bg-white border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800">Roteiros Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {itineraries.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum roteiro gerado ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itineraries.map((itinerary) => (
                      <div
                        key={itinerary.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-slate-800 truncate">
                              {itinerary.title || "Roteiro sem título"}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {(itinerary.text_length / 1000).toFixed(1)}k chars
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
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
                              {format(new Date(itinerary.created_at), "dd/MM/yyyy HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                        </div>
                        <a href={itinerary.pdf_url} target="_blank" rel="noopener noreferrer" className="ml-4">
                          <Button size="sm" variant="outline" className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
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
        ) : (
          <MuralsPanel />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
