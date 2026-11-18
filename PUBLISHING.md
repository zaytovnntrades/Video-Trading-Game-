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

## Stage 2: Android / Google Play (no coding needed)

Google Play accepts PWAs wrapped as a "Trusted Web Activity".

1. Create a **Google Play Console** account at play.google.com/console ($25, one-time).
2. Go to **pwabuilder.com** and paste your Stage 1 website URL. It scores the app; the manifest and offline support are already in place.
3. Click **Package for stores → Android → Generate**. Download the zip. It contains:
   - an `.aab` file, which is what you upload to Play
   - a `signing.keystore` and its passwords. **Back these up somewhere safe.** If you lose them, you can never update the app.
   - an `assetlinks.json` file
4. Put `assetlinks.json` in the repo at `.well-known/assetlinks.json`, commit, and push. This proves you own the website and removes the browser address bar inside the app.
   - Also add an empty file called `.nojekyll` at the root of the repo, so GitHub Pages serves the `.well-known` folder.
5. In Play Console: **Create app → Production → Upload the .aab**.
6. Fill in the store listing:
   - **Short description:** "Learn trading basics and practise with fake money."
   - **Screenshots:** at least 2 phone screenshots (Menu, a Lesson, Trade, Report).
   - **Feature graphic:** 1024×500.
   - **Icon:** 512×512. Use `icons/icon-512.png`.
   - **Privacy policy URL:** required. Write a simple page saying "This game collects no data. Progress is stored only on your device."
   - **Content rating questionnaire** and **Data safety:** answer "no data collected".
7. **New personal developer accounts must run a closed test** with at least 12 testers for 14 days before going public. Recruit friends, Discord or Reddit communities early.
8. Submit for review. Approval usually takes a few days.

---

## Stage 3: iPhone / Apple App Store

Apple doesn't accept plain website wrappers, so the app needs to feel like a real app. Our game is offline-capable, has no browser address bar and doesn't depend on a website, which all help.

1. Join the **Apple Developer Program** at developer.apple.com ($99/year).
2. You need **Xcode**, which only runs on a Mac. With no Mac, rent a cloud Mac (MacinCloud, about $1/hr), or use a cloud build service like Codemagic or Ionic Appflow.
3. Wrap the game with **Capacitor**, the most common free tool for turning web apps into native apps:
   ```bash
   npm init -y
   npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
   npx cap init "Market Apprentice" com.yourname.marketapprentice --web-dir www
   mkdir www && cp -r index.html manifest.webmanifest sw.js icons www/
   npx cap add ios
   npx cap open ios        # opens Xcode
   ```
   (Capacitor can also build Android with `npx cap add android`, an alternative to PWABuilder in Stage 2.)
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
