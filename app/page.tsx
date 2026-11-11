"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Music, Mic, Search, Volume2, ExternalLink, Info, Settings, Loader2, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { bandDatabase, type BandInfo } from "@/lib/bands"
import { calculateMatch, type Rating } from "@/lib/match"
import { getCachedBandNames } from "@/lib/web-lookup"
import { respond, type ChatAction, type LastBand } from "@/lib/chat"
import { findBand } from "@/lib/band-source"
import {
  addToWatchlist,
  isOnWatchlist,
  loadWatchlist,
  removeFromWatchlist,
  saveWatchlist,
  toggleListened,
  type WatchItem,
} from "@/lib/watchlist"
import { WatchlistDialog } from "@/components/watchlist-dialog"
import { NoteDialog } from "@/components/note-dialog"
import {
  VERDICT_COLORS,
  VERDICT_LABELS,
  getNote,
  loadNotes,
  noteSummary,
  notesBridge,
  removeNote,
  saveNotes,
  setNote,
  type NoteBook,
  type PersonalNote,
} from "@/lib/personal-notes"
import { AiChat, AiError, aiAvailable, loadAiSetting, modelLabel, saveAiSetting, type AiSetting } from "@/lib/ai-chat"
import { AI_MODELS } from "@/lib/ai-tools"
import {
  defaultProfile,
  disabledBridge,
  loadDisabled,
  loadProfile,
  saveDisabled,
  profileSections,
  saveProfile,
  type ProfileKey,
  type UserProfile,
} from "@/lib/profile"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  actions?: ChatAction[]
  /** Welches KI-Modell geantwortet hat (leer = Chat ohne KI) */
  via?: string
}

const buttonStyle =
  "bg-gradient-to-r from-zinc-700 via-zinc-500 to-zinc-600 hover:from-zinc-600 hover:via-zinc-400 hover:to-zinc-500 text-black font-bold shadow-lg shadow-black/50"
const cardStyle = "bg-gradient-to-br from-zinc-900/90 to-black/90 backdrop-blur-md border-zinc-700/50 shadow-xl shadow-black/50"
const inputStyle = "bg-black/60 border-zinc-600/50 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:ring-zinc-400"

let messageCounter = 0

// Außerhalb der Seite definiert, damit der Regler beim Ziehen nicht neu erzeugt wird
function SliderControl({
  label,
  value,
  onChange,
  active = true,
  onToggle,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  active?: boolean
  onToggle?: () => void
}) {
  return (
    <div className={`space-y-2 transition-opacity ${active ? "" : "opacity-60"}`}>
      <div className="flex justify-between items-center gap-2">
        <label className={`text-sm font-medium ${active ? "text-zinc-300" : "text-zinc-500 line-through"}`}>{label}</label>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-sm font-bold px-2 py-1 rounded min-w-[2.6rem] text-center ${
              active ? "text-zinc-100 bg-zinc-800/50" : "text-zinc-400 border border-dashed border-zinc-600"
            }`}
          >
            {active ? value : "aus"}
          </span>
          {onToggle && (
            <button
              type="button"
              role="switch"
              aria-checked={active}
              aria-label={`${label.split(" - ")[0]}: ${active ? "zählt mit – zum Ausschalten tippen" : "aus – zum Einschalten tippen"}`}
              onClick={onToggle}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${active ? "bg-green-500" : "bg-zinc-700"}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${active ? "left-[22px] bg-white" : "left-0.5 bg-zinc-400"}`}
              />
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        value={value}
        disabled={!active}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`w-full h-2 rounded-lg appearance-none slider ${active ? "cursor-pointer" : "cursor-not-allowed slider-off"}`}
        style={{ background: active ? "linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)" : "#27272a" }}
      />
      {active ? (
        <div className="flex justify-between text-[10px] sm:text-xs text-zinc-500">
          <span>0 - Mag ich nicht</span>
          <span>5 - Neutral</span>
          <span>10 - Will ich viel</span>
        </div>
      ) : (
        <p className="text-[11px] text-zinc-500">⏸ Zählt nicht mit – weder in der Ampel noch in den Empfehlungen.</p>
      )}
    </div>
  )
}

function TrafficLight({ active, color, small = false }: { active: boolean; color: string; small?: boolean }) {
  return (
    <motion.div
      animate={{ opacity: active ? 1 : 0.2, scale: active ? 1.12 : 1 }}
      className={`${small ? "w-11 h-11 lg:w-12 lg:h-12" : "w-16 h-16 lg:w-20 lg:h-20"} rounded-full shadow-lg relative`}
      style={{
        backgroundColor: active ? color : "#1a1a1a",
        boxShadow: active ? `0 0 30px ${color}, inset 0 0 15px ${color}80` : "inset 0 2px 8px rgba(0,0,0,0.8)",
      }}
    >
      {active && (
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ boxShadow: [`0 0 20px ${color}`, `0 0 40px ${color}`, `0 0 20px ${color}`] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  )
}

const VERDICT_RANK = { green: 0, yellow: 1, red: 2 } as const

/** Rechte Seite der Bewertung: deine persönliche Wertung (oder Knopf zum Anlegen) */
function PersonalPanel({ note, onEdit }: { note?: PersonalNote; onEdit: () => void }) {
  if (!note) {
    return (
      <div className="flex flex-col justify-center gap-3 py-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Deine Wertung</span>
        <p className="text-sm text-zinc-400 leading-snug">
          Meidest du einzelne Songs, Alben oder Phasen? Halte es hier fest – die Ampel links bleibt, wie sie ist.
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="self-start inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-zinc-600/60 bg-black/40 text-zinc-200 hover:bg-zinc-700/60 active:scale-95 transition"
        >
          📝 Eigene Wertung hinzufügen
        </button>
      </div>
    )
  }
  const color = VERDICT_COLORS[note.verdict]
  return (
    <div className="flex flex-col gap-2 py-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }} />
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Deine Wertung</div>
          <div className="text-sm font-extrabold text-zinc-100">{VERDICT_LABELS[note.verdict]}</div>
        </div>
      </div>
      {note.avoid && (
        <p className="text-[13px] leading-snug text-zinc-300 break-words">
          🚫 <b className="text-zinc-100">Meide:</b> {note.avoid}
        </p>
      )}
      {note.ok && (
        <p className="text-[13px] leading-snug text-zinc-300 break-words">
          ✅ <b className="text-zinc-100">Okay:</b> {note.ok}
        </p>
      )}
      {note.note && <p className="text-[13px] leading-snug text-zinc-300 break-words">💬 {note.note}</p>}
      <button
        type="button"
        onClick={onEdit}
        className="self-start inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-zinc-600/60 bg-black/40 text-zinc-200 hover:bg-zinc-700/60 active:scale-95 transition"
      >
        📝 Bearbeiten
      </button>
    </div>
  )
}

/** Kleiner Hinweis unter dem Ampel-Text, wenn deine Wertung von der berechneten abweicht */
function NoteHint({ rating, note }: { rating: Rating; note?: PersonalNote }) {
  if (!note || !rating || note.verdict === rating) return null
  const worse = VERDICT_RANK[note.verdict] > VERDICT_RANK[rating]
  return (
    <p className="text-sm font-semibold mt-1" style={{ color: VERDICT_COLORS[note.verdict] }}>
      {worse ? (note.verdict === "red" ? "· du meidest sie persönlich" : "· mit Vorbehalt") : "· du hörst sie trotzdem"}
    </p>
  )
}

export default function MetalDetectorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey Kumpel! 🤘 Willkommen beim Metal Detector!\n\nIch bin dein persönlicher Musik-Guide mit intelligenter Profil-Analyse. Öffne die Einstellungen (Button unter der Ampel) und erstelle dein persönliches Musikprofil mit dem Bewertungssystem (0 = mag ich nicht, 5 = neutral, 10 = davon will ich viel).\n\nDann kannst du nach jeder beliebigen Band suchen – ich hole mir die Infos aus dem Web (Wikipedia & Wikidata) und sage dir, wie gut sie zu dir passen! 🎸\n\nOder schreib mir einfach: „Wie passt Sabaton zu mir?“, „Bands wie Nightwish“, „Empfiehl mir was“ oder „Ich hasse Growls“ 💬",
      timestamp: new Date(),
      actions: [
        { label: "💡 Empfiehl mir was", type: "say", value: "Empfiehl mir was" },
        { label: "👤 Was mag ich?", type: "say", value: "Was mag ich?" },
        { label: "❔ Hilfe", type: "say", value: "Hilfe" },
      ],
    },
  ])
  const [input, setInput] = useState("")
  const [bandSearch, setBandSearch] = useState("")
  const [currentBand, setCurrentBand] = useState<string | null>(null)
  const [rating, setRating] = useState<Rating>(null)
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultProfile)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [scoreDetails, setScoreDetails] = useState<string>("")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>(Object.keys(bandDatabase))
  const [watchlist, setWatchlist] = useState<WatchItem[]>([])
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false)
  const [currentInfo, setCurrentInfo] = useState<BandInfo | null>(null)
  const [currentPercent, setCurrentPercent] = useState<number | null>(null)
  const [notes, setNotes] = useState<NoteBook>({})
  const [disabled, setDisabled] = useState<ProfileKey[]>([])
  const [noteBand, setNoteBand] = useState<string | null>(null)
  const [aiSetting, setAiSetting] = useState<AiSetting>("haiku")
  const aiRef = useRef(new AiChat())
  // Aktuelle Werte für die KI-Werkzeuge (React-State wäre in laufenden Anfragen veraltet)
  const profileRef = useRef<UserProfile>(defaultProfile)
  const watchlistRef = useRef<WatchItem[]>([])
  profileRef.current = userProfile
  watchlistRef.current = watchlist
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastBandRef = useRef<LastBand>(null)
  const undoRef = useRef<UserProfile | null>(null)

  // Profil beim Start vom Gerät laden …
  useEffect(() => {
    setUserProfile(loadProfile())
    setWatchlist(loadWatchlist())
    setNotes(loadNotes())
    setDisabled(loadDisabled())
    setAiSetting(loadAiSetting())
    setProfileLoaded(true)
    setSuggestions((s) => [...new Set([...getCachedBandNames(), ...s])])
  }, [])

  // … und bei jeder Änderung speichern
  useEffect(() => {
    if (profileLoaded) saveProfile(userProfile)
  }, [userProfile, profileLoaded])

  useEffect(() => {
    if (profileLoaded) saveWatchlist(watchlist)
  }, [watchlist, profileLoaded])

  // Ausgeschaltete Themen speichern und für Berechnung/Chat/KI bereitstellen.
  // Danach die aktuelle Band neu bewerten, damit die Ampel sofort stimmt.
  useEffect(() => {
    disabledBridge.connect(disabled, setDisabled)
    if (profileLoaded) saveDisabled(disabled)
    if (lastBandRef.current) {
      const { name, info } = lastBandRef.current
      const analysis = calculateMatch(name, info, profileRef.current)
      setRating(analysis.rating)
      setCurrentPercent(analysis.rating ? analysis.matchPercentage : null)
      setScoreDetails(analysis.scoreBreakdown)
    }
  }, [disabled, profileLoaded])

  // Persönliche Wertungen speichern und für Chat/KI bereitstellen
  useEffect(() => {
    notesBridge.connect(notes, setNotes)
    if (profileLoaded) saveNotes(notes)
  }, [notes, profileLoaded])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const addMessage = (role: "user" | "assistant", content: string, actions?: ChatAction[], via?: string) => {
    const newMessage: Message = { id: `${Date.now()}-${messageCounter++}`, role, content, timestamp: new Date(), actions, via }
    setMessages((prev) => [...prev, newMessage])
  }

  const setProfileValue = (key: ProfileKey, value: number) => setUserProfile((p) => ({ ...p, [key]: value }))

  const showAnalysis = (name: string, info: BandInfo, profile: UserProfile = userProfile) => {
    const analysis = calculateMatch(name, info, profile)
    setCurrentBand(name)
    setCurrentInfo(info)
    setCurrentPercent(analysis.rating ? analysis.matchPercentage : null)
    setRating(analysis.rating)
    setScoreDetails(analysis.scoreBreakdown)
    lastBandRef.current = { name, info }
    setSuggestions((s) => [...new Set([name, ...s])])

    let links = `[🎧 Auf Spotify anhören](${analysis.spotifyLink})`
    if (info.source?.wikipedia) links += `\n[📖 Wikipedia](${info.source.wikipedia})`
    if (info.source?.wikidata) links += `\n[🗂️ Wikidata](${info.source.wikidata})`
    for (const src of info.source?.webSources?.slice(0, 3) ?? []) links += `\n[🌐 ${src.title.replace(/[[\]()]/g, "")}](${src.url})`
    const note = getNote(notesBridge.get(), name)
    const noteLine = note ? `\n\n📝 **Deine Wertung:** ${noteSummary(note)}` : ""
    addMessage("assistant", `${analysis.explanation}${noteLine}\n\n${analysis.scoreBreakdown}\n\n${links}`, [
      { label: "❤️ Merken", type: "watch", value: name },
      { label: note ? "📝 Deine Wertung" : "📝 Eigene Wertung", type: "note", value: name },
      { label: "🔎 Ähnliche Bands", type: "say", value: `Bands wie ${name}` },
      { label: "🎤 Live?", type: "say", value: `Wie ist ${name} live?` },
      { label: "❓ Warum?", type: "say", value: "Warum?" },
    ])
  }

  // ---------- Merkliste ----------
  const addWatch = (name: string, info: BandInfo, announce = true) => {
    if (isOnWatchlist(watchlist, name)) {
      if (announce) addMessage("assistant", `**${name}** steht schon auf deiner Merkliste ❤️`)
      return
    }
    setWatchlist((list) => addToWatchlist(list, name, info))
    if (announce)
      addMessage("assistant", `❤️ **${name}** ist auf deiner Merkliste.`, [
        { label: "❤️ Merkliste zeigen", type: "say", value: "Zeig meine Merkliste" },
      ])
  }

  const removeWatch = (name: string) => setWatchlist((list) => removeFromWatchlist(list, name))

  const toggleCurrentWatch = () => {
    if (!currentBand || !currentInfo) return
    if (isOnWatchlist(watchlist, currentBand)) removeWatch(currentBand)
    else addWatch(currentBand, currentInfo, false)
  }

  const watchFromChip = async (name: string) => {
    if (lastBandRef.current && lastBandRef.current.name === name) return addWatch(name, lastBandRef.current.info)
    const found = await findBand(name)
    if (found.ok) addWatch(found.name, found.info)
    else addMessage("assistant", `Ich konnte **${name}** gerade nicht laden – versuch es gleich nochmal.`)
  }

  // Chat: Nachricht an die Chat-Engine schicken
  // KI-Chat: Werkzeuge der KI greifen über diese Funktionen auf die App zu
  const aiDeps = {
    getProfile: () => profileRef.current,
    applyProfile: (p: UserProfile) => {
      undoRef.current = profileRef.current
      profileRef.current = p
      setUserProfile(p)
    },
    getWatchlist: () => watchlistRef.current,
    setWatchlist: (list: WatchItem[]) => {
      watchlistRef.current = list
      setWatchlist(list)
    },
    showBand: (name: string, info: BandInfo) => {
      const analysis = calculateMatch(name, info, profileRef.current)
      setCurrentBand(name)
      setCurrentInfo(info)
      setCurrentPercent(analysis.rating ? analysis.matchPercentage : null)
      setRating(analysis.rating)
      setScoreDetails(analysis.scoreBreakdown)
      lastBandRef.current = { name, info }
      setSuggestions((s) => [...new Set([name, ...s])])
    },
    getLastBand: () => lastBandRef.current,
  }

  const useAi = aiAvailable() && aiSetting !== "off"

  const sendChat = async (text: string, shownText = text, allowAi = false) => {
    if (!text.trim() || isSearching) return
    if (allowAi && useAi && (aiSetting === "haiku" || aiSetting === "opus")) {
      addMessage("user", shownText)
      setIsSearching(true)
      try {
        const reply = await aiRef.current.send(text, aiSetting, aiDeps)
        if (reply.newConversation) addMessage("assistant", "🧹 Das Gespräch wurde zu lang – ich habe ein neues angefangen. Dein Profil und deine Merkliste bleiben natürlich.")
        addMessage("assistant", reply.text, reply.actions, modelLabel(reply.model))
        return
      } catch (e) {
        const msg = e instanceof AiError ? e.message : "KI nicht erreichbar"
        addMessage("assistant", `🤖 ${msg} – ich antworte ohne KI.`)
      } finally {
        setIsSearching(false)
      }
      return sendRuleChat(text, shownText, false)
    }
    return sendRuleChat(text, shownText, true)
  }

  // Chat ohne KI (Satzmuster-Erkennung)
  const sendRuleChat = async (text: string, shownText: string, showUser: boolean) => {
    if (showUser) addMessage("user", shownText)
    setIsSearching(true)
    try {
      const outcome = await respond(text, { profile: userProfile, lastBand: lastBandRef.current, watchlist })
      if (outcome.lastBand !== undefined) lastBandRef.current = outcome.lastBand
      if (outcome.watchAdd) {
        const { name, info } = outcome.watchAdd
        setWatchlist((list) => addToWatchlist(list, name, info))
      }
      if (outcome.watchRemove) removeWatch(outcome.watchRemove)
      let profile = userProfile
      if (outcome.profile) {
        undoRef.current = userProfile
        profile = outcome.profile
        setUserProfile(outcome.profile)
      }
      for (const r of outcome.replies) addMessage("assistant", r.text, r.actions)
      if (outcome.analyze) {
        if (outcome.analyze.note) addMessage("assistant", outcome.analyze.note)
        showAnalysis(outcome.analyze.name, outcome.analyze.info, profile)
      }
    } catch {
      addMessage("assistant", "Uff, da ist etwas schiefgelaufen 😵 Versuch es bitte nochmal.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleSendMessage = () => {
    const text = input
    setInput("")
    sendChat(text, text, true)
  }

  const handleAction = (action: ChatAction) => {
    if (action.type === "link") {
      window.open(action.value, "_blank", "noopener")
    } else if (action.type === "undo") {
      if (!undoRef.current) return
      setUserProfile(undoRef.current)
      undoRef.current = null
      addMessage("assistant", "↩️ Rückgängig gemacht – dein Profil ist wieder wie vorher.")
    } else if (action.type === "note") {
      setNoteBand(action.value)
    } else if (action.type === "watch") {
      watchFromChip(action.value)
    } else if (action.type === "band") {
      sendChat(`Wie passt ${action.value} zu mir?`, `🔍 ${action.value}`)
    } else {
      sendChat(action.value)
    }
  }

  // Suchfeld oben: direkte Band-Analyse
  const handleBandSearch = () => {
    const name = bandSearch.trim()
    if (!name) return
    setRating(null)
    setScoreDetails("")
    sendChat(`Wie passt ${name} zu mir?`, `🔍 ${name}`)
  }

  const getRatingText = (r: Rating) => {
    switch (r) {
      case "green": return "PASST PERFEKT! 🤘"
      case "yellow": return "KÖNNTE PASSEN 🤔"
      case "red": return "EHER NICHT 🚫"
      default: return "KEINE BEWERTUNG"
    }
  }

  const getRatingColor = (r: Rating) => {
    switch (r) {
      case "green": return "from-green-500 to-emerald-500"
      case "yellow": return "from-yellow-500 to-amber-500"
      case "red": return "from-red-500 to-rose-500"
      default: return "from-zinc-500 to-zinc-600"
    }
  }

  return (
    <div className="safe-area min-h-[100dvh] bg-gradient-to-br from-zinc-950 via-neutral-900 to-black flex flex-col">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-zinc-700/50 shadow-lg shadow-black/50">
        <div className="max-w-7xl mx-auto p-4 flex items-center gap-3">
          <div className="bg-gradient-to-br from-zinc-700 via-zinc-500 to-zinc-400 p-3 rounded-xl shadow-lg shadow-zinc-800/50">
            <Music className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-400 bg-clip-text text-transparent">
              Metal Detector
            </h1>
            <p className="text-sm text-zinc-400">Profil-basierte Musik-Analyse 🤘</p>
          </div>
          <button
            type="button"
            onClick={() => setIsWatchlistOpen(true)}
            aria-label={`Merkliste öffnen (${watchlist.length})`}
            className="ml-auto relative w-12 h-12 inline-flex items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition"
          >
            <Heart className={`w-6 h-6 ${watchlist.length ? "text-red-500 fill-red-500" : "text-zinc-300"}`} />
            {watchlist.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                {watchlist.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left/Top: Band Search */}
        <div className="lg:col-span-2 space-y-4">
          <Card className={cardStyle}>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Input
                  value={bandSearch}
                  onChange={(e) => setBandSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBandSearch()}
                  placeholder="Band oder Künstler suchen..."
                  enterKeyHint="search"
                  list="known-bands"
                  className={inputStyle}
                />
                <datalist id="known-bands">
                  {suggestions.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <Button onClick={handleBandSearch} disabled={isSearching} className={buttonStyle} aria-label="Band suchen">
                  {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </Button>
              </div>
              {currentBand && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2">
                  <Badge className="bg-zinc-800/80 text-zinc-200 border-zinc-600/50 shadow-md">
                    <Volume2 className="w-3 h-3 mr-1" />
                    {currentBand}
                  </Badge>
                  {rating && (
                    <Badge className={`bg-gradient-to-r ${getRatingColor(rating)} text-white border-0 shadow-md`}>
                      {rating === "green" ? "✓" : rating === "yellow" ? "~" : "✗"}
                    </Badge>
                  )}
                  {currentInfo && !isSearching && (
                    <button
                      type="button"
                      onClick={toggleCurrentWatch}
                      aria-label={isOnWatchlist(watchlist, currentBand) ? "Von der Merkliste entfernen" : "Auf die Merkliste"}
                      className="ml-auto inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-zinc-600/60 bg-black/40 text-zinc-200 hover:bg-zinc-700/60 active:scale-95 transition"
                    >
                      <Heart
                        className={`w-4 h-4 ${isOnWatchlist(watchlist, currentBand) ? "text-red-500 fill-red-500" : ""}`}
                      />
                      {isOnWatchlist(watchlist, currentBand) ? "Gemerkt" : "Merken"}
                    </button>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Chat Messages */}
          <Card className={`${cardStyle} flex-1`}>
            <CardContent className="p-4 h-[50vh] lg:h-[60vh] overflow-y-auto space-y-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl shadow-lg ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-zinc-700 via-zinc-500 to-zinc-600 text-black font-medium shadow-zinc-800/50"
                          : "bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 text-zinc-100 border border-zinc-700/50 shadow-black/50"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {message.content.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*)/).map((part, i) => {
                          const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/)
                          if (linkMatch) {
                            return (
                              <a
                                key={i}
                                href={linkMatch[2]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-zinc-300 hover:text-white underline font-semibold"
                              >
                                {linkMatch[1]}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )
                          }
                          const boldMatch = part.match(/^\*\*(.*?)\*\*$/)
                          if (boldMatch) return <strong key={i}>{boldMatch[1]}</strong>
                          return <span key={i}>{part}</span>
                        })}
                      </div>
                      <div
                        suppressHydrationWarning
                        className={`text-xs opacity-60 mt-2 ${message.role === "user" ? "text-black" : "text-zinc-400"}`}
                      >
                        {message.timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        {message.via && <span className="ml-2">🤖 {message.via}</span>}
                      </div>
                      {message.actions && message.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {message.actions.map((a, i) => (
                            <button
                              key={i}
                              onClick={() => handleAction(a)}
                              disabled={isSearching}
                              className="text-xs px-3 py-1.5 rounded-full border border-zinc-600/60 bg-black/40 text-zinc-200 hover:bg-zinc-700/60 active:scale-95 transition disabled:opacity-40"
                            >
                              {a.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isSearching && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ich schau mal nach… 🔍
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>
          </Card>

          {/* Input */}
          <Card className={cardStyle}>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Schreib was, Kumpel..."
                  enterKeyHint="send"
                  className={inputStyle}
                />
                <Button onClick={handleSendMessage} disabled={isSearching} className={buttonStyle} aria-label="Nachricht senden">
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Rating Display */}
        <div className="space-y-4">
          <Card className={cardStyle}>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-2">
                <Mic className="w-5 h-5 text-zinc-400 shrink-0" />
                <span className="truncate">Bewertung{currentBand ? ` · ${currentBand}` : ""}</span>
              </h2>

              <div className="space-y-4">
                {/* Traffic Light – mit Band: berechnete Ampel links, deine Wertung rechts */}
                {currentBand && currentInfo ? (
                  <div className="grid grid-cols-[84px_1fr] gap-3 bg-black/60 rounded-xl p-3 border border-zinc-800/50 shadow-inner">
                    <div className="flex flex-col items-center gap-2.5 border-r border-zinc-800 pr-3 py-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Profil</span>
                      <TrafficLight small active={rating === "green"} color="#22c55e" />
                      <TrafficLight small active={rating === "yellow"} color="#eab308" />
                      <TrafficLight small active={rating === "red"} color="#ef4444" />
                      {currentPercent !== null && (
                        <span
                          className="text-sm font-extrabold"
                          style={{ color: rating === "green" ? "#4ade80" : rating === "yellow" ? "#facc15" : "#f87171" }}
                        >
                          {currentPercent} %
                        </span>
                      )}
                    </div>
                    <PersonalPanel note={getNote(notes, currentBand)} onEdit={() => setNoteBand(currentBand)} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 bg-black/60 rounded-xl p-6 border border-zinc-800/50 shadow-inner">
                    <TrafficLight active={rating === "green"} color="#22c55e" />
                    <TrafficLight active={rating === "yellow"} color="#eab308" />
                    <TrafficLight active={rating === "red"} color="#ef4444" />
                  </div>
                )}

                {/* Rating Text */}
                <AnimatePresence mode="wait">
                  {rating && (
                    <motion.div
                      key={rating}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="text-center"
                    >
                      <p className="text-xl font-bold bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-400 bg-clip-text text-transparent">
                        {getRatingText(rating)}
                      </p>
                      {currentBand && <NoteHint rating={rating} note={getNote(notes, currentBand)} />}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Settings Button */}
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                  <DialogTrigger asChild>
                    <Button className={`w-full ${buttonStyle}`}>
                      <Settings className="w-4 h-4 mr-2" />
                      Profil-Einstellungen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto bg-gradient-to-br from-zinc-900 to-black border-zinc-700 text-zinc-100">
                    <DialogHeader>
                      <DialogTitle className="text-xl sm:text-2xl font-bold text-zinc-100 flex items-center gap-2">
                        <Settings className="w-6 h-6" />
                        Profil-Engine
                      </DialogTitle>
                      <p className="text-sm text-zinc-400 mt-2">
                        Bewertungsskala: 0 = Mag ich überhaupt nicht | 5 = Neutral | 10 = Davon will ich möglichst viel ·{" "}
                        <b className="text-zinc-300">Schalter aus = ist mir egal, zählt nicht</b>
                      </p>
                    </DialogHeader>

                    {aiAvailable() && (
                      <div className="rounded-xl border border-zinc-700/50 bg-black/40 p-3 space-y-2">
                        <p className="text-sm font-semibold text-zinc-200">🤖 KI-Chat</p>
                        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="KI-Modell">
                          {(["off", "haiku", "opus"] as AiSetting[]).map((v) => (
                            <button
                              key={v}
                              type="button"
                              role="radio"
                              aria-checked={aiSetting === v}
                              onClick={() => {
                                setAiSetting(v)
                                saveAiSetting(v)
                              }}
                              className={`rounded-lg px-2 py-2 text-xs sm:text-sm border transition ${
                                aiSetting === v ? "bg-zinc-100 text-black border-zinc-100 font-bold" : "border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                              }`}
                            >
                              {v === "off" ? "Aus" : AI_MODELS[v].label}
                              <span className="block text-[10px] font-normal opacity-70">
                                {v === "off" ? "ohne KI" : AI_MODELS[v].hint}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <Tabs defaultValue="musik" className="w-full">
                      <TabsList className="grid w-full grid-cols-4 bg-zinc-800/50">
                        {profileSections.map((s) => (
                          <TabsTrigger key={s.id} value={s.id}>
                            {s.tab}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {profileSections.map((section) => (
                        <TabsContent key={section.id} value={section.id} className="space-y-6 mt-6">
                          <div className="space-y-4">
                            <h3 className="text-lg font-bold text-zinc-200">{section.title}</h3>
                            {section.sliders.map((s) => (
                              <SliderControl
                                key={s.key}
                                label={s.question ? `${s.label} - ${s.question}` : s.label}
                                value={userProfile[s.key]}
                                onChange={(v) => setProfileValue(s.key, v)}
                                active={!disabled.includes(s.key)}
                                onToggle={() =>
                                  setDisabled((d) => (d.includes(s.key) ? d.filter((k) => k !== s.key) : [...d, s.key]))
                                }
                              />
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>

                    <div className="flex gap-2 mt-6">
                      <Button
                        onClick={() => {
                          setUserProfile(defaultProfile)
                          setDisabled([])
                        }}
                        variant="outline"
                        className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                      >
                        Zurücksetzen
                      </Button>
                      <Button onClick={() => setIsSettingsOpen(false)} className={`flex-1 ${buttonStyle}`}>
                        Speichern
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Score Details */}
                {scoreDetails && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black/40 rounded-lg p-4 border border-zinc-800/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-zinc-400" />
                      <p className="text-xs font-semibold text-zinc-300">Analyse-Details</p>
                    </div>
                    <div className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">
                      {scoreDetails.replace(/\*\*/g, "")}
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <footer className="text-center text-[11px] text-zinc-500 px-4 pb-4">
        Band-Daten:{" "}
        <a href="https://www.wikidata.org" target="_blank" rel="noopener noreferrer" className="underline">
          Wikidata
        </a>{" "}
        (CC0) · Beschreibungen:{" "}
        <a href="https://de.wikipedia.org" target="_blank" rel="noopener noreferrer" className="underline">
          Wikipedia
        </a>{" "}
        (
        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.de" target="_blank" rel="noopener noreferrer" className="underline">
          CC BY-SA 4.0
        </a>
        ) · Profile werden automatisch geschätzt
      </footer>

      <NoteDialog
        open={noteBand !== null}
        onOpenChange={(open) => !open && setNoteBand(null)}
        band={noteBand ?? ""}
        note={noteBand ? getNote(notes, noteBand) : undefined}
        onSave={(n) => {
          setNotes((all) => setNote(all, n))
          addMessage("assistant", `📝 Deine Wertung für **${n.band}** ist gespeichert: ${VERDICT_LABELS[n.verdict]}.`)
        }}
        onDelete={() => noteBand && setNotes((all) => removeNote(all, noteBand))}
      />

      <WatchlistDialog
        open={isWatchlistOpen}
        onOpenChange={setIsWatchlistOpen}
        items={watchlist}
        profile={userProfile}
        onAnalyze={(name) => {
          setIsWatchlistOpen(false)
          sendChat(`Wie passt ${name} zu mir?`, `🔍 ${name}`)
        }}
        onToggleListened={(name) => setWatchlist((list) => toggleListened(list, name))}
        onRemove={removeWatch}
      />
    </div>
  )
}
