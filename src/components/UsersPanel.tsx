import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Mail, Calendar, Loader2, Shield, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  isCurrent: boolean;
}

const UsersPanel = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("list-admin-users", { method: "GET" });
    if (error || data?.error) {
      toast({ title: "Erro ao carregar usuários", description: error?.message || data?.error, variant: "destructive" });
    } else {
      setUsers(data.users || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast({ title: "Dados inválidos", description: "Email válido e senha com 6+ caracteres", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-admin-user", {
      body: { email: email.trim(), password },
    });
    if (error || data?.error) {
      toast({ title: "Erro ao criar usuário", description: error?.message || data?.error, variant: "destructive" });
    } else {
      toast({ title: "Usuário criado!", description: `${email} já pode fazer login` });
      setEmail(""); setPassword(""); fetchUsers();
    }
    setCreating(false);
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!confirm(`Excluir o usuário ${userEmail}? Esta ação não pode ser desfeita.`)) return;
    const { data, error } = await supabase.functions.invoke("list-admin-users", {
      method: "DELETE",
      body: { userId },
    });
    if (error || data?.error) {
      toast({ title: "Erro ao excluir", description: error?.message || data?.error, variant: "destructive" });
    } else {
      toast({ title: "Usuário excluído" });
      fetchUsers();
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition text-sm font-medium";

  return (
    <div className="space-y-5">
      {/* Create Form */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Criar Administrador
          </h2>
        </div>
        <div className="p-5">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className={inputClass}
            />
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Senha (mín. 6 caracteres)"
                className={inputClass + " pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Criar
            </button>
          </form>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Administradores ({users.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Nenhum administrador cadastrado</p>
        ) : (
          <div className="divide-y divide-border">
            {users.map(u => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm text-foreground truncate">{u.email}</span>
                    {u.isCurrent && (
                      <span className="text-[10px] font-semibold bg-vibrant-yellow text-foreground px-2 py-0.5 rounded-full">
                        Você
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Criado em {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    {u.last_sign_in_at && (
                      <span>Último acesso: {format(new Date(u.last_sign_in_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                    )}
                  </div>
                </div>
                {!u.isCurrent && (
                  <button
                    onClick={() => handleDelete(u.id, u.email)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Excluir
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPanel;
