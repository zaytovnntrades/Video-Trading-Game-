# Publishing Market Apprentice: website and app stores

The game is already an installable web app (a PWA: `manifest.webmanifest`, `sw.js` and `icons/`).
That one base gives you all three: **website → Android app → iPhone app**. Do them in that order, because each stage reuses the previous one.

| Stage | Where | Cost | Time | Needs a Mac? |
|---|---|---|---|---|
| 1 | Website (GitHub Pages) | Free | 10 min | No |
| 2 | Google Play (Android) | $25 one-time | 1–3 days + review | No |
| 3 | Apple App Store (iPhone) | $99 / year | 1–2 weeks + review | No (GitHub's Macs build it) |

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

The repo contains a ready iOS app project (`ios/`, Capacitor). Like Android, the game is bundled inside, so it plays fully offline. **You don't need a Mac:** GitHub's Mac machines build it.

### What happens automatically (free, no Apple account)
Every push that changes the game builds the iOS app and **runs it in an iPhone simulator**. A screenshot of the running app is saved under Actions → **iOS app** → latest run → Artifacts → **ios-simulator-screenshot**.
> If your repo is private, Mac build minutes count 10× against GitHub's free allowance. Public repos are free.

### Getting it onto a real iPhone (TestFlight)
iPhones can't install app files the way Android can. The route is **TestFlight**, Apple's free beta-testing app, which needs a developer account.
1. Join the **Apple Developer Program** at developer.apple.com ($99/year). Note your **Team ID** (Membership details page).
2. In **App Store Connect** (appstoreconnect.apple.com) go to **Apps → + → New App**. Choose platform iOS, name "Market Apprentice", bundle ID `com.marketapprentice.game` (register it under Certificates, IDs & Profiles → Identifiers if it isn't listed), and SKU `market-apprentice`.
3. Create an API key: App Store Connect → **Users and Access → Integrations → App Store Connect API → Team Keys → +**. Use the **Admin** role. Download the `.p8` file (it can only be downloaded once, so back it up) and note the **Key ID** and **Issuer ID**.
4. On GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Add four secrets:
   - `IOS_TEAM_ID`: your Team ID
   - `APPSTORE_API_KEY_ID`: the Key ID
   - `APPSTORE_API_ISSUER_ID`: the Issuer ID
   - `APPSTORE_API_KEY_P8`: open the `.p8` file in a text editor and paste all of it
5. Go to **Actions → iOS app → Run workflow**, tick **Sign and upload to TestFlight**, and run it. Xcode signs the app automatically with the key, so you never handle certificates yourself.
6. After about 10–30 minutes of Apple processing, the build appears in App Store Connect → your app → **TestFlight**. Add yourself as an internal tester, install the **TestFlight** app on your iPhone, and install Market Apprentice from there.

### Publishing on the App Store
1. In App Store Connect, fill in the listing:
   - screenshots for 6.9" and 6.5" iPhones (plus iPad, since the app supports iPad)
   - description and keywords ("trading, stock market, learn, simulator, education")
   - **privacy policy URL**, with App Privacy set to **Data Not Collected**
   - age rating
   - category **Education**
2. Under the version, choose the TestFlight build and click **Submit for Review**. Review usually takes 1–3 days.

**Approval tips for Apple**
- Say clearly that it's a **simulation with fake money**, with no real trading and no real-money features.
- Apple rejects thin website wrappers. This app bundles everything, plays offline and has native touch controls, which helps.
- Export compliance is pre-answered (`ITSAppUsesNonExemptEncryption = false`), so uploads don't ask about encryption.

### Working on the iOS project yourself (optional, needs a Mac)
```bash
npm ci
npm run ios:sync      # copies the game into www/ and into the iOS project
npx cap open ios      # opens Xcode; pick a simulator or your iPhone and press Run
```

---

## Before you submit (checklist)
- [ ] Website live and installable (Stage 1)
- [ ] Privacy policy page published
- [ ] 4–6 screenshots (Menu, Lesson, Trade with a position open, Report card)
- [ ] 512×512 icon (Android: `icons/icon-512.png`) and 1024×1024 icon (iOS: already in the Xcode project)
- [ ] Short and full store descriptions, with the "educational simulation, not financial advice" line
- [ ] Signing keys backed up (Android keystore)
