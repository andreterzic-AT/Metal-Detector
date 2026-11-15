import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"
import { PROVIDER as P } from "@/lib/legal"
import { BAND_NAME_NOTICE } from "@/lib/site"

export const metadata: Metadata = { title: "Impressum · Metal Detector" }

export default function Impressum() {
  return (
    <LegalPage title="Impressum">
      <section>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          {P.company}
          <br />
          {P.name}
          <br />
          {P.street}
          <br />
          {P.city}
          <br />
          {P.country}
        </p>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>
          Telefon: {P.phone}
          <br />
          E-Mail: <a href={`mailto:${P.email}`}>{P.email}</a>
        </p>
      </section>

      <section>
        <h2>Umsatzsteuer</h2>
        <p>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).</p>
      </section>

      <section>
        <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p>
          {P.name}
          <br />
          {P.street}
          <br />
          {P.city}
        </p>
      </section>

      <section>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>
          Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <section>
        <h2>Haftung für Inhalte</h2>
        <p>
          Die Band-Profile und Übereinstimmungen im Metal Detector werden automatisch aus öffentlichen Quellen (Wikidata,
          Wikipedia) und teilweise mit künstlicher Intelligenz geschätzt. Sie sind eine Orientierungshilfe und können
          unvollständig oder fehlerhaft sein. Für Richtigkeit, Vollständigkeit und Aktualität übernehmen wir keine Gewähr.
        </p>
      </section>

      <section>
        <h2>Haftung für Links</h2>
        <p>
          Die App enthält Links zu externen Websites Dritter (z. B. Wikipedia, Spotify), auf deren Inhalte wir keinen
          Einfluss haben. Für diese fremden Inhalte ist stets der jeweilige Anbieter verantwortlich.
        </p>
      </section>

      <section>
        <h2>Marken und Bandnamen</h2>
        <p>
          {BAND_NAME_NOTICE} Alle genannten Namen und Marken gehören ihren jeweiligen Inhabern. Band-Logos, Albumcover,
          Fotos und Songtexte werden nicht verwendet.
        </p>
      </section>

      <section>
        <h2>Urheberrecht und Quellen</h2>
        <p>
          Die durch den Betreiber erstellten Inhalte unterliegen dem deutschen Urheberrecht. Band-Daten stammen von{" "}
          <a href="https://www.wikidata.org" target="_blank" rel="noopener noreferrer">
            Wikidata
          </a>{" "}
          (CC0), Beschreibungen von{" "}
          <a href="https://de.wikipedia.org" target="_blank" rel="noopener noreferrer">
            Wikipedia
          </a>{" "}
          (
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.de" target="_blank" rel="noopener noreferrer">
            CC BY-SA 4.0
          </a>
          ).
        </p>
      </section>

      <p className="text-xs text-zinc-500">Stand: {P.updated}</p>
    </LegalPage>
  )
}
