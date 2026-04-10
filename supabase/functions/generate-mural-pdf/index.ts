import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(mural: any, photos: any[], fullNarrative: string): string {
  const title = escapeHtml(mural.title || "Minha Viagem");
  const description = mural.description ? escapeHtml(mural.description) : "";
  const coverPhoto = mural.cover_photo_url || photos[0]?.photo_url || "";
  const totalPhotos = photos.length;
  const createdDate = new Date(mural.created_at).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const photosHtml = photos
    .map((photo, index) => {
      const isLeft = index % 2 === 0;
      const narrative = escapeHtml(photo.narrative_text || "");
      const caption = escapeHtml(photo.caption || "");
      const momentNum = String(index + 1).padStart(2, "0");

      return `
      <div class="moment ${isLeft ? "moment-left" : "moment-right"}">
        <div class="moment-line">
          <div class="moment-dot"></div>
        </div>
        <div class="moment-photo">
          <img src="${photo.photo_url}" alt="${caption}" />
          <div class="photo-overlay"></div>
        </div>
        <div class="moment-content">
          <span class="moment-number">${momentNum}</span>
          <h3 class="moment-caption">${caption}</h3>
          ${narrative ? `<p class="moment-narrative">"${narrative}"</p>` : ""}
        </div>
      </div>
      `;
    })
    .join("");

  // Process narrative sections
  let narrativeHtml = "";
  if (fullNarrative) {
    const sections = fullNarrative.split("---").filter((s) => s.trim());
    narrativeHtml = sections
      .map(
        (section, i) => `
      <div class="narrative-section">
        <div class="narrative-accent"></div>
        <p>${escapeHtml(section.trim())}</p>
      </div>
    `
      )
      .join("");
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=Inter:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');

    :root {
      --color-deep: #0c1220;
      --color-navy: #1a2744;
      --color-accent: #c8a45e;
      --color-accent-light: #e8d5a0;
      --color-warm: #f5f0e8;
      --color-paper: #faf8f5;
      --color-ink: #2d3748;
      --color-ink-light: #64748b;
      --color-ink-faint: #94a3b8;
      --color-divider: #e2ddd5;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: var(--color-paper);
      color: var(--color-ink);
      -webkit-font-smoothing: antialiased;
    }

    /* ═══════════════════════════════════════
       COVER
    ═══════════════════════════════════════ */
    .cover {
      position: relative;
      width: 100%;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: var(--color-deep);
      page-break-after: always;
    }

    .cover-bg {
      position: absolute;
      inset: 0;
      background-image: url('${coverPhoto}');
      background-size: cover;
      background-position: center;
      filter: brightness(0.35) saturate(0.8);
    }

    .cover-grain {
      position: absolute;
      inset: 0;
      background: repeating-conic-gradient(rgba(255,255,255,0.01) 0% 25%, transparent 0% 50%) 0 0 / 3px 3px;
      mix-blend-mode: overlay;
      opacity: 0.4;
    }

    .cover-content {
      position: relative;
      z-index: 2;
      text-align: center;
      padding: 60px 40px;
      max-width: 700px;
    }

    .cover-line {
      width: 60px;
      height: 1px;
      background: var(--color-accent);
      margin: 0 auto 32px;
    }

    .cover-subtitle {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: var(--color-accent);
      margin-bottom: 24px;
    }

    .cover h1 {
      font-family: 'Playfair Display', serif;
      font-size: 52px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.15;
      margin-bottom: 20px;
      letter-spacing: -0.5px;
    }

    .cover-description {
      font-family: 'Cormorant Garamond', serif;
      font-size: 20px;
      font-style: italic;
      color: rgba(255,255,255,0.65);
      line-height: 1.6;
      margin-bottom: 36px;
    }

    .cover-meta {
      display: flex;
      justify-content: center;
      gap: 32px;
      font-size: 12px;
      color: rgba(255,255,255,0.45);
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .cover-line-bottom {
      width: 60px;
      height: 1px;
      background: var(--color-accent);
      margin: 36px auto 0;
    }

    /* ═══════════════════════════════════════
       INTRO SECTION
    ═══════════════════════════════════════ */
    .intro {
      max-width: 640px;
      margin: 80px auto;
      padding: 0 40px;
      text-align: center;
    }

    .intro-icon {
      font-size: 28px;
      margin-bottom: 24px;
      opacity: 0.6;
    }

    .intro h2 {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      font-weight: 600;
      color: var(--color-navy);
      margin-bottom: 16px;
    }

    .intro p {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18px;
      font-style: italic;
      color: var(--color-ink-light);
      line-height: 1.7;
    }

    .intro-divider {
      width: 40px;
      height: 1px;
      background: var(--color-accent);
      margin: 32px auto 0;
    }

    /* ═══════════════════════════════════════
       TIMELINE
    ═══════════════════════════════════════ */
    .timeline {
      max-width: 900px;
      margin: 0 auto;
      padding: 0 40px 60px;
      position: relative;
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 1px;
      background: linear-gradient(
        to bottom,
        transparent,
        var(--color-divider) 60px,
        var(--color-divider) calc(100% - 60px),
        transparent
      );
      transform: translateX(-50%);
    }

    /* Moment card */
    .moment {
      display: flex;
      align-items: flex-start;
      margin-bottom: 64px;
      position: relative;
      gap: 0;
    }

    .moment-left { flex-direction: row; }
    .moment-right { flex-direction: row-reverse; }

    .moment-line {
      position: absolute;
      left: 50%;
      top: 40px;
      transform: translateX(-50%);
      z-index: 2;
    }

    .moment-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--color-accent);
      border: 3px solid var(--color-paper);
      box-shadow: 0 0 0 1px var(--color-accent);
    }

    .moment-photo {
      flex: 0 0 44%;
      position: relative;
      overflow: hidden;
      border-radius: 6px;
    }

    .moment-photo img {
      width: 100%;
      display: block;
      border-radius: 6px;
      box-shadow:
        0 8px 30px rgba(0,0,0,0.12),
        0 2px 8px rgba(0,0,0,0.06);
    }

    .moment-photo .photo-overlay {
      position: absolute;
      inset: 0;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.1);
      pointer-events: none;
    }

    .moment-content {
      flex: 0 0 44%;
      padding: 16px 32px;
    }

    .moment-left .moment-content { text-align: left; }
    .moment-right .moment-content { text-align: right; }

    .moment-number {
      font-family: 'Playfair Display', serif;
      font-size: 42px;
      font-weight: 700;
      color: var(--color-accent-light);
      opacity: 0.4;
      line-height: 1;
      display: block;
      margin-bottom: 8px;
    }

    .moment-caption {
      font-family: 'Playfair Display', serif;
      font-size: 20px;
      font-weight: 600;
      color: var(--color-navy);
      line-height: 1.35;
      margin-bottom: 12px;
    }

    .moment-narrative {
      font-family: 'Cormorant Garamond', serif;
      font-size: 16px;
      font-style: italic;
      color: var(--color-ink-light);
      line-height: 1.7;
    }

    /* ═══════════════════════════════════════
       FULL NARRATIVE
    ═══════════════════════════════════════ */
    .narrative-wrapper {
      max-width: 660px;
      margin: 80px auto;
      padding: 0 40px;
      page-break-before: always;
    }

    .narrative-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .narrative-header h2 {
      font-family: 'Playfair Display', serif;
      font-size: 30px;
      font-weight: 600;
      color: var(--color-navy);
      margin-bottom: 8px;
    }

    .narrative-header p {
      font-size: 13px;
      color: var(--color-ink-faint);
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .narrative-header .nh-line {
      width: 40px;
      height: 1px;
      background: var(--color-accent);
      margin: 20px auto 0;
    }

    .narrative-section {
      position: relative;
      padding: 0 0 32px 28px;
      margin-bottom: 12px;
    }

    .narrative-accent {
      position: absolute;
      left: 0;
      top: 6px;
      width: 3px;
      height: calc(100% - 20px);
      background: linear-gradient(to bottom, var(--color-accent), transparent);
      border-radius: 2px;
    }

    .narrative-section p {
      font-family: 'Cormorant Garamond', serif;
      font-size: 17px;
      color: var(--color-ink);
      line-height: 1.85;
    }

    /* ═══════════════════════════════════════
       FOOTER
    ═══════════════════════════════════════ */
    .footer {
      text-align: center;
      padding: 60px 40px 80px;
      margin-top: 40px;
      border-top: 1px solid var(--color-divider);
    }

    .footer-accent {
      width: 20px;
      height: 20px;
      margin: 0 auto 20px;
      border: 1px solid var(--color-accent);
      transform: rotate(45deg);
    }

    .footer p {
      font-size: 12px;
      color: var(--color-ink-faint);
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .footer .footer-brand {
      font-family: 'Playfair Display', serif;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-navy);
      letter-spacing: 0;
      text-transform: none;
      margin-top: 8px;
    }

    /* ═══════════════════════════════════════
       PRINT / PDF TWEAKS
    ═══════════════════════════════════════ */
    @media print {
      body { background: white; }
      .cover { min-height: 100vh; }
      .moment { break-inside: avoid; }
      .narrative-section { break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- COVER -->
  <div class="cover">
    <div class="cover-bg"></div>
    <div class="cover-grain"></div>
    <div class="cover-content">
      <div class="cover-line"></div>
      <p class="cover-subtitle">Diário de Viagem</p>
      <h1>${title}</h1>
      ${description ? `<p class="cover-description">${escapeHtml(description)}</p>` : ""}
      <div class="cover-meta">
        <span>${createdDate}</span>
        <span>·</span>
        <span>${totalPhotos} momento${totalPhotos > 1 ? "s" : ""}</span>
      </div>
      <div class="cover-line-bottom"></div>
    </div>
  </div>

  <!-- INTRO -->
  <div class="intro">
    <div class="intro-icon">✧</div>
    <h2>Uma história contada em imagens</h2>
    <p>Cada fotografia guarda um instante. Juntas, elas tecem a narrativa de uma jornada única — momentos de descoberta, encantamento e memórias que o tempo não apaga.</p>
    <div class="intro-divider"></div>
  </div>

  <!-- TIMELINE -->
  <div class="timeline">
    ${photosHtml}
  </div>

  <!-- FULL NARRATIVE -->
  ${
    narrativeHtml
      ? `
  <div class="narrative-wrapper">
    <div class="narrative-header">
      <h2>A História Completa</h2>
      <p>Narrada por inteligência artificial</p>
      <div class="nh-line"></div>
    </div>
    ${narrativeHtml}
  </div>
  `
      : ""
  }

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-accent"></div>
    <p>Gerado com carinho por</p>
    <p class="footer-brand">IA Turismo</p>
  </div>

</body>
</html>`;
}

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
    const photoCaptions = photos
      .map((p, i) => `Foto ${i + 1}: ${p.caption || "Sem legenda"}`)
      .join("\n");

    let fullNarrative = "";
    try {
      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
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
                content: `Você é um narrador de viagens talentoso e poético. Crie uma narrativa coesa e envolvente para um mural de viagem chamado "${mural.title}". 
Use as legendas das fotos como base para criar uma história fluida, como se fosse um diário de viagem narrado em terceira pessoa.
A narrativa deve ser poética, emocionante e em português brasileiro.
Cada parágrafo deve ter 2-3 frases no máximo, mantendo a prosa elegante e concisa.
Separe cada momento com "---". Não use markdown, apenas texto puro.`,
              },
              {
                role: "user",
                content: `Crie a narrativa completa para este mural com ${photos.length} fotos:\n\n${photoCaptions}`,
              },
            ],
          }),
        }
      );

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        fullNarrative = aiData.choices?.[0]?.message?.content || "";
      }
    } catch (aiError) {
      console.error("AI narrative generation failed:", aiError);
    }

    // Build sophisticated HTML
    const html = buildHtml(mural, photos, fullNarrative);

    // Upload HTML
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
