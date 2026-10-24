import type { Order, Settings } from "@/lib/db";
import { getLang, translate } from "@/lib/i18n";

type PdfLine = { text: string; size?: number; bold?: boolean; center?: boolean; mono?: boolean };

function money(value: number, lang: "en" | "fr"): string {
  const formatted = new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
  return formatted + " FCFA";
}

function safeText(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/·/g, "-")
    .replace(/€/g, " EUR ");
}

function wrap(value: unknown, width = 82): string[] {
  const text = safeText(value).trim();
  if (!text) return [""];
  const words = text.split(/\s+/);
  const result: string[] = [];
  let line = "";
  for (const word of words) {
    if (word.length > width) {
      if (line) result.push(line);
      for (let index = 0; index < word.length; index += width) {
        const part = word.slice(index, index + width);
        if (part.length === width) result.push(part);
        else line = part;
      }
      continue;
    }
    if (!line) line = word;
    else if ((line + " " + word).length <= width) line += " " + word;
    else {
      result.push(line);
      line = word;
    }
  }
  if (line) result.push(line);
  return result.length ? result : [""];
}

function pdfLiteral(value: string): string {
  let out = "(";
  for (const original of value) {
    let ch = original;
    const cp = ch.codePointAt(0) ?? 32;
    if (ch === "\\") { out += "\\\\"; continue; }
    if (ch === "(" || ch === ")") { out += "\\" + ch; continue; }
    if (cp >= 32 && cp <= 126) { out += ch; continue; }
    if (cp <= 255 && cp >= 160) {
      out += "\\" + cp.toString(8).padStart(3, "0");
      continue;
    }
    const transliterated = ch.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    if (transliterated && transliterated !== ch) {
      out += transliterated.replace(/[^\x20-\x7e]/g, "?")
        .replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    } else {
      out += "?";
    }
  }
  return out + ")";
}

function renderTextLine(line: PdfLine, y: number, pageWidth: number): string {
  const size = line.size ?? 10;
  const font = line.mono ? "F3" : line.bold ? "F2" : "F1";
  const approximateWidth = line.text.length * size * 0.5;
  const x = line.center ? Math.max(12, (pageWidth - approximateWidth) / 2) : 12;
  return "BT /" + font + " " + size + " Tf 1 0 0 1 " +
    x.toFixed(2) + " " + y.toFixed(2) + " Tm " +
    pdfLiteral(line.text) + " Tj ET";
}

function createPdf(lines: PdfLine[], format = "index-3x5"): string {
  // Media sizes use portrait dimensions (width, height in PDF points).
  const pageSizes: Record<string, [number, number]> = {"index-3x5":[216,360],"index-4x6":[288,432],"index-5x8":[360,576],"foolscap":[612,936],"government-letter":[576,756],"junior-legal":[576,720],"ledger":[792,1224],"legal":[612,1008],"letter":[612,792],"monarch":[279,540],"quarto":[610,780],"tabloid":[792,1224],"ansi-c":[1224,1584],"ansi-d":[1584,2448],"ansi-e":[2448,3168],"arch-b":[1296,1728],"arch-c":[1728,2592],"arch-d":[2592,3456],"arch-e":[3456,4320],"arch-e1":[3150,4500],"iso-a0":[2383.94,3370.39],"iso-a1":[1683.78,2383.94],"iso-a2":[1190.55,1683.78],"iso-a3":[841.89,1190.55],"iso-a4":[595.28,841.89],"iso-a5":[419.53,595.28],"iso-a6":[297.64,419.53],"iso-a7":[209.76,297.64],"iso-a8":[147.4,209.76],"iso-a9":[104.88,147.4],"iso-a10":[73.7,104.88],"iso-c5":[459.21,649.13],"iso-c6":[323.15,459.21],"iso-c7":[229.61,323.15],"iso-c8":[161.57,229.61],"iso-c9":[114.8,161.57],"photo-l":[252,360],"super-b":[936,1368],"chou2":[420,595],"chou3":[297.64,420],"chou4":[210,297.64],"hagaki":[283.46,419.53],"jis-b0":[2919.69,4127.24],"jis-b1":[2063.62,2919.69],"jis-b2":[1459.84,2063.62],"jis-b3":[1031.81,1459.84],"jis-b4":[728.5,1031.81],"jis-b5":[515.91,728.5],"jis-b6":[362.83,515.91],"jis-b7":[257.95,362.83],"jis-b8":[181.42,257.95],"jis-b9":[127.56,181.42],"jis-b10":[90.71,127.56],"thermal-58":[164.4,180],"thermal-80":[226.8,180],"a4":[595.28,841.89],"a5":[419.53,595.28]};
  const [pageWidth, minimumPageHeight] = pageSizes[format] || pageSizes["index-3x5"];
  const margin = format.startsWith("thermal") ? 6 : 12;
  const lineGap = format.startsWith("thermal") ? 11 : 12;
  // Expand only when content needs it, avoiding blank trailing pages.
  const pageHeight = Math.max(minimumPageHeight, lines.length * lineGap + 2 * margin + 10);
  const pages = [lines];

  const objects = new Map<number, string>();
  const pageIds: number[] = [];
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  objects.set(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>");

  pages.forEach((pageLines, pageIndex) => {
    const pageId = 6 + pageIndex * 2;
    const contentId = pageId + 1;
    pageIds.push(pageId);
    const stream = pageLines.map((line, lineIndex) =>
      renderTextLine(line, pageHeight - margin - 12 - lineIndex * lineGap, pageWidth),
    ).join("\n");
    objects.set(pageId,
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pageWidth + " " + pageHeight + "] " +
      "/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents " +
      contentId + " 0 R >>");
    objects.set(contentId, "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream");
  });

  objects.set(2, "<< /Type /Pages /Kids [" + pageIds.map(id => id + " 0 R").join(" ") +
    "] /Count " + pageIds.length + " >>");

  const maxId = Math.max(...objects.keys());
  let pdf = "%PDF-1.4\n%MedicalCentrePOS\n";
  const offsets = new Array<number>(maxId + 1).fill(0);
  for (let id = 1; id <= maxId; id++) {
    const object = objects.get(id);
    if (!object) continue;
    offsets[id] = pdf.length;
    pdf += id + " 0 obj\n" + object + "\nendobj\n";
  }
  const xrefOffset = pdf.length;
  pdf += "xref\n0 " + (maxId + 1) + "\n";
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id <= maxId; id++) {
    pdf += (offsets[id] || 0).toString().padStart(10, "0") + " 00000 " +
      (offsets[id] ? "n" : "f") + " \n";
  }
  pdf += "trailer\n<< /Size " + (maxId + 1) + " /Root 1 0 R >>\nstartxref\n" +
    xrefOffset + "\n%%EOF\n";
  return pdf;
}

export function generateReceiptPdfBase64(order: Order, settings: Partial<Settings>): string {
  const lang = getLang();
  const t = (label: string) => translate(label, lang);
  const pharmacy = order.receiptKind === "pharmacy";
  const discountPercent = Number(order.discountPercent ?? 0);
  const paid = Math.min(
    Math.max(0, Number.isFinite(order.amountPaid) ? Number(order.amountPaid) : order.paid ? order.total : 0),
    order.total,
  );
  const tendered = Math.max(0, Number(order.tendered ?? paid));
  const change = Math.max(0, tendered - order.total);
  const remaining = Math.max(0, order.total - paid);
  const date = new Date(Number(order.createdAt || Date.now()));
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  const format = settings.receiptFormat || "index-3x5";
  const lines: PdfLine[] = [];
  const add = (text: unknown, options: Omit<PdfLine, "text"> = {}) => {
    for (const segment of wrap(text, options.size && options.size >= 13 ? 28 : 40)) {
      lines.push({ text: segment, ...options });
    }
  };
  const narrow = format === "thermal-58";
  const cols = narrow ? [10, 3, 5, 3, 7] : [14, 4, 7, 4, 9];
  const ruleWidth = narrow ? 28 : format === "thermal-80" ? 36 : 40;
  const rule = () => add("-".repeat(ruleWidth), { size: 9, mono: true });
  const pad = (value: string, width: number, side: "left" | "right" = "left") =>
    side === "right" ? value.slice(-width).padStart(width, " ") : value.slice(0, width).padEnd(width, " ");
  const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);

  add(settings.businessName || "MEDICAL CENTRE", { size: 15, bold: true, center: true });
  if (settings.address) add(settings.address, { center: true });
  if (settings.phone) add(t("Phone:") + " " + settings.phone, { center: true });
  rule();
  add(t(pharmacy ? "Pharmacy receipt" : "Cash receipt"), { size: 12, bold: true, center: true });
  add(t("No.:") + " " + order.ref, { center: true });
  rule();

  add((order.customer || "—").toLocaleUpperCase(locale), { size: 11, bold: true });
  add(t("Patient code:") + " " + (order.patientCode || "—"));
  if (!pharmacy) {
    add(t("Medical service:") + " " + (order.service || "LABORATORY"));
    add(t("Practitioner:") + " " + (order.practitioner || "—"));
  }
  if (order.phone) add(t("Patient phone:") + " " + order.phone);
  rule();

  const header = pad(pharmacy ? "ITEM" : (lang === "fr" ? "ACTE" : "ACT"), cols[0]) +
    pad(lang === "fr" ? "RED" : "DISC", cols[1], "right") +
    pad(lang === "fr" ? "PU" : "UNIT", cols[2], "right") +
    pad(lang === "fr" ? "QTE" : "QTY", cols[3], "right") +
    pad("TOTAL", cols[4], "right");
  add(header, { bold: true, mono: true, size: narrow ? 7 : 8 });
  for (const item of order.items) {
    const lineTotal = item.price * item.qty * (1 - discountPercent / 100);
    const nameLines = wrap(item.name, cols[0]);
    nameLines.forEach((namePart, index) => {
      const row = pad(namePart, cols[0]) +
        (index === 0 ? pad(String(discountPercent) + "%", cols[1], "right") : " ".repeat(cols[1])) +
        (index === 0 ? pad(number(item.price), cols[2], "right") : " ".repeat(cols[2])) +
        (index === 0 ? pad(String(item.qty), cols[3], "right") : " ".repeat(cols[3])) +
        (index === 0 ? pad(number(lineTotal), cols[4], "right") : " ".repeat(cols[4]));
      add(row, { mono: true, size: narrow ? 7 : 8 });
    });
  }
  rule();

  add(t("Subtotal") + ": " + money(order.subtotal, lang));
  add(t("Discount") + " (" + discountPercent + "%): " +
    money(order.discount ?? Math.round(order.subtotal * discountPercent / 100), lang));
  if (order.tax > 0) add(t("Tax") + ": " + money(order.tax, lang));
  add(t("Total amount") + ": " + money(order.total, lang), { bold: true, size: 12 });
  add(t("Amount received") + ": " + money(tendered, lang));
  add(t("Change given") + ": " + money(change, lang));
  add(t("Remaining") + ": " + money(remaining, lang), { bold: true });
  rule();
  add(t("Patient debt") + ": " + money(remaining, lang));
  add(t("Deposit balance") + ": " + money(order.depositBalance ?? 0, lang));
  add(date.toLocaleDateString(locale) + " " + date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }));
  if (settings.cashierName) add(t("Printed by:") + " " + settings.cashierName);
  if (settings.receiptFooter) {
    rule();
    add(settings.receiptFooter, { center: true });
  }

  const pdf = createPdf(lines, format);
  return btoa(pdf);
}
