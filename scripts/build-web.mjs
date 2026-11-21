// Copies the game's files into www/ for the Android (Capacitor) app.
// Run: npm run build:web
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';

const FILES = ['index.html', 'avatar.js', 'world.js', 'manifest.webmanifest', 'sw.js', 'vendor', 'icons'];
rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const f of FILES) {
  if (!existsSync(f)) throw new Error(`Missing game file: ${f}`);
  cpSync(f, `www/${f}`, { recursive: true });
}
console.log(`Copied ${FILES.length} entries into www/`);
