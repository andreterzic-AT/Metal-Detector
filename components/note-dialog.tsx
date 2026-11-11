"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VERDICT_COLORS, VERDICT_LABELS, type NoteVerdict, type PersonalNote } from "@/lib/personal-notes"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  band: string
  note?: PersonalNote
  onSave: (note: Omit<PersonalNote, "updatedAt">) => void
  onDelete: () => void
}

const VERDICTS: { value: NoteVerdict; hint: string }[] = [
  { value: "green", hint: "Ich höre die Band" },
  { value: "yellow", hint: "Nur bestimmte Songs/Alben" },
  { value: "red", hint: "Meide ich ganz" },
]

const fieldStyle =
  "w-full rounded-lg border border-zinc-700 bg-black/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none"

export function NoteDialog({ open, onOpenChange, band, note, onSave, onDelete }: Props) {
  const [verdict, setVerdict] = useState<NoteVerdict>("yellow")
  const [avoid, setAvoid] = useState("")
  const [ok, setOk] = useState("")
  const [text, setText] = useState("")

  // Beim Öffnen die vorhandene Notiz übernehmen
  useEffect(() => {
    if (!open) return
    setVerdict(note?.verdict ?? "yellow")
    setAvoid(note?.avoid ?? "")
    setOk(note?.ok ?? "")
    setText(note?.note ?? "")
  }, [open, note])

  const save = () => {
    onSave({ band, verdict, avoid, ok, note: text })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto bg-gradient-to-br from-zinc-900 to-black border-zinc-700 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-zinc-100">📝 Deine Wertung · {band}</DialogTitle>
          <p className="text-sm text-zinc-400 mt-1">
            Die berechnete Ampel bleibt, wie sie ist. Deine Wertung steht daneben – nur du siehst sie.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Deine Wertung">
            {VERDICTS.map((v) => (
              <button
                key={v.value}
                type="button"
                role="radio"
                aria-checked={verdict === v.value}
                onClick={() => setVerdict(v.value)}
                className={`rounded-lg border px-2 py-2.5 text-left transition ${
                  verdict === v.value ? "border-zinc-200 bg-zinc-800" : "border-zinc-700 hover:bg-zinc-800/60"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: VERDICT_COLORS[v.value], boxShadow: verdict === v.value ? `0 0 10px ${VERDICT_COLORS[v.value]}` : "none" }}
                  />
                  {VERDICT_LABELS[v.value]}
                </span>
                <span className="block text-[11px] text-zinc-400 mt-1 leading-tight">{v.hint}</span>
              </button>
            ))}
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-semibold">🚫 Was meidest du?</span>
            <textarea
              value={avoid}
              onChange={(e) => setAvoid(e.target.value)}
              rows={2}
              maxLength={400}
              placeholder="z. B. Songs, die sich über Jesus lustig machen · die alten Alben bis 2002"
              className={fieldStyle}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-semibold">✅ Was ist für dich okay?</span>
            <textarea
              value={ok}
              onChange={(e) => setOk(e.target.value)}
              rows={2}
              maxLength={400}
              placeholder="z. B. alle anderen Songs · alles seit 2004"
              className={fieldStyle}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-semibold">💬 Notiz</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              maxLength={600}
              placeholder="z. B. Kenne die Band gut, höre gezielt."
              className={fieldStyle}
            />
          </label>

          <div className="flex gap-2 pt-1">
            {note && (
              <button
                type="button"
                onClick={() => {
                  onDelete()
                  onOpenChange(false)
                }}
                className="flex-1 rounded-lg border border-red-900/70 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-950/40"
              >
                Löschen
              </button>
            )}
            <button
              type="button"
              onClick={save}
              className="flex-[2] rounded-lg py-2.5 text-sm font-bold text-black bg-gradient-to-r from-zinc-300 via-zinc-100 to-zinc-300 hover:from-zinc-200 hover:to-zinc-200"
            >
              Speichern
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
