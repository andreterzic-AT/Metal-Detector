import type { UserProfile } from "./profile"

type Partial10 = Partial<UserProfile>

/**
 * Genre-Regeln: Wenn eine Band ein passendes Genre auf Wikidata hat (oder es im Wikipedia-Artikel oft vorkommt),
 * fließen diese Werte (gewichtet nach Tag-Häufigkeit) in ihr Profil ein.
 * Mehrere Genres werden gemittelt, z. B. "melodic death metal" trifft
 * sowohl "melodic death metal" als auch "death metal".
 */
export const genreRules: { match: string; values: Partial10 }[] = [
  { match: "heavy metal", values: { haerte: 6, melodie: 8, technik: 7, groove: 7, cleanVocals: 9, growls: 0, screams: 1, liveEnergie: 9, festivalTauglichkeit: 9 } },
  { match: "nwobhm", values: { haerte: 6, melodie: 8, technik: 8, cleanVocals: 9, growls: 0, screams: 0, liveEnergie: 9 } },
  { match: "speed metal", values: { haerte: 8, melodie: 6, technik: 8, cleanVocals: 7, growls: 0, moshpitFaktor: 8 } },
  { match: "thrash metal", values: { haerte: 8, melodie: 5, technik: 8, groove: 8, cleanVocals: 6, growls: 2, screams: 5, liveEnergie: 10, moshpitFaktor: 10, publikumsenergie: 9, gesellschaftskritik: 7, krieg: 6 } },
  { match: "groove metal", values: { haerte: 8, groove: 10, melodie: 4, cleanVocals: 4, screams: 7, moshpitFaktor: 9 } },
  { match: "death metal", values: { haerte: 10, melodie: 3, technik: 9, groove: 6, cleanVocals: 0, growls: 10, screams: 4, symphonisch: 1, horror: 7, dunkelheitAesthetik: 8, moshpitFaktor: 9 } },
  { match: "melodic death metal", values: { haerte: 8, melodie: 8, atmosphaere: 6, technik: 8, cleanVocals: 2, growls: 8, screams: 5, horror: 3 } },
  { match: "technical death metal", values: { technik: 10, progressive: 8 } },
  { match: "brutal death metal", values: { haerte: 10, melodie: 1, horror: 9 } },
  { match: "black metal", values: { haerte: 9, melodie: 4, atmosphaere: 9, melancholie: 7, cleanVocals: 1, growls: 3, screams: 10, dunkelheitAesthetik: 10, satanischeSymbolik: 7, antiReligion: 7, gotteslaesterung: 6, okkultismus: 6, spirituelleNeutralitaet: 2 } },
  { match: "atmospheric black metal", values: { atmosphaere: 10, natur: 8, melancholie: 8, satanischeSymbolik: 3, antiReligion: 4 } },
  { match: "symphonic black metal", values: { symphonisch: 9, atmosphaere: 9 } },
  { match: "depressive", values: { melancholie: 10, verlustTrauer: 9, innereKaempfe: 9, innereKaempfeTexte: 9, nihilismus: 8, hoffnung: 1 } },
  { match: "doom metal", values: { haerte: 7, melodie: 5, atmosphaere: 9, melancholie: 10, groove: 6, technik: 4, verlustTrauer: 7, dunkelheitAesthetik: 8, moshpitFaktor: 3 } },
  { match: "funeral doom", values: { melancholie: 10, verlustTrauer: 10, haerte: 7, liveEnergie: 3 } },
  { match: "sludge", values: { haerte: 8, groove: 8, atmosphaere: 7, melodie: 3, screams: 8 } },
  { match: "stoner", values: { groove: 9, haerte: 6, atmosphaere: 7, melodie: 6, cleanVocals: 8 } },
  { match: "post-metal", values: { atmosphaere: 10, progressive: 8, melancholie: 7, haerte: 7, philosophie: 6 } },
  { match: "gothic", values: { melodie: 8, atmosphaere: 9, melancholie: 9, cleanVocals: 8, symphonisch: 5, dunkelheitAesthetik: 8, verlustTrauer: 6 } },
  { match: "power metal", values: { haerte: 5, melodie: 10, technik: 8, cleanVocals: 10, growls: 0, screams: 0, symphonisch: 6, fantasy: 8, hoffnung: 7, abenteuer: 7, dunkelheitAesthetik: 2, festivalTauglichkeit: 9, publikumsinteraktion: 8 } },
  { match: "symphonic metal", values: { haerte: 5, melodie: 9, atmosphaere: 9, symphonisch: 10, cleanVocals: 9, growls: 2, screams: 1, fantasy: 6, buehnenpraesenz: 9 } },
  { match: "progressive metal", values: { technik: 10, progressive: 10, atmosphaere: 7, philosophie: 6, moshpitFaktor: 4 } },
  { match: "progressive rock", values: { technik: 9, progressive: 10, haerte: 3, melodie: 8, cleanVocals: 9, growls: 0, screams: 0 } },
  { match: "djent", values: { technik: 9, progressive: 9, groove: 9, haerte: 8 } },
  { match: "metalcore", values: { haerte: 8, melodie: 7, groove: 8, cleanVocals: 6, growls: 3, screams: 9, moshpitFaktor: 10, publikumsenergie: 9, innereKaempfe: 7, innereKaempfeTexte: 7 } },
  { match: "melodic metalcore", values: { melodie: 8, cleanVocals: 7 } },
  { match: "deathcore", values: { haerte: 10, melodie: 2, groove: 8, cleanVocals: 1, growls: 9, screams: 9, moshpitFaktor: 10 } },
  { match: "post-hardcore", values: { haerte: 6, melodie: 7, cleanVocals: 7, screams: 7, innereKaempfe: 7 } },
  { match: "hardcore", values: { haerte: 8, groove: 8, screams: 8, cleanVocals: 2, moshpitFaktor: 10, gesellschaftskritik: 7 } },
  { match: "nu metal", values: { haerte: 7, groove: 10, melodie: 6, technik: 4, cleanVocals: 7, screams: 6, innereKaempfe: 8, innereKaempfeTexte: 8, moshpitFaktor: 8 } },
  { match: "alternative metal", values: { haerte: 6, melodie: 7, groove: 8, cleanVocals: 8, screams: 4 } },
  { match: "industrial", values: { haerte: 7, groove: 8, atmosphaere: 7, cleanVocals: 6, scienceFiction: 5, dunkelheitAesthetik: 7 } },
  { match: "neue deutsche härte", values: { haerte: 7, groove: 9, melodie: 7, cleanVocals: 8, growls: 0, screams: 1, buehnenpraesenz: 10, publikumsenergie: 10, festivalTauglichkeit: 10 } },
  { match: "grindcore", values: { haerte: 10, melodie: 0, technik: 6, growls: 9, screams: 9, cleanVocals: 0, gesellschaftskritik: 7, horror: 6, moshpitFaktor: 10 } },
  { match: "crust", values: { gesellschaftskritik: 9, haerte: 8 } },
  { match: "folk metal", values: { melodie: 8, atmosphaere: 7, natur: 8, mythologie: 8, heidentum: 7, abenteuer: 6, festivalTauglichkeit: 10, publikumsenergie: 9, publikumsinteraktion: 8 } },
  { match: "viking metal", values: { mythologie: 10, heidentum: 9, krieg: 8, geschichte: 7, abenteuer: 7 } },
  { match: "pagan", values: { heidentum: 10, natur: 8, mythologie: 8, mystik: 7 } },
  { match: "celtic", values: { mythologie: 8, natur: 7, heidentum: 6 } },
  { match: "pirate metal", values: { abenteuer: 10, fantasy: 6, publikumsinteraktion: 9, festivalTauglichkeit: 10 } },
  { match: "occult", values: { okkultismus: 9, mystik: 8, satanischeSymbolik: 6, dunkelheitAesthetik: 8 } },
  { match: "satanic", values: { satanischeSymbolik: 10, antiReligion: 8, gotteslaesterung: 7, okkultismus: 7 } },
  { match: "war metal", values: { krieg: 10, haerte: 10, gotteslaesterung: 7 } },
  { match: "space", values: { kosmos: 9, scienceFiction: 8, atmosphaere: 8 } },
  { match: "cyber", values: { scienceFiction: 9 } },
  { match: "epic", values: { symphonisch: 7, fantasy: 7, abenteuer: 6 } },
  { match: "hard rock", values: { haerte: 4, melodie: 8, groove: 8, cleanVocals: 10, growls: 0, screams: 1, festivalTauglichkeit: 9, publikumsinteraktion: 8 } },
  { match: "glam metal", values: { haerte: 4, melodie: 9, cleanVocals: 10, growls: 0, screams: 0, publikumsinteraktion: 9, dunkelheitAesthetik: 1 } },
  { match: "rock", values: { haerte: 3, melodie: 8, cleanVocals: 9, growls: 0, screams: 1 } },
]

/**
 * Diese Regeln überschreiben am Ende alles andere (z. B. damit eine
 * christliche Black-Metal-Band nicht als satanisch eingestuft wird).
 */
export const overrideRules: { match: string; values: Partial10 }[] = [
  {
    match: "christian",
    values: { christlicheThemen: 10, religioeseThemen: 9, hoffnungErloesung: 9, moralischeWerte: 8, hoffnung: 8, satanischeSymbolik: 0, gotteslaesterung: 0, antiReligion: 0, okkultismus: 0, spirituelleNeutralitaet: 2 },
  },
  {
    match: "unblack",
    values: { christlicheThemen: 10, religioeseThemen: 9, satanischeSymbolik: 0, gotteslaesterung: 0, antiReligion: 0, okkultismus: 0 },
  },
]

/**
 * Stichwörter, nach denen in Wikipedia-Sätzen über Texte/Themen gesucht wird.
 * Treffer heben den jeweiligen Profilwert an.
 */
export const themeKeywords: { keys: (keyof UserProfile)[]; words: string[]; label: string }[] = [
  { keys: ["natur"], label: "Natur", words: ["nature", "environment", "environmental", "ecolog", "climate", "forest", "wilderness"] },
  { keys: ["mythologie"], label: "Mythologie", words: ["mytholog", "norse", "odin", "thor", "valhalla", "greek myth", "vikings", "pagan gods"] },
  { keys: ["heidentum"], label: "Heidentum", words: ["pagan", "heathen", "paganism"] },
  { keys: ["philosophie"], label: "Philosophie", words: ["philosoph", "metaphysic", "consciousness"] },
  { keys: ["existenzialismus"], label: "Existenzialismus", words: ["existential", "meaning of life", "mortality"] },
  { keys: ["persoenlicheEntwicklung"], label: "Persönliche Entwicklung", words: ["self-improvement", "overcoming", "personal growth", "empower", "perseverance"] },
  { keys: ["innereKaempfe", "innereKaempfeTexte"], label: "Innere Kämpfe", words: ["depression", "mental health", "mental illness", "addiction", "anxiety", "inner struggle", "suicide", "self-harm", "personal struggle"] },
  { keys: ["verlustTrauer"], label: "Verlust und Trauer", words: ["grief", "loss", "mourning", "bereavement", "sorrow"] },
  { keys: ["hoffnung", "hoffnungErloesung"], label: "Hoffnung", words: ["hope", "redemption", "uplifting", "positive message", "optimis"] },
  { keys: ["gesellschaftskritik"], label: "Gesellschaftskritik", words: ["politic", "social issue", "social commentary", "corruption", "capitalism", "government", "protest", "injustice", "activism", "society"] },
  { keys: ["geschichte"], label: "Geschichte", words: ["historical", "world war", "ancient", "medieval", "military history", "historic battles"] },
  { keys: ["krieg"], label: "Krieg", words: ["war", "warfare", "battle", "military", "soldier"] },
  { keys: ["scienceFiction"], label: "Science Fiction", words: ["science fiction", "sci-fi", "futuristic", "dystopi", "cyberpunk", "alien"] },
  { keys: ["fantasy"], label: "Fantasy", words: ["fantasy", "tolkien", "dragon", "sword and sorcery", "fairy tale", "fairytale"] },
  { keys: ["horror"], label: "Horror", words: ["horror", "gore", "zombie", "serial killer", "lovecraft", "macabre"] },
  { keys: ["kosmos"], label: "Kosmos", words: ["cosmic", "cosmos", "outer space", "universe", "astronom", "planet"] },
  { keys: ["abenteuer"], label: "Abenteuer", words: ["adventure", "pirate", "voyage", "seafar", "exploration"] },
  { keys: ["christlicheThemen", "religioeseThemen"], label: "Christliche Themen", words: ["christian", "christianity", "jesus", "biblical", "bible", "gospel"] },
  { keys: ["religioeseThemen"], label: "Religion", words: ["religio", "faith", "spiritual"] },
  { keys: ["moralischeWerte"], label: "Moral", words: ["moral", "ethic", "integrity"] },
  { keys: ["nihilismus"], label: "Nihilismus", words: ["nihilis", "misanthrop", "hopeless"] },
  { keys: ["antiReligion"], label: "Religionskritik", words: ["anti-christian", "anti-religio", "atheis", "criticism of religion", "critique of religion"] },
  { keys: ["gotteslaesterung"], label: "Gotteslästerung", words: ["blasphem", "sacrileg"] },
  { keys: ["satanischeSymbolik"], label: "Satanismus", words: ["satan", "lucifer", "devil", "antichrist"] },
  { keys: ["okkultismus"], label: "Okkultismus", words: ["occult", "esoteric", "witchcraft", "ritual", "magick"] },
  { keys: ["mystik"], label: "Mystik", words: ["mystic", "mysticism", "esoteric"] },
  { keys: ["dunkelheitAesthetik"], label: "Dunkelheit", words: ["darkness", "gothic", "macabre", "bleak"] },
]
