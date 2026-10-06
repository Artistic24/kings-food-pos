const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kingsFoodDesktop", {
  isDesktop: true,

  getPrinters: () => ipcRenderer.invoke("kings-food:get-printers"),

  printReceipt: (options = {}) =>
    ipcRenderer.invoke("kings-food:print-receipt", {
      printerName: typeof options.printerName === "string" ? options.printerName : "",
    }),

  archiveReceipt: (payload) =>
    ipcRenderer.invoke("kings-food:archive-receipt", payload),

  openReceiptsFolder: () => ipcRenderer.invoke("kings-food:open-receipts-folder"),
});
