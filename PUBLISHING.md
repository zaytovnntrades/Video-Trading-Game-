# Publishing Market Apprentice: website and app stores

The game is already an installable web app (a PWA: `manifest.webmanifest`, `sw.js` and `icons/`).
That one base gives you all three: **website → Android app → iPhone app**. Do them in that order, because each stage reuses the previous one.

| Stage | Where | Cost | Time | Needs a Mac? |
|---|---|---|---|---|
| 1 | Website (GitHub Pages) | Free | 10 min | No |
| 2 | Google Play (Android) | $25 one-time | 1–3 days + review | No |
| 3 | Apple App Store (iPhone) | $99 / year | 1–2 weeks + review | Yes (or a cloud Mac) |

---

## Stage 1: Website (GitHub Pages, free)

1. Merge the branch `claude/amazing-shannon-f1n9qy` into `main` on GitHub (open a pull request and click **Merge**).
2. In the repo, go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**. Pick **main** and **/ (root)**, then click **Save**.
4. Wait 1–2 minutes. Your game will be live at:
   `https://zaytovnntrades.github.io/Video-Trading-Game-/`
5. Test it on your phone. In Chrome, use the menu → **Install app**. On iPhone Safari, use **Share → Add to Home Screen**. It works offline after the first visit.

**Shortcut alternatives**
- **Netlify Drop** (app.netlify.com/drop): drag the project folder onto the page and get a live link in about 30 seconds.
- **itch.io**: a game platform with a built-in audience. Zip the folder, then create a new project → Kind: **HTML** → upload the zip → tick "This file will be played in the browser".
- **Custom domain** (around $10/yr, e.g. from Namecheap or Cloudflare): add it in Settings → Pages → Custom domain.

---

## Stage 2: Android / Google Play

The repo already contains a ready Android app project (`android/`, made with Capacitor). The game files are bundled inside the app, so it works fully offline and doesn't depend on the website.

### Get a test APK onto your phone (free, about 5 minutes)
Every push to `main` (or a `claude/...` branch) builds the app automatically on GitHub.
1. On GitHub, open the repo → **Actions** → **Android app** → the latest green run.
2. Under **Artifacts**, download **market-apprentice-debug-apk** and unzip it to get `app-debug.apk`.
3. Copy it to your Android phone and open it. Allow "install unknown apps" when asked.
4. To rebuild by hand: Actions → Android app → **Run workflow**.

The debug APK is for testing only. Google Play needs a **signed release bundle (.aab)**.

### Signed release for Google Play
1. **Create your upload key once, on your own computer.** It needs Java (any recent JDK):
   ```bash
   keytool -genkeypair -v -keystore market-apprentice.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```
   **Back up this file and its passwords.** If you lose them you can't update the app. Never commit the keystore.
2. Turn it into text: `base64 -w0 market-apprentice.keystore` (on a Mac: `base64 -i market-apprentice.keystore`).
3. On GitHub, go to **Settings → Secrets and variables → Actions → New repository secret** and add four secrets:
   - `ANDROID_KEYSTORE_BASE64`: the base64 text
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`: `upload`
   - `ANDROID_KEY_PASSWORD`
4. Run the workflow again. A **market-apprentice-release-aab** artifact appears. That `.aab` is what you upload to Play. Each build gets a higher version code automatically.
5. Create a **Google Play Console** account at play.google.com/console ($25, one-time). Then **Create app → Production → upload the .aab**.
6. Fill in the store listing:
   - **Short description:** "Learn trading basics and practise with fake money."
   - **Screenshots:** at least 2 phone screenshots (Menu, 3D floor, a Lesson, Trade, Report).
   - **Feature graphic:** 1024×500.
   - **Icon:** 512×512. Use `icons/icon-512.png`.
   - **Privacy policy URL:** required. Say "This game collects no data. Progress is stored only on your device."
   - **Content rating questionnaire** and **Data safety:** answer "no data collected". Category: **Education**.
7. **New personal developer accounts must run a closed test** with at least 12 testers for 14 days before going public. Start recruiting early.
8. Submit for review.

**App ID:** `com.marketapprentice.game` (in `capacitor.config.json` and `android/app/build.gradle`). It becomes permanent the first time you upload to Play, so change it before then if you want a different one.

### Working on the Android project yourself (optional)
You need Node 22+, JDK 21 and Android Studio.
```bash
npm ci
npm run android:sync     # copies the game into www/ and into the Android project
npx cap open android     # opens Android Studio; press Run to install on a phone or emulator
```

**Alternative without the repo project:** paste your Stage 1 website URL into **pwabuilder.com → Package for stores → Android**.

---

## Stage 3: iPhone / Apple App Store

Apple doesn't accept plain website wrappers, so the app needs to feel like a real app. Our game is offline-capable, has no browser address bar and doesn't depend on a website, which all help.

1. Join the **Apple Developer Program** at developer.apple.com ($99/year).
2. You need **Xcode**, which only runs on a Mac. With no Mac, rent a cloud Mac (MacinCloud, about $1/hr), or use a cloud build service like Codemagic or Ionic Appflow.
3. Wrap the game with **Capacitor**, the most common free tool for turning web apps into native apps:
   ```bash
   npm ci                  # Capacitor is already set up in this repo (see Stage 2)
   npm install @capacitor/ios
   npm run build:web       # copies the game files into www/
   npx cap add ios
   npx cap open ios        # opens Xcode
   ```
4. In Xcode, set your Team (your developer account), the app icon (1024×1024, no transparency) and the version. Then choose **Product → Archive → Distribute → App Store Connect**.
5. In **App Store Connect**, create the app listing:
   - screenshots for 6.7" and 6.5" iPhones
   - a description and keywords (e.g. "trading, stock market, learn, simulator, education")
   - a privacy policy URL, with privacy details set to "Data Not Collected"
   - age rating
6. Test it first with **TestFlight**, then submit for review. Review usually takes 1–3 days.

**Approval tips for Apple**
- Make the category **Education**, not Finance. A simulator with fake money that teaches is easier to approve.
- Say clearly in the description that it is a simulation, with no real money and no real trading.
- Never add real-money features, crypto links or "get rich" claims. Apple and Google both reject those.

---

## Before you submit (checklist)
- [ ] Website live and installable (Stage 1)
- [ ] Privacy policy page published
- [ ] 4–6 screenshots (Menu, Lesson, Trade with a position open, Report card)
- [ ] 512×512 icon (Android) and 1024×1024 icon (iOS)
- [ ] Short and full store descriptions, with the "educational simulation, not financial advice" line
- [ ] Signing keys backed up (Android keystore)
