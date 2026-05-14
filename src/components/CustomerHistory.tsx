import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Calendar, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Itinerary {
  id: string;
  title: string | null;
  destination: string | null;
  pdf_url: string;
  file_name: string;
  created_at: string;
}

const CustomerHistory = ({ phone }: { phone: string }) => {
  const [items, setItems] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("generated_itineraries")
        .select("id, title, destination, pdf_url, file_name, created_at")
        .eq("phone", phone)
        .order("created_at", { ascending: false });
      setItems((data as Itinerary[]) || []);
      setLoading(false);
    })();
  }, [phone]);

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-foreground/60">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-foreground/60 italic">
        Nenhum roteiro gerado ainda para este cliente.
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">
          Histórico ({items.length} {items.length === 1 ? "roteiro" : "roteiros"})
        </span>
      </div>
      {items.map((it) => (
        <div
          key={it.id}
          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h4 className="font-semibold text-sm text-foreground truncate">
                {it.title || "Roteiro sem título"}
              </h4>
              {it.destination && (
                <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5" />
                  {it.destination}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(it.created_at), "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>
          <button
            onClick={() => handleDownload(it.pdf_url, it.file_name)}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Download className="h-3 w-3" />
            PDF
          </button>
        </div>
      ))}
    </div>
  );
};

export default CustomerHistory;
