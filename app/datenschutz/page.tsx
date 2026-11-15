import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"
import { PROVIDER as P } from "@/lib/legal"

export const metadata: Metadata = { title: "Datenschutz · Metal Detector" }

export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <section>
        <h2>1. Auf einen Blick</h2>
        <ul>
          <li>Du brauchst kein Konto. Wir erheben weder Name noch E-Mail-Adresse.</li>
          <li>Keine Cookies, keine Werbung, kein Tracking, keine Analyse-Tools.</li>
          <li>Dein Musikprofil, deine Merkliste und deine Wertungen bleiben auf deinem Gerät.</li>
          <li>
            Für die Band-Suche und den KI-Chat werden Anfragen an die unten genannten Dienste geschickt. Dabei wird
            technisch bedingt deine IP-Adresse übertragen.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Verantwortlicher</h2>
        <p>
          {P.company}
          <br />
          {P.name}, {P.street}, {P.city}, {P.country}
          <br />
          E-Mail: <a href={`mailto:${P.email}`}>{P.email}</a> · Telefon: {P.phone}
        </p>
      </section>

      <section>
        <h2>3. Bereitstellung der App (Hosting)</h2>
        <p>
          Die App wird über GitHub Pages bereitgestellt (GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA
          94107, USA). Beim Aufruf verarbeitet GitHub technisch notwendige Zugriffsdaten wie IP-Adresse, Zeitpunkt,
          aufgerufene Datei und Browser-Kennung, um die Seite auszuliefern und vor Missbrauch zu schützen. Rechtsgrundlage
          ist unser berechtigtes Interesse an einem sicheren und zuverlässigen Betrieb (Art. 6 Abs. 1 lit. f DSGVO).
          GitHub ist unter dem EU-US Data Privacy Framework zertifiziert. Weitere Informationen:{" "}
          <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">
            Datenschutzerklärung von GitHub
          </a>
          .
        </p>
      </section>

      <section>
        <h2>4. Speicherung auf deinem Gerät</h2>
        <p>
          Die App speichert im lokalen Speicher deines Browsers: dein Musikprofil, ausgeschaltete Themen, deine Merkliste,
          deine persönlichen Wertungen, die gewählte KI-Einstellung sowie einen Zwischenspeicher bereits gesuchter Bands.
          Außerdem legt ein Service Worker die App-Dateien ab, damit sie schneller lädt und als App installiert werden
          kann. Diese Daten werden nicht an uns übertragen. Du kannst sie jederzeit löschen, indem du in den
          Profil-Einstellungen zurücksetzt oder die Website-Daten in deinem Browser löschst. Rechtsgrundlage ist § 25
          Abs. 2 Nr. 2 TDDDG (unbedingt erforderlich für die von dir gewünschte Funktion).
        </p>
      </section>

      <section>
        <h2>5. Band-Suche über Wikipedia und Wikidata</h2>
        <p>
          Suchst du eine Band, fragt dein Browser direkt bei Wikipedia und Wikidata an (Wikimedia Foundation, Inc., 1
          Montgomery Street, Suite 1600, San Francisco, CA 94104, USA). Übertragen werden der Suchbegriff und technisch
          bedingt deine IP-Adresse. Rechtsgrundlage ist die Bereitstellung der von dir angeforderten Funktion (Art. 6
          Abs. 1 lit. b DSGVO). Siehe{" "}
          <a href="https://foundation.wikimedia.org/wiki/Policy:Privacy_policy/de" target="_blank" rel="noopener noreferrer">
            Datenschutzrichtlinie der Wikimedia Foundation
          </a>
          .
        </p>
      </section>

      <section>
        <h2>6. KI-Chat und KI-Bandrecherche</h2>
        <p>
          Der KI-Chat lässt sich in den Profil-Einstellungen ausschalten. Ist er eingeschaltet, werden deine
          Chat-Nachrichten und die für die Antwort nötigen Angaben (z. B. Profilwerte, Merkliste, persönliche Wertungen
          und Band-Analysen) über unseren KI-Server an die KI geschickt. Findet die normale Suche zu einer kleinen Band zu
          wenig, wird nur der Bandname zur Recherche an die KI übermittelt.
        </p>
        <h3>Unser KI-Server (Cloudflare)</h3>
        <p>
          Der KI-Server läuft bei Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA. Cloudflare verarbeitet
          deine IP-Adresse, um die Anfrage weiterzuleiten. Wir nutzen sie kurzzeitig zur Begrenzung der Anfragen pro
          Minute (Schutz vor Missbrauch) und speichern sie nicht. Ergebnisse der Bandrecherche werden bis zu 30 Tage ohne
          Bezug zu deiner Person zwischengespeichert. Cloudflare ist unter dem EU-US Data Privacy Framework zertifiziert.
        </p>
        <h3>Anthropic (Claude)</h3>
        <p>
          Die Antworten erzeugt das KI-Modell Claude von Anthropic, PBC, 548 Market Street, PMB 90375, San Francisco, CA
          94104, USA. Anthropic erhält die oben genannten Inhalte, aber nicht deine IP-Adresse. Nach Angaben von
          Anthropic werden Inhalte aus der API nicht zum Training der Modelle verwendet und nur begrenzte Zeit
          gespeichert. Die Übermittlung in die USA stützt sich auf die Standardvertragsklauseln der EU-Kommission. Siehe{" "}
          <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer">
            Datenschutzerklärung von Anthropic
          </a>
          .
        </p>
        <p>
          Rechtsgrundlage ist die Bereitstellung der von dir genutzten Chat-Funktion (Art. 6 Abs. 1 lit. b DSGVO) und
          unser berechtigtes Interesse am Schutz vor Missbrauch (Art. 6 Abs. 1 lit. f DSGVO). Bitte schreib keine
          sensiblen persönlichen Daten in den Chat.
        </p>
      </section>

      <section>
        <h2>7. Links zu anderen Diensten</h2>
        <p>
          Links zu Spotify, Wikipedia oder anderen Seiten werden erst geöffnet, wenn du darauf tippst. Erst dann gelten
          die Datenschutzbestimmungen des jeweiligen Anbieters.
        </p>
      </section>

      <section>
        <h2>8. Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
          sowie Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Schreib dazu an{" "}
          <a href={`mailto:${P.email}`}>{P.email}</a>. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde
          beschweren, zum Beispiel beim Hessischen Beauftragten für Datenschutz und Informationsfreiheit,
          Gustav-Stresemann-Ring 1, 65189 Wiesbaden.
        </p>
      </section>

      <p className="text-xs text-zinc-500">Stand: {P.updated}</p>
    </LegalPage>
  )
}
