import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Ban,
  Heart,
  MessageCircle,
  NotebookPen,
  Play,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Gauge,
} from "lucide-react"
import { StandaloneRedirect } from "@/components/standalone-redirect"
import { STORE_LINKS, asset } from "@/lib/site"
import { PROVIDER } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Metal Detector – finde Metal, der zu dir passt",
  description:
    "Stell ein, was dir bei Musik wichtig ist – Sound, Themen, Texte. Der Metal Detector prüft jede Band und zeigt dir per Ampel mit Begründung, ob sie zu dir passt.",
  openGraph: {
    title: "Metal Detector – finde Metal, der zu dir passt",
    description: "Dein persönlicher Band-Check: Profil einstellen, Band suchen, Ampel lesen. 🤘",
    images: [asset("/icon-512.png")],
    locale: "de_DE",
    type: "website",
  },
}

const steps = [
  {
    icon: SlidersHorizontal,
    title: "Profil einstellen",
    text: "Rund 50 Eigenschaften in vier Bereichen: Sound, Themen, Texte & Weltanschauung, Live. 0 heißt „mag ich nicht“, 10 heißt „davon will ich viel“. Was dir egal ist, schaltest du einfach aus.",
  },
  {
    icon: Search,
    title: "Band suchen",
    text: "Name eingeben – der Detector holt Genres, Herkunft und Themen der Texte aus Wikidata und Wikipedia. Auch kleine Bands findet er per KI-Recherche im Web.",
  },
  {
    icon: Gauge,
    title: "Ampel lesen",
    text: "Grün, Gelb oder Rot plus Prozentwert – mit Begründung, was passt und was nicht. So weißt du vor dem ersten Hören, worauf du dich einlässt.",
  },
]

const features = [
  {
    icon: Ban,
    title: "Ausschlusskriterien zählen",
    text: "Lehnst du etwas klar ab, wird die Band rot – egal wie gut Sound und Melodie passen. Kein Durchschnitt, der deine Grenzen verwässert.",
  },
  {
    icon: Scale,
    title: "Keine Pauschalurteile",
    text: "Nicht jede Black-Metal-Band ist satanistisch. Aussagen zur Weltanschauung gibt es nur mit Belegen für genau diese Band – nie aus dem Genre geraten.",
  },
  {
    icon: NotebookPen,
    title: "Deine eigene Wertung",
    text: "Du hörst eine Band, meidest aber bestimmte Songs oder Alben? Halte es fest. Deine Wertung steht neben der berechneten Ampel.",
  },
  {
    icon: MessageCircle,
    title: "Chat mit KI",
    text: "„Empfiehl mir was“, „Ich hasse Growls“, „Was ist ähnlich wie Sabaton?“ – der Detector versteht dich und passt dein Profil an.",
  },
  {
    icon: Heart,
    title: "Merkliste",
    text: "Interessante Bands merken, später anhören, abhaken. Mit Link direkt zu Spotify.",
  },
  {
    icon: ShieldCheck,
    title: "Deine Daten bleiben bei dir",
    text: "Kein Konto, keine Cookies, kein Tracking. Profil, Merkliste und Wertungen bleiben auf deinem Gerät.",
  },
]

const faqs = [
  {
    q: "Was kostet der Metal Detector?",
    a: "Im Moment kannst du ihn kostenlos im Browser testen. Die Android-App kommt bald in den Google Play Store.",
  },
  {
    q: "Gibt es ihn fürs iPhone?",
    a: "Ja, als Web-App: Öffne die App in Safari, tippe auf „Teilen“ und dann auf „Zum Home-Bildschirm“. Sie startet dann wie eine normale App.",
  },
  {
    q: "Wie genau ist die Bewertung?",
    a: "Die Band-Profile werden automatisch aus öffentlichen Quellen geschätzt. Sie sind eine gute Orientierung, ersetzen aber nicht dein eigenes Urteil – dafür gibt es deine persönliche Wertung.",
  },
  {
    q: "Sagt mir die App, was ich hören darf?",
    a: "Nein. Du legst selbst fest, was dir wichtig ist und was dir egal ist. Der Detector zeigt dir nur, wie gut eine Band zu deinen eigenen Maßstäben passt.",
  },
]

function StoreButtons() {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Link
        href="/app/"
        className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-bold text-black bg-gradient-to-r from-[#f3d27a] via-[#e2b24a] to-[#c8902a] shadow-lg shadow-amber-900/30 hover:brightness-110 transition"
      >
        Jetzt im Browser testen <ArrowRight className="w-5 h-5" />
      </Link>
      {STORE_LINKS.googlePlay ? (
        <a
          href={STORE_LINKS.googlePlay}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold border border-zinc-600 bg-zinc-900 hover:bg-zinc-800 transition"
        >
          <Play className="w-5 h-5 fill-current" /> Bei Google Play laden
        </a>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold border border-zinc-700 text-zinc-400 bg-zinc-900/60"
        >
          <Play className="w-5 h-5" /> Bald bei Google Play
        </span>
      )}
    </div>
  )
}

function Phone({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-[2rem] border border-zinc-700 bg-zinc-950 p-2 shadow-2xl shadow-black/60">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset(src)} alt={alt} className="w-full rounded-[1.6rem]" loading="lazy" />
    </div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_#26262b_0%,_#09090b_60%)] text-zinc-200">
      <StandaloneRedirect />

      {/* Kopf */}
      <header className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/logo.svg")} alt="" width={40} height={40} className="w-10 h-10" />
          <span className="font-black text-lg text-zinc-100">Metal Detector</span>
        </div>
        <Link href="/app/" className="text-sm font-semibold text-zinc-300 hover:text-white">
          Zur App →
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-8 pb-16 grid md:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset("/logo.svg")}
            alt="Metal Detector Logo"
            width={96}
            height={96}
            className="w-24 h-24 drop-shadow-[0_4px_20px_rgba(226,178,74,0.35)]"
          />
          <h1 className="text-4xl sm:text-5xl font-black leading-tight text-zinc-50">
            Finde Metal, der <span className="text-[#e2b24a]">wirklich</span> zu dir passt.
          </h1>
          <p className="text-lg text-zinc-300 leading-relaxed">
            Du legst fest, was dir wichtig ist – Sound, Themen, Texte. Der Metal Detector prüft jede Band und zeigt dir
            per Ampel, ob sie zu dir passt. Mit Begründung. 🤘
          </p>
          <StoreButtons />
        </div>
        <div className="max-w-xs mx-auto w-full">
          <Phone src="/landing/screen-rating.webp" alt="Bewertung von Nightwish: grüne Ampel, 86 % – passt perfekt" />
        </div>
      </section>

      {/* So funktioniert's */}
      <section className="bg-black/40 border-y border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-black text-zinc-50 text-center">So funktioniert der Detector</h2>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e2b24a] font-black text-black">
                    {i + 1}
                  </span>
                  <s.icon className="w-6 h-6 text-zinc-300" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-zinc-100">{s.title}</h3>
                <p className="mt-2 text-zinc-400 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid sm:grid-cols-3 gap-4 text-center">
            {[
              { c: "#22c55e", t: "Grün", d: "Passt zu dir – reinhören lohnt sich." },
              { c: "#facc15", t: "Gelb", d: "Teils, teils – lies die Begründung." },
              { c: "#ef4444", t: "Rot", d: "Passt nicht oder verletzt deine Grenzen." },
            ].map((a) => (
              <div key={a.t} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                <span
                  className="mx-auto block h-10 w-10 rounded-full"
                  style={{ backgroundColor: a.c, boxShadow: `0 0 24px ${a.c}` }}
                />
                <p className="mt-3 font-bold text-zinc-100">{a.t}</p>
                <p className="text-sm text-zinc-400">{a.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Funktionen */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-black text-zinc-50 text-center">Mehr als eine Suchmaschine</h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <f.icon className="w-7 h-7 text-[#e2b24a]" />
              <h3 className="mt-3 text-lg font-bold text-zinc-100">{f.title}</h3>
              <p className="mt-2 text-zinc-400 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Einblicke */}
      <section className="bg-black/40 border-y border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <Sparkles className="w-8 h-8 text-[#e2b24a]" />
            <h2 className="text-3xl font-black text-zinc-50">Alles Wichtige auf einen Blick</h2>
            <p className="text-zinc-300 leading-relaxed">
              Genre, Herkunft, Themen der Texte und die Übereinstimmung mit deinem Profil – dazu Links zu Spotify,
              Wikipedia und Wikidata. Mit einem Tipp findest du ähnliche Bands, setzt sie auf die Merkliste oder
              fragst nach: „Warum?“
            </p>
            <p className="flex items-center gap-2 text-sm text-zinc-400">
              <Smartphone className="w-4 h-4" /> Läuft auf Handy, Tablet und PC.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Phone src="/landing/screen-chat.webp" alt="Band-Analyse von Nightwish im Chat" />
            <Phone src="/landing/screen-app.webp" alt="Startansicht der App mit Suche" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-black text-zinc-50 text-center">Häufige Fragen</h2>
        <div className="mt-8 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <summary className="cursor-pointer list-none font-semibold text-zinc-100 flex justify-between gap-4">
                {f.q}
                <span className="text-zinc-500 group-open:rotate-45 transition">+</span>
              </summary>
              <p className="mt-3 text-zinc-400 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Abschluss */}
      <section className="max-w-3xl mx-auto px-4 pb-20 text-center space-y-6">
        <h2 className="text-3xl font-black text-zinc-50">Bereit für deinen Band-Check?</h2>
        <div className="flex justify-center">
          <StoreButtons />
        </div>
      </section>

      <footer className="border-t border-zinc-800 px-4 py-8 text-center text-xs text-zinc-500 space-y-2">
        <p>
          <Link href="/impressum/" className="underline">
            Impressum
          </Link>{" "}
          ·{" "}
          <Link href="/datenschutz/" className="underline">
            Datenschutz
          </Link>
        </p>
        <p>
          © 2026 {PROVIDER.company} · Ein Projekt von{" "}
          <a href="https://at-teamtools.de" target="_blank" rel="noopener noreferrer" className="underline">
            at-teamtools.de
          </a>
        </p>
        <p>
          Band-Beschreibung im Bildschirmfoto:{" "}
          <a href="https://de.wikipedia.org/wiki/Nightwish" target="_blank" rel="noopener noreferrer" className="underline">
            Wikipedia
          </a>{" "}
          (
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.de" target="_blank" rel="noopener noreferrer" className="underline">
            CC BY-SA 4.0
          </a>
          )
        </p>
      </footer>
    </div>
  )
}
