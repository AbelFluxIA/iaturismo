import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, MapPin, Globe2, CalendarDays, Sparkles, Route, Store,
  Loader2, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface MetricRow {
  conversation_id: string;
  itinerary_id: string | null;
  conversation_created_at: string;
  itinerary_created_at: string | null;
  destination: string | null;
  origin_city: string | null;
  tourist_profile: string | null;
  group_type: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  days: number | null;
  itinerary_status: string | null;
  has_paid: boolean;
  has_companion: boolean;
}

type ProfileCategory = "negocios" | "inovacao" | "gastronomia" | "cultura" | "aventura" | "praia" | "outro";

const PROFILE_CATEGORIES: ProfileCategory[] = [
  "negocios", "inovacao", "gastronomia", "cultura", "aventura", "praia", "outro",
];

const PROFILE_CATEGORY_LABELS: Record<ProfileCategory, string> = {
  negocios: "Negócios",
  inovacao: "Inovação / Tech",
  gastronomia: "Gastronômico",
  cultura: "Cultural",
  aventura: "Aventura",
  praia: "Lazer / Praia",
  outro: "Outro",
};

const PROFILE_CATEGORY_COLORS: Record<ProfileCategory, string> = {
  negocios: "hsl(var(--card-blue))",
  inovacao: "hsl(var(--card-magenta))",
  gastronomia: "hsl(var(--card-coral))",
  cultura: "hsl(var(--card-lavender))",
  aventura: "hsl(var(--card-orange))",
  praia: "hsl(var(--card-mint))",
  outro: "hsl(var(--border))",
};

// Ordem importa: categorias específicas checadas antes do catch-all "lazer|praia",
// pra não sequestrar perfis mais específicos que também mencionem lazer.
const PROFILE_RULES: Array<{ category: ProfileCategory; pattern: RegExp }> = [
  { category: "negocios", pattern: /neg[oó]cios?/i },
  { category: "inovacao", pattern: /inova[çc][ãa]o|tecnol[oó]gic/i },
  { category: "gastronomia", pattern: /gastron[oô]mic/i },
  { category: "cultura", pattern: /cultural/i },
  { category: "aventura", pattern: /aventura/i },
  { category: "praia", pattern: /lazer|praia|piscina/i },
];

function categorizeTouristProfile(profile: string | null | undefined): ProfileCategory {
  if (!profile) return "outro";
  const head = profile.slice(0, 30);
  const hit = PROFILE_RULES.find(rule => rule.pattern.test(head));
  return hit ? hit.category : "outro";
}

// Mantém só a linha mais recente de cada conversa — necessário pras métricas de
// grão-cliente (adoção da Sol Guia, distribuição de perfil), que não podem contar
// o mesmo cliente 2x só porque ele gerou 2 roteiros.
function latestRowPerConversation(rows: MetricRow[]): MetricRow[] {
  const sorted = [...rows].sort((a, b) => {
    const aDate = a.itinerary_created_at ?? a.conversation_created_at;
    const bDate = b.itinerary_created_at ?? b.conversation_created_at;
    return bDate.localeCompare(aDate);
  });
  const seen = new Set<string>();
  const result: MetricRow[] = [];
  for (const row of sorted) {
    if (seen.has(row.conversation_id)) continue;
    seen.add(row.conversation_id);
    result.push(row);
  }
  return result;
}

function buildMonthlyVolume(rows: MetricRow[]) {
  const buckets = new Map<string, { conversas: Set<string>; roteiros: number }>();
  for (const row of rows) {
    const key = row.conversation_created_at.slice(0, 7);
    if (!buckets.has(key)) buckets.set(key, { conversas: new Set(), roteiros: 0 });
    const bucket = buckets.get(key)!;
    bucket.conversas.add(row.conversation_id);
    if (row.itinerary_id) bucket.roteiros += 1;
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, bucket]) => ({
      month: format(new Date(`${key}-01T12:00:00`), "MMM/yy", { locale: ptBR }),
      conversas: bucket.conversas.size,
      roteiros: bucket.roteiros,
    }));
}

function topCounts(rows: MetricRow[], field: "destination" | "origin_city", limit = 8) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[field];
    if (!value?.trim()) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function buildProfileDistribution(rows: MetricRow[]) {
  const perConversation = latestRowPerConversation(rows);
  const counts = new Map<ProfileCategory, number>();
  for (const row of perConversation) {
    const cat = categorizeTouristProfile(row.tourist_profile);
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  return PROFILE_CATEGORIES
    .map(cat => ({ category: cat, label: PROFILE_CATEGORY_LABELS[cat], value: counts.get(cat) ?? 0 }))
    .filter(entry => entry.value > 0);
}

function computeAvgDays(rows: MetricRow[]): number | null {
  const values = rows.map(r => r.days).filter((d): d is number => typeof d === "number" && d > 0);
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, d) => sum + d, 0) / values.length) * 10) / 10;
}

const DAY_BUCKETS = [
  { label: "1-2 dias", test: (d: number) => d <= 2 },
  { label: "3-4 dias", test: (d: number) => d >= 3 && d <= 4 },
  { label: "5-7 dias", test: (d: number) => d >= 5 && d <= 7 },
  { label: "8+ dias", test: (d: number) => d >= 8 },
];

function buildDaysHistogram(rows: MetricRow[]) {
  const values = rows.map(r => r.days).filter((d): d is number => typeof d === "number" && d > 0);
  return DAY_BUCKETS.map(b => ({ label: b.label, count: values.filter(b.test).length }));
}

function computeCompanionAdoption(rows: MetricRow[]) {
  const perConversation = latestRowPerConversation(rows);
  const total = perConversation.length;
  const adopted = perConversation.filter(r => r.has_companion).length;
  return { total, adopted, rate: total > 0 ? Math.round((adopted / total) * 100) : 0 };
}

// Números redondos/fictícios só pra ilustrar a demo — nunca gravados no banco.
// Trocar pelos números reais assim que houver volume, mantendo o rótulo de
// "ilustrativo" enquanto for projeção e não medição direta do produto.
const ILLUSTRATIVE_LABEL = "Projeção com ~500 conversas/mês em João Pessoa";
const ILLUSTRATIVE_ORIGINS = [
  { name: "Recife - PE", count: 145 },
  { name: "São Paulo - SP", count: 98 },
  { name: "Blumenau - SC", count: 61 },
  { name: "Campina Grande - PB", count: 54 },
  { name: "Brasília - DF", count: 40 },
  { name: "Outras cidades", count: 102 },
];
const ILLUSTRATIVE_PROFILE: Array<{ category: ProfileCategory; label: string; value: number }> = [
  { category: "praia", label: PROFILE_CATEGORY_LABELS.praia, value: 34 },
  { category: "gastronomia", label: PROFILE_CATEGORY_LABELS.gastronomia, value: 22 },
  { category: "cultura", label: PROFILE_CATEGORY_LABELS.cultura, value: 18 },
  { category: "negocios", label: PROFILE_CATEGORY_LABELS.negocios, value: 14 },
  { category: "aventura", label: PROFILE_CATEGORY_LABELS.aventura, value: 8 },
  { category: "inovacao", label: PROFILE_CATEGORY_LABELS.inovacao, value: 4 },
];

function SectionHeader({ title, badge, badgeVariant = "real" }: { title: string; badge?: string; badgeVariant?: "real" | "example" }) {
  return (
    <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
      <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
        {title}
      </h2>
      {badge && (
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
            badgeVariant === "real" ? "bg-vibrant-mint text-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

const MetricsPanel = () => {
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from("v_metrics")
        .select("*")
        .order("conversation_created_at", { ascending: true });
      if (error) throw error;
      setRows((data as MetricRow[]) || []);
    } catch (err) {
      console.error("Error fetching metrics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchMetrics(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary/40" />
      </div>
    );
  }

  const conversationCount = new Set(rows.map(r => r.conversation_id)).size;
  const itineraryCount = rows.filter(r => r.itinerary_id).length;
  const destinationCount = new Set(rows.map(r => r.destination).filter(Boolean)).size;
  const originCount = new Set(rows.map(r => r.origin_city).filter(Boolean)).size;
  const avgDays = computeAvgDays(rows);
  const adoption = computeCompanionAdoption(rows);

  const monthlyVolume = buildMonthlyVolume(rows);
  const topDestinations = topCounts(rows, "destination");
  const topOrigins = topCounts(rows, "origin_city");
  const profileDistribution = buildProfileDistribution(rows);
  const daysHistogram = buildDaysHistogram(rows);

  const statCards = [
    { label: "Conversas", value: conversationCount, Icon: BarChart3, bg: "bg-vibrant-mint" },
    { label: "Roteiros Gerados", value: itineraryCount, Icon: Route, bg: "bg-vibrant-lavender" },
    { label: "Destinos Únicos", value: destinationCount, Icon: MapPin, bg: "bg-vibrant-yellow" },
    { label: "Origens Únicas", value: originCount, Icon: Globe2, bg: "bg-vibrant-orange" },
    { label: "Duração Média", value: avgDays !== null ? `${avgDays}d` : "—", Icon: CalendarDays, bg: "bg-vibrant-blue" },
    { label: "Adoção Sol Guia", value: `${adoption.rate}%`, Icon: Sparkles, bg: "bg-vibrant-coral" },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl border border-border p-4`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">{s.label}</p>
              <s.Icon className="h-4 w-4 text-foreground/40" />
            </div>
            <p className="text-3xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Refresh */}
      <div className="flex justify-end">
        <button
          onClick={() => { setRefreshing(true); fetchMetrics(); }}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg bg-card hover:bg-muted transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Volume ao longo do tempo */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <SectionHeader title="Volume ao longo do tempo" badge="Dados reais" badgeVariant="real" />
        <div className="p-5">
          {monthlyVolume.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Ainda sem histórico suficiente.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="conversas" name="Conversas iniciadas" fill="hsl(var(--card-mint))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="roteiros" name="Roteiros gerados" fill="hsl(var(--card-lavender))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top destinos / Top origens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <SectionHeader title="Pra onde os turistas vão" badge="Dados reais" badgeVariant="real" />
          <div className="p-5">
            {topDestinations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem destinos registrados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, topDestinations.length * 36)}>
                <BarChart data={topDestinations} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Viagens" fill="hsl(var(--card-orange))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <SectionHeader title="De onde os turistas vêm" badge="Dados reais" badgeVariant="real" />
          <div className="p-5">
            {topOrigins.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem origens registradas ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, topOrigins.length * 36)}>
                <BarChart data={topOrigins} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Viagens" fill="hsl(var(--card-blue))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Perfil de turismo / Duração da viagem */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <SectionHeader title="Perfil de turismo" badge="Dados reais" badgeVariant="real" />
          <div className="p-5">
            {profileDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem perfis classificados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={profileDistribution}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={55}
                    outerRadius={90}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {profileDistribution.map(entry => (
                      <Cell key={entry.category} fill={PROFILE_CATEGORY_COLORS[entry.category]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={48} wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <SectionHeader title="Duração da viagem" badge="Dados reais" badgeVariant="real" />
          <div className="p-5">
            <p className="text-sm text-muted-foreground mb-3">
              Média: <span className="text-foreground font-semibold">{avgDays !== null ? `${avgDays} dias` : "sem dados ainda"}</span>
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={daysHistogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Roteiros" fill="hsl(var(--card-yellow))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Adoção Sol Guia */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <SectionHeader title="Adoção da Sol Guia" badge="Dados reais" badgeVariant="real" />
        <div className="p-5 flex flex-col sm:flex-row items-center gap-6">
          <ResponsiveContainer width={160} height={160} className="flex-none">
            <PieChart>
              <Pie
                data={[
                  { name: "Ativaram", value: adoption.adopted },
                  { name: "Não ativaram", value: Math.max(adoption.total - adoption.adopted, 0) },
                ]}
                dataKey="value"
                innerRadius={45}
                outerRadius={75}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              >
                <Cell fill="hsl(var(--success))" />
                <Cell fill="hsl(var(--muted))" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div>
            <p className="text-4xl font-bold text-foreground">{adoption.rate}%</p>
            <p className="text-sm text-muted-foreground mt-1">
              {adoption.adopted} de {adoption.total} clientes ativaram o acompanhamento em tempo real
            </p>
          </div>
        </div>
      </div>

      {/* Seção ilustrativa — projeção em escala */}
      <div className="bg-card border border-dashed border-border rounded-xl overflow-hidden">
        <SectionHeader title="Como fica em escala" badge="Dados ilustrativos — projeção" badgeVariant="example" />
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">{ILLUSTRATIVE_LABEL}</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide mb-2">De onde viriam os turistas</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ILLUSTRATIVE_ORIGINS} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Conversas/mês" fill="hsl(var(--card-blue))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide mb-2">Mix de perfil de turismo</p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={ILLUSTRATIVE_PROFILE}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={80}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {ILLUSTRATIVE_PROFILE.map(entry => (
                      <Cell key={entry.category} fill={PROFILE_CATEGORY_COLORS[entry.category]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Negócios locais — visão de produto */}
      <div className="bg-card border border-dashed border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            <Store className="h-4 w-4 text-muted-foreground" />
            Negócios locais recomendados
          </h2>
          <span className="text-[10px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            Em breve — visão de produto
          </span>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            A Sol vai identificar automaticamente pousadas, restaurantes e passeios mais recomendados a
            partir dos próprios roteiros gerados, fortalecendo o turismo local com dados reais de demanda.
          </p>
          <div className="space-y-2 opacity-40 pointer-events-none select-none">
            {["Restaurante local", "Pousada / hospedagem", "Passeio / experiência"].map(name => (
              <div key={name} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-background">
                <span className="text-sm font-medium text-foreground">{name}</span>
                <span className="text-xs text-muted-foreground">-- menções</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;
