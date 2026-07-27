import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PdfReportOptions {
  title: string;
  subtitle?: string;
  pdfType?: string;
  headers: string[];
  rows: (string | number)[][];
  summaryKpis?: { label: string; value: string | number }[];
  fileName?: string;
  sucursalNombre?: string;
  membreteLine1?: string;
  membreteLine2?: string;
}

// Helper to load image URL as base64 Data URL for jsPDF
const loadImageAsDataUrl = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch (e) {
        console.warn('Canvas conversion failed:', e);
      }
      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/**
 * Draws the standardized IVSS Header in two distinct vertical levels:
 * Level 1: Prominent IVSS Logo occupying the full top row.
 * Level 2: Institutional text on the line below.
 */
export const drawIvssHeader = async (
  doc: jsPDF, 
  sucursalNombre?: string,
  customLine1?: string,
  customLine2?: string
): Promise<number> => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const startX = 14;
  let currentY = 10;

  // --- LÍNEA 1 SUPERIOR: Logo IVSS Destacado ---
  try {
    const logoDataUrl = await loadImageAsDataUrl('/assets/images/ivss-banner.png');
    if (logoDataUrl) {
      // Draw prominent logo banner across top line (width: 55mm, height: 14mm)
      doc.addImage(logoDataUrl, 'PNG', startX, currentY, 55, 14);
      currentY += 18;
    } else {
      // Fallback emblem occupying full line if image file cannot be rendered
      doc.setFillColor(15, 118, 110);
      doc.roundedRect(startX, currentY, 32, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('I V S S', startX + 6, currentY + 7);
      currentY += 14;
    }
  } catch (e) {
    console.warn('Could not render IVSS logo image:', e);
    currentY += 14;
  }

  // --- LÍNEA 2 INFERIOR: Texto Institucional ---
  const line1Text = customLine1 || 'Ministerio del Poder Popular para el Proceso Social de Trabajo';
  const line2Text = customLine2 || 'Instituto Venezolano de los Seguros Sociales';

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(line1Text, startX, currentY);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110); // Emerald/Teal IVSS Tone
  doc.text(line2Text, startX, currentY + 5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate 500
  const subText = sucursalNombre ? `MediControl Pro • Sede: ${sucursalNombre}` : 'MediControl Pro • Sistema de Gestión de Farmacia e Inventarios';
  doc.text(subText, startX, currentY + 10);

  // Horizontal divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, currentY + 14, pageWidth - 14, currentY + 14);

  return currentY + 20; // Returns next Y coordinate for PDF document body
};

/**
 * Generates a complete standardized PDF report with two-level IVSS header
 */
export const generateIvssPdfReport = async (options: PdfReportOptions) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // 1. Draw 2-level Membrete
  const nextY = await drawIvssHeader(
    doc, 
    options.sucursalNombre, 
    options.membreteLine1, 
    options.membreteLine2
  );

  // 2. Report Title & Generation Metadata
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(options.title, 14, nextY);

  if (options.subtitle) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(options.subtitle, 14, nextY + 5);
  }

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  const dateStr = `Emisión: ${new Date().toLocaleString('es-VE', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })}`;
  doc.text(dateStr, pageWidth - 14, nextY, { align: 'right' });

  let currentY = nextY + (options.subtitle ? 10 : 7);

  // 3. KPI Summaries (if provided)
  if (options.summaryKpis && options.summaryKpis.length > 0) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Resumen Ejecutivo / Métricas Clave', 14, currentY);
    currentY += 3;

    const kpiRows = options.summaryKpis.map(k => [k.label, String(k.value)]);
    autoTable(doc, {
      startY: currentY,
      head: [['Métrica / Indicador', 'Valor']],
      body: kpiRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      margin: { left: 14, right: 14 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 4. Main Data Table
  if (options.rows && options.rows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [options.headers],
      body: options.rows,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8
      },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Documento Oficial IVSS - MediControl Pro • Página ${data.pageNumber} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
      }
    });
  }

  // 5. Download File
  const fileBasename = options.fileName || `reporte_ivss_${options.pdfType || 'estadisticas'}_${Date.now()}.pdf`;
  doc.save(fileBasename);
};
