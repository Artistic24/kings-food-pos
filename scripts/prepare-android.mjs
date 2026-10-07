import fs from "node:fs";
import path from "node:path";

const androidRoot = path.resolve("android");
const manifestPath = path.join(androidRoot, "app/src/main/AndroidManifest.xml");
const activityPath = path.join(
  androidRoot,
  "app/src/main/java/com/kingsfood/pos/MainActivity.java",
);
const iconSource = path.resolve("public/icons/icon-512.png");
const iconDir = path.join(androidRoot, "app/src/main/res/drawable");
const iconTarget = path.join(iconDir, "kings_food_icon.png");

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
  'android:icon="@drawable/kings_food_icon"',
);
fs.writeFileSync(manifestPath, manifest);

if (fs.existsSync(iconSource)) {
  fs.mkdirSync(iconDir, { recursive: true });
  fs.copyFileSync(iconSource, iconTarget);
} else {
  throw new Error("Kings Food icon source is missing: public/icons/icon-512.png");
}

const pluginPath = path.join(
  androidRoot,
  "app/src/main/java/com/kingsfood/pos/KingsFoodPrinterPlugin.java",
);
const pluginJava = `package com.kingsfood.pos;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.print.PrintAttributes;
import android.print.PrintJob;
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
import java.util.Base64;

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
                    .setMediaSize(PrintAttributes.MediaSize.UNKNOWN_PORTRAIT)
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build();

                PrintJob job = printManager.print(
                    call.getString("jobName", "Kings Food POS Receipt"),
                    getBridge().getWebView().createPrintDocumentAdapter("Kings Food POS"),
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
            byte[] data = Base64.getDecoder().decode(base64);
            String relative = "Download/Kings Food POS/Receipts/" + year + "/" + month + "/";
            String savedPath;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                values.put(MediaStore.Downloads.RELATIVE_PATH, relative);
                values.put(MediaStore.Downloads.IS_PENDING, 1);

                Uri uri = getContext().getContentResolver().insert(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    values
                );
                if (uri == null) throw new Exception("Android could not create the Excel file");

                try (OutputStream out = getContext().getContentResolver().openOutputStream(uri)) {
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
                    "Kings Food POS/Receipts/" + year + "/" + month
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

const java = `package com.kingsfood.pos;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.BridgeActivity;
import com.kingsfood.pos.KingsFoodPrinterPlugin;
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

console.log("Kings Food Android permissions and icon prepared.");
