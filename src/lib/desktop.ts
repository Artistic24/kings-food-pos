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
  filePath?: string;
  relativePath?: string;
};

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
    window.print();
    return {
      printed: false,
      archived: false,
      fallback: true,
      message: printed.failureReason || "The selected printer could not be used. The Windows print dialog was opened instead.",
    };
  }

  const archived = await desktop.archiveReceipt({ order, settings });
  return {
    printed: true,
    archived: archived.success,
    fallback: false,
    message: archived.success
      ? `Printed successfully and saved to Excel: ${archived.relativePath || "Receipts folder"}`
      : "Printed successfully, but the Excel receipt archive could not be updated.",
  };
}
