import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Phone, CreditCard, Plus, Search, Users, RefreshCw,
  ChevronDown, ChevronUp, Loader2,
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

  useEffect(() => { fetchCustomers(); }, []);

  const handleRefresh = () => { setRefreshing(true); fetchCustomers(); };

  const handleAddCustomer = async () => {
    if (!newPhone.trim()) { toast.error("Informe o número de telefone"); return; }
    const normalizedPhone = newPhone.replace(/[\s\-\(\)]/g, "");
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/manage-customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", phone: normalizedPhone, name: newName || null, free_credits: newCredits }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao adicionar cliente");
      }
      toast.success("Cliente adicionado!");
      setNewPhone(""); setNewName(""); setNewCredits(3); setShowAddForm(false);
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
        body: JSON.stringify({ action: "update-credits", customer_id: customerId, free_credits: Math.max(0, value) }),
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

  const filteredCustomers = customers.filter(c => {
    const term = search.toLowerCase();
    return c.phone.toLowerCase().includes(term) || (c.name && c.name.toLowerCase().includes(term));
  });

  const totalCredits = customers.reduce((acc, c) => acc + c.free_credits, 0);
  const customersWithCredits = customers.filter(c => c.free_credits > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary/40" />
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition";

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total de Clientes",    value: customers.length,     Icon: Users,      bg: "bg-vibrant-mint"     },
          { label: "Com Créditos",         value: customersWithCredits, Icon: CreditCard, bg: "bg-vibrant-lavender" },
          { label: "Créditos Disponíveis", value: totalCredits,         Icon: CreditCard, bg: "bg-vibrant-yellow"   },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl border border-border p-4`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">{s.label}</p>
              <s.Icon className="h-4 w-4 text-foreground/40" />
            </div>
            <p className="text-3xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition"
          />
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Telefone *</label>
              <input type="text" placeholder="5583999999999" value={newPhone} onChange={e => setNewPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Nome</label>
              <input type="text" placeholder="Nome do cliente" value={newName} onChange={e => setNewName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Créditos</label>
              <input type="number" min={0} value={newCredits} onChange={e => setNewCredits(parseInt(e.target.value) || 0)} className={inputClass} />
            </div>
            <button
              onClick={handleAddCustomer}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Customers List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Clientes ({filteredCustomers.length})
          </h2>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredCustomers.map(customer => {
              const isOpen = expanded === customer.id;
              return (
                <div key={customer.id} className="transition-colors">
                  <div className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/30 flex-wrap">
                    <button
                      onClick={() => setExpanded(isOpen ? null : customer.id)}
                      className="flex-1 min-w-0 text-left flex items-center gap-3"
                    >
                      {isOpen
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <h3 className="font-semibold text-sm text-foreground">{customer.name || "Sem nome"}</h3>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            customer.free_credits > 0
                              ? "bg-vibrant-mint text-foreground"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {customer.free_credits} crédito{customer.free_credits !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </span>
                          <span>
                            Desde {format(new Date(customer.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        {customer.interests && customer.interests.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {customer.interests.map(tag => (
                              <span
                                key={tag}
                                className="text-[10px] font-medium bg-muted text-foreground/70 px-2 py-0.5 rounded-full capitalize"
                              >
                                {INTEREST_LABELS[tag] || tag.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-2">
                      {editingCredits === customer.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            value={creditAmount}
                            onChange={e => setCreditAmount(parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 rounded-lg border border-border text-sm text-center font-bold bg-background focus:outline-none"
                          />
                          <button
                            className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                            onClick={() => handleSaveCredits(customer.id, creditAmount)}
                          >
                            Salvar
                          </button>
                          <button
                            className="text-muted-foreground hover:text-foreground text-sm px-1"
                            onClick={() => setEditingCredits(null)}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingCredits(customer.id); setCreditAmount(customer.free_credits); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-card hover:bg-muted transition-colors text-foreground"
                        >
                          <CreditCard className="h-3 w-3" />
                          Créditos
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-4 pt-2 bg-muted/20 border-t border-border">
                      <CustomerHistory phone={customer.phone} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersPanel;
