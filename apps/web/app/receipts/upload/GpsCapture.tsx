'use client'
import { useEffect } from 'react'

export function GpsCapture() {
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latEl = document.getElementById('gps-lat') as HTMLInputElement | null
        const lngEl = document.getElementById('gps-lng') as HTMLInputElement | null
        if (latEl) latEl.value = String(pos.coords.latitude)
        if (lngEl) lngEl.value = String(pos.coords.longitude)
      },
      () => { /* GPS unavailable — form submits without coordinates */ }
    )
  }, [])
  return null
}
