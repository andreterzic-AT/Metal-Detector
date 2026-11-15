/** Store-Links – sobald die App im Store ist, hier eintragen. Leer = "Bald verfügbar". */
export const STORE_LINKS = {
  googlePlay: "",
  appStore: "",
}

const base = process.env.NEXT_PUBLIC_BASE_PATH || ""
/** Pfad zu einer Datei aus /public (berücksichtigt basePath) */
export const asset = (path: string) => `${base}${path}`

/** Hinweis zu Bandnamen (Markenrecht) – in Fußzeilen und Impressum */
export const BAND_NAME_NOTICE =
  "Bandnamen dienen nur der Beschreibung. Der Metal Detector steht in keiner Verbindung zu den genannten Bands und wird nicht von ihnen unterstützt."
