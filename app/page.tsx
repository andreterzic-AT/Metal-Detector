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
import {
  defaultProfile,
  loadProfile,
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
}

const buttonStyle =
  "bg-gradient-to-r from-zinc-700 via-zinc-500 to-zinc-600 hover:from-zinc-600 hover:via-zinc-400 hover:to-zinc-500 text-black font-bold shadow-lg shadow-black/50"
const cardStyle = "bg-gradient-to-br from-zinc-900/90 to-black/90 backdrop-blur-md border-zinc-700/50 shadow-xl shadow-black/50"
const inputStyle = "bg-black/60 border-zinc-600/50 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:ring-zinc-400"

let messageCounter = 0

// Außerhalb der Seite definiert, damit der Regler beim Ziehen nicht neu erzeugt wird
function SliderControl({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center gap-2">
        <label className="text-sm text-zinc-300 font-medium">{label}</label>
        <span className="text-sm font-bold text-zinc-100 bg-zinc-800/50 px-2 py-1 rounded min-w-[2rem] text-center">{value}</span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
        style={{ background: "linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)" }}
      />
      <div className="flex justify-between text-[10px] sm:text-xs text-zinc-500">
        <span>0 - Mag ich nicht</span>
        <span>5 - Neutral</span>
        <span>10 - Will ich viel</span>
      </div>
    </div>
  )
}

function TrafficLight({ active, color }: { active: boolean; color: string }) {
  return (
    <motion.div
      animate={{ opacity: active ? 1 : 0.2, scale: active ? 1.15 : 1 }}
      className="w-16 h-16 lg:w-20 lg:h-20 rounded-full shadow-lg relative"
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

export default function MetalDetectorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey Kumpel! 🤘 Willkommen beim Metal Detector!\n\nIch bin dein persönlicher Musik-Guide mit intelligenter Profil-Analyse. Öffne die Einstellungen (Button unter der Ampel) und erstelle dein persönliches Musikprofil mit dem Bewertungssystem (0 = mag ich nicht, 5 = neutral, 10 = davon will ich viel).\n\nDann kannst du nach jeder beliebigen Band suchen – ich hole mir die Infos aus dem Web (MusicBrainz & Wikipedia) und sage dir, wie gut sie zu dir passen! 🎸\n\nOder schreib mir einfach: „Wie passt Sabaton zu mir?“, „Bands wie Nightwish“, „Empfiehl mir was“ oder „Ich hasse Growls“ 💬",
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastBandRef = useRef<LastBand>(null)
  const undoRef = useRef<UserProfile | null>(null)

  // Profil beim Start vom Gerät laden …
  useEffect(() => {
    setUserProfile(loadProfile())
    setWatchlist(loadWatchlist())
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const addMessage = (role: "user" | "assistant", content: string, actions?: ChatAction[]) => {
    const newMessage: Message = { id: `${Date.now()}-${messageCounter++}`, role, content, timestamp: new Date(), actions }
    setMessages((prev) => [...prev, newMessage])
  }

  const setProfileValue = (key: ProfileKey, value: number) => setUserProfile((p) => ({ ...p, [key]: value }))

  const showAnalysis = (name: string, info: BandInfo, profile: UserProfile = userProfile) => {
    const analysis = calculateMatch(name, info, profile)
    setCurrentBand(name)
    setCurrentInfo(info)
    setRating(analysis.rating)
    setScoreDetails(analysis.scoreBreakdown)
    lastBandRef.current = { name, info }
    setSuggestions((s) => [...new Set([name, ...s])])

    let links = `[🎧 Auf Spotify anhören](${analysis.spotifyLink})`
    if (info.source?.wikipedia) links += `\n[📖 Wikipedia](${info.source.wikipedia})`
    if (info.source) links += `\n[🗂️ MusicBrainz](${info.source.musicbrainz})`
    addMessage("assistant", `${analysis.explanation}\n\n${analysis.scoreBreakdown}\n\n${links}`, [
      { label: "❤️ Merken", type: "watch", value: name },
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
  const sendChat = async (text: string, shownText = text) => {
    if (!text.trim() || isSearching) return
    addMessage("user", shownText)
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
    sendChat(text)
  }

  const handleAction = (action: ChatAction) => {
    if (action.type === "link") {
      window.open(action.value, "_blank", "noopener")
    } else if (action.type === "undo") {
      if (!undoRef.current) return
      setUserProfile(undoRef.current)
      undoRef.current = null
      addMessage("assistant", "↩️ Rückgängig gemacht – dein Profil ist wieder wie vorher.")
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
                <Mic className="w-5 h-5 text-zinc-400" />
                Bewertung
              </h2>

              <div className="space-y-4">
                {/* Traffic Light */}
                <div className="flex flex-col items-center gap-3 bg-black/60 rounded-xl p-6 border border-zinc-800/50 shadow-inner">
                  <TrafficLight active={rating === "green"} color="#22c55e" />
                  <TrafficLight active={rating === "yellow"} color="#eab308" />
                  <TrafficLight active={rating === "red"} color="#ef4444" />
                </div>

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
                        Bewertungsskala: 0 = Mag ich überhaupt nicht | 5 = Neutral | 10 = Davon will ich möglichst viel
                      </p>
                    </DialogHeader>

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
                              />
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>

                    <div className="flex gap-2 mt-6">
                      <Button
                        onClick={() => setUserProfile(defaultProfile)}
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
