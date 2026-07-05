import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export interface Table {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  /** índices de columnas numéricas (alineación derecha) */
  numeric?: number[];
}

export function toCsv(table: Table): Buffer {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const lines = [table.headers.map(escape).join(","), ...table.rows.map((r) => r.map(escape).join(","))];
  // BOM para que Excel abra UTF-8 correctamente (tildes, ñ)
  return Buffer.from("﻿" + lines.join("\n"), "utf8");
}

export async function toXlsx(table: Table): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(table.title.slice(0, 31));

  ws.addRow([table.title]).font = { bold: true, size: 14 };
  if (table.subtitle) ws.addRow([table.subtitle]).font = { size: 10, color: { argb: "FF666666" } };
  ws.addRow([]);

  const headerRow = ws.addRow(table.headers);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF5F0" } };
    cell.border = { bottom: { style: "thin" } };
  });
  for (const row of table.rows) ws.addRow(row);

  ws.columns.forEach((col, i) => {
    col.width = Math.max(10, table.headers[i]?.length ?? 10, 14);
    if (table.numeric?.includes(i)) col.alignment = { horizontal: "right" };
  });
  ws.getColumn(2).width = 28;

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function toPdf(table: Table): Promise<Buffer> {
  return renderPdf((doc) => {
    doc.fontSize(16).font("Helvetica-Bold").text(table.title);
    if (table.subtitle) doc.fontSize(9).font("Helvetica").fillColor("#666").text(table.subtitle);
    doc.moveDown(1);

    const startX = doc.page.margins.left;
    const usable = doc.page.width - startX - doc.page.margins.right;
    // primera columna angosta, segunda ancha, resto repartido
    const n = table.headers.length;
    const widths = table.headers.map((_, i) => (i === 0 ? 24 : i === 1 ? usable * 0.3 : 0));
    const rest = (usable - 24 - usable * 0.3) / (n - 2 || 1);
    for (let i = 2; i < n; i++) widths[i] = rest;

    const drawRow = (cells: (string | number)[], bold = false, y?: number) => {
      const rowY = y ?? doc.y;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).fillColor("#111");
      let x = startX;
      cells.forEach((c, i) => {
        doc.text(String(c), x, rowY, {
          width: widths[i]! - 4,
          align: table.numeric?.includes(i) || (i > 1 && bold) ? "right" : "left",
          lineBreak: false,
        });
        x += widths[i]!;
      });
      doc.y = rowY + 14;
    };

    drawRow(table.headers, true);
    doc
      .moveTo(startX, doc.y - 3)
      .lineTo(startX + usable, doc.y - 3)
      .strokeColor("#999")
      .lineWidth(0.5)
      .stroke();
    for (const row of table.rows) {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 20) doc.addPage();
      drawRow(row);
    }
  });
}

export function renderPdf(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    draw(doc);
    doc.end();
  });
}
