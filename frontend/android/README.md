# Sachet for Android

Native Android app (Kotlin, Jetpack Compose). It talks to the same API as the website and the
bots, so all of them give the same answer.

- **Check**: a message, phone number, UPI ID or link. You get the verdict, why, and what to do.
- **Share menu**: in WhatsApp or SMS, long-press a message → Share → **Sachet**. It opens and
  checks the message straight away.
- **Screenshots**: share a screenshot to Sachet, or tap **📷 Check a screenshot**. ML Kit reads
  its Hindi and English text on the phone (the picture is never uploaded) and checks the text.
  The reading model comes through Google Play services, so the APK stays small; on a phone
  without Play services this one feature says it can't read the picture.
- **Report** a scam, **delete my data**, privacy notice, English / हिंदी switch.
- **1930** button opens the dialer with the number filled in, so the app needs no phone permission.

Not in this version (V3): call screening and reading SMS. Both need Play Store approval for
sensitive permissions.

## Layout

```
app/src/main/java/com/unfilteredengineers/sachet/
  MainActivity.kt        start-up and the Share menu
  data/SachetApi.kt      API client (OkHttp + kotlinx.serialization)
  data/Models.kt         the API's JSON
  data/Prefs.kt          random client ID and language, on this phone only
  data/Input.kt          guess the identifier type, join shared text
  data/ScreenshotReader.kt  read a screenshot's text on the phone (ML Kit)
  data/ScreenshotText.kt    drop the status bar and app buttons from that text
  i18n/Strings.kt        every text in English and Hindi (same as the website)
  ui/                    view model and screens (Check, Report, Privacy)
app/src/test/            unit tests (run on your computer, no phone needed)
```

## Build and test

Needs JDK 17 and the Android SDK (Android Studio installs both).

```bash
cd frontend/android
./gradlew testDebugUnitTest   # unit tests
./gradlew lintDebug           # Android lint
./gradlew assembleDebug       # APK in app/build/outputs/apk/debug/
```

Or open `frontend/android` in Android Studio and press ▶ Run.

## Which API it talks to

Set in `gradle.properties`:

| Build   | Property                | Default                                                      |
| ------- | ----------------------- | ------------------------------------------------------------ |
| Debug   | `sachet.apiUrl.debug`   | `http://10.0.2.2:3000` (your laptop, seen from the emulator) |
| Release | `sachet.apiUrl.release` | must be your Railway `https://` URL                          |

On a real phone with a debug build: plug it in over USB with USB debugging on, run
`adb reverse tcp:3000 tcp:3000`, and set `sachet.apiUrl.debug=http://localhost:3000`.

## Release build

1. Set your Railway URL in `gradle.properties`: `sachet.apiUrl.release=https://….up.railway.app`.
2. Make a signing key once, and keep it outside the repo (it asks for passwords; remember them):

   ```bash
   keytool -genkeypair -v -keystore ~/keys/sachet-release.jks -alias sachet -keyalg RSA -keysize 4096 -validity 10000
   ```

3. Copy `keystore.properties.example` to `keystore.properties` and fill in the path and
   passwords. It is git-ignored.
4. `./gradlew bundleRelease` makes `app/build/outputs/bundle/release/app-release.aab` for the
   Play Store; `./gradlew assembleRelease` makes an APK to share directly.

Back up the `.jks` file and its passwords (a password manager is good). If they are lost, the
Play Store app can never be updated again.

## Security

- **Permissions: Internet, and "view network connections"** (`ACCESS_NETWORK_STATE`, added by
  ML Kit to see whether the phone is online). No contacts, SMS, call log, location or gallery:
  screenshots come through the Share menu or Android's photo picker, which need no permission.
- **Screenshots stay on the phone.** ML Kit reads them on the device; Google's ML Kit does send
  Google usage and performance statistics, but not the picture or its text. Only `content://`
  pictures from other apps are read, never `file://` (which could point at Sachet's own files).
- **HTTPS only in release.** Plain http is allowed only in debug builds, only to the laptop
  addresses above. Certificates a user or an app added to the phone aren't trusted, so they
  can't be used to read the traffic.
- **No redirect from https down to http**, 20-second time limit on every call.
- **Backups off.** The random client ID never goes to a cloud backup or a new phone.
- **Shared text is untrusted.** It is only shown as text and sent to the API to check; it is
  never opened, run or logged.
- **Release builds are shrunk and obfuscated** (R8). The release build refuses to compile with a
  non-https API URL.
- Signing keys (`*.jks`, `*.keystore`) are git-ignored. Keep the release key outside the repo
  and back it up: losing it means you can never update the app on the Play Store.
