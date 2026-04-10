import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Copy, FileText, RefreshCw, ExternalLink, Image } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Mural {
  id: string;
  phone: string;
  title: string | null;
  share_code: string;
  cover_photo_url: string | null;
  pdf_url: string | null;
  created_at: string;
}

interface MuralWithCount extends Mural {
  photo_count: number;
}

const MuralsPanel = () => {
  const [murals, setMurals] = useState<MuralWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const fetchMurals = async () => {
    setLoading(true);
    const { data: muralsData, error } = await supabase
      .from("photo_murals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching murals:", error);
      setLoading(false);
      return;
    }

    // Get photo counts
    const muralsWithCounts: MuralWithCount[] = [];
    for (const mural of muralsData || []) {
      const { count } = await supabase
        .from("mural_photos")
        .select("*", { count: "exact", head: true })
        .eq("mural_id", mural.id);

      muralsWithCounts.push({ ...mural, photo_count: count || 0 });
    }

    setMurals(muralsWithCounts);
    setLoading(false);
  };

  useEffect(() => {
    fetchMurals();
  }, []);

  const copyLink = (shareCode: string) => {
    const url = `https://iaturismo.lovable.app/mural/${shareCode}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const generatePdf = async (muralId: string) => {
    setGeneratingPdf(muralId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mural-pdf", {
        body: { mural_id: muralId },
      });

      if (error) throw error;

      toast.success("PDF gerado com sucesso!");
      fetchMurals();
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF: " + (error.message || "Erro desconhecido"));
    } finally {
      setGeneratingPdf(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Murais de Fotos</h2>
        <Button onClick={fetchMurals} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {murals.length === 0 ? (
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="text-center py-12 text-slate-500">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum mural criado ainda</p>
            <p className="text-sm mt-1">Os murais serão criados automaticamente quando o n8n enviar fotos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {murals.map((mural) => (
            <Card key={mural.id} className="bg-white border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Cover Photo */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    {mural.cover_photo_url ? (
                      <img
                        src={mural.cover_photo_url}
                        alt={mural.title || "Mural"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-8 w-8 text-slate-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-800 truncate">
                        {mural.title || "Mural sem título"}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {mural.photo_count} fotos
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">📱 {mural.phone}</p>
                    <p className="text-sm text-slate-500">
                      {format(new Date(mural.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyLink(mural.share_code)}
                      title="Copiar link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <a
                      href={`/mural/${mural.share_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline" title="Abrir mural">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generatePdf(mural.id)}
                      disabled={generatingPdf === mural.id || mural.photo_count === 0}
                      title="Gerar PDF"
                    >
                      {generatingPdf === mural.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MuralsPanel;
