import { useEffect, useRef, useState } from 'react'

const MAX_LY = 48
const WARP_RATE = 0.38 // ly/s

type WarpPhase = {
  name: string
  short: string
  min: number
  max: number
}

const PHASES: WarpPhase[] = [
  { name: 'Local Stellar Neighborhood', short: 'LOCAL', min: 0, max: 10 },
  { name: 'Orion-Cygnus Arm Transit', short: 'ARM', min: 10, max: 24 },
  { name: 'Deep Field Crossing', short: 'DEEP', min: 24, max: 38 },
  { name: 'Target Nebula Approach', short: 'CORE', min: 38, max: MAX_LY + 0.01 },
]

function getPhase(ly: number): WarpPhase {
  return PHASES.find((p) => ly >= p.min && ly < p.max) ?? PHASES[PHASES.length - 1]
}

interface Star {
  x: number
  y: number
  z: number
  color: string
  size: number
  brightness: number
  type: string
}

interface NebulaCloud {
  x: number
  y: number
  z: number
  radius: number
  color: string
  drift: number
  alpha: number
}

interface DustRibbon {
  y: number
  width: number
  phase: number
  alpha: number
}

interface ConstellationNode {
  x: number
  y: number
  z: number
}

interface Constellation {
  nodes: ConstellationNode[]
  color: string
  alpha: number
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 255, g: 255, b: 255 }
}

export default function StarHyperspace() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const distanceRef = useRef(0)
  const [hud, setHud] = useState({
    distance: 0,
    phase: PHASES[0],
    warpFactor: 1,
    velocity: 0,
    starsPassed: 0,
    eta: MAX_LY / WARP_RATE,
  })
  const [phaseFlash, setPhaseFlash] = useState('')
  const [gameState, setGameState] = useState<'playing' | 'victory'>('playing')
  const [redirectCountdown, setRedirectCountdown] = useState(6)

  useEffect(() => {
    if (gameState === 'victory') {
      setRedirectCountdown(6)
      const timer = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            window.location.href = '/'
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [gameState])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }
    resize()
    window.addEventListener('resize', resize)

    const STAR_COUNT = 6000
    const MAX_DEPTH = 20000
    const FOV = 1000
    let speed = 0
    const targetSpeed = 950
    let starsPassed = 0
    const stars: Star[] = []
    const nebulae: NebulaCloud[] = []
    const dustRibbons: DustRibbon[] = []
    const constellations: Constellation[] = []

    const starColors = {
      dwarf: ['#ffffff', '#ffffee'],
      main: ['#ffffdd', '#ffffcc', '#ffff99', '#fffeee'],
      supergiant: ['#66ccff', '#88ddff'],
      red: ['#ff9966', '#ff7744', '#ff6633', '#dd5522'],
      bluegiant: ['#99ccff', '#aaddff', '#88bbff'],
      gold: ['#ffcc66', '#ffdd88', '#ffbb44'],
      pulsar: ['#99e6ff'],
      ghost: ['#ffffff'],
    }

    const spawnStar = (): Star => {
      const roll = Math.random()
      let type = 'main'
      if (roll < 0.5) type = 'main'
      else if (roll < 0.7) type = 'dwarf'
      else if (roll < 0.82) type = 'red'
      else if (roll < 0.9) type = 'bluegiant'
      else if (roll < 0.95) type = 'gold'
      else if (roll < 0.985) type = 'supergiant'
      else if (roll < 0.995) type = 'pulsar'
      else type = 'ghost'

      const colors = starColors[type as keyof typeof starColors]
      return {
        x: (Math.random() - 0.5) * 15000,
        y: (Math.random() - 0.5) * 15000,
        z: Math.random() * MAX_DEPTH + 1000,
        color: colors[Math.floor(Math.random() * colors.length)],
        size:
          type === 'supergiant' ? Math.random() * 4.0 + 2.5
          : type === 'bluegiant' ? Math.random() * 3.2 + 2.0
          : type === 'gold' ? Math.random() * 3.5 + 2.2
          : type === 'pulsar' ? Math.random() * 1.5 + 1.0
          : type === 'ghost' ? Math.random() * 0.8 + 0.4
          : Math.random() * 2.2 + 0.8,
        brightness:
          type === 'ghost' ? Math.random() * 0.2 + 0.05
          : type === 'pulsar' ? Math.random() * 1 + 0.8
          : type === 'supergiant' ? Math.random() * 0.6 + 0.8
          : Math.random() * 0.8 + 0.3,
        type,
      }
    }

    for (let i = 0; i < STAR_COUNT; i++) stars.push(spawnStar())

    const nebulaColors = ['#a78bfa', '#8b5cf6', '#c084fc', '#f472b6', '#6366f1']
    for (let i = 0; i < 16; i++) {
      nebulae.push({
        x: (Math.random() - 0.5) * 18000,
        y: (Math.random() - 0.5) * 12000,
        z: 6000 + Math.random() * 16000,
        radius: 900 + Math.random() * 2300,
        color: nebulaColors[Math.floor(Math.random() * nebulaColors.length)],
        drift: (Math.random() - 0.5) * 0.18,
        alpha: 0.08 + Math.random() * 0.12,
      })
    }

    for (let i = 0; i < 7; i++) {
      dustRibbons.push({
        y: (Math.random() - 0.5) * height,
        width: 70 + Math.random() * 180,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.035 + Math.random() * 0.045,
      })
    }

    for (let i = 0; i < 8; i++) {
      const baseX = (Math.random() - 0.5) * 13000
      const baseY = (Math.random() - 0.5) * 9000
      const nodeCount = 4 + Math.floor(Math.random() * 4)
      const nodes: ConstellationNode[] = []
      for (let j = 0; j < nodeCount; j++) {
        nodes.push({
          x: baseX + (Math.random() - 0.5) * 2200,
          y: baseY + (Math.random() - 0.5) * 1800,
          z: 7000 + Math.random() * 9000,
        })
      }
      constellations.push({
        nodes,
        color: Math.random() > 0.5 ? '#a78bfa' : '#c4b5fd',
        alpha: 0.08 + Math.random() * 0.08,
      })
    }

    const project = (x: number, y: number, z: number) => {
      const scale = FOV / z
      return { x: width / 2 + x * scale, y: height / 2 - y * scale, scale }
    }

    let lastHud = 0
    let lastPhaseIdx = 0
    let lastFrame = performance.now()
    let raf = 0

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastFrame) / 1000)
      lastFrame = now
      const time = now * 0.001

      if (!width || !height || width <= 0 || height <= 0) {
        raf = requestAnimationFrame(frame)
        return
      }

      const atMax = distanceRef.current >= MAX_LY
      if (!atMax) {
        distanceRef.current = Math.min(MAX_LY, distanceRef.current + WARP_RATE * dt)
        if (distanceRef.current >= MAX_LY) {
          setGameState('victory')
        }
      }

      const dist = distanceRef.current
      const warpFactor = 1 + (dist / MAX_LY) * 8.5

      speed += (targetSpeed * warpFactor * 0.12 - speed) * 0.012

      const dpr = window.devicePixelRatio || 1
      ctx.save()
      ctx.scale(dpr, dpr)

      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, width, height)

      const spaceGlow = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.8,
      )
      spaceGlow.addColorStop(0, 'rgba(18,8,38,0.42)')
      spaceGlow.addColorStop(0.46, 'rgba(5,18,40,0.16)')
      spaceGlow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = spaceGlow
      ctx.fillRect(0, 0, width, height)

      for (const ribbon of dustRibbons) {
        const driftY = ((ribbon.y + Math.sin(time * 0.18 + ribbon.phase) * 70 + height * 1.5) % (height * 2)) - height * 0.5
        const grad = ctx.createLinearGradient(0, driftY - ribbon.width, width, driftY + ribbon.width)
        grad.addColorStop(0, 'rgba(0,0,0,0)')
        grad.addColorStop(0.35, `rgba(168, 85, 247, ${ribbon.alpha})`)
        grad.addColorStop(0.52, `rgba(99, 102, 241, ${ribbon.alpha * 0.8})`)
        grad.addColorStop(0.7, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.save()
        ctx.translate(width / 2, driftY)
        ctx.rotate(-0.12 + Math.sin(ribbon.phase) * 0.08)
        ctx.fillRect(-width, -ribbon.width / 2, width * 2, ribbon.width)
        ctx.restore()
      }

      for (const nebula of nebulae) {
        nebula.z -= speed * 0.09
        nebula.x += nebula.drift * speed * 0.02
        if (nebula.z <= 900) {
          nebula.x = (Math.random() - 0.5) * 18000
          nebula.y = (Math.random() - 0.5) * 12000
          nebula.z = 18000 + Math.random() * 9000
          nebula.radius = 900 + Math.random() * 2300
          nebula.color = nebulaColors[Math.floor(Math.random() * nebulaColors.length)]
        }
        const p = project(nebula.x, nebula.y, nebula.z)
        const r = nebula.radius * p.scale
        if (r < 20 || p.x < -r || p.x > width + r || p.y < -r || p.y > height + r) continue
        const rgb = hexToRgb(nebula.color)
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
        grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${nebula.alpha})`)
        grad.addColorStop(0.45, `rgba(${rgb.r},${rgb.g},${rgb.b},${nebula.alpha * 0.35})`)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      for (const constellation of constellations) {
        const pts = constellation.nodes.map((node) => {
          node.z -= speed * 0.035
          if (node.z <= 1200) node.z = 15000 + Math.random() * 8000
          return project(node.x, node.y, node.z)
        })
        ctx.strokeStyle = constellation.color
        ctx.globalAlpha = constellation.alpha * (0.55 + Math.sin(time * 0.7) * 0.25)
        ctx.lineWidth = 1
        ctx.beginPath()
        pts.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        })
        ctx.stroke()
        for (const p of pts) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, 3.8, 0, Math.PI * 2)
          ctx.fillStyle = constellation.color
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      for (const star of stars) {
        star.z -= speed
        if (star.z <= 1) {
          starsPassed++
          const fresh = spawnStar()
          star.x = fresh.x; star.y = fresh.y; star.z = MAX_DEPTH
          star.color = fresh.color; star.size = fresh.size
          star.brightness = fresh.brightness; star.type = fresh.type
        }

        const proj = project(star.x, star.y, star.z)
        const scaledSize = star.size * proj.scale * 2.8
        if (scaledSize <= 0) continue

        const depthFade = Math.max(0, 1 - star.z / MAX_DEPTH)
        const twinkle = Math.sin(time * 2 + star.x * 0.0001) * 0.08
        let baseOpacity = Math.min((star.brightness + twinkle) * depthFade * 1.4, 1)
        if (star.type === 'ghost') baseOpacity *= 0.5 + Math.sin(time * 1.5) * 0.3

        const rgb = hexToRgb(star.color)
        const stretch = speed * 0.015 * proj.scale

        ctx.globalAlpha = Math.min(baseOpacity * 1.3, 1)
        ctx.fillStyle = star.color
        ctx.beginPath()
        ctx.ellipse(proj.x, proj.y, scaledSize, scaledSize + stretch, 0, 0, Math.PI * 2)
        ctx.fill()

        if (scaledSize > 0.5) {
          const innerRadius = scaledSize * 3.5
          const innerGrad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, innerRadius)
          innerGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${baseOpacity * 1.2})`)
          innerGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)
          ctx.fillStyle = innerGrad
          ctx.globalAlpha = 1
          ctx.beginPath()
          ctx.arc(proj.x, proj.y, innerRadius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1

      ctx.restore()

      if (now - lastHud > 100) {
        lastHud = now
        const phase = getPhase(dist)
        const phaseIdx = PHASES.indexOf(phase)
        if (phaseIdx !== lastPhaseIdx && dist > 1) {
          lastPhaseIdx = phaseIdx
          setPhaseFlash(phase.short)
          window.setTimeout(() => setPhaseFlash(''), 2200)
        }

        setHud({
          distance: dist,
          phase,
          warpFactor,
          velocity: Math.floor(speed * 0.12),
          starsPassed,
          eta: atMax ? 0 : (MAX_LY - dist) / WARP_RATE,
        })
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const progressPct = (hud.distance / MAX_LY) * 100

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 h-full w-full" />

      <a
        href="/"
        data-astro-reload=""
        className="pointer-events-auto fixed right-6 top-6 z-40 border-2 border-purple-400/80 bg-black/85 px-4 py-2 font-mono text-xs text-white shadow-lg shadow-black/50 backdrop-blur-sm transition-all hover:bg-purple-400/20 sm:px-5 sm:py-2.5 sm:text-sm"
      >
        ← back
      </a>

      {phaseFlash && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-40 flex justify-center">
          <p className="animate-pulse border border-purple-400/50 bg-black/70 px-6 py-3 font-mono text-sm uppercase tracking-[0.3em] text-purple-200 shadow-lg shadow-black/60">
            entering {phaseFlash}
          </p>
        </div>
      )}

      {gameState === 'victory' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-40 flex justify-center">
          <p className="border border-purple-500/40 bg-black/75 px-5 py-2 font-mono text-xs uppercase tracking-wider text-purple-100/90">
            Target nebula · {MAX_LY} ly · transit complete
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute left-6 top-1/2 z-30 hidden -translate-y-1/2 sm:block">
        <div className="h-64 w-1.5 overflow-hidden rounded-full border border-purple-900/40 bg-black/50">
          <div
            className="w-full bg-gradient-to-t from-indigo-950 via-purple-600 to-purple-200 transition-all duration-300"
            style={{ height: `${progressPct}%`, marginTop: `${100 - progressPct}%` }}
          />
        </div>
        <p className="mt-2 text-center font-mono text-[10px] text-purple-500/70">0 ly</p>
        <p className="mt-[200px] text-center font-mono text-[10px] text-purple-500/70">{MAX_LY} ly</p>
      </div>

      <div className="pointer-events-none absolute right-6 top-[5.25rem] z-30 space-y-1 font-mono text-xs">
        <div className="min-w-[170px] border border-purple-700/50 bg-black/85 px-4 py-3 shadow-lg shadow-black/50 backdrop-blur-sm">
          <p className="text-2xl font-bold tabular-nums text-white drop-shadow-md">
            {hud.distance.toFixed(1)}
            <span className="text-sm font-normal text-purple-300/90"> ly</span>
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-purple-200">{hud.phase.short}</p>
          <p className="mt-0.5 text-[10px] text-purple-400/80">{hud.phase.name}</p>
        </div>
        <div className="space-y-1 border border-purple-900/50 bg-black/80 px-3 py-2 text-[10px] text-purple-300/90 shadow-lg shadow-black/40">
          <p>▸ WARP FACTOR <span className="float-right text-purple-300/90">{hud.warpFactor.toFixed(1)}</span></p>
          <p>▸ VELOCITY <span className="float-right text-purple-300/90">{hud.velocity} c</span></p>
          <p>▸ STARS PASSED <span className="float-right text-purple-300/90">{hud.starsPassed.toLocaleString()}</span></p>
          <p>▸ ETA <span className="float-right text-purple-300/90">{hud.eta > 0 ? `${Math.ceil(hud.eta)}s` : '—'}</span></p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-30 flex flex-col p-6 sm:p-8">
        <div className="max-w-[min(100%,42rem)] border-b-2 border-purple-500/60 pb-3 pr-28">
          <h1 className="text-2xl font-bold tracking-wider text-white drop-shadow-lg sm:text-4xl">
            HYPERSPACE TRANSIT
          </h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-purple-200 sm:text-xs">
            {hud.phase.name} · {hud.phase.short}
          </p>
        </div>
        <div className="flex-1" />
        <div className="pointer-events-none border-t-2 border-purple-700/50 pt-3">
          <p className="font-mono text-[10px] text-purple-100/90 drop-shadow sm:text-xs">
            ▸ OBJECTIVE: REACH TARGET NEBULA · {MAX_LY} LIGHT-YEAR MARKER · WARP FACTOR {hud.warpFactor.toFixed(1)}
          </p>
          <p className="mt-1 font-mono text-[10px] text-purple-600/50">
            ▸ {hud.distance.toFixed(1)} ly traversed — {gameState === 'victory' ? 'holding at destination' : `${Math.ceil(hud.eta)}s to target`}
          </p>
        </div>
      </div>

      {/* ── Victory Screen Overlay ── */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="max-w-md w-full border border-purple-500/40 bg-black/95 p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold tracking-widest text-purple-400 font-mono mb-2">
              TRANSIT COMPLETE
            </h2>
            <p className="text-[10px] font-mono text-purple-200/60 tracking-widest mb-4">
              Target nebula reached · {MAX_LY} ly traversed
            </p>
            <p className="font-mono text-[11px] text-white/75 leading-relaxed mb-6 border-y border-purple-900/40 py-4 px-2">
              Redirecting to home page in <span className="text-purple-400 font-bold">{redirectCountdown}s</span>...
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setGameState('playing')
                }}
                className="pointer-events-auto flex-1 border border-purple-700/50 bg-black/50 hover:bg-purple-950/40 text-purple-200 font-mono text-[10px] px-4 py-2.5 transition-all tracking-widest cursor-pointer flex items-center justify-center"
              >
                KEEP WARPING
              </button>
              <a
                href="/"
                data-astro-reload=""
                className="pointer-events-auto flex-1 border border-purple-500/80 bg-purple-500/10 hover:bg-purple-500/20 text-white font-mono text-[10px] px-4 py-2.5 transition-all tracking-widest cursor-pointer flex items-center justify-center"
              >
                RETURN HOME
              </a>
            </div>
          </div>
        </div>
      )}

      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,8,0.55) 100%)' }}
      />
    </div>
  )
}