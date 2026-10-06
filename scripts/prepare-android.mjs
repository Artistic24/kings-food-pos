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

const java = `package com.kingsfood.pos;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSIONS_REQUEST = 4201;

    @Override
    public void onCreate(Bundle savedInstanceState) {
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
