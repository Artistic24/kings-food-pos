# Kings Food POS

Kings Food POS is an offline-first restaurant point-of-sale application designed for Android devices and modern browsers.

## Offline by design

- Orders, menu items, categories, settings and sales history are stored locally on the device with IndexedDB.
- The application does not require a cloud database, login service or internet connection for normal POS operation.
- The PWA service worker precaches the application so the installed app continues to open without internet.
- Payment QR images are stored locally in the device database.
- Receipts are generated locally and can be printed through the device/browser print system.

## Kings Food branding

The application is fully Kings Food branded and has no external editor, telemetry, cloud database, or vendor runtime dependency.

## Development

```bash
npm install
npm run dev
npm run build
npm run test
```

## Local data

The database is named `kings-food` and is versioned in `src/lib/db.ts`. Clearing the application's site/app data will remove the local POS database, so use the application's future backup/export feature before resetting a production device.
