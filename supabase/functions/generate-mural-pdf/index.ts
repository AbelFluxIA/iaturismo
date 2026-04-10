import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mural_id } = await req.json();

    if (!mural_id) {
      return new Response(
        JSON.stringify({ error: "mural_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch mural
    const { data: mural, error: muralError } = await supabase
      .from("photo_murals")
      .select("*")
      .eq("id", mural_id)
      .single();

    if (muralError || !mural) {
      return new Response(
        JSON.stringify({ error: "Mural not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch photos
    const { data: photos, error: photosError } = await supabase
      .from("mural_photos")
      .select("*")
      .eq("mural_id", mural_id)
      .order("order_index", { ascending: true });

    if (photosError) throw photosError;

    if (!photos || photos.length === 0) {
      return new Response(
        JSON.stringify({ error: "No photos in this mural" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a full narrative using AI
    const photoCaptions = photos.map((p, i) => `Foto ${i + 1}: ${p.caption || "Sem legenda"}`).join("\n");

    let fullNarrative = "";
    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Você é um narrador de viagens talentoso. Crie uma narrativa coesa e envolvente para um mural de viagem chamado "${mural.title}". 
Use as legendas das fotos como base para criar uma história fluida, como se fosse um diário de viagem narrado em terceira pessoa.
A narrativa deve ser poética, emocionante e em português brasileiro.
Formate como uma linha do tempo, com cada momento separado por "---".`,
            },
            {
              role: "user",
              content: `Crie a narrativa completa para este mural com ${photos.length} fotos:\n\n${photoCaptions}`,
            },
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        fullNarrative = aiData.choices?.[0]?.message?.content || "";
      }
    } catch (aiError) {
      console.error("AI narrative generation failed:", aiError);
    }

    // Build HTML for PDF
    const photosHtml = photos.map((photo, index) => {
      const isLeft = index % 2 === 0;
      const narrative = photo.narrative_text || "";
      return `
        <div style="display: flex; align-items: flex-start; margin-bottom: 40px; gap: 24px; flex-direction: ${isLeft ? "row" : "row-reverse"};">
          <div style="flex: 1; max-width: 50%;">
            <img src="${photo.photo_url}" style="width: 100%; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" />
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">Momento ${index + 1}</p>
            <h3 style="font-size: 18px; color: #1e293b; margin-bottom: 8px; font-weight: 600;">${photo.caption || ""}</h3>
            <p style="font-size: 15px; color: #475569; line-height: 1.7; font-style: italic;">${narrative}</p>
          </div>
        </div>
        ${index < photos.length - 1 ? '<div style="text-align: center; color: #cbd5e1; font-size: 24px; margin: 20px 0;">✦</div>' : ""}
      `;
    }).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap');
          body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; background: #fafafa; }
          .cover { text-align: center; margin-bottom: 60px; padding: 60px 40px; background: linear-gradient(135deg, #0f172a 0%, #1e40af 100%); border-radius: 16px; color: white; }
          .cover h1 { font-family: 'Playfair Display', serif; font-size: 36px; margin-bottom: 12px; }
          .cover p { font-size: 16px; opacity: 0.8; }
          .timeline { max-width: 800px; margin: 0 auto; }
          .footer { text-align: center; margin-top: 60px; padding: 30px; color: #94a3b8; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="cover">
          <h1>📸 ${mural.title || "Minha Viagem"}</h1>
          <p>Uma história contada em imagens</p>
        </div>
        <div class="timeline">
          ${photosHtml}
        </div>
        ${fullNarrative ? `
          <div style="max-width: 700px; margin: 40px auto; padding: 30px; background: #f8fafc; border-radius: 12px; border-left: 4px solid #3b82f6;">
            <h2 style="font-family: 'Playfair Display', serif; font-size: 22px; color: #1e293b; margin-bottom: 16px;">A História Completa</h2>
            <p style="font-size: 15px; color: #475569; line-height: 1.8; white-space: pre-wrap;">${fullNarrative}</p>
          </div>
        ` : ""}
        <div class="footer">
          <p>Gerado com ❤️ por IA Turismo</p>
        </div>
      </body>
      </html>
    `;

    // Store HTML as PDF placeholder (the actual PDF generation would need a headless browser)
    // For now, we save the HTML and return it
    const fileName = `murals/${mural.id}/mural-${Date.now()}.html`;
    const htmlBytes = new TextEncoder().encode(html);

    const { error: uploadError } = await supabase.storage
      .from("mural-photos")
      .upload(fileName, htmlBytes, { contentType: "text/html" });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("mural-photos")
      .getPublicUrl(fileName);

    const pdfUrl = publicUrlData.publicUrl;

    // Update mural with PDF URL
    await supabase
      .from("photo_murals")
      .update({ pdf_url: pdfUrl })
      .eq("id", mural.id);

    return new Response(
      JSON.stringify({ success: true, pdf_url: pdfUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
