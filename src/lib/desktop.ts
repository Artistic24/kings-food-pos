import { Capacitor } from "@capacitor/core";
import ExcelJS from "exceljs";
import { AndroidPrinter } from "@/lib/androidPrinter";

export type DesktopPrinter = {
  name: string;
  displayName: string;
  description?: string;
  status?: number;
  isDefault?: boolean;
  source?: "electron" | "windows" | "android";
};

export type PrintResult = {
  success: boolean;
  failureReason?: string | null;
};

export type ArchiveResult = {
  success: boolean;
  alreadyArchived?: boolean;
  fallback?: boolean;
  filePath?: string;
  relativePath?: string;
  warning?: string;
};

export type SpendingArchiveResult = ArchiveResult;

export type KingsFoodDesktopBridge = {
  isDesktop: true;
  getPrinters: () => Promise<DesktopPrinter[]>;
  printReceipt: (options?: { printerName?: string }) => Promise<PrintResult>;
  archiveReceipt: (payload: { order: unknown; settings: unknown }) => Promise<ArchiveResult>;
  archiveSpending: (payload: { spending: unknown; settings: unknown }) => Promise<ArchiveResult>;
  openReceiptsFolder: () => Promise<{ success: boolean; path?: string }>;
};

declare global {
  interface Window {
    kingsFoodDesktop?: KingsFoodDesktopBridge;
  }
}


function isAndroidApp() {
  return Capacitor.getPlatform() === "android" && Capacitor.isNativePlatform();
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

async function createAndroidExcelReceipt(kind: "sale" | "spending", data: any) {
  const createdAt = Number(data.createdAt || Date.now());
  const date = new Date(createdAt);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const ref = String(data.ref || ("KF-" + createdAt));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kings Food POS";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(kind === "sale" ? "Receipt" : "Spending");

  if (kind === "sale") {
    sheet.columns = [
      { header: "Receipt Ref", key: "ref", width: 22 },
      { header: "Reference", key: "reference", width: 32 },
      { header: "Date", key: "date", width: 20 },
      { header: "Item", key: "item", width: 32 },
      { header: "Qty", key: "qty", width: 10 },
      { header: "Unit Price", key: "unit", width: 16 },
      { header: "Line Total", key: "line", width: 16 },
      { header: "Subtotal", key: "subtotal", width: 16 },
      { header: "Discount", key: "discount", width: 16 },
      { header: "Tax", key: "tax", width: 16 },
      { header: "Delivery", key: "delivery", width: 16 },
      { header: "Total", key: "total", width: 16 },
      { header: "Payment", key: "payment", width: 20 },
      { header: "Tendered", key: "tendered", width: 16 },
      { header: "Change", key: "change", width: 16 },
    ];
    data.items?.forEach((item: any, index: number) => {
      sheet.addRow({
        ref: index === 0 ? ref : "",
        reference: index === 0 ? (data.reference || "") : "",
        date: index === 0 ? date : "",
        item: item.name,
        qty: item.qty,
        unit: item.price,
        line: item.price * item.qty,
        subtotal: index === 0 ? data.subtotal : "",
        discount: index === 0 ? (data.discount || 0) : "",
        tax: index === 0 ? (data.tax || 0) : "",
        delivery: index === 0 ? (data.deliveryFee || 0) : "",
        total: index === 0 ? data.total : "",
        payment: index === 0 ? data.paymentMethod : "",
        tendered: index === 0 ? (data.tendered ?? "") : "",
        change: index === 0 && data.tendered !== undefined ? Math.max(0, data.tendered - data.total) : "",
      });
    });
  } else {
    sheet.columns = [
      { header: "Spending Ref", key: "ref", width: 22 },
      { header: "Reference", key: "reference", width: 32 },
      { header: "Date", key: "date", width: 20 },
      { header: "Description", key: "description", width: 32 },
      { header: "Category", key: "category", width: 20 },
      { header: "Supplier / Recipient", key: "vendor", width: 28 },
      { header: "Payment", key: "payment", width: 20 },
      { header: "Amount", key: "amount", width: 16 },
      { header: "Notes", key: "notes", width: 40 },
    ];
    sheet.addRow({
      ref,
      reference: data.reference || "",
      date,
      description: data.description,
      category: data.category,
      vendor: data.vendor || "",
      payment: data.paymentMethod || "",
      amount: data.amount,
      notes: data.notes || "",
    });
  }

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer();
  const safeRef = ref.replace(/[^a-zA-Z0-9_-]/g, "_");
  const prefix = kind === "sale" ? "Kings-Food-Receipt" : "Kings-Food-Spending";
  const fileName = prefix + "-" + safeRef + "-" + year + month + day + ".xlsx";

  const saved = await AndroidPrinter.saveExcel({
    base64: bufferToBase64(buffer),
    fileName,
    year,
    month,
  });

  return {
    success: Boolean(saved.success),
    relativePath: saved.path || fileName,
  };
}

export async function getDesktopPrinters(): Promise<DesktopPrinter[]> {
  return window.kingsFoodDesktop?.getPrinters() ?? [];
}

export async function printReceiptAndArchive(
  order: unknown,
  settings: { printerName?: string },
): Promise<{ printed: boolean; archived: boolean; fallback: boolean; message?: string }> {
  if (isAndroidApp()) {
    const printed = await AndroidPrinter.printCurrentPage({ jobName: "Kings Food POS Receipt" });
    if (!printed.success) {
      return { printed: false, archived: false, fallback: false, message: printed.failureReason || "Android printing was cancelled or failed." };
    }
    const archived = await createAndroidExcelReceipt("sale", order);
    return {
      printed: true,
      archived: archived.success,
      fallback: false,
      message: archived.success
        ? "Printed successfully and saved to Excel: " + archived.relativePath
        : "Printed successfully, but the Excel receipt archive could not be saved.",
    };
  }

  const desktop = window.kingsFoodDesktop;

  if (!desktop) {
    window.print();
    return {
      printed: false,
      archived: false,
      fallback: true,
      message: "Browser print dialog opened. Automatic Excel archiving is available in the Windows app.",
    };
  }

  const printed = await desktop.printReceipt({
    printerName: settings.printerName || undefined,
  });

  if (!printed.success) {
    return {
      printed: false,
      archived: false,
      fallback: false,
      message: printed.failureReason || "Printing was cancelled or Windows could not print the receipt.",
    };
  }

  const archived = await desktop.archiveReceipt({ order, settings });
  return {
    printed: true,
    archived: archived.success,
    fallback: Boolean(archived.fallback),
    message: archived.success
      ? archived.warning || `Printed successfully and saved to Excel: ${archived.relativePath || "Receipts folder"}`
      : "Printed successfully, but the Excel receipt archive could not be updated.",
  };
}

export async function printSpendingAndArchive(
  spending: unknown,
  settings: { printerName?: string },
): Promise<{ printed: boolean; archived: boolean; fallback: boolean; message?: string }> {
  if (isAndroidApp()) {
    const printed = await AndroidPrinter.printCurrentPage({ jobName: "Kings Food Spending Receipt" });
    if (!printed.success) {
      return { printed: false, archived: false, fallback: false, message: printed.failureReason || "Android printing was cancelled or failed." };
    }
    const archived = await createAndroidExcelReceipt("spending", spending);
    return {
      printed: true,
      archived: archived.success,
      fallback: false,
      message: archived.success
        ? "Printed successfully and saved to Excel: " + archived.relativePath
        : "Printed successfully, but the Excel spending archive could not be saved.",
    };
  }

  const desktop = window.kingsFoodDesktop;

  if (!desktop) {
    window.print();
    return { printed: false, archived: false, fallback: true, message: "Browser print dialog opened." };
  }

  const printed = await desktop.printReceipt({ printerName: settings.printerName || undefined });
  if (!printed.success) {
    return { printed: false, archived: false, fallback: false, message: printed.failureReason || "Printing was cancelled." };
  }

  const archived = await desktop.archiveSpending({ spending, settings });
  return {
    printed: true,
    archived: archived.success,
    fallback: Boolean(archived.fallback),
    message: archived.success
      ? archived.warning || `Printed successfully and saved to Excel: ${archived.relativePath || "Receipts folder"}`
      : "Printed successfully, but the Excel spending archive could not be updated.",
  };
}
