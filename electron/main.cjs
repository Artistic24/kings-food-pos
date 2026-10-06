const { app, BrowserWindow, ipcMain } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { archivePrintedReceipt, openReceiptsFolder } = require("./receipts.cjs");

const PORT = 0;
const DIST_DIR = path.join(__dirname, "..", "dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
        const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
        const distRoot = path.resolve(DIST_DIR);
        const candidate = path.resolve(DIST_DIR, relativePath);

        if (!candidate.startsWith(distRoot + path.sep)) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }

        const filePath = fs.existsSync(candidate) && fs.statSync(candidate).isFile()
          ? candidate
          : path.join(DIST_DIR, "index.html");

        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
          "Cache-Control": "no-cache",
        });
        fs.createReadStream(filePath).pipe(res);
      } catch (error) {
        console.error("Kings Food local server error:", error);
        res.writeHead(500);
        res.end("Internal server error");
      }
    });

    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}


function registerIpcHandlers() {
  if (registerIpcHandlers.registered) return;
  registerIpcHandlers.registered = true;

  ipcMain.handle("kings-food:get-printers", async (event) => {
    const printers = await event.sender.getPrintersAsync();
    return printers.map((printer) => ({
      name: printer.name,
      displayName: printer.displayName,
      description: printer.description,
      status: printer.status,
      isDefault: printer.isDefault,
    }));
  });

  ipcMain.handle("kings-food:print-receipt", async (event, options = {}) => {
    return await new Promise((resolve) => {
      const printerName = typeof options.printerName === "string" ? options.printerName.trim() : "";
      const printOptions = {
        silent: true,
        printBackground: true,
        color: true,
        margins: { marginType: "none" },
        ...(printerName ? { deviceName: printerName } : {}),
      };

      event.sender.print(printOptions, (success, failureReason) => {
        resolve({
          success,
          failureReason: success ? null : failureReason || "Windows could not print the receipt.",
        });
      });
    });
  });

  ipcMain.handle("kings-food:archive-receipt", async (_event, payload) => {
    return await archivePrintedReceipt(payload);
  });

  ipcMain.handle("kings-food:open-receipts-folder", async () => openReceiptsFolder());
}

async function createWindow() {
  const server = await startStaticServer();
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#fffaf4",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.loadURL("http://127.0.0.1:" + port + "/");

  window.on("closed", () => server.close());
}

app.whenReady().then(() => {
  registerIpcHandlers();
  return createWindow();
}).catch((error) => {
  console.error("Kings Food POS failed to start:", error);
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
