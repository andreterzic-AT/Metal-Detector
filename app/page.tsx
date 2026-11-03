"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Music, Mic, Search, Volume2, ExternalLink, Info, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { bandDatabase, type BandInfo } from "@/lib/bands"
import {
  defaultProfile,
  getPropertyLabel,
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
}

type Rating = "green" | "yellow" | "red" | null

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
        "Hey Kumpel! 🤘 Willkommen beim Metal Detector!\n\nIch bin dein persönlicher Musik-Guide mit intelligenter Profil-Analyse. Öffne die Einstellungen (Button unter der Ampel) und erstelle dein persönliches Musikprofil mit dem Bewertungssystem (0 = mag ich nicht, 5 = neutral, 10 = davon will ich viel).\n\nDann kannst du Bands suchen und ich sage dir genau, wie gut sie zu dir passen! 🎸",
      timestamp: new Date(),
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Profil beim Start vom Gerät laden …
  useEffect(() => {
    setUserProfile(loadProfile())
    setProfileLoaded(true)
  }, [])

  // … und bei jeder Änderung speichern
  useEffect(() => {
    if (profileLoaded) saveProfile(userProfile)
  }, [userProfile, profileLoaded])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const addMessage = (role: "user" | "assistant", content: string) => {
    const newMessage: Message = { id: `${Date.now()}-${messageCounter++}`, role, content, timestamp: new Date() }
    setMessages((prev) => [...prev, newMessage])
  }

  const setProfileValue = (key: ProfileKey, value: number) => setUserProfile((p) => ({ ...p, [key]: value }))

  const calculateMatch = (bandName: string) => {
    const band = bandName.toLowerCase()

    const bandInfo: BandInfo = bandDatabase[band] || {
      genre: "unbekannt",
      attitude: "neutral",
      religion: "neutral",
      themes: ["verschiedene themen"],
      spotify: `https://open.spotify.com/search/${encodeURIComponent(bandName)}`,
      description: "Band nicht in Datenbank - Profil-basierte Analyse nicht verfügbar",
      lyricStyle: "variabel",
      profile: {},
    }

    const profileKeys = Object.keys(bandInfo.profile) as ProfileKey[]

    if (profileKeys.length === 0) {
      return {
        rating: null as Rating,
        explanation: `**${bandName}**\n\nDiese Band ist noch nicht in meiner Datenbank. Ich kann keine detaillierte Profil-Analyse durchführen.`,
        spotifyLink: bandInfo.spotify,
        scoreBreakdown: "Keine Profildaten verfügbar",
        matchPercentage: 0,
      }
    }

    let totalScore = 0
    let maxPossibleScore = 0
    const strongMatches: string[] = []
    const weakMatches: string[] = []

    // Durchlaufe alle Profil-Eigenschaften
    profileKeys.forEach((key) => {
      const bandValue = bandInfo.profile[key]
      const userValue = userProfile[key]

      if (bandValue !== undefined && userValue !== undefined) {
        // Differenz: 0 = perfekt, 10 = maximal unterschiedlich
        const difference = Math.abs(bandValue - userValue)
        totalScore += 10 - difference
        maxPossibleScore += 10

        if (difference <= 2 && (bandValue >= 7 || userValue >= 7)) {
          strongMatches.push(`✅ ${getPropertyLabel(key)}: Band ${bandValue}/10, Du ${userValue}/10`)
        } else if (difference >= 5 && (bandValue >= 7 || userValue >= 7)) {
          weakMatches.push(`⚠️ ${getPropertyLabel(key)}: Band ${bandValue}/10, Du ${userValue}/10`)
        }
      }
    })

    const matchPercentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0

    let finalRating: Rating
    let ratingText: string

    if (matchPercentage >= 80) {
      finalRating = "green"
      ratingText = `🟢 **PREMIUM-TREFFER!** (${matchPercentage}%)\n\nDiese Band passt hervorragend zu deinem Profil!`
    } else if (matchPercentage >= 70) {
      finalRating = "green"
      ratingText = `🟢 **STARKE ÜBEREINSTIMMUNG!** (${matchPercentage}%)\n\nDiese Band passt sehr gut zu dir!`
    } else if (matchPercentage >= 60) {
      finalRating = "yellow"
      ratingText = `🟡 **GUTE ÜBEREINSTIMMUNG** (${matchPercentage}%)\n\nEinige gute Matches, testweise anhören!`
    } else if (matchPercentage >= 50) {
      finalRating = "yellow"
      ratingText = `🟡 **TESTWEISE ANHÖREN** (${matchPercentage}%)\n\nGemischtes Profil, könnte interessant sein.`
    } else {
      finalRating = "red"
      ratingText = `🔴 **NICHT EMPFOHLEN** (${matchPercentage}%)\n\nZu viele Unterschiede zu deinem Profil.`
    }

    let explanation = `**${bandName}**\n${bandInfo.description}\n\n`
    explanation += `📊 **Genre**: ${bandInfo.genre}${bandInfo.subgenre ? ` (${bandInfo.subgenre})` : ""}\n`
    explanation += `🎭 **Stil**: ${bandInfo.lyricStyle}\n`
    explanation += `🎯 **Themen**: ${bandInfo.themes.join(", ")}\n\n`
    explanation += `${ratingText}\n\n`

    if (strongMatches.length > 0) {
      explanation += `**Stärkste Übereinstimmungen:**\n${strongMatches.slice(0, 5).join("\n")}\n\n`
    }
    if (weakMatches.length > 0) {
      explanation += `**Größte Abweichungen:**\n${weakMatches.slice(0, 5).join("\n")}\n\n`
    }

    const scoreBreakdown = `**Match-Analyse:**\n${matchPercentage}% Übereinstimmung\n\nBasierend auf ${profileKeys.length} Profil-Eigenschaften`

    return { rating: finalRating, explanation: explanation.trim(), spotifyLink: bandInfo.spotify, scoreBreakdown, matchPercentage }
  }

  const handleSendMessage = () => {
    if (!input.trim()) return

    addMessage("user", input)
    const lowerInput = input.toLowerCase()
    setInput("")

    setTimeout(() => {
      if (lowerInput.includes("empfehlung") || lowerInput.includes("vorschlag")) {
        addMessage(
          "assistant",
          `Basierend auf deinem Profil könnte ich dir diese Bands empfehlen: Metallica, Nightwish, Iron Maiden, Amon Amarth, Gojira.\n\nProbier sie einfach oben in der Suche aus! 🎸`
        )
      } else if (lowerInput.includes("wie") || lowerInput.includes("funktioniert")) {
        addMessage(
          "assistant",
          `Das System analysiert Bands anhand deines persönlichen Profils!\n\n📊 Du bewertest 50+ Eigenschaften von 0-10\n🎸 Jede Band hat ein eigenes Profil\n🎯 Ich vergleiche beide und berechne die Übereinstimmung\n\n🟢 80%+ = Premium-Treffer\n🟢 70-79% = Starke Übereinstimmung\n🟡 60-69% = Gute Übereinstimmung\n🟡 50-59% = Testweise anhören\n🔴 <50% = Nicht empfohlen`
        )
      } else {
        const responses = [
          `Cool! Probier mal die Bandsuche aus! 🤘`,
          `Nice! Hast du schon dein Profil eingestellt? ⚙️`,
          `Interessant! Such mal nach einer Band! 🔍`,
        ]
        addMessage("assistant", responses[Math.floor(Math.random() * responses.length)])
      }
    }, 500)
  }

  const handleBandSearch = () => {
    const name = bandSearch.trim()
    if (!name) return

    setCurrentBand(name)
    const analysis = calculateMatch(name)
    setRating(analysis.rating)
    setScoreDetails(analysis.scoreBreakdown)

    setTimeout(() => {
      addMessage("assistant", `${analysis.explanation}\n\n${analysis.scoreBreakdown}\n\n[🎧 Auf Spotify anhören](${analysis.spotifyLink})`)
    }, 300)
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
                  {Object.keys(bandDatabase).map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <Button onClick={handleBandSearch} className={buttonStyle} aria-label="Band suchen">
                  <Search className="w-5 h-5" />
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
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
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
                <Button onClick={handleSendMessage} className={buttonStyle} aria-label="Nachricht senden">
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
    </div>
  )
}
