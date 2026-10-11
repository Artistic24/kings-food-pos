# Medical Centre POS

A dedicated, offline-first point-of-sale edition for medical centres, with separate receipt layouts for the cashier/laboratory and pharmacy.

## Receipt layouts

- **Reçu de Caisse:** patient name and code, service, treating practitioner, ACTE/Red/PU/QTE/TOTAL item table, total, payment, change, amount remaining, patient debt, deposit balance, date/time and optional cashier name.
- **Reçu de Pharmacie:** patient name and code, ARTICLE/Red/PU/QTE/TOTAL item table and the same payment and balance totals.
- The facility name, address, phone, optional logo, receipt footer and cashier name are editable from Settings.
- Supports partial cash payments and records the remaining amount due.
- Android printing uses the system print preview. Windows printing uses the selected installed printer. Desktop-printed receipts are archived to Excel.

## First launch

The catalogue is preloaded with example laboratory acts and pharmacy/care items based on the supplied receipt photographs. **Prices are examples only:** review and adjust the catalogue from **Articles & actes** before using the system for real transactions. Enter the centre's full legal name, address, phone and logo in **Settings**.

## Build on Windows

```bash
npm install --legacy-peer-deps
npm run build:win
```

## Build Android

```bash
npm install --legacy-peer-deps
npm run android:add
npm run android:sync
npm run build:android:release
```

The GitHub Actions workflows publish the Android APK and Windows installer to the versioned GitHub Release for tags matching `v*-medical*`.

## Data and privacy

Patient and transaction records are stored locally in the app's dedicated IndexedDB database `medical-centre-pos`. The medical edition uses a separate Android application ID and Windows app identity from Kings Food restaurant POS. Back up the device regularly and follow your centre's policies for patient data access and retention.
