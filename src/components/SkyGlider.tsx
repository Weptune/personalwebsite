import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

// Game constants
const TARGET_LANTERNS = 15
const CELL_SIZE = 1200

interface Entity {
  id: number
  type: 'lantern' | 'breeze' | 'cloud' | 'star' | 'crane'
  x: number
  y: number
  radius: number
  collected?: boolean
  pulsePhase?: number
  strength?: number
  driftX?: number
}

interface Particle {
  x: number; y: number
  vx: number; vy: number
  size: number; color: string
  alpha: number; life: number; decay: number
  type: 'petal' | 'spark'
  angle?: number; spinSpeed?: number; tw?: number
}

interface FloatingText { id: number; x: number; y: number; text: string; color: string; life: number }

interface PlaneState {
  x: number; y: number    // world position
  vx: number; vy: number  // velocity (for visual banking)
  pitch: number; roll: number
  score: number
  angle: number
  speed: number
}

interface HudData {
  altitude: number
  airspeed: number
  bearing: number
  score: number
  distance: number
  windGust: number
  condition: string
}

export default function SkyGlider() {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const gameStateRef = useRef<'start' | 'playing' | 'victory'>('start')
  const planeRef    = useRef<PlaneState>({ x: 0, y: 1400, vx: 0, vy: 0, pitch: 0, roll: 0, score: 0, angle: 0, speed: 0 })
  const mouseRef    = useRef({ sx: 0, sy: 0 }) // screen coords
  const cameraRef   = useRef({ x: 0, y: 1400 })
  const entitiesRef = useRef<Entity[]>([])
  const particlesRef = useRef<Particle[]>([])
  const vaporRef    = useRef<{ x: number; y: number; alpha: number }[]>([])
  const floatRef    = useRef<FloatingText[]>([])
  const timeRef     = useRef(0)
  const distRef     = useRef(0)
  const generatedCellsRef = useRef<Set<string>>(new Set())
  const collectedIdsRef = useRef<Set<number>>(new Set())

  // Parallax stars pre-generated once
  const starsRef = useRef<{ x: number; y: number; size: number; speed: number; twinklePhase: number }[]>([])
  if (starsRef.current.length === 0) {
    const tempStars = []
    for (let i = 0; i < 150; i++) {
      tempStars.push({
        x: Math.random(),
        y: Math.random(),
        size: 0.6 + Math.random() * 1.5,
        speed: 0.015 + Math.random() * 0.045,
        twinklePhase: Math.random() * Math.PI * 2,
      })
    }
    starsRef.current = tempStars
  }

  // Background slow clouds pre-generated once
  const bgCloudsRef = useRef<{ x: number; y: number; size: number; speed: number; driftPhase: number }[]>([])
  if (bgCloudsRef.current.length === 0) {
    const tempClouds = []
    for (let i = 0; i < 12; i++) {
      tempClouds.push({
        x: Math.random(),
        y: Math.random(),
        size: 140 + Math.random() * 180,
        speed: 0.04 + Math.random() * 0.06,
        driftPhase: Math.random() * Math.PI * 2,
      })
    }
    bgCloudsRef.current = tempClouds
  }

  // Shooting stars active array
  const shootingStarsRef = useRef<{ id: number; x: number; y: number; vx: number; vy: number; len: number; life: number; color: string }[]>([])

  const [gameState, setGameState] = useState<'start' | 'playing' | 'victory'>('start')
  const [hud, setHud] = useState<HudData>({ altitude: 1400, airspeed: 38, bearing: 90, score: 0, distance: 0, windGust: 0, condition: 'CLEAR' })
  const [audioOn, setAudioOn] = useState(false)
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

  // Audio refs
  const audioCtxRef   = useRef<AudioContext | null>(null)
  const audioOnRef    = useRef(false)
  const ambGainRef    = useRef<GainNode | null>(null)
  const ambOscsRef    = useRef<OscillatorNode[]>([])

  const conditions = ['CLEAR', 'BREEZY', 'CALM', 'OVERCAST', 'HAZY', 'WINDY']

  // Audio helpers
  const initAudio = () => {
    if (audioCtxRef.current) return
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (AC) audioCtxRef.current = new AC()
  }

  const toggleAudio = () => {
    if (!audioOnRef.current) {
      initAudio(); audioOnRef.current = true; setAudioOn(true); startAmbientPad()
    } else {
      audioOnRef.current = false; setAudioOn(false); stopAmbientPad()
    }
  }

  const startAmbientPad = () => {
    if (!audioCtxRef.current || !audioOnRef.current || ambGainRef.current) return
    const ctx = audioCtxRef.current, now = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.06, now + 2.5)
    gain.connect(ctx.destination); ambGainRef.current = gain
    ;[130.81, 164.81, 196.00, 261.63, 329.63].forEach(freq => {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, now)
      const lfo = ctx.createOscillator(); const lfoG = ctx.createGain()
      lfo.frequency.setValueAtTime(0.15 + Math.random() * 0.08, now)
      lfoG.gain.setValueAtTime(4, now)
      lfo.connect(lfoG); lfoG.connect(osc.detune)
      osc.connect(gain); osc.start(now); lfo.start(now)
      ambOscsRef.current.push(osc, lfo as any)
    })
  }

  const stopAmbientPad = () => {
    if (!ambGainRef.current || !audioCtxRef.current) return
    const now = audioCtxRef.current.currentTime, g = ambGainRef.current
    g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now)
    g.gain.linearRampToValueAtTime(0, now + 1.2)
    const oscs = [...ambOscsRef.current]; ambOscsRef.current = []; ambGainRef.current = null
    setTimeout(() => oscs.forEach(o => { try { (o as any).stop() } catch {} }), 1400)
  }

  const playChime = () => {
    if (!audioCtxRef.current || !audioOnRef.current) return
    const ctx = audioCtxRef.current, now = ctx.currentTime
    const freqs = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]
    const f = freqs[Math.floor(Math.random() * freqs.length)]
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.type = 'sine'; osc.frequency.setValueAtTime(f, now)
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.1, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6)
    osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 1.7)
  }

  // Cantor pairing function to generate unique positive integer IDs for any cx, cy coordinates (including negative ones)
  const getCellEntityId = (cx: number, cy: number, typeOffset: number) => {
    const ux = cx >= 0 ? 2 * cx : -2 * cx - 1
    const uy = cy >= 0 ? 2 * cy : -2 * cy - 1
    const pair = ((ux + uy) * (ux + uy + 1)) / 2 + uy
    return pair * 10 + typeOffset
  }

  // Seeded sparse grid generator
  const spawnCell = (cx: number, cy: number) => {
    let seed = Math.abs(cx * 73856093 ^ cy * 19349663) || 1
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    const cellX = cx * CELL_SIZE
    const cellY = cy * CELL_SIZE
    const arr: Entity[] = []

    // 35% chance of spawning 1 lantern per cell
    const lanternId = getCellEntityId(cx, cy, 0)
    if (rand() < 0.35) {
      const lx = cellX + rand() * CELL_SIZE
      const ly = cellY + rand() * CELL_SIZE
      if (!collectedIdsRef.current.has(lanternId)) {
        arr.push({ id: lanternId, type: 'lantern', x: lx, y: ly, radius: 26, pulsePhase: rand() * Math.PI * 2 })
      }
    }

    // 30% chance of spawning 1 cloud per cell
    const cloudId = getCellEntityId(cx, cy, 1)
    if (rand() < 0.30) {
      const clx = cellX + rand() * CELL_SIZE
      const cly = cellY + rand() * CELL_SIZE
      arr.push({ id: cloudId, type: 'cloud', x: clx, y: cly, radius: 140 + rand() * 100, driftX: (rand() - 0.5) * 0.4 })
    }

    // 12% chance of spawning 1 star per cell
    const starId = getCellEntityId(cx, cy, 2)
    if (rand() < 0.12) {
      const sx = cellX + rand() * CELL_SIZE
      const sy = cellY + rand() * CELL_SIZE
      if (!collectedIdsRef.current.has(starId)) {
        arr.push({ id: starId, type: 'star', x: sx, y: sy, radius: 18 })
      }
    }

    // 12% chance of spawning 1 breeze per cell
    const breezeId = getCellEntityId(cx, cy, 3)
    if (rand() < 0.12) {
      const bx = cellX + rand() * CELL_SIZE
      const by = cellY + rand() * CELL_SIZE
      arr.push({ id: breezeId, type: 'breeze', x: bx, y: by, radius: 80 + rand() * 50, strength: 3 + rand() * 3 })
    }

    // 40% chance of spawning 1 origami crane per cell
    const craneId = getCellEntityId(cx, cy, 4)
    if (rand() < 0.40) {
      const crx = cellX + rand() * CELL_SIZE
      const cry = cellY + rand() * CELL_SIZE
      arr.push({
        id: craneId,
        type: 'crane',
        x: crx,
        y: cry,
        radius: 45,
        driftX: -(20 + rand() * 30), // drift left
        pulsePhase: rand() * Math.PI * 2, // wing flap initial phase
        strength: 3.5 + rand() * 2.5, // wing flap speed
      })
    }

    entitiesRef.current = [...entitiesRef.current, ...arr]
  }

  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    floatRef.current.push({ id: Date.now() + Math.random(), x, y, text, color, life: 1.2 })
  }

  const handleStart = () => {
    initAudio()
    planeRef.current = { x: 0, y: 1400, vx: 0, vy: 0, pitch: 0, roll: 0, score: 0, angle: 0, speed: 0 }
    cameraRef.current = { x: 0, y: 1400 }
    entitiesRef.current = []; particlesRef.current = []; vaporRef.current = []; shootingStarsRef.current = []
    floatRef.current = []; distRef.current = 0; timeRef.current = 0
    generatedCellsRef.current = new Set()
    collectedIdsRef.current = new Set()

    // Load initial 5x5 cells around startup location
    for (let cx = -2; cx <= 2; cx++) {
      for (let cy = -2; cy <= 2; cy++) {
        generatedCellsRef.current.add(`${cx},${cy}`)
        spawnCell(cx, cy)
      }
    }

    gameStateRef.current = 'playing'; setGameState('playing')
    if (audioOnRef.current) startAmbientPad()
  }

  useEffect(() => {
    const fxCanvas = canvasRef.current
    if (!fxCanvas) return

    const fx = fxCanvas.getContext('2d')
    if (!fx) return

    let w = 0, h = 0

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight
      fxCanvas.width = w; fxCanvas.height = h
    }
    resize()

    mouseRef.current = { sx: w * 0.5, sy: h * 0.5 }

    const onMove = (e: MouseEvent) => {
      const rect = fxCanvas.getBoundingClientRect()
      mouseRef.current = { sx: e.clientX - rect.left, sy: e.clientY - rect.top }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = fxCanvas.getBoundingClientRect()
        mouseRef.current = { sx: e.touches[0].clientX - rect.left, sy: e.touches[0].clientY - rect.top }
      }
    }
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = fxCanvas.getBoundingClientRect()
        mouseRef.current = { sx: e.touches[0].clientX - rect.left, sy: e.touches[0].clientY - rect.top }
      }
    }

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })

    let frameId = 0, lastTime = performance.now(), throttle = 0

    const loop = (now: number) => {
      frameId = requestAnimationFrame(loop)
      const dt = Math.min(0.04, (now - lastTime) / 1000); lastTime = now
      timeRef.current += dt

      if (w <= 0 || h <= 0) return

      if (gameStateRef.current !== 'playing') {
        render()
        return
      }

      update(dt)
      render()

      throttle++
      if (throttle >= 8) {
        throttle = 0
        const p = planeRef.current
        setHud({
          altitude: Math.round((2000 - p.y) / 6),
          airspeed: Math.round(p.speed * 0.15 + 10),
          bearing: Math.round(((p.angle + Math.PI / 2) * 180 / Math.PI + 360) % 360),
          score: p.score,
          distance: Math.round(distRef.current / 100),
          windGust: Math.round(12 + Math.sin(timeRef.current * 0.3) * 8),
          condition: conditions[Math.floor(timeRef.current * 0.05) % conditions.length],
        })
      }
    }

    const update = (dt: number) => {
      const plane = planeRef.current
      const cam = cameraRef.current

      // ── Steering Vector calculation (Virtual Joystick relative to screen center) ───
      const dx = mouseRef.current.sx - w / 2
      const dy = mouseRef.current.sy - h / 2
      const dist = Math.hypot(dx, dy)

      if (dist > 20) {
        const targetAngle = Math.atan2(dy, dx)
        let angleDiff = targetAngle - plane.angle
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2

        // Rotate plane towards target angle
        plane.angle += angleDiff * 4.5 * dt

        // Interpolate speed based on distance (farther = faster)
        const maxDist = Math.min(w, h) * 0.45
        const targetSpeed = 220 + Math.min(1.0, dist / maxDist) * 140
        plane.speed += (targetSpeed - plane.speed) * 3.0 * dt

        // Roll/bank visual based on turn rate
        const targetRoll = Math.max(-0.6, Math.min(0.6, angleDiff * 1.5))
        plane.roll += (targetRoll - plane.roll) * 5.0 * dt
      } else {
        // Keep flying forward at base speed in deadzone, reduce roll to 0
        plane.speed += (220 - plane.speed) * 3.0 * dt
        plane.roll += (0 - plane.roll) * 4.0 * dt
      }

      plane.vx = Math.cos(plane.angle) * plane.speed
      plane.vy = Math.sin(plane.angle) * plane.speed

      plane.x += plane.vx * dt
      plane.y += plane.vy * dt
      distRef.current += Math.hypot(plane.vx, plane.vy) * dt

      // Camera smoothly tracks the plane
      cam.x += (plane.x - cam.x) * 4.0 * dt
      cam.y += (plane.y - cam.y) * 4.0 * dt

      // ── 2D Sparse Grid Spawner ────────────────────────────────────────
      const minCx = Math.floor((cam.x - w) / CELL_SIZE)
      const maxCx = Math.ceil((cam.x + w) / CELL_SIZE)
      const minCy = Math.floor((cam.y - h) / CELL_SIZE)
      const maxCy = Math.ceil((cam.y + h) / CELL_SIZE)

      for (let cx = minCx; cx <= maxCx; cx++) {
        for (let cy = minCy; cy <= maxCy; cy++) {
          const cellKey = `${cx},${cy}`
          if (!generatedCellsRef.current.has(cellKey)) {
            generatedCellsRef.current.add(cellKey)
            spawnCell(cx, cy)
          }
        }
      }

      // Entity interactions & culling
      entitiesRef.current = entitiesRef.current.filter(e => {
        const edx = e.x - plane.x
        const edy = e.y - plane.y
        const distanceToPlane = Math.hypot(edx, edy)
        
        // Remove far entities and reset their cell generated status
        const far = distanceToPlane > 3500
        if (far) {
          const ecx = Math.floor(e.x / CELL_SIZE)
          const ecy = Math.floor(e.y / CELL_SIZE)
          generatedCellsRef.current.delete(`${ecx},${ecy}`)
          return false
        }

        if (e.type === 'cloud') {
          e.x += (e.driftX || 0) * dt * 8
        } else if (e.type === 'crane') {
          e.x += (e.driftX || -20) * dt
          // Gentle vertical sway
          e.y += Math.sin(timeRef.current * 1.5 + e.id) * 12 * dt
          // Flap wings
          if (e.pulsePhase !== undefined) {
            e.pulsePhase += (e.strength || 3) * dt
          }
        }

        // Apply breeze column lifts (pushes Y upwards / decreases Y)
        if (e.type === 'breeze') {
          if (Math.abs(plane.x - e.x) < e.radius && Math.abs(plane.y - e.y) < e.radius * 2) {
            plane.y -= (e.strength || 4) * 20 * dt
            if (Math.random() < 0.15) {
              particlesRef.current.push({
                x: plane.x + (Math.random() - 0.5) * 40,
                y: plane.y + 20,
                vx: (Math.random() - 0.5) * 10,
                vy: -80 - Math.random() * 50,
                size: 1.5 + Math.random() * 1.5,
                color: 'rgba(236,72,153,0.6)',
                alpha: 0.8,
                life: 0.8,
                decay: 1.2,
                type: 'spark'
              })
            }
          }
        }

        if (!e.collected && (e.type === 'lantern' || e.type === 'star')) {
          if (Math.hypot(plane.x - e.x, plane.y - e.y) < e.radius + 20) {
            e.collected = true
            collectedIdsRef.current.add(e.id)
            if (e.type === 'lantern') {
              plane.score++
              addFloatingText(e.x, e.y, '✦ Lantern +1', '#fde68a')
              spawnCollectBurst(e.x, e.y, '#fde68a')
              playChime()
              if (plane.score >= TARGET_LANTERNS) {
                gameStateRef.current = 'victory'
                setGameState('victory')
                stopAmbientPad()
              }
            } else {
              addFloatingText(e.x, e.y, '✧ Wish Star', '#bae6fd')
              spawnCollectBurst(e.x, e.y, '#c4b5fd')
              playChime()
            }
          }
        }
        return true
      })



      // Vapor trail
      vaporRef.current.push({ x: plane.x, y: plane.y, alpha: 0.75 })
      if (vaporRef.current.length > 65) vaporRef.current.shift()
      vaporRef.current.forEach(v => { v.alpha *= 0.985 })

      // Petals spawned randomly around viewport
      if (Math.random() < 0.08) {
        const px = cam.x - w/2 + Math.random() * w
        const py = cam.y - h/2 + Math.random() * h
        spawnPetal(px, py)
      }

      // Particles update
      particlesRef.current.forEach(p => {
        p.life -= p.decay * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.type === 'petal') {
          p.angle = (p.angle || 0) + (p.spinSpeed || 1) * dt
          p.vy += Math.sin(((p.tw || 0) + p.life * 2.5)) * 0.5
          p.vx -= 0.5 * dt
        }
      })
      particlesRef.current = particlesRef.current.filter(p => p.life > 0)
      if (particlesRef.current.length > 200) particlesRef.current.splice(0, 40)

      // Float texts update
      floatRef.current.forEach(ft => { ft.life -= dt * 0.9; ft.y -= 22 * dt })
      floatRef.current = floatRef.current.filter(ft => ft.life > 0)

      // Update shooting stars (spawns at high altitudes: Y < 500)
      if (plane.y < 500 && Math.random() < 0.012 && shootingStarsRef.current.length < 3) {
        const spawnLeft = Math.random() > 0.5
        const sxStart = spawnLeft ? -50 : w + 50
        const syStart = Math.random() * h * 0.45
        const angle = Math.PI * 0.15 + Math.random() * Math.PI * 0.12
        const speed = 700 + Math.random() * 500
        shootingStarsRef.current.push({
          id: Math.random(),
          x: cam.x - w/2 + sxStart,
          y: cam.y - h/2 + syStart,
          vx: (spawnLeft ? 1 : -1) * Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          len: 80 + Math.random() * 100,
          life: 0.6 + Math.random() * 0.5,
          color: Math.random() > 0.7 ? '#fde68a' : '#bae6fd' // gold or blue
        })
      }

      shootingStarsRef.current.forEach(star => {
        star.life -= dt
        star.x += star.vx * dt
        star.y += star.vy * dt

        if (Math.random() < 0.38) {
          particlesRef.current.push({
            x: star.x,
            y: star.y,
            vx: -star.vx * 0.08 + (Math.random() - 0.5) * 30,
            vy: -star.vy * 0.08 + (Math.random() - 0.5) * 30,
            size: 1 + Math.random() * 1.5,
            color: star.color,
            alpha: 0.8,
            life: 0.4,
            decay: 2.2,
            type: 'spark'
          })
        }
      })
      shootingStarsRef.current = shootingStarsRef.current.filter(star => star.life > 0)
    }

    const spawnPetal = (wx: number, wy: number) => {
      particlesRef.current.push({
        x: wx, y: wy,
        vx: -40 - Math.random() * 30,
        vy: -5 - Math.random() * 10,
        size: 3.5 + Math.random() * 3,
        color: `hsl(${340 + Math.random() * 20}, 90%, ${78 + Math.random() * 12}%)`,
        alpha: 0.85,
        life: 3.5, decay: 0.28,
        type: 'petal',
        angle: Math.random() * Math.PI * 2,
        spinSpeed: 0.8 + Math.random() * 1.8,
        tw: Math.random() * Math.PI,
      })
    }

    const spawnCollectBurst = (wx: number, wy: number, color: string) => {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2
        const sp = 1.5 + Math.random() * 3
        particlesRef.current.push({
          x: wx, y: wy,
          vx: Math.cos(a) * sp * 22, vy: Math.sin(a) * sp * 22,
          size: 2 + Math.random() * 2,
          color, alpha: 1.0,
          life: 0.8, decay: 1.2,
          type: 'spark',
        })
      }
    }

    const render = () => {
      const plane = planeRef.current
      const cam = cameraRef.current
      const t = timeRef.current

      // Clear Canvas
      fx.clearRect(0, 0, w, h)

      // World→screen helpers (center-relative viewport)
      const sx  = (wx: number) => wx - cam.x + w / 2
      const sy  = (wy: number) => wy - cam.y + h / 2

      // ─── 1. 2D Canvas Sky Gradient ───
      const altitudeOffset = (1400 - cam.y) * 0.00018
      const visualOffset = Math.max(-0.4, Math.min(1.4, altitudeOffset))
      const grad = fx.createLinearGradient(0, -visualOffset * h, 0, h - visualOffset * h)
      grad.addColorStop(0, '#101f42')    // Zenith: Deep indigo twilight
      grad.addColorStop(0.28, '#1d3a73') // Upper: Dusk blue
      grad.addColorStop(0.52, '#3b6bb0') // Mid: Soft cobalt
      grad.addColorStop(0.74, '#75a3e3') // Low: Sky blue
      grad.addColorStop(0.92, '#b5cff5') // Horizon: Misty pastel blue
      grad.addColorStop(1.0, '#fbc2eb')  // Base: Dreamy cotton-candy pink
      fx.fillStyle = grad
      fx.fillRect(0, 0, w, h)

      // ─── 3. Parallax Starfield ───
      const starBaseOpacity = Math.max(0, Math.min(1, (1400 - cam.y) * 0.00025 + 0.35))
      starsRef.current.forEach(star => {
        let sxStar = (star.x * w - cam.x * star.speed) % w
        let syStar = (star.y * h - cam.y * star.speed) % h
        if (sxStar < 0) sxStar += w
        if (syStar < 0) syStar += h

        const yFade = Math.max(0, Math.min(1, (h - syStar) / (h * 0.5)))
        const twinkle = 0.4 + 0.6 * Math.sin(t * 3.5 + star.twinklePhase)
        const alpha = starBaseOpacity * yFade * twinkle

        if (alpha > 0.05) {
          fx.fillStyle = `rgba(224, 242, 254, ${alpha})`
          fx.beginPath()
          fx.arc(sxStar, syStar, star.size, 0, Math.PI * 2)
          fx.fill()
        }
      })

      // ─── 3.5 Parallax Background Clouds ───
      const cloudOpacity = Math.max(0.1, Math.min(0.8, 1 - altitudeOffset * 0.5)) // fade out as we reach space
      bgCloudsRef.current.forEach(cloud => {
        let sxCloud = (cloud.x * w - cam.x * cloud.speed) % (w + cloud.size * 2) - cloud.size
        let syCloud = (cloud.y * h - cam.y * cloud.speed) % (h + cloud.size * 2) - cloud.size
        if (sxCloud < -cloud.size) sxCloud += w + cloud.size * 2
        if (syCloud < -cloud.size) syCloud += h + cloud.size * 2

        const cg = fx.createRadialGradient(sxCloud, syCloud - cloud.size * 0.1, 0, sxCloud, syCloud, cloud.size)
        // Background clouds are soft, fluffy, dreamy white/lavender gradients with higher visibility
        cg.addColorStop(0, `rgba(255, 255, 255, ${0.35 * cloudOpacity})`)
        cg.addColorStop(0.4, `rgba(255, 240, 245, ${0.22 * cloudOpacity})`)
        cg.addColorStop(0.8, `rgba(235, 215, 245, ${0.08 * cloudOpacity})`)
        cg.addColorStop(1, 'rgba(0,0,0,0)')
        fx.fillStyle = cg
        fx.beginPath()
        fx.arc(sxCloud, syCloud, cloud.size, 0, Math.PI * 2)
        fx.fill()
      })

      // ─── 4. Shooting Stars ───
      shootingStarsRef.current.forEach(star => {
        const sStarX = sx(star.x)
        const sStarY = sy(star.y)
        const angle = Math.atan2(star.vy, star.vx)
        const opacity = Math.max(0, Math.min(1, star.life * 2))

        fx.save()
        fx.globalAlpha = opacity
        
        const gradStar = fx.createLinearGradient(
          sStarX, sStarY,
          sStarX - Math.cos(angle) * star.len, sStarY - Math.sin(angle) * star.len
        )
        gradStar.addColorStop(0, star.color)
        gradStar.addColorStop(0.3, star.color + '88')
        gradStar.addColorStop(1, 'rgba(0,0,0,0)')
        
        fx.strokeStyle = gradStar
        fx.lineWidth = 1.8
        fx.lineCap = 'round'
        fx.beginPath()
        fx.moveTo(sStarX, sStarY)
        fx.lineTo(sStarX - Math.cos(angle) * star.len, sStarY - Math.sin(angle) * star.len)
        fx.stroke()

        fx.shadowColor = star.color
        fx.shadowBlur = 8
        fx.fillStyle = '#ffffff'
        fx.beginPath()
        fx.arc(sStarX, sStarY, 1.5, 0, Math.PI * 2)
        fx.fill()

        fx.restore()
      })

      // ─── 5. Entities (Prettier Oriental Sky Lanterns, breezes, clouds, stars) ───
      entitiesRef.current.forEach(entity => {
        const esx = sx(entity.x)
        const esy = sy(entity.y)
        if (esx < -entity.radius * 3 || esx > w + entity.radius * 3 || esy < -entity.radius * 3 || esy > h + entity.radius * 3) return

        fx.save()
        if (entity.type === 'breeze') {
          // Updraft breeze column
          const colG = fx.createLinearGradient(esx - entity.radius, 0, esx + entity.radius, 0)
          colG.addColorStop(0, 'rgba(236,72,153,0.0)')
          colG.addColorStop(0.5, 'rgba(236,72,153,0.025)')
          colG.addColorStop(1, 'rgba(236,72,153,0.0)')
          fx.fillStyle = colG; fx.fillRect(esx - entity.radius, 0, entity.radius * 2, h)

          fx.strokeStyle = 'rgba(236,72,153,0.07)'; fx.lineWidth = 0.8
          for (let row = 0; row < 6; row++) {
            const yOff = (t * 45 + row * 240) % h
            fx.beginPath()
            fx.ellipse(esx + Math.sin(t * 0.8 + row) * 12, h - yOff, entity.radius * 0.55, 9, 0, 0, Math.PI * 2)
            fx.stroke()
          }
        } else if (entity.type === 'cloud') {
          const r = entity.radius
          const cg = fx.createRadialGradient(esx, esy - r * 0.2, 0, esx, esy, r)
          cg.addColorStop(0, 'rgba(240,180,210,0.09)')
          cg.addColorStop(0.45, 'rgba(120,70,95,0.05)')
          cg.addColorStop(1, 'rgba(0,0,0,0)')
          fx.fillStyle = cg
          fx.beginPath(); fx.arc(esx, esy, r * 0.75, 0, Math.PI * 2); fx.fill()
          fx.beginPath(); fx.arc(esx - r * 0.45, esy + r * 0.15, r * 0.45, 0, Math.PI * 2); fx.fill()
          fx.beginPath(); fx.arc(esx + r * 0.45, esy + r * 0.18, r * 0.42, 0, Math.PI * 2); fx.fill()
        } else if (entity.type === 'crane') {
          const flap = Math.sin(entity.pulsePhase || 0)
          const sz = 24
          fx.translate(esx, esy)
          
          const faceDir = (entity.driftX || -1) < 0 ? -1 : 1
          fx.scale(faceDir, 1)

          // Body
          fx.fillStyle = 'rgba(255, 235, 235, 0.9)'
          fx.beginPath()
          fx.moveTo(0, -sz * 0.3)
          fx.lineTo(-sz * 0.8, -sz * 0.5)
          fx.lineTo(-sz * 0.2, sz * 0.1)
          fx.closePath()
          fx.fill()

          // Head / Neck
          fx.fillStyle = 'rgba(255, 200, 200, 0.95)'
          fx.beginPath()
          fx.moveTo(0, -sz * 0.3)
          fx.lineTo(sz * 0.6, -sz * 0.4)
          fx.lineTo(sz * 0.8, -sz * 0.2)
          fx.lineTo(sz * 0.5, -sz * 0.1)
          fx.closePath()
          fx.fill()

          // Near Wing
          fx.fillStyle = 'rgba(255, 255, 255, 0.95)'
          fx.strokeStyle = 'rgba(244, 143, 177, 0.6)'
          fx.lineWidth = 1
          fx.beginPath()
          fx.moveTo(0, -sz * 0.3)
          fx.lineTo(-sz * 0.3, -sz * 0.3 - sz * 0.95 * flap)
          fx.lineTo(-sz * 0.65, -sz * 0.05)
          fx.closePath()
          fx.fill()
          fx.stroke()

          // Far Wing
          fx.fillStyle = 'rgba(244, 210, 220, 0.85)'
          fx.beginPath()
          fx.moveTo(0, -sz * 0.3)
          const farFlap = Math.sin((entity.pulsePhase || 0) + 0.3)
          fx.lineTo(-sz * 0.25, -sz * 0.45 - sz * 0.8 * farFlap)
          fx.lineTo(-sz * 0.55, -sz * 0.1)
          fx.closePath()
          fx.fill()
          fx.stroke()

          // Fold Lines
          fx.strokeStyle = 'rgba(0, 0, 0, 0.08)'
          fx.beginPath()
          fx.moveTo(0, -sz * 0.3)
          fx.lineTo(-sz * 0.2, sz * 0.1)
          fx.stroke()
        } else if (!entity.collected && entity.type === 'lantern') {
          const pulse = 1.0 + Math.sin((entity.pulsePhase || 0) + t * 2.5) * 0.08
          const sz = entity.radius * pulse

          fx.translate(esx, esy)
          
          // Draw outer glow (larger, warmer, and softer)
          const glow = fx.createRadialGradient(0, -sz * 0.1, 0, 0, -sz * 0.1, sz * 3.0)
          glow.addColorStop(0, 'rgba(254,215,170,0.60)')
          glow.addColorStop(0.3, 'rgba(251,146,60,0.22)')
          glow.addColorStop(0.6, 'rgba(236,72,153,0.08)')
          glow.addColorStop(1, 'rgba(0,0,0,0)')
          fx.fillStyle = glow
          fx.beginPath()
          fx.arc(0, -sz * 0.1, sz * 3.0, 0, Math.PI * 2)
          fx.fill()

          // Draw the dome/trapezoid lantern shape
          fx.beginPath()
          fx.moveTo(-sz * 0.45, sz * 0.6)  // Bottom-left
          fx.bezierCurveTo(-sz * 0.5, -sz * 0.3, -sz * 0.6, -sz * 0.8, 0, -sz * 0.85) // Left wall to Top-center
          fx.bezierCurveTo(sz * 0.6, -sz * 0.8, sz * 0.5, -sz * 0.3, sz * 0.45, sz * 0.6)   // Top-center to Right wall
          fx.quadraticCurveTo(0, sz * 0.7, -sz * 0.45, sz * 0.6) // Bottom curved edge
          fx.closePath()

          const bodyG = fx.createLinearGradient(0, -sz * 0.85, 0, sz * 0.6)
          bodyG.addColorStop(0, '#fffbeb') // luminous warm top
          bodyG.addColorStop(0.4, '#fde68a') // amber middle
          bodyG.addColorStop(0.7, '#f97316') // orange base
          bodyG.addColorStop(1, '#7c2d12') // deep rust bottom rim
          fx.fillStyle = bodyG
          fx.fill()

          // Outline with glowing stroke
          fx.strokeStyle = 'rgba(251,191,36,0.85)'
          fx.lineWidth = 1.6
          fx.stroke()

          // Inner Flame / Core (flickers rapidly)
          const flameY = sz * 0.2 + Math.sin(t * 15) * 1.5
          const flameSz = sz * 0.22 + Math.sin(t * 12) * 0.03
          const flameG = fx.createRadialGradient(0, flameY, 0, 0, flameY, flameSz * 2.5)
          flameG.addColorStop(0, '#ffffff')
          flameG.addColorStop(0.4, '#fef08a') // bright yellow
          flameG.addColorStop(0.8, '#f97316') // orange
          flameG.addColorStop(1, 'rgba(249,115,22,0)')
          fx.fillStyle = flameG
          fx.beginPath()
          fx.arc(0, flameY, flameSz * 2.5, 0, Math.PI * 2)
          fx.fill()

          // Bottom wooden frame bar
          fx.fillStyle = '#451a03'
          fx.fillRect(-sz * 0.48, sz * 0.58, sz * 0.96, sz * 0.08)

          // Two delicate hanging tassels swaying slightly
          fx.strokeStyle = 'rgba(239,68,68,0.7)'
          fx.lineWidth = 1.0
          
          // Left tassel
          fx.beginPath()
          fx.moveTo(-sz * 0.3, sz * 0.66)
          const swayLeft = Math.sin(t * 2.5 + (entity.pulsePhase || 0)) * 4
          fx.quadraticCurveTo(-sz * 0.3 + swayLeft * 0.5, sz * 0.9, -sz * 0.3 + swayLeft, sz * 1.3)
          fx.stroke()
          // Left tassel bead
          fx.fillStyle = '#fbbf24'
          fx.beginPath(); fx.arc(-sz * 0.3 + swayLeft, sz * 1.3, 1.8, 0, Math.PI * 2); fx.fill()

          // Right tassel
          fx.beginPath()
          fx.moveTo(sz * 0.3, sz * 0.66)
          const swayRight = Math.sin(t * 2.5 + (entity.pulsePhase || 0) + 1.5) * 4
          fx.quadraticCurveTo(sz * 0.3 + swayRight * 0.5, sz * 0.9, sz * 0.3 + swayRight, sz * 1.3)
          fx.stroke()
          // Right tassel bead
          fx.fillStyle = '#fbbf24'
          fx.beginPath(); fx.arc(sz * 0.3 + swayRight, sz * 1.3, 1.8, 0, Math.PI * 2); fx.fill()

        } else if (!entity.collected && entity.type === 'star') {
          const pulse = 1 + Math.sin(t * 3) * 0.2
          const r = 8 * pulse
          fx.fillStyle = 'rgba(186,230,253,0.9)'; fx.shadowColor = '#38bdf8'; fx.shadowBlur = 10
          fx.beginPath()
          for (let pt = 0; pt < 5; pt++) {
            const a = (pt / 5) * Math.PI * 2 - Math.PI / 2
            const b = a + Math.PI / 5
            fx.lineTo(esx + Math.cos(a) * r, esy + Math.sin(a) * r)
            fx.lineTo(esx + Math.cos(b) * r * 0.42, esy + Math.sin(b) * r * 0.42)
          }
          fx.closePath(); fx.fill(); fx.shadowBlur = 0
        }
        fx.restore()
      })

      // Vapor trail drawing
      if (vaporRef.current.length > 3) {
        fx.beginPath()
        fx.moveTo(sx(vaporRef.current[0].x), sy(vaporRef.current[0].y))
        for (let i = 1; i < vaporRef.current.length; i++) {
          const pt = vaporRef.current[i]
          fx.lineTo(sx(pt.x), sy(pt.y))
        }
        fx.strokeStyle = 'rgba(244,143,177,0.25)'
        fx.lineWidth = 2.2; fx.lineCap = 'round'; fx.stroke()
      }

      // Origami plane drawing
      const gsx = sx(plane.x)
      const gsy = sy(plane.y)

      fx.save()
      fx.translate(gsx, gsy)
      fx.rotate(plane.angle)

      // Banking shadow
      fx.save(); fx.rotate(plane.roll); fx.globalAlpha = 0.15
      fx.fillStyle = '#f472b6'
      fx.beginPath(); fx.moveTo(22, 0); fx.lineTo(-22, 4); fx.lineTo(-18, 14); fx.closePath(); fx.fill()
      fx.restore()

      // Right wing (top, bright)
      fx.fillStyle = 'rgba(255,245,250,0.98)'
      fx.beginPath(); fx.moveTo(22, 0); fx.lineTo(-22, 3); fx.lineTo(-14, -15); fx.closePath(); fx.fill()

      // Left wing (slightly darker pink)
      fx.fillStyle = 'rgba(244,220,230,0.92)'
      fx.beginPath(); fx.moveTo(22, 0); fx.lineTo(-22, 3); fx.lineTo(-16, 14); fx.closePath(); fx.fill()

      // Center fold keel
      fx.fillStyle = 'rgba(236,72,153,0.45)'
      fx.beginPath(); fx.moveTo(22, 0); fx.lineTo(-22, 3); fx.lineTo(-19, -2); fx.closePath(); fx.fill()

      // Highlight edge glow
      fx.strokeStyle = 'rgba(236,72,153,0.6)'; fx.lineWidth = 0.9
      fx.beginPath(); fx.moveTo(22, 0); fx.lineTo(-22, 3); fx.stroke()

      fx.restore()

      // Particles drawing
      particlesRef.current.forEach(p => {
        const psx = sx(p.x)
        const psy = sy(p.y)
        fx.save(); fx.globalAlpha = p.alpha * p.life
        if (p.type === 'petal') {
          fx.translate(psx, psy); fx.rotate(p.angle || 0)
          fx.beginPath(); fx.moveTo(-p.size, 0); fx.quadraticCurveTo(0, -p.size * 0.4, p.size, 0)
          fx.quadraticCurveTo(0, p.size * 0.4, -p.size, 0); fx.closePath()
          fx.fillStyle = p.color; fx.fill()
        } else {
          fx.fillStyle = p.color; fx.beginPath(); fx.arc(psx, psy, p.size, 0, Math.PI * 2); fx.fill()
        }
        fx.restore()
      })

      // Float texts drawing
      floatRef.current.forEach(ft => {
        fx.save(); fx.font = '500 11px system-ui'; fx.fillStyle = ft.color
        fx.globalAlpha = Math.max(0, ft.life); fx.fillText(ft.text, sx(ft.x), sy(ft.y)); fx.restore()
      })

      // ── Nearest Lantern Indicator Arrow ──
      let nearestLantern: Entity | null = null
      let minDistance = Infinity
      for (const e of entitiesRef.current) {
        if (e.type === 'lantern' && !e.collected) {
          const d = Math.hypot(e.x - plane.x, e.y - plane.y)
          if (d < minDistance) {
            minDistance = d
            nearestLantern = e
          }
        }
      }

      if (nearestLantern) {
        const lesx = sx(nearestLantern.x)
        const lesy = sy(nearestLantern.y)
        const margin = 45
        const isOffScreen = lesx < margin || lesx > w - margin || lesy < margin || lesy > h - margin

        if (isOffScreen) {
          const dx = nearestLantern.x - plane.x
          const dy = nearestLantern.y - plane.y
          const angle = Math.atan2(dy, dx)
          
          let px = w / 2
          let py = h / 2
          
          const slope = dy / (dx || 0.0001)
          if (Math.abs(dx) * (h / 2 - margin) > Math.abs(dy) * (w / 2 - margin)) {
            px = dx > 0 ? w - margin : margin
            py = h / 2 + (px - w / 2) * slope
          } else {
            py = dy > 0 ? h - margin : margin
            px = w / 2 + (py - h / 2) / slope
          }

          fx.save()
          fx.translate(px, py)
          fx.rotate(angle)
          
          const pulse = 1.0 + Math.sin(t * 5) * 0.12
          fx.scale(pulse, pulse)
          
          fx.shadowColor = '#f472b6'
          fx.shadowBlur = 8
          fx.fillStyle = 'rgba(244,114,182,0.9)'
          fx.beginPath()
          fx.moveTo(8, 0)
          fx.lineTo(-6, -6)
          fx.lineTo(-3, 0)
          fx.lineTo(-6, 6)
          fx.closePath()
          fx.fill()
          
          fx.fillStyle = '#fde68a'
          fx.shadowColor = '#fbbf24'
          fx.shadowBlur = 6
          fx.beginPath()
          fx.arc(14, 0, 2.5, 0, Math.PI * 2)
          fx.fill()
          
          fx.restore()
        }
      }
    }

    frameId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchstart', onTouchStart)
      stopAmbientPad()
    }
  }, [handleStart])

  const progress = Math.min(100, (hud.score / TARGET_LANTERNS) * 100)
  const altPct   = Math.min(100, (hud.altitude / 300) * 100)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black select-none touch-none">
      {/* Interactive game 2D canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 h-full w-full pointer-events-none" />

      {/* ── Fixed Back Button ── */}
      <a
        href="/"
        data-astro-reload=""
        className="pointer-events-auto fixed right-6 top-6 z-40 border-2 border-pink-400/80 bg-black/85 px-4 py-2 font-mono text-xs text-white shadow-lg shadow-black/50 backdrop-blur-sm transition-all hover:bg-pink-500/30 sm:px-5 sm:py-2.5 sm:text-sm"
      >
        ← back
      </a>

      {/* ── Title Strip (Top-Left) ── */}
      <div className="pointer-events-none absolute inset-x-6 top-6 z-10 flex flex-col sm:inset-x-8 sm:top-8">
        <div className="max-w-[min(100%,38rem)] border-b-2 border-pink-500/60 pb-3 pr-32">
          <h1 className="text-2xl font-bold tracking-wider text-white drop-shadow-lg sm:text-3xl font-mono">
            DRIFTING IN THE CLOUDS
          </h1>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-pink-300 sm:text-[10px]">
            {gameState === 'playing' ? 'ACTIVE FLIGHT MODE — MOVE CURSOR TO FLY 360°' : 'FLIGHT STANDBY'}
          </p>
        </div>
      </div>

      {/* ── Left Progress Meter (vertical) ── */}
      {gameState === 'playing' && (
        <div className="pointer-events-none absolute left-6 top-1/2 z-30 hidden -translate-y-1/2 sm:block">
          <div className="h-64 w-1.5 overflow-hidden rounded-full border border-pink-900/40 bg-black/50">
            <div
              className="w-full bg-gradient-to-t from-pink-950 via-pink-400 to-white transition-all duration-300"
              style={{ height: `${progress}%`, marginTop: `${100 - progress}%` }}
            />
          </div>
          <p className="mt-2 text-center font-mono text-[9px] text-pink-400/60">0</p>
          <p className="mt-[200px] text-center font-mono text-[9px] text-pink-400/60">{TARGET_LANTERNS}</p>
        </div>
      )}

      {/* ── Right HUD Panels ── */}
      {gameState === 'playing' && (
        <div className="pointer-events-none absolute right-6 top-[5.25rem] z-30 space-y-1 font-mono text-xs">
          {/* Top Panel: Score */}
          <div className="min-w-[190px] border border-pink-700/50 bg-black/85 px-4 py-3 shadow-lg shadow-black/50 backdrop-blur-sm">
            <p className="text-2xl font-bold tabular-nums text-white drop-shadow-md">
              {hud.score}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-pink-200">Lanterns Gathered</p>
            <p className="mt-0.5 text-[10px] text-pink-400/80">Endless Flight Mode</p>
          </div>

          {/* Bottom Panel: Progress & Telemetry */}
          <div className="space-y-1.5 border border-pink-900/50 bg-black/80 px-3 py-2.5 text-[10px] text-pink-300/90 shadow-lg shadow-black/40">
            <div>
              <div className="flex justify-between mb-0.5">
                <span>▸ Progress</span>
                <span className="text-pink-400 font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-black/50 h-1 border border-pink-950 rounded-sm overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-pink-800 via-pink-500 to-white transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <p className="pt-0.5">▸ Altitude <span className="float-right text-pink-300">{hud.altitude} km</span></p>
            <p>▸ Airspeed <span className="float-right text-pink-300">{hud.airspeed} kn</span></p>
            <p>▸ Bearing <span className="float-right text-pink-300">{hud.bearing}°</span></p>
            <p>▸ Distance <span className="float-right text-pink-300">{hud.distance} km</span></p>
            <p>▸ Wind <span className="float-right text-pink-300">{hud.windGust} kn</span></p>
            <p>▸ Status <span className="float-right text-amber-400">{hud.condition}</span></p>
          </div>
        </div>
      )}

      {/* ── Right vertical altitude gauge ── */}
      {gameState === 'playing' && (
        <div className="pointer-events-none absolute right-6 top-1/2 z-30 hidden -translate-y-1/2 sm:block h-64 w-1 border-r border-pink-950/50">
          <div 
            className="absolute w-2.5 h-2.5 -left-[3px] bg-pink-400 border border-pink-100 rounded-full transition-all duration-300"
            style={{ top: `${100 - altPct}%` }}
          />
        </div>
      )}

      {/* ── Audio toggle ── */}
      {gameState === 'playing' && (
        <button
          onClick={toggleAudio}
          className="pointer-events-auto absolute bottom-6 right-6 z-20
                     rounded-full border border-pink-500/20 bg-black/50 p-2.5
                     text-pink-300/70 hover:text-white hover:bg-pink-500/20
                     transition-all backdrop-blur-sm cursor-pointer"
          title={audioOn ? 'Mute' : 'Play ambient sound'}
        >
          {audioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      )}

      {/* ── Start overlay ── */}
      {gameState === 'start' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="max-w-md w-full border border-pink-500/40 bg-black/92 p-8 text-center shadow-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-pink-300/60 mb-3">
              Atmospheric Drift Module
            </p>
            <h2 className="text-3xl font-bold tracking-widest text-white mb-2 font-mono">
              CLOUD DRIFT
            </h2>
            <p className="text-[10px] font-mono text-pink-200/50 mb-6 tracking-widest">
              DRIFTING IN THE CLOUDS
            </p>
            <div className="text-left space-y-1.5 border border-pink-900/40 bg-black/50 px-4 py-3 mb-6">
              <p className="font-mono text-[10px] text-pink-200/70 leading-relaxed">
                <span className="text-pink-400">▸</span> Move cursor anywhere — the plane flies 360° in that direction<br />
                <span className="text-pink-400">▸</span> Collect gorgeous sky lanterns 🏮 scattered throughout the infinite skies<br />
                <span className="text-pink-400">▸</span> Pink wish stars grant bonus points ✧
              </p>
            </div>
            <button
              onClick={handleStart}
              className="pointer-events-auto w-full border border-pink-500/80 hover:bg-pink-500/20 text-white font-mono text-xs px-6 py-3 transition-all tracking-widest cursor-pointer"
            >
              TAKE FLIGHT
            </button>
          </div>
        </div>
      )}

      {/* ── Victory overlay ── */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="max-w-md w-full border border-pink-400/35 bg-black/95 p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold tracking-widest text-pink-400 font-mono mb-2">
              DRIFT COMPLETE
            </h2>
            <p className="text-[10px] font-mono text-pink-200/60 tracking-widest mb-4">
              All {TARGET_LANTERNS} lanterns gathered · {hud.distance} km flown
            </p>
            <p className="font-mono text-[11px] text-white/75 leading-relaxed mb-6 border-y border-pink-900/40 py-4 px-2">
              Redirecting to home page in <span className="text-pink-400 font-bold">{redirectCountdown}s</span>...
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  gameStateRef.current = 'playing'
                  setGameState('playing')
                  if (audioOnRef.current) startAmbientPad()
                }}
                className="pointer-events-auto flex-1 border border-pink-700/50 bg-black/50 hover:bg-pink-950/40 text-pink-200 font-mono text-[10px] px-4 py-2.5 transition-all tracking-widest cursor-pointer flex items-center justify-center"
              >
                KEEP DRIFTING
              </button>
              <a
                href="/"
                data-astro-reload=""
                className="pointer-events-auto flex-1 border border-pink-500/80 bg-pink-500/10 hover:bg-pink-500/20 text-white font-mono text-[10px] px-4 py-2.5 transition-all tracking-widest cursor-pointer flex items-center justify-center"
              >
                RETURN HOME
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 35%, rgba(8,2,0,0.55) 100%)',
        }}
      />
    </div>
  )
}
