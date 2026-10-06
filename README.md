# Kings Food POS

Offline-first restaurant point-of-sale application for Kings Food.

## Offline architecture

The POS is designed to operate without an Internet connection after installation. Menu, categories, orders, sales history, settings, payment methods and local QR assets are stored on the device using IndexedDB. A service worker caches the application shell for offline startup.

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Branding

This project contains no Lovable runtime, telemetry, cloud database, Supabase/Firebase dependency, external font loading, or external runtime API requirement.

## Local data

The local database is named `kings-food`. Clearing the browser/app site data removes the local POS database, so production deployments should provide an appropriate backup/export workflow before clearing device data.

## Repository

Kings Food POS — maintained for Kings Food restaurant operations.
