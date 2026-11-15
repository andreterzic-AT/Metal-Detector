import Link from "next/link"

/** Gemeinsamer Rahmen für Impressum und Datenschutz */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-zinc-950 text-zinc-200 px-4 py-8">
      <article className="mx-auto max-w-2xl space-y-6 text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-zinc-100 [&_h2]:mt-8 [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:text-zinc-100 [&_h3]:mt-4 [&_a]:underline [&_a]:text-zinc-100 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        <Link href="/app/" className="inline-block text-zinc-400 no-underline hover:text-zinc-100">
          ← Zurück zum Metal Detector
        </Link>
        <h1 className="text-2xl font-black text-zinc-100">{title}</h1>
        {children}
        <p className="pt-6 text-xs text-zinc-500">
          <Link href="/impressum/">Impressum</Link> · <Link href="/datenschutz/">Datenschutz</Link>
        </p>
      </article>
    </main>
  )
}
