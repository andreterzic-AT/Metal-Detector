"use client"

import { Check, ExternalLink, Heart, Search, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { calculateMatch, type Rating } from "@/lib/match"
import type { UserProfile } from "@/lib/profile"
import type { WatchItem } from "@/lib/watchlist"

const dotColor = (r: Rating) =>
  r === "green" ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : r === "yellow" ? "bg-yellow-500 shadow-[0_0_8px_#eab308]" : r === "red" ? "bg-red-500 shadow-[0_0_8px_#ef4444]" : "bg-zinc-600"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: WatchItem[]
  profile: UserProfile
  onAnalyze: (name: string) => void
  onToggleListened: (name: string) => void
  onRemove: (name: string) => void
}

export function WatchlistDialog({ open, onOpenChange, items, profile, onAnalyze, onToggleListened, onRemove }: Props) {
  // Übereinstimmung immer mit dem aktuellen Profil berechnen
  const rows = items
    .map((item) => ({ item, match: calculateMatch(item.name, item.info, profile) }))
    .sort(
      (a, b) =>
        Number(a.item.listened) - Number(b.item.listened) || b.match.matchPercentage - a.match.matchPercentage
    )
  const openCount = items.filter((i) => !i.listened).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto bg-gradient-to-br from-zinc-900 to-black border-zinc-700 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            Merkliste
          </DialogTitle>
          <p className="text-sm text-zinc-400 mt-1">
            {items.length === 0
              ? "Noch keine Bands gemerkt."
              : `${items.length} ${items.length === 1 ? "Band" : "Bands"} · ${openCount} noch anzuhören · Match mit deinem aktuellen Profil`}
          </p>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="text-center py-10 text-zinc-400 space-y-2">
            <p className="text-4xl">📭</p>
            <p>Tipp nach einer Band-Analyse auf „❤️ Merken“</p>
            <p className="text-sm text-zinc-500">oder schreib im Chat: „Merk dir Sabaton“</p>
          </div>
        ) : (
          <ul className="space-y-2 min-w-0">
            {rows.map(({ item, match }) => (
              <li
                key={item.name}
                className={`rounded-xl border border-zinc-700/50 bg-black/40 p-3 flex items-center gap-2 sm:gap-3 min-w-0 transition ${
                  item.listened ? "opacity-60" : ""
                }`}
              >
                <span className={`w-3 h-3 rounded-full shrink-0 ${dotColor(match.rating)}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold truncate ${item.listened ? "line-through text-zinc-400" : "text-zinc-100"}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">
                    {match.rating ? `${match.matchPercentage}%` : "ohne Bewertung"} · {item.info.genre}
                  </p>
                </div>
                <div className="flex items-center shrink-0">
                  <IconButton
                    label={item.listened ? "Als nicht gehört markieren" : "Als gehört markieren"}
                    onClick={() => onToggleListened(item.name)}
                    active={item.listened}
                  >
                    <Check className="w-4 h-4" />
                  </IconButton>
                  <a
                    href={item.info.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Auf Spotify anhören"
                    className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-700/60"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <IconButton label="Erneut prüfen" onClick={() => onAnalyze(item.name)}>
                    <Search className="w-4 h-4" />
                  </IconButton>
                  <IconButton label="Von der Merkliste entfernen" onClick={() => onRemove(item.name)}>
                    <Trash2 className="w-4 h-4" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

function IconButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-full transition active:scale-90 ${
        active ? "bg-green-600/80 text-white" : "text-zinc-300 hover:bg-zinc-700/60"
      }`}
    >
      {children}
    </button>
  )
}
