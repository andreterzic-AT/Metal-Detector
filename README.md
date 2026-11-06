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

## KI-Chat einrichten (optional)

Ohne Einrichtung antwortet der Chat mit eingebauter Satzerkennung. Mit KI beantwortet
Claude die Nachrichten und nutzt dabei die Funktionen der App (Band-Analyse, Merkliste, Profil).

Der API-Schlüssel liegt **nur auf dem eigenen Server** (Cloudflare Worker im Ordner `worker/`),
nie in der App und nie im Code. Der Server schützt vor hohen Kosten: nur Anfragen von der
App, höchstens 20 Anfragen pro Minute pro Nutzer, ein Tageslimit für alle zusammen
(`DAILY_BUDGET` in `worker/wrangler.toml`) und kurze Antworten.

1. **Anthropic:** Auf console.anthropic.com ein Konto anlegen, Guthaben aufladen,
   unter *Limits* ein **monatliches Ausgabenlimit** setzen und einen **API-Key** erstellen.
2. **Cloudflare:** Kostenloses Konto auf dash.cloudflare.com anlegen. Einmal *Workers & Pages*
   öffnen (dabei wird die eigene `….workers.dev`-Adresse festgelegt).
   - **Account ID** kopieren (steht in der Übersicht rechts bzw. unter *Workers & Pages*).
   - Unter *My Profile → API Tokens → Create Token* die Vorlage **„Edit Cloudflare Workers“** wählen und den Token kopieren.
3. **GitHub:** Im Repository unter *Settings → Secrets and variables → Actions → Secrets*
   drei Secrets anlegen: `ANTHROPIC_API_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
4. Unter *Actions* den Workflow **„Deploy KI-Server (Cloudflare)“** mit *Run workflow* starten.
   Im Log steht danach die Adresse, z. B. `https://metal-detector-ai.<name>.workers.dev`.
5. Unter *Settings → Secrets and variables → Actions → Variables* die Variable
   `AI_PROXY_URL` mit dieser Adresse anlegen.
6. Unter *Actions* den Workflow **„Deploy to GitHub Pages“** mit *Run workflow* neu starten.

In der App erscheint dann in den Profil-Einstellungen die Auswahl **KI-Chat: Aus / Haiku 5.5 / Opus 5.5**.

## Struktur

- `app/page.tsx` – Oberfläche
- `lib/ai-chat.ts` – KI-Chat: schickt das Gespräch an den Server und führt die Werkzeuge aus
- `lib/ai-tools.ts` – Auftrag (System-Prompt) und Werkzeuge der KI, gemeinsam für App und Server
- `worker/` – KI-Server (Cloudflare Worker) mit Schlüssel, Limits und Tageslimit
- `lib/chat.ts` – Chat-Engine: erkennt Fragen („Wie passt X zu mir?“, „Bands wie X“, „Ich hasse Growls“) und beantwortet sie
- `lib/watchlist.ts` + `components/watchlist-dialog.tsx` – Merkliste (auf dem Gerät gespeichert)
- `lib/band-source.ts` – Band suchen: zuerst Web, sonst eingebaute Liste
- `lib/web-lookup.ts` – Bandsuche im Web (Wikipedia-Suche + Wikidata-Genres, beides kommerziell nutzbar), mit Zwischenspeicher auf dem Gerät
- `lib/genre-rules.ts` – Regeln, die Genres und Textthemen in Profilwerte übersetzen (hier feinjustieren)
- `lib/match.ts` – Berechnung der Übereinstimmung
- `lib/bands.ts` – eingebaute Band-Liste (Fallback ohne Internet)
- `lib/profile.ts` – Profil-Eigenschaften, Labels und Speichern
