import type { UserProfile } from "./profile"

export type BandInfo = {
  /** Offizieller Name (bei Web-Ergebnissen von Wikidata) */
  name?: string
  genre: string
  subgenre?: string
  attitude: string
  religion: string
  themes: string[]
  spotify: string
  description: string
  lyricStyle: string
  profile: Partial<UserProfile>
  /** Woher die Daten stammen – fehlt bei der eingebauten Liste */
  source?: {
    kind: "web"
    wikidata?: string
    /** Nur bei älteren, gespeicherten Ergebnissen */
    musicbrainz?: string
    wikipedia?: string
    tagCount: number
    lyricSentences: number
  }
}

// Erweiterte Band-Datenbank mit Profilen
export const bandDatabase: Record<string, BandInfo> = {
  "metallica": {
    genre: "thrash metal",
    subgenre: "heavy metal",
    attitude: "rebellisch, gesellschaftskritisch",
    religion: "neutral, atheistisch",
    themes: ["gesellschaftskritik", "krieg", "persönliche struggles", "sucht", "tod"],
    spotify: "https://open.spotify.com/artist/2ye2Wgw4gimLv2eAKyk1NB",
    description: "Thrash Metal Pioniere mit sozialkritischen und düsteren Texten",
    lyricStyle: "direkt, emotional, manchmal düster",
    profile: {
      haerte: 8, melodie: 6, atmosphaere: 5, melancholie: 6, technik: 8, progressive: 5, groove: 9,
      cleanVocals: 7, growls: 2, screams: 6, symphonisch: 2, liveEnergie: 10,
      gesellschaftskritik: 8, innereKaempfe: 7, krieg: 7, verlustTrauer: 6,
      spirituelleNeutralitaet: 8, dunkelheitAesthetik: 7,
      moshpitFaktor: 9, publikumsenergie: 10, buehnenpraesenz: 9,
    },
  },
  "nightwish": {
    genre: "symphonic metal",
    subgenre: "power metal",
    attitude: "neutral, künstlerisch",
    religion: "spirituell, naturverbunden",
    themes: ["fantasy", "natur", "philosophie", "märchen", "träume"],
    spotify: "https://open.spotify.com/artist/2NPduAUeLVsfIauhRwuft1",
    description: "Symphonischer Metal mit orchestralen Elementen und poetischen Texten",
    lyricStyle: "poetisch, bildlich, fantastisch",
    profile: {
      haerte: 5, melodie: 10, atmosphaere: 10, melancholie: 7, technik: 8, progressive: 6, groove: 5,
      cleanVocals: 10, growls: 1, screams: 0, symphonisch: 10, liveEnergie: 9,
      natur: 9, mythologie: 8, philosophie: 8, fantasy: 10, kosmos: 7,
      spirituelleNeutralitaet: 6, mystik: 8, hoffnung: 7,
      buehnenpraesenz: 10, festivalTauglichkeit: 9,
    },
  },
  "slayer": {
    genre: "thrash metal",
    subgenre: "extreme metal",
    attitude: "rebellisch, provokativ",
    religion: "satanisch, anti-religiös",
    themes: ["gewalt", "krieg", "religion", "tod", "okkultismus", "horror"],
    spotify: "https://open.spotify.com/artist/1IQ2e1buppatiN1bxUVkrk",
    description: "Extreme Thrash Metal Band mit kontroversen, düsteren Texten",
    lyricStyle: "brutal, provokativ, düster",
    profile: {
      haerte: 10, melodie: 3, atmosphaere: 6, melancholie: 4, technik: 9, progressive: 4, groove: 8,
      cleanVocals: 1, growls: 4, screams: 8, symphonisch: 0, liveEnergie: 10,
      krieg: 10, horror: 9, antiReligion: 9, gotteslaesterung: 8, satanischeSymbolik: 8,
      okkultismus: 7, dunkelheitAesthetik: 10,
      moshpitFaktor: 10, publikumsenergie: 10, buehnenpraesenz: 9,
    },
  },
  "iron maiden": {
    genre: "heavy metal",
    subgenre: "nwobhm",
    attitude: "neutral, historisch",
    religion: "neutral",
    themes: ["geschichte", "literatur", "fantasy", "krieg", "mythologie"],
    spotify: "https://open.spotify.com/artist/6mdiAmATAx73kdxrNrnlao",
    description: "Klassischer Heavy Metal mit literarischen und historischen Themen",
    lyricStyle: "erzählend, literarisch, episch",
    profile: {
      haerte: 6, melodie: 8, atmosphaere: 7, melancholie: 5, technik: 8, progressive: 5, groove: 7,
      cleanVocals: 9, growls: 0, screams: 0, symphonisch: 3, liveEnergie: 10,
      geschichte: 10, mythologie: 9, fantasy: 8, krieg: 7, abenteuer: 8,
      spirituelleNeutralitaet: 9,
      moshpitFaktor: 7, publikumsenergie: 10, buehnenpraesenz: 10, festivalTauglichkeit: 10,
    },
  },
  "august burns red": {
    genre: "metalcore",
    subgenre: "progressive metalcore",
    attitude: "positiv, hoffnungsvoll",
    religion: "christlich",
    themes: ["hoffnung", "persönliche struggles", "glaube", "überwindung", "moral"],
    spotify: "https://open.spotify.com/artist/0yyMdRMjRKRQ4SLRKvSPCL",
    description: "Christliche Metalcore Band mit positiven, hoffnungsvollen Botschaften",
    lyricStyle: "hoffnungsvoll, persönlich, moralisch",
    profile: {
      haerte: 8, melodie: 7, atmosphaere: 6, melancholie: 5, technik: 9, progressive: 7, groove: 8,
      cleanVocals: 4, growls: 2, screams: 7, symphonisch: 3, liveEnergie: 9,
      persoenlicheEntwicklung: 9, innereKaempfe: 8, hoffnung: 10,
      christlicheThemen: 9, hoffnungErloesung: 9, moralischeWerte: 9,
      moshpitFaktor: 8, publikumsenergie: 9, buehnenpraesenz: 8,
    },
  },
  "amon amarth": {
    genre: "melodic death metal",
    subgenre: "viking metal",
    attitude: "neutral, kriegerisch",
    religion: "heidnisch, nordisch",
    themes: ["wikinger", "mythologie", "krieg", "schlachten", "nordische götter"],
    spotify: "https://open.spotify.com/artist/3pulcT2wt7FEG10lQlqDJL",
    description: "Melodic Death Metal mit Wikinger und nordischer Mythologie",
    lyricStyle: "episch, mythologisch, kriegerisch",
    profile: {
      haerte: 8, melodie: 7, atmosphaere: 7, melancholie: 5, technik: 7, progressive: 4, groove: 8,
      cleanVocals: 1, growls: 9, screams: 3, symphonisch: 4, liveEnergie: 10,
      mythologie: 10, geschichte: 8, krieg: 9, abenteuer: 7,
      heidentum: 10, mystik: 7,
      moshpitFaktor: 9, publikumsenergie: 10, buehnenpraesenz: 9, festivalTauglichkeit: 9,
    },
  },
  "opeth": {
    genre: "progressive metal",
    subgenre: "death metal",
    attitude: "künstlerisch, melancholisch",
    religion: "atheistisch, nihilistisch",
    themes: ["tod", "melancholie", "philosophie", "dunkelheit", "verlust"],
    spotify: "https://open.spotify.com/artist/0ybFZ2Ab08V8hueghSXm6E",
    description: "Progressive Metal/Death Metal mit komplexen, düsteren Arrangements",
    lyricStyle: "poetisch, düster, philosophisch",
    profile: {
      haerte: 7, melodie: 8, atmosphaere: 10, melancholie: 10, technik: 10, progressive: 10, groove: 6,
      cleanVocals: 7, growls: 6, screams: 2, symphonisch: 5, liveEnergie: 7,
      philosophie: 9, verlustTrauer: 9,
      existenzialismus: 8, nihilismus: 7, dunkelheitAesthetik: 9,
      buehnenpraesenz: 8,
    },
  },
  "gojira": {
    genre: "progressive metal",
    subgenre: "death metal",
    attitude: "aktivistisch, umweltbewusst",
    religion: "spirituell, naturverbunden",
    themes: ["umwelt", "natur", "philosophie", "tod", "spiritualität"],
    spotify: "https://open.spotify.com/artist/0GDGKpJFhVpcjIGF8N6Ewt",
    description: "Progressive Death Metal mit starkem Fokus auf Umweltschutz",
    lyricStyle: "philosophisch, umweltbewusst, kraftvoll",
    profile: {
      haerte: 9, melodie: 6, atmosphaere: 8, melancholie: 6, technik: 9, progressive: 8, groove: 9,
      cleanVocals: 3, growls: 8, screams: 5, symphonisch: 2, liveEnergie: 10,
      natur: 10, philosophie: 9, gesellschaftskritik: 8, kosmos: 6,
      spirituelleNeutralitaet: 7, mystik: 6,
      moshpitFaktor: 9, publikumsenergie: 10, buehnenpraesenz: 10, festivalTauglichkeit: 10,
    },
  },
  "ghost": {
    genre: "heavy metal",
    subgenre: "occult rock",
    attitude: "theatralisch, satirisch",
    religion: "satanisch, okkult",
    themes: ["okkultismus", "satan", "religion", "tod", "horror"],
    spotify: "https://open.spotify.com/artist/1Qp56T7n950O3EGMsSl81D",
    description: "Theatralischer Metal mit okkulten und satanischen Themen",
    lyricStyle: "theatralisch, okkult, satirisch",
    profile: {
      haerte: 5, melodie: 9, atmosphaere: 8, melancholie: 6, technik: 6, progressive: 5, groove: 7,
      cleanVocals: 10, growls: 0, screams: 0, symphonisch: 6, liveEnergie: 9,
      horror: 8, antiReligion: 7, satanischeSymbolik: 10, okkultismus: 10, mystik: 9,
      dunkelheitAesthetik: 8,
      buehnenpraesenz: 10, publikumsinteraktion: 8, festivalTauglichkeit: 8,
    },
  },
  "architects": {
    genre: "metalcore",
    subgenre: "progressive metalcore",
    attitude: "politisch links, aktivistisch",
    religion: "atheistisch",
    themes: ["gesellschaftskritik", "umwelt", "politik", "persönliche struggles", "tod"],
    spotify: "https://open.spotify.com/artist/3ZztVuWxHzNpl0THurTFCv",
    description: "Moderne Metalcore Band mit starkem Fokus auf Umwelt- und Gesellschaftskritik",
    lyricStyle: "kritisch, emotional, aktivistisch",
    profile: {
      haerte: 8, melodie: 7, atmosphaere: 7, melancholie: 8, technik: 8, progressive: 7, groove: 7,
      cleanVocals: 5, growls: 3, screams: 8, symphonisch: 3, liveEnergie: 10,
      gesellschaftskritik: 10, innereKaempfe: 9, verlustTrauer: 8, hoffnung: 6, natur: 7,
      existenzialismus: 7, spirituelleNeutralitaet: 8,
      moshpitFaktor: 9, publikumsenergie: 10, buehnenpraesenz: 9, festivalTauglichkeit: 9,
    },
  },
}
