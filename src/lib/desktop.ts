export type DesktopPrinter = {
  name: string;
  displayName: string;
  description?: string;
  status?: number;
  isDefault?: boolean;
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
  openReceiptsFolder: () => Promise<{ success: boolean; path?: string }>;
};

declare global {
  interface Window {
    kingsFoodDesktop?: KingsFoodDesktopBridge;
  }
}

export async function getDesktopPrinters(): Promise<DesktopPrinter[]> {
  return window.kingsFoodDesktop?.getPrinters() ?? [];
}

export async function printReceiptAndArchive(
  order: unknown,
  settings: { printerName?: string },
): Promise<{ printed: boolean; archived: boolean; fallback: boolean; message?: string }> {
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
