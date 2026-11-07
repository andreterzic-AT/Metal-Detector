# Metal Detector 🤘

Profil-basierte Metal-Musik-Analyse als installierbare Web-App (PWA).

## Lokal starten

```bash
npm install
npm run dev        # Entwicklung: http://localhost:3000
npm run build      # erzeugt die fertige App im Ordner out/
```

## Online stellen (GitHub Pages)

1. Auf GitHub: **Settings → Pages → Source: GitHub Actions** auswählen.
2. Auf `main`/`master` pushen – der Workflow `.github/workflows/deploy.yml` baut und veröffentlicht die App.
3. Die App ist dann unter `https://<benutzername>.github.io/<repo-name>/` erreichbar.

## Als App aufs Handy

- **iPhone (Safari):** Seite öffnen → Teilen-Button → „Zum Home-Bildschirm“.
- **Android (Chrome):** Seite öffnen → Menü ⋮ → „App installieren“.

Die App startet dann im Vollbild ohne Browserleiste, funktioniert auch offline,
und dein Profil sowie deine Merkliste werden auf dem Gerät gespeichert.

## Datenquellen und Lizenzen

- **Wikipedia-Suche** findet die Band (auch bei mehrdeutigen Namen wie „Ghost“).
- **Wikidata** (CC0, frei auch für kommerzielle Nutzung): Genres, Herkunft, Gründungsjahr, Spotify-Link,
  Bands eines Genres (sortiert nach Bekanntheit).
- **Wikipedia-Texte** (CC BY-SA 4.0): kurze Beschreibung und Textthemen. Die App zeigt nur kurze Auszüge
  und verlinkt jeweils den Artikel; im Fußbereich stehen Quellen und Lizenz.
- MusicBrainz wird nicht mehr verwendet (dessen Genre-Tags sind nur nicht-kommerziell freigegeben).

## Veröffentlichen auf IONOS (App + KI-Server)

Die App und der KI-Server laufen auf dem eigenen IONOS-Webhosting:
`https://<deine-adresse>/` ist die App, `https://<deine-adresse>/api/chat.php` der KI-Server (PHP).
Bei jedem Push geht die neue Version automatisch auf die **Test-Seite**; auf die **Live-Seite** nur per
Knopfdruck (*Actions → „Deploy zu IONOS“ → Run workflow → Ziel „live“*).

Der API-Schlüssel liegt **nur auf dem Server** (in `api/config.php`, wird beim Veröffentlichen aus dem
GitHub-Secret erzeugt), nie in der App und nie im Code. Schutz vor hohen Kosten: nur Anfragen von der
eigenen Seite, höchstens 20 Anfragen pro Minute pro Nutzer, Tageslimit für alle zusammen, kurze Antworten.

**Wichtig:** Die App braucht auf IONOS jeweils einen **eigenen, leeren Ordner** – nie den Ordner einer
bestehenden Webseite. Der Ablauf bricht ab, wenn im Zielordner fremde Dateien liegen.

1. **IONOS – Ordner und Adressen:** Im Webspace zwei neue Ordner anlegen, z. B. `/metal-detector-test`
   und `/metal-detector`. Unter *Domains & SSL* je eine Subdomain anlegen (z. B. `test.deine-domain.de`
   und `app.deine-domain.de`), auf den jeweiligen Ordner zeigen lassen und SSL aktivieren.
2. **IONOS – PHP-Version:** Für beide Subdomains PHP **8.2 oder neuer** einstellen.
3. **IONOS – SFTP-Zugang:** Unter *Hosting → SFTP & SSH* Server, Benutzer und Passwort notieren
   (am besten einen eigenen SFTP-Benutzer anlegen).
4. **Anthropic:** Auf console.anthropic.com Guthaben aufladen, ein **monatliches Ausgabenlimit** setzen
   und einen **API-Key** erstellen.
5. **GitHub – Secrets** (*Settings → Secrets and variables → Actions → Secrets*):
   `IONOS_SFTP_HOST`, `IONOS_SFTP_USER`, `IONOS_SFTP_PASSWORD`, `ANTHROPIC_API_KEY`.
6. **GitHub – Variables** (gleiche Seite, Reiter *Variables*):
   `IONOS_TEST_DIR` = `/metal-detector-test`, `IONOS_TEST_URL` = `https://test.deine-domain.de`,
   `IONOS_LIVE_DIR` = `/metal-detector`, `IONOS_LIVE_URL` = `https://app.deine-domain.de`.
   Optional: `AI_DAILY_BUDGET` (Standard 1000; eine Haiku-Anfrage = 1, eine Opus-Anfrage = 25).
7. *Actions → „Deploy zu IONOS“ → Run workflow → Ziel „test“* starten und die Test-Seite ausprobieren.

Ohne `ANTHROPIC_API_KEY` wird die App ohne KI veröffentlicht (Chat mit eingebauter Satzerkennung).
In der App lässt sich unter *Profil-Einstellungen* wählen: **KI-Chat Aus / Haiku 5.5 / Opus 5.5**.

## Struktur

- `app/page.tsx` – Oberfläche
- `lib/ai-chat.ts` – KI-Chat: schickt das Gespräch an den Server und führt die Werkzeuge aus
- `lib/ai-tools.ts` – Auftrag (System-Prompt) und Werkzeuge der KI – hier ändern, dann `npm run export-ai`
- `server/api/chat.php` – KI-Server (PHP) mit Schlüssel, Limits und Tageslimit; `ai-config.json` erzeugt `npm run export-ai`
- `.github/workflows/deploy-ionos.yml` – Veröffentlichung auf IONOS (Test automatisch, Live per Knopfdruck)
- `lib/chat.ts` – Chat-Engine: erkennt Fragen („Wie passt X zu mir?“, „Bands wie X“, „Ich hasse Growls“) und beantwortet sie
- `lib/watchlist.ts` + `components/watchlist-dialog.tsx` – Merkliste (auf dem Gerät gespeichert)
- `lib/band-source.ts` – Band suchen: zuerst Web, sonst eingebaute Liste
- `lib/web-lookup.ts` – Bandsuche im Web (Wikipedia-Suche + Wikidata-Genres, beides kommerziell nutzbar), mit Zwischenspeicher auf dem Gerät
- `lib/genre-rules.ts` – Regeln, die Genres und Textthemen in Profilwerte übersetzen (hier feinjustieren)
- `lib/match.ts` – Berechnung der Übereinstimmung
- `lib/bands.ts` – eingebaute Band-Liste (Fallback ohne Internet)
- `lib/profile.ts` – Profil-Eigenschaften, Labels und Speichern
