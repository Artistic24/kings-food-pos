import { registerPlugin } from "@capacitor/core";

export interface AndroidPrinterPlugin {
  getStatus(): Promise<{ platform: string; printSystemAvailable: boolean }>;
  openPrintSettings(): Promise<void>;
  printCurrentPage(options?: { jobName?: string }): Promise<{
    success: boolean;
    status?: string;
    failureReason?: string;
  }>;
  saveExcel(options: {
    base64: string;
    fileName: string;
    year: string;
    month: string;
  }): Promise<{ success: boolean; path?: string }>;
}

export const AndroidPrinter = registerPlugin<AndroidPrinterPlugin>("KingsFoodPrinter");

// Android native printing: system preview selects the connected printer.
