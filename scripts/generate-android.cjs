/*
 * Erzeugt das Android-Projekt (android/) neu aus android/twa-manifest.json – nur nötig, wenn sich
 * Paketname, Farben, Icons o. Ä. ändern.
 *   npm i --no-save @bubblewrap/core@1
 *   (cd public && python3 -m http.server 3998) &
 *   node scripts/generate-android.cjs android/twa-manifest.json /tmp/android-neu http://localhost:3998
 * Danach den Inhalt von /tmp/android-neu nach android/ kopieren (upload-keystore.p12.enc behalten!).
 */
const { TwaGenerator, TwaManifest, ConsoleLog } = require('@bubblewrap/core');
const fs = require('fs');
const [,, manifestPath, outDir, iconBase] = process.argv;
(async () => {
  const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  // Icons lokal laden (gleiche Dateien wie auf der Website)
  data.iconUrl = iconBase + '/icon-512.png';
  data.maskableIconUrl = iconBase + '/icon-maskable-512.png';
  delete data.webManifestUrl;
  const m = new TwaManifest(data);
  await new TwaGenerator().createTwaProject(outDir, m, new ConsoleLog('gen'));
  console.log('fertig');
})().catch(e => { console.error(e); process.exit(1); });
