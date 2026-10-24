import fs from "node:fs";
import path from "node:path";

const androidRoot = path.resolve("android");
const manifestPath = path.join(androidRoot, "app/src/main/AndroidManifest.xml");
const activityPath = path.join(
  androidRoot,
  "app/src/main/java/com/kingshealth/medicalpos/MainActivity.java",
);
const iconDir = path.join(androidRoot, "app/src/main/res/drawable");

if (!fs.existsSync(manifestPath)) {
  throw new Error("Android project is missing. Run: npm run android:add");
}

const permissions = [
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.BLUETOOTH_SCAN",
  "android.permission.BLUETOOTH_CONNECT",
  "android.permission.BLUETOOTH_ADVERTISE",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
];

let manifest = fs.readFileSync(manifestPath, "utf8");
for (const permission of permissions) {
  const line = `    <uses-permission android:name="${permission}" />`;
  if (!manifest.includes(`android:name="${permission}"`)) {
    manifest = manifest.replace("</manifest>", `${line}\n</manifest>`);
  }
}
manifest = manifest.replace(
  /android:icon="[^"]+"/,
  'android:icon="@drawable/medical_centre_icon"',
);
fs.writeFileSync(manifestPath, manifest);

const medicalIcon = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="48dp"
    android:height="48dp"
    android:viewportWidth="48"
    android:viewportHeight="48">
    <path android:fillColor="#2563EB" android:pathData="M0,0h48v48H0z" />
    <path android:fillColor="#FFFFFFFF" android:pathData="M20,8h8v12h12v8H28v12h-8V28H8v-8h12z" />
</vector>
`;
fs.mkdirSync(iconDir, { recursive: true });
fs.writeFileSync(path.join(iconDir, "medical_centre_icon.xml"), medicalIcon);

const pluginPath = path.join(
  androidRoot,
  "app/src/main/java/com/kingshealth/medicalpos/KingsFoodPrinterPlugin.java",
);
const pluginJava = `package com.kingshealth.medicalpos;

import android.app.Activity;
import android.content.ContentValues;
import android.content.ContentUris;
import android.content.Context;
import android.database.Cursor;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.print.PrintAttributes;
import android.print.PrintJob;
import android.print.PageRange;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "KingsFoodPrinter")
public class KingsFoodPrinterPlugin extends Plugin {
    private final Handler handler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("platform", "android");
        ret.put("printSystemAvailable", getContext().getSystemService(Context.PRINT_SERVICE) != null);
        call.resolve(ret);
    }

    @PluginMethod
    public void openPrintSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_PRINT_SETTINGS);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Unable to open Android print settings", e);
        }
    }

    @PluginMethod
    public void printCurrentPage(PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Android activity is unavailable");
            return;
        }

        activity.runOnUiThread(() -> {
            try {
                PrintManager printManager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
                if (printManager == null) {
                    call.reject("Android printing is not available on this device");
                    return;
                }

                PrintAttributes attributes = new PrintAttributes.Builder()
                    .setMediaSize(new PrintAttributes.MediaSize("MEDICAL_INDEX_CARD_5X3", "Index card 5 x 3 in", 5000, 3000))
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build();

                PrintJob job = printManager.print(
                    call.getString("jobName", "Medical Centre POS Receipt"),
                    getBridge().getWebView().createPrintDocumentAdapter("Medical Centre POS"),
                    attributes
                );

                if (job == null) {
                    call.reject("Android could not create the print job");
                    return;
                }

                waitForPrintJob(call, job, System.currentTimeMillis());
            } catch (Exception e) {
                call.reject("Could not open Android print preview", e);
            }
        });
    }

    private void waitForPrintJob(PluginCall call, PrintJob job, long startedAt) {
        if (job.isCompleted()) {
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("status", "completed");
            call.resolve(ret);
            return;
        }
        if (job.isFailed()) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("status", "failed");
            ret.put("failureReason", "Android reported that the print job failed.");
            call.resolve(ret);
            return;
        }
        if (job.isCancelled()) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("status", "cancelled");
            ret.put("failureReason", "Printing was cancelled.");
            call.resolve(ret);
            return;
        }

        if (System.currentTimeMillis() - startedAt > 10 * 60 * 1000L) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("status", "timeout");
            ret.put("failureReason", "Android print job timed out.");
            call.resolve(ret);
            return;
        }

        handler.postDelayed(() -> waitForPrintJob(call, job, startedAt), 500);
    }

    @PluginMethod
    public void saveReceiptPdf(PluginCall call) {
        String base64 = call.getString("base64");
        String fileName = call.getString("fileName");
        String year = call.getString("year");
        String month = call.getString("month");
        if (base64 == null || fileName == null || year == null || month == null) {
            call.reject("Missing PDF receipt data");
            return;
        }

        Uri savedUri = null;
        boolean createdNew = false;
        String savedPath;
        try {
            byte[] pdfBytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
            if (pdfBytes.length < 5 || pdfBytes[0] != '%' || pdfBytes[1] != 'P' ||
                pdfBytes[2] != 'D' || pdfBytes[3] != 'F' || pdfBytes[4] != '-') {
                throw new IllegalArgumentException("Generated receipt does not contain a valid PDF header");
            }

            String safeFileName = new File(fileName).getName();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                String relativePath = Environment.DIRECTORY_DOWNLOADS + "/Medical Centre POS/Receipts/" + year + "/" + month + "/";
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, safeFileName);
                values.put(MediaStore.Downloads.MIME_TYPE, "application/pdf");
                values.put(MediaStore.Downloads.RELATIVE_PATH, relativePath);
                values.put(MediaStore.Downloads.IS_PENDING, 1);

                String selection = MediaStore.Downloads.DISPLAY_NAME + "=? AND " + MediaStore.Downloads.RELATIVE_PATH + "=?";
                String[] selectionArgs = new String[] { safeFileName, relativePath };
                try (Cursor cursor = getContext().getContentResolver().query(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    new String[] { MediaStore.Downloads._ID },
                    selection, selectionArgs, MediaStore.Downloads._ID + " ASC")) {
                    if (cursor != null) {
                        while (cursor.moveToNext()) {
                            Uri existing = ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cursor.getLong(0));
                            if (savedUri == null) savedUri = existing;
                            else getContext().getContentResolver().delete(existing, null, null);
                        }
                    }
                }

                if (savedUri == null) {
                    savedUri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    createdNew = true;
                    if (savedUri == null) throw new Exception("Android could not create the PDF file");
                } else {
                    getContext().getContentResolver().update(savedUri, values, null, null);
                }

                OutputStream output = getContext().getContentResolver().openOutputStream(savedUri, "w");
                if (output == null) throw new Exception("Android could not open the PDF file");
                try (OutputStream stream = output) {
                    stream.write(pdfBytes);
                    stream.flush();
                }

                ContentValues done = new ContentValues();
                done.put(MediaStore.Downloads.IS_PENDING, 0);
                getContext().getContentResolver().update(savedUri, done, null, null);
                savedPath = savedUri.toString();
            } else {
                File root = new File(getContext().getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS),
                    "Medical Centre POS/Receipts/" + year + "/" + month);
                if (!root.exists() && !root.mkdirs()) {
                    throw new Exception("Could not create PDF receipt directory");
                }
                File file = new File(root, safeFileName);
                try (OutputStream stream = new FileOutputStream(file)) {
                    stream.write(pdfBytes);
                    stream.flush();
                }
                savedPath = file.getAbsolutePath();
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("path", savedPath);
            call.resolve(ret);
        } catch (Exception e) {
            if (createdNew && savedUri != null) {
                try { getContext().getContentResolver().delete(savedUri, null, null); } catch (Exception ignored) {}
            }
            call.reject("Could not save PDF receipt", e);
        }
    }

    @PluginMethod
    public void saveExcel(PluginCall call) {
        String base64 = call.getString("base64");
        String fileName = call.getString("fileName");
        String year = call.getString("year");
        String month = call.getString("month");

        if (base64 == null || fileName == null || year == null || month == null) {
            call.reject("Missing Excel file data");
            return;
        }

        try {
            byte[] data = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
            String relative = "Download/Medical Centre POS/Receipts/" + year + "/" + month + "/";
            String savedPath;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                values.put(MediaStore.Downloads.RELATIVE_PATH, relative);
                values.put(MediaStore.Downloads.IS_PENDING, 1);

                Uri uri = null;
                boolean createdNew = false;
                String selection = MediaStore.Downloads.DISPLAY_NAME + "=? AND " + MediaStore.Downloads.RELATIVE_PATH + "=?";
                String[] selectionArgs = new String[] { fileName, relative };
                try (Cursor cursor = getContext().getContentResolver().query(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    new String[] { MediaStore.Downloads._ID },
                    selection, selectionArgs, MediaStore.Downloads._ID + " ASC")) {
                    if (cursor != null) {
                        while (cursor.moveToNext()) {
                            Uri existing = ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cursor.getLong(0));
                            if (uri == null) uri = existing;
                            else getContext().getContentResolver().delete(existing, null, null);
                        }
                    }
                }

                if (uri == null) {
                    uri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    createdNew = true;
                    if (uri == null) throw new Exception("Android could not create the Excel file");
                } else {
                    getContext().getContentResolver().update(uri, values, null, null);
                }

                try (OutputStream out = getContext().getContentResolver().openOutputStream(uri, "w")) {
                    if (out == null) throw new Exception("Android could not open the Excel file");
                    out.write(data);
                    out.flush();
                }

                values.clear();
                values.put(MediaStore.Downloads.IS_PENDING, 0);
                getContext().getContentResolver().update(uri, values, null, null);
                savedPath = uri.toString();
            } else {
                File root = new File(
                    getContext().getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS),
                    "Medical Centre POS/Receipts/" + year + "/" + month
                );
                if (!root.exists() && !root.mkdirs()) throw new Exception("Could not create receipt directory");
                File file = new File(root, fileName);
                try (FileOutputStream out = new FileOutputStream(file)) {
                    out.write(data);
                    out.flush();
                }
                savedPath = file.getAbsolutePath();
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("path", savedPath);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not save Excel receipt", e);
        }
    }
}
`;

fs.writeFileSync(pluginPath, pluginJava);

const java = `package com.kingshealth.medicalpos;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.BridgeActivity;
import com.kingshealth.medicalpos.KingsFoodPrinterPlugin;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSIONS_REQUEST = 4201;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KingsFoodPrinterPlugin.class);
        super.onCreate(savedInstanceState);
        requestKingsFoodPermissions();
    }

    private void requestKingsFoodPermissions() {
        List<String> permissions = new ArrayList<>();

        permissions.add(Manifest.permission.CAMERA);
        permissions.add(Manifest.permission.RECORD_AUDIO);
        permissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
        permissions.add(Manifest.permission.ACCESS_COARSE_LOCATION);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS);
            permissions.add(Manifest.permission.READ_MEDIA_IMAGES);
            permissions.add(Manifest.permission.READ_MEDIA_VIDEO);
            if (Build.VERSION.SDK_INT >= 34) {
                permissions.add("android.permission.READ_MEDIA_VISUAL_USER_SELECTED");
            }
        } else {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            if (Build.VERSION.SDK_INT <= 28) {
                permissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_SCAN);
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT);
            permissions.add(Manifest.permission.BLUETOOTH_ADVERTISE);
        }

        List<String> missing = new ArrayList<>();
        for (String permission : permissions) {
            if (ActivityCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                missing.add(permission);
            }
        }

        if (!missing.isEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                missing.toArray(new String[0]),
                PERMISSIONS_REQUEST
            );
        }
    }
}
`;
fs.mkdirSync(path.dirname(activityPath), { recursive: true });
fs.writeFileSync(activityPath, java);

// Keep the installed Android app version aligned with package.json/release assets.
const packageJson = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
const appVersion = String(packageJson.version || "");
const versionMatch = appVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-[A-Za-z0-9.-]+)?$/);
if (!versionMatch) {
  throw new Error("Invalid app version in package.json: " + appVersion);
}
const major = Number(versionMatch[1]);
const minor = Number(versionMatch[2]);
const patch = Number(versionMatch[3]);
const prereleaseMatch = appVersion.match(/-(?:[^.]+\.)?(\d+)$/);
const prereleaseNumber = prereleaseMatch ? Number(prereleaseMatch[1]) : 0;
const versionCode = major * 1000000 + minor * 10000 + patch * 100 + prereleaseNumber;
const gradlePath = [
  path.join(androidRoot, "app/build.gradle"),
  path.join(androidRoot, "app/build.gradle.kts"),
].find((candidate) => fs.existsSync(candidate));
if (!gradlePath) {
  throw new Error("Android app Gradle file is missing.");
}
let gradle = fs.readFileSync(gradlePath, "utf8");
if (!/versionCode(?:\s*=\s*|\s+)\d+/.test(gradle) || !/versionName(?:\s*=\s*|\s+)["'][^"']+["']/.test(gradle)) {
  throw new Error("Could not find Android versionCode/versionName in the app Gradle file.");
}
gradle = gradle.replace(/versionCode(?:\s*=\s*|\s+)\d+/, (match) =>
  match.includes("=") ? "versionCode = " + versionCode : "versionCode " + versionCode,
);
gradle = gradle.replace(/versionName(?:\s*=\s*|\s+)["'][^"']+["']/, (match) =>
  match.includes("=") ? 'versionName = "' + appVersion + '"' : 'versionName "' + appVersion + '"',
);
fs.writeFileSync(gradlePath, gradle);
console.log("Medical Centre Android version configured: " + appVersion + " (versionCode " + versionCode + ")");

console.log("Medical Centre Android permissions and icon prepared.");
