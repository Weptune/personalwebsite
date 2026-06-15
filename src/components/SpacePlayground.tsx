import { useEffect, useState } from 'react'
import OceanDescent from './OceanDescent'
import SolarStorm from './SolarStorm'
import StarHyperspace from './StarHyperspace'
import SkyGlider from './SkyGlider'
import LunarTransit from './LunarTransit'

type CelestialTheme = 'stars' | 'sun' | 'ocean' | 'sky' | 'moon'

const THEME_LABELS: Record<CelestialTheme, string> = {
  stars: 'Hyperspace Transit',
  sun: 'Chasing Solar Skies',
  ocean: 'Abyssal Descent',
  sky: 'Drifting in the Clouds',
  moon: 'Lunar Transit',
}

const isCelestialTheme = (value: string | null | undefined): value is CelestialTheme =>
  value === 'stars' || value === 'sun' || value === 'ocean' || value === 'sky' || value === 'moon'

/** Read active theme — URL param wins, then DOM attr, then localStorage. */
function readTheme(): CelestialTheme {
  if (typeof window === 'undefined') return 'stars'

  const fromUrl = new URLSearchParams(window.location.search).get('theme')
  if (isCelestialTheme(fromUrl)) return fromUrl

  const fromDom = document.documentElement.getAttribute('data-celestial-theme')
  if (isCelestialTheme(fromDom)) return fromDom

  const fromStorage = localStorage.getItem('celestial-theme')
  if (isCelestialTheme(fromStorage)) return fromStorage

  return 'stars'
}

function persistTheme(theme: CelestialTheme) {
  document.documentElement.setAttribute('data-celestial-theme', theme)
  localStorage.setItem('celestial-theme', theme)
  document.title = `${THEME_LABELS[theme]} · stargazing`
}

export default function SpacePlayground() {
  const [theme, setTheme] = useState<CelestialTheme | null>(null)

  useEffect(() => {
    const applyTheme = (next: CelestialTheme) => {
      setTheme(next)
      persistTheme(next)

      // Keep URL in sync so refreshes and shares preserve the active game
      const url = new URL(window.location.href)
      if (url.searchParams.get('theme') !== next) {
        url.searchParams.set('theme', next)
        window.history.replaceState({}, '', url)
      }
    }

    applyTheme(readTheme())

    const onThemeChange = (e: Event) => {
      const next = (e as CustomEvent<{ theme: string }>).detail?.theme
      if (isCelestialTheme(next)) applyTheme(next)
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'celestial-theme' && isCelestialTheme(e.newValue)) applyTheme(e.newValue)
    }

    document.addEventListener('celestial-theme-change', onThemeChange)
    window.addEventListener('storage', onStorage)
    return () => {
      document.removeEventListener('celestial-theme-change', onThemeChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  if (!theme) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#010810]">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/35">Loading voyage…</p>
      </div>
    )
  }

  switch (theme) {
    case 'ocean':
      return <OceanDescent />
    case 'sun':
      return <SolarStorm />
    case 'sky':
      return <SkyGlider />
    case 'moon':
      return <LunarTransit />
    default:
      return <StarHyperspace />
  }
}
