import type { BandInfo } from "./bands"
import { getPropertyLabel, type ProfileKey, type UserProfile } from "./profile"

export type Rating = "green" | "yellow" | "red" | null

export type MatchResult = {
  rating: Rating
  explanation: string
  spotifyLink: string
  scoreBreakdown: string
  matchPercentage: number
}

export function calculateMatch(bandName: string, bandInfo: BandInfo, userProfile: UserProfile): MatchResult {
  const profileKeys = Object.keys(bandInfo.profile) as ProfileKey[]

  if (profileKeys.length === 0) {
    return {
      rating: null,
      explanation: `**${bandName}**\n${bandInfo.description}\n\nZu dieser Band habe ich keine Genre-Daten gefunden, deshalb kann ich kein Profil berechnen.`,
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
  if (bandInfo.lyricStyle) explanation += `${bandInfo.source ? "🌍 **Herkunft**" : "🎭 **Stil**"}: ${bandInfo.lyricStyle}\n`
  if (bandInfo.themes.length) explanation += `🎯 **Themen**: ${bandInfo.themes.join(", ")}\n`
  explanation += `\n${ratingText}\n\n`

  if (strongMatches.length > 0) {
    explanation += `**Stärkste Übereinstimmungen:**\n${strongMatches.slice(0, 5).join("\n")}\n\n`
  }
  if (weakMatches.length > 0) {
    explanation += `**Größte Abweichungen:**\n${weakMatches.slice(0, 5).join("\n")}\n\n`
  }

  let scoreBreakdown = `**Match-Analyse:**\n${matchPercentage}% Übereinstimmung\n\nBasierend auf ${profileKeys.length} Profil-Eigenschaften`
  if (bandInfo.source) {
    scoreBreakdown += `\nQuelle: Web (${bandInfo.source.tagCount} Genre-Tags, ${bandInfo.source.lyricSentences} Wikipedia-Sätze zu Texten/Themen) – automatisch geschätzt`
  } else {
    scoreBreakdown += `\nQuelle: eingebaute Liste`
  }

  return { rating: finalRating, explanation: explanation.trim(), spotifyLink: bandInfo.spotify, scoreBreakdown, matchPercentage }
}
