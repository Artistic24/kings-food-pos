# Medical Centre POS release branch

This branch is the release source for **Medical Centre POS v1.3.0-medical.1**.

It is intentionally separate from `main`, which continues to represent the Kings Food restaurant POS.

The versioned release workflows build and verify:
- `Medical-Centre-POS-1.3.0-medical.1.apk`
- `Medical-Centre-POS-1.3.0-medical.1.exe`

The APK is built with the dedicated Android package ID `com.kingshealth.medicalpos`. Patient receipt data uses its own local database `medical-centre-pos`.

Before live use, the medical centre should set its actual name, address, phone, logo, cashier name, and approved catalogue prices in Settings / Articles & actes. Example catalogue prices are supplied for setup and must be confirmed by the centre.
