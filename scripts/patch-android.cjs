const fs = require('fs');
const path = require('path');

console.log('--- Configuring Android for Notification / Status Bar ---');

// 1. Fix Kotlin stdlib conflicts
const buildGradlePath = 'android/app/build.gradle';
if (fs.existsSync(buildGradlePath)) {
  fs.appendFileSync(
    buildGradlePath,
    '\nconfigurations.all { resolutionStrategy.eachDependency { details -> if (details.requested.group == "org.jetbrains.kotlin") { details.useVersion "1.8.22" } } }\n'
  );
}

const gradlePropsPath = 'android/gradle.properties';
if (fs.existsSync(gradlePropsPath)) {
  fs.appendFileSync(gradlePropsPath, '\nandroid.enableJetifier=true\n');
}

// 2. Set styles.xml to disable fullscreen and ensure notification bar is visible
const stylesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:windowFullscreen">false</item>
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
        <item name="android:statusBarColor">#000000</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:windowFullscreen">false</item>
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
        <item name="android:statusBarColor">#000000</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:windowFullscreen">false</item>
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
        <item name="android:statusBarColor">#000000</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:background">@drawable/splash</item>
    </style>
</resources>`;

const stylesPath = 'android/app/src/main/res/values/styles.xml';
if (fs.existsSync(path.dirname(stylesPath))) {
  fs.writeFileSync(stylesPath, stylesXml);
  console.log('✓ Updated styles.xml successfully');
}

// 3. Write complete MainActivity with permanent status bar and white icons
const mainActivityJava = `package com.deepkapatel.calculator;

import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(0xFF000000);

        View decorView = window.getDecorView();
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
        if (controller != null) {
            controller.show(WindowInsetsCompat.Type.statusBars());
            controller.setAppearanceLightStatusBars(false);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        window.setStatusBarColor(0xFF000000);

        View decorView = window.getDecorView();
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
        if (controller != null) {
            controller.show(WindowInsetsCompat.Type.statusBars());
            controller.setAppearanceLightStatusBars(false);
        }
    }
}
`;

function findFile(dir, regex) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      const res = findFile(full, regex);
      if (res) return res;
    } else if (regex.test(f.name)) return full;
  }
  return null;
}

const mainFile = findFile('android/app/src/main/java', /^MainActivity\.(java|kt)$/);
if (mainFile) {
  fs.writeFileSync(mainFile, mainActivityJava);
  console.log('✓ MainActivity.java patched successfully');
}
console.log('--- Android configuration complete ---');
