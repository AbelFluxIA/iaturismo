import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TravelItinerary {
  title?: string;
  destination?: string;
  text: string;
  traveler_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: TravelItinerary = await req.json();
    
    if (!body.text) {
      return new Response(
        JSON.stringify({ error: 'O campo "text" é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      title = "Roteiro de Viagem",
      destination = "",
      text,
      traveler_name = ""
    } = body;

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Colors
    const primaryColor = rgb(0.2, 0.4, 0.6);      // Deep blue
    const secondaryColor = rgb(0.95, 0.95, 0.98); // Light gray background
    const accentColor = rgb(0.9, 0.5, 0.2);       // Orange accent
    const textColor = rgb(0.2, 0.2, 0.2);         // Dark gray text

    // Page settings
    const pageWidth = 595.28;  // A4 width
    const pageHeight = 841.89; // A4 height
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);
    
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;

    // Helper function to add new page
    const addNewPage = () => {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    };

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredHeight: number) => {
      if (yPosition - requiredHeight < margin) {
        addNewPage();
        return true;
      }
      return false;
    };

    // Draw header background
    page.drawRectangle({
      x: 0,
      y: pageHeight - 120,
      width: pageWidth,
      height: 120,
      color: primaryColor,
    });

    // Draw accent line
    page.drawRectangle({
      x: 0,
      y: pageHeight - 125,
      width: pageWidth,
      height: 5,
      color: accentColor,
    });

    // Title
    const titleFontSize = 28;
    page.drawText(title.toUpperCase(), {
      x: margin,
      y: pageHeight - 55,
      size: titleFontSize,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Destination subtitle
    if (destination) {
      // Draw location pin icon as a small circle
      page.drawCircle({
        x: margin + 5,
        y: pageHeight - 81,
        size: 4,
        color: accentColor,
      });
      page.drawText(destination, {
        x: margin + 15,
        y: pageHeight - 85,
        size: 14,
        font: font,
        color: rgb(0.9, 0.9, 0.95),
      });
    }

    // Traveler name
    if (traveler_name) {
      page.drawText(`Viajante: ${traveler_name}`, {
        x: margin,
        y: pageHeight - 105,
        size: 12,
        font: font,
        color: rgb(0.8, 0.85, 0.9),
      });
    }

    // Date
    const today = new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
    const dateWidth = font.widthOfTextAtSize(today, 10);
    page.drawText(today, {
      x: pageWidth - margin - dateWidth,
      y: pageHeight - 105,
      size: 10,
      font: font,
      color: rgb(0.8, 0.85, 0.9),
    });

    yPosition = pageHeight - 160;

    // Process text content
    const lines = text.split('\n');
    const fontSize = 11;
    const lineHeight = 18;
    const headerFontSize = 14;
    const subHeaderFontSize = 12;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        yPosition -= lineHeight / 2;
        continue;
      }

      // Check for day headers (e.g., "Dia 1:", "DIA 1 -", etc.)
      const dayMatch = trimmedLine.match(/^(dia\s*\d+|day\s*\d+)/i);
      if (dayMatch) {
        checkPageBreak(50);
        
        // Draw day header with background
        page.drawRectangle({
          x: margin - 10,
          y: yPosition - 5,
          width: contentWidth + 20,
          height: 28,
          color: secondaryColor,
          borderColor: primaryColor,
          borderWidth: 1,
        });
        
        page.drawText(trimmedLine, {
          x: margin,
          y: yPosition + 5,
          size: headerFontSize,
          font: fontBold,
          color: primaryColor,
        });
        
        yPosition -= 40;
        continue;
      }

      // Check for time entries (e.g., "08:00", "8h", "Manhã:", etc.)
      const timeMatch = trimmedLine.match(/^(\d{1,2}[h:]\d{0,2}|manhã|tarde|noite)/i);
      if (timeMatch) {
        checkPageBreak(35);
        
        // Draw time with accent
        page.drawRectangle({
          x: margin - 5,
          y: yPosition - 2,
          width: 4,
          height: 16,
          color: accentColor,
        });
        
        page.drawText(trimmedLine, {
          x: margin + 5,
          y: yPosition,
          size: subHeaderFontSize,
          font: fontBold,
          color: textColor,
        });
        
        yPosition -= 25;
        continue;
      }

      // Check for bullet points
      const bulletMatch = trimmedLine.match(/^[-•*]\s*/);
      if (bulletMatch) {
        checkPageBreak(lineHeight);
        
        const bulletText = trimmedLine.replace(/^[-•*]\s*/, '');
        
        page.drawText("•", {
          x: margin + 10,
          y: yPosition,
          size: fontSize,
          font: font,
          color: accentColor,
        });
        
        // Word wrap for bullet content
        const words = bulletText.split(' ');
        let currentLine = '';
        const bulletIndent = margin + 25;
        const bulletContentWidth = contentWidth - 25;
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = font.widthOfTextAtSize(testLine, fontSize);
          
          if (textWidth > bulletContentWidth) {
            checkPageBreak(lineHeight);
            page.drawText(currentLine, {
              x: bulletIndent,
              y: yPosition,
              size: fontSize,
              font: font,
              color: textColor,
            });
            yPosition -= lineHeight;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        
        if (currentLine) {
          checkPageBreak(lineHeight);
          page.drawText(currentLine, {
            x: bulletIndent,
            y: yPosition,
            size: fontSize,
            font: font,
            color: textColor,
          });
          yPosition -= lineHeight;
        }
        
        continue;
      }

      // Regular paragraph with word wrap
      const words = trimmedLine.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (textWidth > contentWidth) {
          checkPageBreak(lineHeight);
          page.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size: fontSize,
            font: font,
            color: textColor,
          });
          yPosition -= lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        checkPageBreak(lineHeight);
        page.drawText(currentLine, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: font,
          color: textColor,
        });
        yPosition -= lineHeight;
      }
    }

    // Add footer to all pages
    const pages = pdfDoc.getPages();
    pages.forEach((p, index) => {
      // Footer line
      p.drawRectangle({
        x: margin,
        y: 35,
        width: contentWidth,
        height: 1,
        color: secondaryColor,
      });
      
      // Page number
      const pageText = `Página ${index + 1} de ${pages.length}`;
      const pageTextWidth = font.widthOfTextAtSize(pageText, 9);
      p.drawText(pageText, {
        x: (pageWidth - pageTextWidth) / 2,
        y: 20,
        size: 9,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Generated text
      p.drawText("Gerado por IA de Turismo", {
        x: margin,
        y: 20,
        size: 8,
        font: font,
        color: rgb(0.6, 0.6, 0.6),
      });
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().substring(0, 8);
    const fileName = `roteiro-${timestamp}-${randomId}.pdf`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('travel-pdfs')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Erro ao fazer upload do PDF', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('travel-pdfs')
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: publicUrlData.publicUrl,
        file_name: fileName,
        message: 'PDF gerado com sucesso!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao gerar PDF', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
