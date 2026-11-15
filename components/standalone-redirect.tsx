"use client"

import { useEffect } from "react"

/** Wird die App vom Homescreen gestartet (installiert), direkt zur App statt zur Landing Page */
export function StandaloneRedirect() {
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) window.location.replace(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/app/`)
  }, [])
  return null
}
