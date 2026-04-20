import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  CreditCard,
  Plus,
  Search,
  Users,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import CustomerHistory from "./CustomerHistory";

interface Customer {
  id: string;
  phone: string;
  name: string | null;
  free_credits: number;
  interests: string[] | null;
  created_at: string;
  updated_at: string;
}

const INTEREST_LABELS: Record<string, string> = {
  praia: "🏖️ Praia",
  gastronomia: "🍽️ Gastronomia",
  cultura: "🎭 Cultura",
  historia: "🏛️ História",
  natureza: "🌿 Natureza",
  aventura: "🧗 Aventura",
  tecnologia: "💻 Tecnologia",
  negocios: "💼 Negócios",
  vida_noturna: "🌃 Vida Noturna",
  compras: "🛍️ Compras",
  romantico: "💕 Romântico",
  familia: "👨‍👩‍👧 Família",
  religioso: "⛪ Religioso",
  esportes: "⚽ Esportes",
  bem_estar: "🧘 Bem-estar",
  ecoturismo: "🌳 Ecoturismo",
};

const CustomersPanel = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newCredits, setNewCredits] = useState(3);
  const [editingCredits, setEditingCredits] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) setCustomers(data as Customer[]);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  const handleAddCustomer = async () => {
    if (!newPhone.trim()) {
      toast.error("Informe o número de telefone");
      return;
    }
    const normalizedPhone = newPhone.replace(/[\s\-\(\)]/g, "");
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/manage-customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          phone: normalizedPhone,
          name: newName || null,
          free_credits: newCredits,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao adicionar cliente");
      }
      toast.success("Cliente adicionado!");
      setNewPhone("");
      setNewName("");
      setNewCredits(3);
      setShowAddForm(false);
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSaveCredits = async (customerId: string, value: number) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/manage-customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-credits",
          customer_id: customerId,
          free_credits: Math.max(0, value),
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao atualizar créditos");
      }
      toast.success(`Créditos atualizados para ${value}`);
      setEditingCredits(null);
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.phone.toLowerCase().includes(term) ||
      (c.name && c.name.toLowerCase().includes(term))
    );
  });

  const totalCredits = customers.reduce((acc, c) => acc + c.free_credits, 0);
  const customersWithCredits = customers.filter((c) => c.free_credits > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-vibrant-lavender border-2 border-foreground rounded-3xl shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Total de Clientes
            </CardTitle>
            <Users className="h-5 w-5 text-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-foreground">{customers.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-vibrant-mint border-2 border-foreground rounded-3xl shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Com Créditos
            </CardTitle>
            <CreditCard className="h-5 w-5 text-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-foreground">{customersWithCredits}</div>
          </CardContent>
        </Card>

        <Card className="bg-vibrant-yellow border-2 border-foreground rounded-3xl shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Créditos Disponíveis
            </CardTitle>
            <CreditCard className="h-5 w-5 text-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-foreground">{totalCredits}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/60" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-full border-2 border-foreground bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={refreshing}
          className="rounded-full border-2 border-foreground bg-card hover:bg-foreground hover:text-background font-bold uppercase"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-full bg-primary hover:bg-primary-hover border-2 border-foreground text-foreground font-bold uppercase"
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="bg-card border-2 border-foreground rounded-3xl shadow-none">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 block">
                  Telefone *
                </label>
                <input
                  type="text"
                  placeholder="5583999999999"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-4 py-2 rounded-full border-2 border-foreground bg-card text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 block">
                  Nome
                </label>
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2 rounded-full border-2 border-foreground bg-card text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 block">
                  Créditos
                </label>
                <input
                  type="number"
                  min={0}
                  value={newCredits}
                  onChange={(e) => setNewCredits(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 rounded-full border-2 border-foreground bg-card text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>
              <Button
                onClick={handleAddCustomer}
                className="rounded-full bg-secondary hover:bg-secondary-hover border-2 border-foreground text-secondary-foreground font-bold uppercase"
              >
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customers List */}
      <Card className="bg-card border-2 border-foreground rounded-3xl shadow-none">
        <CardHeader>
          <CardTitle className="text-lg font-bold uppercase tracking-wide text-foreground">
            Clientes ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-foreground/60">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Nenhum cliente encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map((customer) => {
                const isOpen = expanded === customer.id;
                return (
                  <div
                    key={customer.id}
                    className="rounded-2xl border-2 border-foreground/20 bg-background overflow-hidden transition-all"
                  >
                    <div className="flex items-center justify-between gap-3 p-4 flex-wrap">
                      <button
                        onClick={() => setExpanded(isOpen ? null : customer.id)}
                        className="flex-1 min-w-0 text-left flex items-center gap-3"
                      >
                        {isOpen ? (
                          <ChevronUp className="h-5 w-5 text-foreground/60 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-foreground/60 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-foreground">
                              {customer.name || "Sem nome"}
                            </h3>
                            <Badge
                              className={`text-[10px] uppercase font-bold border ${
                                customer.free_credits > 0
                                  ? "bg-vibrant-mint text-foreground border-foreground"
                                  : "bg-accent-red text-background border-foreground"
                              }`}
                            >
                              {customer.free_credits} crédito{customer.free_credits !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-foreground/70 flex-wrap">
                            <span className="flex items-center gap-1 font-medium">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </span>
                            <span className="text-xs">
                              Desde {format(new Date(customer.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        {editingCredits === customer.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              value={creditAmount}
                              onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 rounded-full border-2 border-foreground text-sm text-center font-bold"
                            />
                            <Button
                              size="sm"
                              className="rounded-full bg-secondary hover:bg-secondary-hover text-secondary-foreground font-bold uppercase text-xs border-2 border-foreground"
                              onClick={() => handleSaveCredits(customer.id, creditAmount)}
                            >
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingCredits(null)}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              setEditingCredits(customer.id);
                              setCreditAmount(customer.free_credits);
                            }}
                            className="rounded-full bg-card hover:bg-foreground hover:text-background border-2 border-foreground text-foreground font-bold uppercase text-xs"
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Créditos
                          </Button>
                        )}
                      </div>
                    </div>
                    {isOpen && (
                      <div className="px-4 pb-4 border-t-2 border-foreground/10 pt-3">
                        <CustomerHistory phone={customer.phone} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomersPanel;
