# Kings Food POS

Kings Food POS is an offline-first restaurant point-of-sale application designed for Android devices, modern browsers, and Windows desktop computers.

## Offline by design

- Orders, menu items, categories, settings and sales history are stored locally on the device with IndexedDB.
- The application does not require a cloud database, login service or internet connection for normal POS operation.
- The PWA service worker precaches the application so the installed browser/PWA version continues to open without internet.
- Payment QR images are stored locally in the device database.
- Receipts are generated locally and can be printed through the device/browser print system.

## Windows desktop app

The Windows version is packaged with Electron. Electron serves the compiled POS from a local loopback server, so the same client-side IndexedDB data model and offline behavior are preserved without requiring an internet connection.

### Build locally on Windows

```bash
npm install
npm run build:win
```

The installer is written to the `release/` directory.

### GitHub Actions

Every push to `main` also builds the Windows installer on a Windows GitHub Actions runner and uploads the `.exe` as a workflow artifact.

## Kings Food branding

The application is fully Kings Food branded and has no external editor, telemetry, cloud database, or vendor runtime dependency.

## Development

```bash
npm install
npm run dev
npm run build
npm run test
```

For the desktop shell:

```bash
npm run electron:dev
```

## Local data

The database is named `kings-food` and is versioned in `src/lib/db.ts`. Clearing the application's site/app data will remove the local POS database, so use the application's future backup/export feature before resetting a production device.
