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
und dein Profil wird auf dem Gerät gespeichert.

## Struktur

- `app/page.tsx` – Oberfläche
- `lib/chat.ts` – Chat-Engine: erkennt Fragen („Wie passt X zu mir?“, „Bands wie X“, „Ich hasse Growls“) und beantwortet sie
- `lib/band-source.ts` – Band suchen: zuerst Web, sonst eingebaute Liste
- `lib/web-lookup.ts` – Bandsuche im Web (MusicBrainz + Wikipedia), mit Zwischenspeicher auf dem Gerät
- `lib/genre-rules.ts` – Regeln, die Genres und Textthemen in Profilwerte übersetzen (hier feinjustieren)
- `lib/match.ts` – Berechnung der Übereinstimmung
- `lib/bands.ts` – eingebaute Band-Liste (Fallback ohne Internet)
- `lib/profile.ts` – Profil-Eigenschaften, Labels und Speichern
