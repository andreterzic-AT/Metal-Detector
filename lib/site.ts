/** Store-Links – sobald die App im Store ist, hier eintragen. Leer = "Bald verfügbar". */
export const STORE_LINKS = {
  googlePlay: "",
  appStore: "",
}

const base = process.env.NEXT_PUBLIC_BASE_PATH || ""
/** Pfad zu einer Datei aus /public (berücksichtigt basePath) */
export const asset = (path: string) => `${base}${path}`
