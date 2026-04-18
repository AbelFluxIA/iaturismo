import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts, PDFName, PDFArray } from "https://esm.sh/pdf-lib@1.17.1";

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

    // Embed brand logo (SOL)
    let logoImage: any = null;
    try {
      const logoUrl = `${supabaseUrl}/storage/v1/object/public/travel-pdfs/assets/logo-sol.png`;
      const logoRes = await fetch(logoUrl);
      if (logoRes.ok) {
        const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
        try {
          logoImage = await pdfDoc.embedPng(logoBytes);
        } catch {
          logoImage = await pdfDoc.embedJpg(logoBytes);
        }
      }
    } catch (e) {
      console.error("Failed to embed logo:", e);
    }

    // Refined sophisticated palette
    const primaryColor = rgb(0.05, 0.20, 0.40);      // deep navy
    const primaryDark = rgb(0.03, 0.13, 0.27);       // darker navy for gradient
    const goldColor = rgb(0.95, 0.72, 0.20);         // brand gold
    const goldDark = rgb(0.78, 0.55, 0.10);
    const secondaryColor = rgb(0.97, 0.97, 0.95);    // warm paper
    const accentColor = rgb(0.95, 0.72, 0.20);       // gold accent (was orange)
    const textColor = rgb(0.13, 0.15, 0.20);
    const mutedText = rgb(0.42, 0.45, 0.50);
    const linkColor = rgb(0.80, 0.10, 0.12);         // strong red
    const linkBg = rgb(1, 0.93, 0.93);
    const warningColor = rgb(0.85, 0.45, 0.12);
    const dividerColor = rgb(0.88, 0.86, 0.80);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 45;
    const contentWidth = pageWidth - (margin * 2);
    
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;

    // Helper to add clickable link annotation to current page
    const addLinkAnnotation = (url: string, x: number, y: number, w: number, h: number) => {
      const linkAnnotation = pdfDoc.context.register(
        pdfDoc.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [x, y, x + w, y + h],
          Border: [0, 0, 0],
          C: [0, 0, 1],
          A: {
            Type: 'Action',
            S: 'URI',
            URI: url,
          },
        })
      );
      
      // Get existing Annots array or create new one
      const existingAnnots = page.node.lookup(PDFName.of('Annots'));
      if (existingAnnots instanceof PDFArray) {
        existingAnnots.push(linkAnnotation);
      } else {
        page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([linkAnnotation]));
      }
    };

    const addNewPage = () => {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin - 20;
    };

    const checkPageBreak = (requiredHeight: number) => {
      if (yPosition - requiredHeight < margin + 30) {
        addNewPage();
        return true;
      }
      return false;
    };

    const getFontForSegment = (seg: TextSegment) => {
      if (seg.bold && seg.italic) return fontBoldItalic;
      if (seg.bold) return fontBold;
      if (seg.italic) return fontItalic;
      return font;
    };

    // ====== SOPHISTICATED COVER HEADER ======
    const headerHeight = 200;

    // Deep navy gradient background (layered for richness)
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      page.drawRectangle({
        x: 0,
        y: pageHeight - headerHeight + (i * (headerHeight / 12)),
        width: pageWidth,
        height: headerHeight / 12 + 1,
        color: rgb(
          0.03 + t * 0.05,
          0.13 + t * 0.10,
          0.27 + t * 0.15
        ),
      });
    }

    // Decorative gold corner ornaments
    page.drawCircle({ x: pageWidth - 70, y: pageHeight - 60, size: 50, color: goldColor, opacity: 0.10 });
    page.drawCircle({ x: pageWidth - 50, y: pageHeight - 110, size: 30, color: goldColor, opacity: 0.08 });
    page.drawCircle({ x: 30, y: pageHeight - 180, size: 40, color: goldColor, opacity: 0.06 });

    // Gold accent line at bottom of header
    page.drawRectangle({
      x: 0,
      y: pageHeight - headerHeight - 4,
      width: pageWidth,
      height: 4,
      color: goldColor,
    });
    page.drawRectangle({
      x: 0,
      y: pageHeight - headerHeight - 6,
      width: pageWidth,
      height: 1,
      color: goldDark,
    });

    // Logo (top-right)
    if (logoImage) {
      const logoSize = 70;
      page.drawImage(logoImage, {
        x: pageWidth - margin - logoSize,
        y: pageHeight - margin - logoSize + 5,
        width: logoSize,
        height: logoSize,
      });
    }

    // Small gold uppercase eyebrow
    page.drawText("ROTEIRO DE VIAGEM", {
      x: margin,
      y: pageHeight - 55,
      size: 10,
      font: fontBold,
      color: goldColor,
    });
    // Eyebrow underline
    page.drawRectangle({
      x: margin,
      y: pageHeight - 60,
      width: 30,
      height: 1.5,
      color: goldColor,
    });

    // Main title (LARGER, elegant)
    const cleanTitle = cleanTextForPDF(title);
    const titleFontSize = 30;
    // Wrap title if too long
    const titleMaxWidth = logoImage ? pageWidth - margin * 2 - 90 : pageWidth - margin * 2;
    const titleWords = cleanTitle.split(" ");
    let titleLine1 = "";
    let titleLine2 = "";
    for (const w of titleWords) {
      const test = titleLine1 ? titleLine1 + " " + w : w;
      if (fontBold.widthOfTextAtSize(test, titleFontSize) <= titleMaxWidth) {
        titleLine1 = test;
      } else {
        titleLine2 = titleLine2 ? titleLine2 + " " + w : w;
      }
    }
    page.drawText(titleLine1, {
      x: margin,
      y: pageHeight - 95,
      size: titleFontSize,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    if (titleLine2) {
      page.drawText(titleLine2, {
        x: margin,
        y: pageHeight - 95 - titleFontSize - 4,
        size: titleFontSize,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
    }

    const metaY = titleLine2 ? pageHeight - 165 : pageHeight - 135;

    if (destination) {
      const cleanDest = cleanTextForPDF(destination);
      page.drawCircle({ x: margin + 5, y: metaY + 5, size: 4, color: goldColor });
      page.drawText(cleanDest, {
        x: margin + 16, y: metaY, size: 14, font: fontItalic, color: rgb(0.92, 0.94, 0.97),
      });
    }

    if (traveler_name) {
      const cleanName = cleanTextForPDF(traveler_name);
      page.drawText(`Preparado para ${cleanName}`, {
        x: margin, y: metaY - 22, size: 11, font: font, color: rgb(0.78, 0.82, 0.88),
      });
    }

    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const dateWidth = font.widthOfTextAtSize(today, 10);
    page.drawText(today, {
      x: pageWidth - margin - dateWidth, y: metaY - 22, size: 10, font: font, color: rgb(0.78, 0.82, 0.88),
    });

    yPosition = pageHeight - headerHeight - 30;

    // Process text content - LARGER FONTS
    const lines = text.split('\n');
    const fontSize = 13;
    const lineHeight = 22;
    const headerFontSize = 16;
    const subHeaderFontSize = 13;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        yPosition -= lineHeight / 2;
        continue;
      }

      const cleanLine = cleanTextForPDF(trimmedLine);
      if (!cleanLine) continue;

      // Check for DAY headers - handles **DIA 1**, *DIA 1*, DIA 1, etc.
      const dayMatch = cleanLine.match(/^\*{0,2}\s*(DIA\s*\d+|DAY\s*\d+)/i);
      if (dayMatch) {
        // Each day ALWAYS starts on a new page (except first content near top)
        if (yPosition < pageHeight - 180) {
          addNewPage();
        }
        
        yPosition -= 10;
        
        page.drawRectangle({
          x: margin - 5, y: yPosition - 8, width: contentWidth + 10, height: 32,
          color: primaryColor,
        });
        
        page.drawRectangle({
          x: margin - 5, y: yPosition - 8, width: 5, height: 32, color: accentColor,
        });
        
        page.drawText(cleanLine.replace(/^\*+\s*|\*+$/g, '').toUpperCase(), {
          x: margin + 8, y: yPosition + 3, size: headerFontSize, font: fontBold, color: rgb(1, 1, 1),
        });
        
        yPosition -= 48;
        continue;
      }

      // Check for time/period - handles Manhã, Manha, Tarde, Noite, Pôr do Sol, Dia Inteiro with accents
      const timeMatch = cleanLine.match(/^\*{0,2}\s*(Manh[aã]|Tarde|Noite|P[oô]r do Sol|Dia Inteiro|Morning|Afternoon|Evening)(\s*\([^)]+\))?:?\s*\*{0,2}/i);
      if (timeMatch) {
        checkPageBreak(40);
        
        yPosition -= 5;
        
        // Gray background
        page.drawRectangle({
          x: margin, y: yPosition - 5, width: contentWidth, height: 24, color: secondaryColor,
        });
        
        // Orange accent dot - NOW FOR ALL PERIODS INCLUDING MANHÃ
        page.drawCircle({
          x: margin + 10, y: yPosition + 5, size: 4, color: accentColor,
        });
        
        page.drawText(cleanLine.replace(/\*+/g, '').trim(), {
          x: margin + 22, y: yPosition + 1, size: subHeaderFontSize, font: fontBold, color: primaryColor,
        });
        
        yPosition -= 32;
        continue;
      }

      // Warning blocks
      const warningMatch = cleanLine.match(/^(Aten[cç][aã]o|Aviso|Importante|Warning|Note):/i);
      if (warningMatch) {
        checkPageBreak(50);
        
        page.drawRectangle({
          x: margin, y: yPosition - 25, width: contentWidth, height: 40,
          color: rgb(1, 0.95, 0.9), borderColor: warningColor, borderWidth: 1,
        });
        
        page.drawCircle({ x: margin + 15, y: yPosition - 5, size: 8, color: warningColor });
        
        page.drawText(cleanLine, {
          x: margin + 30, y: yPosition - 5, size: fontSize, font: fontBold, color: warningColor,
        });
        
        yPosition -= 50;
        continue;
      }

      // Bullet points
      const bulletMatch = trimmedLine.match(/^[-•]\s*/);
      if (bulletMatch) {
        checkPageBreak(lineHeight * 3);
        
        const bulletContent = cleanTextForPDF(trimmedLine.replace(/^[-•]\s*/, ''));
        const segments = parseWhatsAppFormatting(bulletContent);
        
        page.drawCircle({ x: margin + 12, y: yPosition - 1, size: 3, color: accentColor });
        
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
              checkPageBreak(lineHeight);
              page.drawText(lineText, {
                x: margin + 25, y: yPosition, size: fontSize, font: segFont,
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
          const lastSeg = segments[segments.length - 1] || { bold: false, italic: false, isLink: false };
          page.drawText(lineText, {
            x: margin + 25, y: yPosition, size: fontSize, font: getFontForSegment(lastSeg),
            color: lastSeg.isLink ? linkColor : textColor,
          });
          yPosition -= lineHeight;
        }
        
        yPosition -= 4;
        continue;
      }

      // Explanatory text
      const explanationMatch = cleanLine.match(/^(Por que escolhi|Why I chose|Dica|Tip):/i);
      if (explanationMatch) {
        checkPageBreak(lineHeight * 2);
        
        const words = cleanLine.split(' ');
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = fontItalic.widthOfTextAtSize(testLine, fontSize - 1);
          
          if (textWidth > contentWidth - 20) {
            checkPageBreak(lineHeight);
            page.drawText(currentLine, {
              x: margin + 20, y: yPosition, size: fontSize - 1, font: fontItalic, color: rgb(0.35, 0.35, 0.35),
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
            x: margin + 20, y: yPosition, size: fontSize - 1, font: fontItalic, color: rgb(0.35, 0.35, 0.35),
          });
          yPosition -= lineHeight;
        }
        
        continue;
      }

      // ===== LINK HANDLING =====

      // Markdown links [text](url)
      const navMatch = cleanLine.match(/^\[([^\]]+)\]\(([^)]+)\)/i);
      if (navMatch) {
        checkPageBreak(lineHeight + 10);
        
        const linkText = navMatch[1];
        const linkUrl = navMatch[2];
        
        // Bold red background highlight
        page.drawRectangle({
          x: margin, y: yPosition - 8, width: contentWidth, height: 30,
          color: rgb(1, 0.90, 0.90), borderColor: linkColor, borderWidth: 1.5,
        });
        
        // Map pin icon (larger)
        page.drawCircle({ x: margin + 14, y: yPosition + 4, size: 7, color: linkColor });
        page.drawCircle({ x: margin + 14, y: yPosition + 4, size: 3, color: rgb(1, 1, 1) });
        
        page.drawText(linkText, {
          x: margin + 24, y: yPosition + 1, size: fontSize, font: fontBold, color: linkColor,
        });
        
        const linkWidth = fontBold.widthOfTextAtSize(linkText, fontSize);
        page.drawLine({
          start: { x: margin + 24, y: yPosition - 2 },
          end: { x: margin + 24 + linkWidth, y: yPosition - 2 },
          thickness: 1, color: linkColor,
        });
        
        if (linkUrl) {
          addLinkAnnotation(linkUrl, margin, yPosition - 8, contentWidth, 30);
        }
        
        yPosition -= lineHeight + 10;
        continue;
      }
      
      // "Ver no mapa" or similar with optional URL
      const verMapaMatch = cleanLine.match(/^(Ver no [Mm]apa|Ver [Mm]apa|Google Maps|Waze|Navegar com[^:]*)[:\s]*(https?:\/\/[^\s]*)?/i);
      if (verMapaMatch) {
        checkPageBreak(lineHeight + 14);
        
        const labelText = verMapaMatch[1];
        const mapUrl = verMapaMatch[2] || '';
        
        // Bold red background highlight
        page.drawRectangle({
          x: margin, y: yPosition - 8, width: contentWidth, height: 30,
          color: rgb(1, 0.90, 0.90), borderColor: linkColor, borderWidth: 1.5,
        });
        
        // Map pin icon (larger)
        page.drawCircle({ x: margin + 14, y: yPosition + 4, size: 7, color: linkColor });
        page.drawCircle({ x: margin + 14, y: yPosition + 4, size: 3, color: rgb(1, 1, 1) });
        
        const fullText = mapUrl ? `${labelText}: ${mapUrl.length > 40 ? mapUrl.substring(0, 37) + '...' : mapUrl}` : labelText;
        page.drawText(fullText, {
          x: margin + 24, y: yPosition + 1, size: fontSize, font: fontBold, color: linkColor,
        });
        
        const textW = fontBold.widthOfTextAtSize(fullText, fontSize);
        page.drawLine({
          start: { x: margin + 24, y: yPosition - 2 },
          end: { x: margin + 24 + textW, y: yPosition - 2 },
          thickness: 1, color: linkColor,
        });
        
        if (mapUrl) {
          addLinkAnnotation(mapUrl, margin, yPosition - 8, contentWidth, 30);
        }
        
        yPosition -= lineHeight + 10;
        continue;
      }

      // Raw URLs (https://...)
      const rawUrlMatch = cleanLine.match(/^(https?:\/\/[^\s]+)/i);
      if (rawUrlMatch) {
        checkPageBreak(lineHeight + 14);
        
        const linkUrl = rawUrlMatch[1];
        const displayText = linkUrl.length > 55 ? linkUrl.substring(0, 52) + '...' : linkUrl;
        
        // Bold red background highlight  
        page.drawRectangle({
          x: margin, y: yPosition - 8, width: contentWidth, height: 30,
          color: rgb(1, 0.90, 0.90), borderColor: linkColor, borderWidth: 1.5,
        });
        
        page.drawCircle({ x: margin + 14, y: yPosition + 4, size: 7, color: linkColor });
        page.drawCircle({ x: margin + 14, y: yPosition + 4, size: 3, color: rgb(1, 1, 1) });
        
        page.drawText(displayText, {
          x: margin + 24, y: yPosition + 1, size: fontSize - 1, font: font, color: linkColor,
        });
        
        const linkWidth = font.widthOfTextAtSize(displayText, fontSize - 1);
        page.drawLine({
          start: { x: margin + 24, y: yPosition - 2 },
          end: { x: margin + 24 + linkWidth, y: yPosition - 2 },
          thickness: 1, color: linkColor,
        });
        
        addLinkAnnotation(linkUrl, margin, yPosition - 8, contentWidth, 30);
        
        yPosition -= lineHeight + 10;
        continue;
      }
      
      // [Navegar com ...] without URL
      const simpleNavMatch = cleanLine.match(/^\[([^\]]+)\]/i);
      if (simpleNavMatch && cleanLine.match(/navegar|waze|maps/i)) {
        checkPageBreak(lineHeight);
        
        const linkText = simpleNavMatch[1];
        
        page.drawRectangle({
          x: margin, y: yPosition - 6, width: contentWidth, height: 26,
          color: rgb(1, 0.94, 0.94), borderColor: linkColor, borderWidth: 0.5,
        });
        
        page.drawCircle({ x: margin + 12, y: yPosition + 4, size: 5, color: linkColor });
        page.drawCircle({ x: margin + 12, y: yPosition + 4, size: 2, color: rgb(1, 1, 1) });
        
        page.drawText(linkText, {
          x: margin + 24, y: yPosition + 1, size: fontSize, font: fontBold, color: linkColor,
        });
        
        const linkWidth = fontBold.widthOfTextAtSize(linkText, fontSize);
        page.drawLine({
          start: { x: margin + 24, y: yPosition - 2 },
          end: { x: margin + 24 + linkWidth, y: yPosition - 2 },
          thickness: 1, color: linkColor,
        });
        
        yPosition -= lineHeight + 10;
        continue;
      }

      // ===== REGULAR PARAGRAPH =====
      const segments = parseWhatsAppFormatting(cleanLine);
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
              x: margin, y: yPosition, size: fontSize, font: segFont,
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
          x: margin, y: yPosition, size: fontSize, font: getFontForSegment(lastSeg),
          color: lastSeg.isLink ? linkColor : textColor,
        });
        yPosition -= lineHeight;
      }
    }

    // Add footer to all pages
    const pages = pdfDoc.getPages();
    pages.forEach((p, index) => {
      // Gold footer separator
      p.drawRectangle({
        x: margin, y: 45, width: contentWidth, height: 0.8, color: goldColor,
      });

      // Footer logo on left
      if (logoImage) {
        p.drawImage(logoImage, { x: margin, y: 14, width: 26, height: 26 });
      }

      // Brand text next to logo
      const brandX = margin + (logoImage ? 32 : 0);
      p.drawText("SOL", {
        x: brandX, y: 28, size: 11, font: fontBold, color: primaryColor,
      });
      p.drawText("Roteiros de viagem", {
        x: brandX, y: 17, size: 7, font: font, color: mutedText,
      });

      // Page number centered
      const pageText = `${index + 1} / ${pages.length}`;
      const pageTextWidth = fontBold.widthOfTextAtSize(pageText, 9);
      p.drawText(pageText, {
        x: (pageWidth - pageTextWidth) / 2, y: 22, size: 9, font: fontBold, color: primaryColor,
      });

      // Date on right
      const footerDate = new Date().toLocaleDateString('pt-BR');
      const footerDateWidth = font.widthOfTextAtSize(footerDate, 8);
      p.drawText(footerDate, {
        x: pageWidth - margin - footerDateWidth,
        y: 22, size: 8, font: font, color: mutedText,
      });
    });

    const pdfBytes = await pdfDoc.save();

    // File name: roteiro-{traveler_name}.pdf (timestamp suffix to prevent collision)
    const slugify = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase()
        .substring(0, 60);
    const namePart = traveler_name ? slugify(traveler_name) : "viajante";
    const timestamp = Date.now();
    const fileName = `roteiro-${namePart}-${timestamp}.pdf`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('travel-pdfs')
      .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Erro ao fazer upload do PDF', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: publicUrlData } = supabase.storage.from('travel-pdfs').getPublicUrl(fileName);

    const { error: insertError } = await supabase
      .from('generated_itineraries')
      .insert({
        title, destination, traveler_name,
        pdf_url: publicUrlData.publicUrl,
        file_name: fileName,
        text_length: text.length
      });

    if (insertError) {
      console.error('Error saving itinerary metadata:', insertError);
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
