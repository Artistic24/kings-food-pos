import type { Order, Settings } from "@/lib/db";
import { getLang, translate } from "@/lib/i18n";

type PdfLine = { text: string; size?: number; bold?: boolean; center?: boolean };

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

function renderTextLine(line: PdfLine, y: number): string {
  const size = line.size ?? 10;
  const font = line.bold ? "F2" : "F1";
  const approximateWidth = line.text.length * size * 0.5;
  const x = line.center ? Math.max(36, (595 - approximateWidth) / 2) : 40;
  return "BT /" + font + " " + size + " Tf 1 0 0 1 " +
    x.toFixed(2) + " " + y.toFixed(2) + " Tm " +
    pdfLiteral(line.text) + " Tj ET";
}

function createPdf(lines: PdfLine[]): string {
  const perPage = 43;
  const pages: PdfLine[][] = [];
  for (let index = 0; index < lines.length; index += perPage) {
    const pageLines = lines.slice(index, index + perPage);
    if (index > 0) {
      pageLines.unshift({ text: "Receipt continued", size: 9, bold: true });
    }
    pages.push(pageLines);
  }

  const objects = new Map<number, string>();
  const pageIds: number[] = [];
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  pages.forEach((pageLines, pageIndex) => {
    const pageId = 5 + pageIndex * 2;
    const contentId = pageId + 1;
    pageIds.push(pageId);
    const stream = pageLines.map((line, lineIndex) =>
      renderTextLine(line, 800 - lineIndex * 17),
    ).join("\n");
    objects.set(pageId,
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " +
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
  const lines: PdfLine[] = [];
  const add = (text: unknown, options: Omit<PdfLine, "text"> = {}) => {
    for (const segment of wrap(text, options.size && options.size >= 13 ? 58 : 82)) {
      lines.push({ text: segment, ...options });
    }
  };
  const rule = () => add("------------------------------------------------------------", { size: 9 });

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

  add((pharmacy ? "ITEM" : (lang === "fr" ? "ACTE" : "ACT")) + " / " +
    (lang === "fr" ? "QTE" : "QTY") + " / " + t("Total"), { bold: true });
  for (const item of order.items) {
    add(item.name, { bold: true });
    const lineTotal = item.price * item.qty * (1 - discountPercent / 100);
    add("  " + t("Unit") + ": " + money(item.price, lang) +
      "  x " + item.qty + "  " + t("Discount") + ": " + discountPercent + "%");
    add("  " + t("Total") + ": " + money(lineTotal, lang));
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

  const pdf = createPdf(lines);
  return btoa(pdf);
}
