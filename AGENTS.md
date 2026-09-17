I want to create a react native android app that will allow user to add entries of amounts of gold purchased at certain dates, and the app will scrape https://gold.sa/en for historic prices of gold to calculate how much was spent on tgese purchases and how much would they sell today and the estimated profits allow the user to add multiple entries for ach one stating the amount, karat and date and scraped data should be etored locally

## Project layout

React Native 0.87 (TypeScript), Android-only. Core logic lives in `src/`:

- `src/types.ts` — shared types (`GoldEntry`, `GoldPriceSnapshot`, karats).
- `src/gold.ts` — pure valuation math and `gold.sa` HTML price parsing (fully unit tested).
- `src/priceService.ts` — fetches live prices from `https://gold.sa/en`, falls back to bundled defaults.
- `src/storage.ts` — local persistence via AsyncStorage.
- `App.tsx` — UI (add entries, list, portfolio summary).

## Commands

- Install deps: `npm install`
- Unit tests: `npm test` (Jest)
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Build debug APK: `cd android && ./gradlew assembleDebug`
- Metro dev server: `npm start`

`gold.sa` returns HTTP 403 to non-browser clients, so the live scrape is exercised on-device with browser headers; parsing is validated by unit tests in `__tests__/gold.test.ts`.

## Cursor Cloud specific instructions

The Android SDK is pre-installed at `$HOME/android-sdk` (cmdline-tools, platform-tools, `platforms;android-37.0`, `build-tools;37.0.0`, emulator, and an `android-35` google_apis x86_64 system image). `android/local.properties` is gitignored and recreated by the install step.

To build/test:

```bash
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
npm install
npm test
(cd android && ./gradlew assembleDebug)
```

To run the app on the headless emulator (KVM is required):

```bash
sudo chmod 666 /dev/kvm                     # reset each boot; done by the start command
emulator -avd gold_test -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect -no-snapshot &
adb wait-for-device
adb reverse tcp:8081 tcp:8081               # let the app reach Metro
npm start &                                 # Metro dev server
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p com.goldpriceapp -c android.intent.category.LAUNCHER 1
```
