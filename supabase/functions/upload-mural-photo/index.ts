import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateShareCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, mural_title, photo_base64 } = await req.json();

    if (!phone || !photo_base64) {
      return new Response(
        JSON.stringify({ error: "phone and photo_base64 are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find or create mural for this phone
    let mural;
    const { data: existingMural } = await supabase
      .from("photo_murals")
      .select("*")
      .eq("phone", phone)
      .eq("title", mural_title || "Minha Viagem")
      .maybeSingle();

    if (existingMural) {
      mural = existingMural;
    } else {
      let shareCode = generateShareCode();
      // Ensure unique
      let attempts = 0;
      while (attempts < 5) {
        const { data: existing } = await supabase
          .from("photo_murals")
          .select("id")
          .eq("share_code", shareCode)
          .maybeSingle();
        if (!existing) break;
        shareCode = generateShareCode();
        attempts++;
      }

      const { data: newMural, error: muralError } = await supabase
        .from("photo_murals")
        .insert({
          phone,
          title: mural_title || "Minha Viagem",
          share_code: shareCode,
        })
        .select()
        .single();

      if (muralError) throw muralError;
      mural = newMural;
    }

    // Get current photo count for order_index
    const { count } = await supabase
      .from("mural_photos")
      .select("*", { count: "exact", head: true })
      .eq("mural_id", mural.id);

    const orderIndex = (count || 0) + 1;

    // Decode base64 and upload to storage
    const base64Data = photo_base64.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    
    const fileName = `${mural.id}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("mural-photos")
      .upload(fileName, binaryData, { contentType: "image/jpeg" });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("mural-photos")
      .getPublicUrl(fileName);

    const photoUrl = publicUrlData.publicUrl;

    // Update cover photo if first photo
    if (orderIndex === 1) {
      await supabase
        .from("photo_murals")
        .update({ cover_photo_url: photoUrl })
        .eq("id", mural.id);
    }

    // Call Lovable AI to generate caption and narrative
    let caption = "";
    let narrativeText = "";

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
              content: `Você é um narrador de viagens poético e envolvente. Ao receber uma foto de viagem, você deve criar:
1. Uma legenda curta e descritiva (máximo 1 frase)
2. Um texto narrativo envolvente como se estivesse contando a história dessa viagem para alguém (2-3 frases)

Responda SEMPRE em português brasileiro no formato JSON:
{"caption": "legenda aqui", "narrative_text": "narrativa aqui"}

Contexto: Esta é a foto número ${orderIndex} do mural "${mural.title}" do viajante.`,
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Descreva esta foto de viagem e crie uma narrativa envolvente:" },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
              ],
            },
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        // Try to parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          caption = parsed.caption || "";
          narrativeText = parsed.narrative_text || "";
        }
      } else {
        console.error("AI error:", aiResponse.status, await aiResponse.text());
      }
    } catch (aiError) {
      console.error("AI caption generation failed:", aiError);
      caption = "Momento especial da viagem";
      narrativeText = "Mais um momento inesquecível registrado nesta jornada.";
    }

    // Save photo record
    const { data: photo, error: photoError } = await supabase
      .from("mural_photos")
      .insert({
        mural_id: mural.id,
        photo_url: photoUrl,
        caption,
        narrative_text: narrativeText,
        order_index: orderIndex,
      })
      .select()
      .single();

    if (photoError) throw photoError;

    const muralUrl = `https://iaturismo.lovable.app/mural/${mural.share_code}`;

    return new Response(
      JSON.stringify({
        success: true,
        mural_id: mural.id,
        share_code: mural.share_code,
        mural_url: muralUrl,
        photo_id: photo.id,
        caption,
        narrative_text: narrativeText,
      }),
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
