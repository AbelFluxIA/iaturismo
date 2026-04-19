import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    const { data, error } = await supabase.functions.invoke("list-admin-users", {
      method: "GET",
    });
    if (error || data?.error) {
      toast({ title: "Erro ao carregar usuários", description: error?.message || data?.error, variant: "destructive" });
    } else {
      setUsers(data.users || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
      setEmail("");
      setPassword("");
      fetchUsers();
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

  return (
    <div className="space-y-6">
      <Card className="bg-vibrant-mint border-2 border-foreground rounded-3xl shadow-none">
        <CardHeader>
          <CardTitle className="text-lg font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Criar Novo Administrador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="px-4 py-2.5 bg-card border-2 border-foreground rounded-full text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-secondary font-medium"
            />
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha (mín. 6 caracteres)"
                className="w-full px-4 py-2.5 pr-10 bg-card border-2 border-foreground rounded-full text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-secondary font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              type="submit"
              disabled={creating}
              className="rounded-full bg-secondary hover:bg-secondary-hover text-secondary-foreground font-bold uppercase border-2 border-foreground"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Criar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-card border-2 border-foreground rounded-3xl shadow-none">
        <CardHeader>
          <CardTitle className="text-lg font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Administradores ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-foreground/60" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-foreground/60 py-8">Nenhum administrador cadastrado</p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3 p-4 bg-background rounded-2xl border-2 border-foreground/10 flex-wrap"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Mail className="h-4 w-4 text-foreground/70" />
                      <span className="font-bold text-foreground truncate">{u.email}</span>
                      {u.isCurrent && (
                        <Badge className="bg-vibrant-yellow text-foreground border border-foreground text-[10px] uppercase">
                          Você
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-foreground/60 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Criado em {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      {u.last_sign_in_at && (
                        <span>
                          Último acesso: {format(new Date(u.last_sign_in_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                  {!u.isCurrent && (
                    <Button
                      size="sm"
                      onClick={() => handleDelete(u.id, u.email)}
                      className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold uppercase border-2 border-foreground"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Excluir
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPanel;
