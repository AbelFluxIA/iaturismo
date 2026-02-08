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

// Remove emojis and special unicode characters that PDF fonts can't render
function cleanTextForPDF(text: string): string {
  // Remove emojis and special unicode symbols
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '') // Mahjong
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '') // Playing cards
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation selectors
    .replace(/[\u{200D}]/gu, '')            // Zero width joiner
    .replace(/[\u{20E3}]/gu, '')            // Combining enclosing keycap
    .replace(/[\u{E0020}-\u{E007F}]/gu, '') // Tags
    .replace(/\s+/g, ' ')                    // Normalize whitespace
    .trim();
}

// Parse WhatsApp-style formatting and extract text segments
interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  isLink: boolean;
  linkUrl?: string;
}

function parseWhatsAppFormatting(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const cleanText = cleanTextForPDF(text);
  
  // Pattern for **bold**, *italic*, and [link text](url) or [text]
  let remaining = cleanText;
  
  while (remaining.length > 0) {
    // Check for bold **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      segments.push({ text: boldMatch[1], bold: true, italic: false, isLink: false });
      remaining = remaining.substring(boldMatch[0].length);
      continue;
    }
    
    // Check for italic *text* (single asterisk, not double)
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch && !remaining.startsWith('**')) {
      segments.push({ text: italicMatch[1], bold: false, italic: true, isLink: false });
      remaining = remaining.substring(italicMatch[0].length);
      continue;
    }
    
    // Check for links [text](url) or just [text]
    const linkMatch = remaining.match(/^\[([^\]]+)\](?:\(([^)]+)\))?/);
    if (linkMatch) {
      segments.push({ 
        text: linkMatch[1], 
        bold: false, 
        italic: false, 
        isLink: true,
        linkUrl: linkMatch[2] || ''
      });
      remaining = remaining.substring(linkMatch[0].length);
      continue;
    }
    
    // Find next special character
    const nextSpecial = remaining.search(/\*|\[/);
    if (nextSpecial === -1) {
      // No more special chars, add rest as plain text
      if (remaining.trim()) {
        segments.push({ text: remaining, bold: false, italic: false, isLink: false });
      }
      break;
    } else if (nextSpecial === 0) {
      // Special char at start but didn't match patterns, treat as regular char
      segments.push({ text: remaining[0], bold: false, italic: false, isLink: false });
      remaining = remaining.substring(1);
    } else {
      // Add text before special char
      const plainText = remaining.substring(0, nextSpecial);
      if (plainText.trim()) {
        segments.push({ text: plainText, bold: false, italic: false, isLink: false });
      }
      remaining = remaining.substring(nextSpecial);
    }
  }
  
  // Merge adjacent segments with same formatting
  const merged: TextSegment[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && last.bold === seg.bold && last.italic === seg.italic && last.isLink === seg.isLink && !seg.isLink) {
      last.text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }
  
  return merged;
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
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
    
    // Colors - Modern travel theme
    const primaryColor = rgb(0.08, 0.32, 0.52);     // Deep ocean blue
    const secondaryColor = rgb(0.96, 0.97, 0.98);  // Light gray background
    const accentColor = rgb(0.96, 0.55, 0.15);     // Sunset orange
    const textColor = rgb(0.15, 0.15, 0.15);       // Dark gray text
    const linkColor = rgb(0.12, 0.47, 0.71);       // Link blue
    const successColor = rgb(0.18, 0.55, 0.34);    // Green for highlights
    const warningColor = rgb(0.85, 0.45, 0.12);    // Warning orange

    // Page settings
    const pageWidth = 595.28;  // A4 width
    const pageHeight = 841.89; // A4 height
    const margin = 45;
    const contentWidth = pageWidth - (margin * 2);
    
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;

    // Helper function to add new page
    const addNewPage = () => {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin - 20;
    };

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredHeight: number) => {
      if (yPosition - requiredHeight < margin + 30) {
        addNewPage();
        return true;
      }
      return false;
    };

    // Get font for segment
    const getFontForSegment = (seg: TextSegment) => {
      if (seg.bold && seg.italic) return fontBoldItalic;
      if (seg.bold) return fontBold;
      if (seg.italic) return fontItalic;
      return font;
    };

    // Draw header background with gradient effect (multiple rectangles)
    for (let i = 0; i < 5; i++) {
      page.drawRectangle({
        x: 0,
        y: pageHeight - 140 + (i * 5),
        width: pageWidth,
        height: 30,
        color: rgb(0.08 + (i * 0.02), 0.32 + (i * 0.03), 0.52 + (i * 0.04)),
      });
    }
    
    // Main header rectangle
    page.drawRectangle({
      x: 0,
      y: pageHeight - 140,
      width: pageWidth,
      height: 140,
      color: primaryColor,
    });

    // Draw accent stripe
    page.drawRectangle({
      x: 0,
      y: pageHeight - 145,
      width: pageWidth,
      height: 5,
      color: accentColor,
    });

    // Decorative circles
    page.drawCircle({
      x: pageWidth - 80,
      y: pageHeight - 50,
      size: 40,
      color: rgb(0.12, 0.38, 0.58),
      opacity: 0.3,
    });
    page.drawCircle({
      x: pageWidth - 60,
      y: pageHeight - 90,
      size: 25,
      color: rgb(0.15, 0.42, 0.62),
      opacity: 0.2,
    });

    // Title
    const cleanTitle = cleanTextForPDF(title);
    const titleFontSize = 26;
    page.drawText(cleanTitle.toUpperCase(), {
      x: margin,
      y: pageHeight - 55,
      size: titleFontSize,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Destination subtitle with pin icon
    if (destination) {
      const cleanDest = cleanTextForPDF(destination);
      // Draw location pin
      page.drawCircle({
        x: margin + 6,
        y: pageHeight - 81,
        size: 5,
        color: accentColor,
      });
      page.drawCircle({
        x: margin + 6,
        y: pageHeight - 81,
        size: 2,
        color: rgb(1, 1, 1),
      });
      page.drawText(cleanDest, {
        x: margin + 18,
        y: pageHeight - 85,
        size: 14,
        font: font,
        color: rgb(0.9, 0.92, 0.95),
      });
    }

    // Traveler name
    if (traveler_name) {
      const cleanName = cleanTextForPDF(traveler_name);
      page.drawText(`Viajante: ${cleanName}`, {
        x: margin,
        y: pageHeight - 110,
        size: 11,
        font: font,
        color: rgb(0.75, 0.8, 0.85),
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
      y: pageHeight - 110,
      size: 10,
      font: font,
      color: rgb(0.75, 0.8, 0.85),
    });

    yPosition = pageHeight - 175;

    // Process text content
    const lines = text.split('\n');
    const fontSize = 10;
    const lineHeight = 16;
    const headerFontSize = 13;
    const subHeaderFontSize = 11;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        yPosition -= lineHeight / 2;
        continue;
      }

      const cleanLine = cleanTextForPDF(trimmedLine);
      if (!cleanLine) continue;

      // Check for DAY headers (e.g., "DIA 1", "*DIA 1*")
      const dayMatch = cleanLine.match(/^\*?(DIA\s*\d+|DAY\s*\d+)/i);
      if (dayMatch) {
        checkPageBreak(55);
        
        yPosition -= 10; // Extra spacing before day
        
        // Draw day header with styled background
        page.drawRectangle({
          x: margin - 5,
          y: yPosition - 8,
          width: contentWidth + 10,
          height: 32,
          color: primaryColor,
          borderRadius: 4,
        });
        
        // Accent bar on left
        page.drawRectangle({
          x: margin - 5,
          y: yPosition - 8,
          width: 5,
          height: 32,
          color: accentColor,
        });
        
        page.drawText(cleanLine.replace(/^\*|\*$/g, '').toUpperCase(), {
          x: margin + 8,
          y: yPosition + 3,
          size: headerFontSize,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        
        yPosition -= 48;
        continue;
      }

      // Check for time/period entries (e.g., "Manha (09:00):", "Tarde (14:30):", "Por do Sol", "Noite")
      const timeMatch = cleanLine.match(/^(\*?\*?)?(Manha|Tarde|Noite|Por do Sol|Morning|Afternoon|Evening)(\s*\([^)]+\))?:?\s*(\*?\*?)?/i);
      if (timeMatch) {
        checkPageBreak(40);
        
        yPosition -= 5;
        
        // Draw time block background
        page.drawRectangle({
          x: margin,
          y: yPosition - 5,
          width: contentWidth,
          height: 24,
          color: secondaryColor,
        });
        
        // Accent dot
        page.drawCircle({
          x: margin + 10,
          y: yPosition + 5,
          size: 4,
          color: accentColor,
        });
        
        page.drawText(cleanLine.replace(/\*\*/g, '').replace(/^\*|\*$/g, ''), {
          x: margin + 22,
          y: yPosition + 1,
          size: subHeaderFontSize,
          font: fontBold,
          color: primaryColor,
        });
        
        yPosition -= 32;
        continue;
      }

      // Check for attention/warning blocks
      const warningMatch = cleanLine.match(/^(Atencao|Aviso|Importante|Warning|Note):/i);
      if (warningMatch) {
        checkPageBreak(50);
        
        // Warning background
        page.drawRectangle({
          x: margin,
          y: yPosition - 25,
          width: contentWidth,
          height: 40,
          color: rgb(1, 0.95, 0.9),
          borderColor: warningColor,
          borderWidth: 1,
        });
        
        // Warning icon (triangle shape with lines)
        page.drawCircle({
          x: margin + 15,
          y: yPosition - 5,
          size: 8,
          color: warningColor,
        });
        
        const warningText = cleanLine;
        page.drawText(warningText, {
          x: margin + 30,
          y: yPosition - 5,
          size: fontSize,
          font: fontBold,
          color: warningColor,
        });
        
        yPosition -= 50;
        continue;
      }

      // Check for bullet points with content
      const bulletMatch = trimmedLine.match(/^[-•]\s*/);
      if (bulletMatch) {
        checkPageBreak(lineHeight * 3);
        
        const bulletContent = cleanTextForPDF(trimmedLine.replace(/^[-•]\s*/, ''));
        const segments = parseWhatsAppFormatting(bulletContent);
        
        // Draw bullet point
        page.drawCircle({
          x: margin + 12,
          y: yPosition - 1,
          size: 3,
          color: accentColor,
        });
        
        // Render segments with word wrap
        let xPos = margin + 25;
        const bulletContentWidth = contentWidth - 30;
        let lineText = '';
        
        for (const seg of segments) {
          if (!seg.text.trim()) continue;
          
          const segFont = getFontForSegment(seg);
          const words = seg.text.split(' ');
          
          for (const word of words) {
            if (!word) continue;
            
            const testText = lineText ? lineText + ' ' + word : word;
            const testWidth = font.widthOfTextAtSize(testText, fontSize);
            
            if (testWidth > bulletContentWidth && lineText) {
              // Draw current line and start new one
              checkPageBreak(lineHeight);
              page.drawText(lineText, {
                x: margin + 25,
                y: yPosition,
                size: fontSize,
                font: segFont,
                color: seg.isLink ? linkColor : textColor,
              });
              yPosition -= lineHeight;
              lineText = word;
            } else {
              lineText = testText;
            }
          }
        }
        
        // Draw remaining text
        if (lineText) {
          const lastSeg = segments[segments.length - 1] || { bold: false, italic: false, isLink: false };
          page.drawText(lineText, {
            x: margin + 25,
            y: yPosition,
            size: fontSize,
            font: getFontForSegment(lastSeg),
            color: lastSeg.isLink ? linkColor : textColor,
          });
          yPosition -= lineHeight;
        }
        
        yPosition -= 4; // Extra spacing after bullet
        continue;
      }

      // Check for "Por que escolhi" or similar explanatory text
      const explanationMatch = cleanLine.match(/^(Por que escolhi|Why I chose|Dica|Tip):/i);
      if (explanationMatch) {
        checkPageBreak(lineHeight * 2);
        
        // Italicized explanation with special color
        const explanationText = cleanLine;
        const words = explanationText.split(' ');
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = fontItalic.widthOfTextAtSize(testLine, fontSize - 1);
          
          if (textWidth > contentWidth - 20) {
            checkPageBreak(lineHeight);
            page.drawText(currentLine, {
              x: margin + 20,
              y: yPosition,
              size: fontSize - 1,
              font: fontItalic,
              color: rgb(0.35, 0.35, 0.35),
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
            x: margin + 20,
            y: yPosition,
            size: fontSize - 1,
            font: fontItalic,
            color: rgb(0.35, 0.35, 0.35),
          });
          yPosition -= lineHeight;
        }
        
        continue;
      }

      // Check for navigation links [Navegar com Waze...]
      const navMatch = cleanLine.match(/^\[Navegar com (Waze|Google Maps|Maps)[^\]]*\]/i);
      if (navMatch) {
        checkPageBreak(lineHeight);
        
        // Draw as a styled link
        const linkText = cleanLine.replace(/[\[\]]/g, '');
        page.drawText(linkText, {
          x: margin + 20,
          y: yPosition,
          size: fontSize - 1,
          font: font,
          color: linkColor,
        });
        
        // Underline
        const linkWidth = font.widthOfTextAtSize(linkText, fontSize - 1);
        page.drawLine({
          start: { x: margin + 20, y: yPosition - 2 },
          end: { x: margin + 20 + linkWidth, y: yPosition - 2 },
          thickness: 0.5,
          color: linkColor,
        });
        
        yPosition -= lineHeight + 4;
        continue;
      }

      // Regular paragraph with word wrap and formatting
      const segments = parseWhatsAppFormatting(cleanLine);
      let xPos = margin;
      let lineText = '';
      
      for (const seg of segments) {
        if (!seg.text.trim()) continue;
        
        const segFont = getFontForSegment(seg);
        const words = seg.text.split(' ');
        
        for (const word of words) {
          if (!word) continue;
          
          const testText = lineText ? lineText + ' ' + word : word;
          const testWidth = font.widthOfTextAtSize(testText, fontSize);
          
          if (testWidth > contentWidth && lineText) {
            checkPageBreak(lineHeight);
            page.drawText(lineText, {
              x: margin,
              y: yPosition,
              size: fontSize,
              font: segFont,
              color: seg.isLink ? linkColor : textColor,
            });
            yPosition -= lineHeight;
            lineText = word;
          } else {
            lineText = testText;
          }
        }
      }
      
      if (lineText) {
        checkPageBreak(lineHeight);
        const lastSeg = segments[segments.length - 1] || { bold: false, italic: false, isLink: false };
        page.drawText(lineText, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: getFontForSegment(lastSeg),
          color: lastSeg.isLink ? linkColor : textColor,
        });
        yPosition -= lineHeight;
      }
    }

    // Add footer to all pages
    const pages = pdfDoc.getPages();
    pages.forEach((p, index) => {
      // Footer separator line
      p.drawRectangle({
        x: margin,
        y: 40,
        width: contentWidth,
        height: 1,
        color: rgb(0.85, 0.85, 0.85),
      });
      
      // Page number centered
      const pageText = `${index + 1} / ${pages.length}`;
      const pageTextWidth = font.widthOfTextAtSize(pageText, 9);
      p.drawText(pageText, {
        x: (pageWidth - pageTextWidth) / 2,
        y: 25,
        size: 9,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Brand text on left
      p.drawText("IA de Turismo", {
        x: margin,
        y: 25,
        size: 8,
        font: fontBold,
        color: primaryColor,
      });

      // Date on right
      const footerDate = new Date().toLocaleDateString('pt-BR');
      const footerDateWidth = font.widthOfTextAtSize(footerDate, 8);
      p.drawText(footerDate, {
        x: pageWidth - margin - footerDateWidth,
        y: 25,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
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

    // Save metadata to database for dashboard
    const { error: insertError } = await supabase
      .from('generated_itineraries')
      .insert({
        title: title,
        destination: destination,
        traveler_name: traveler_name,
        pdf_url: publicUrlData.publicUrl,
        file_name: fileName,
        text_length: text.length
      });

    if (insertError) {
      console.error('Error saving itinerary metadata:', insertError);
      // Don't fail the request, just log the error
    }

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
