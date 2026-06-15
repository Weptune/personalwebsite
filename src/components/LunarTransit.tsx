import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

// Game constants
const MAX_DISTANCE = 180000 // Recalibrated distance for slower coordinate scale
const BASE_SPEED = 12000 // km/h base speed
const TARGET_BEACONS = 8 // Data beacons to collect
const DISTANCE_SCALE = 100
const BASE_FORWARD_WORLD_SPEED = 1.6 // Slower scroll rate to allow processing of obstacles
const MAX_SHIP_SPEED = 10 // max ship velocity magnitude (world units per second)

const MOON_WORLD_Y = 150 // Rebalanced world Y height for slower velocity scaling (duration stays ~45s)

interface SpaceDebris {
  id: number
  kind: 'asteroid' | 'meteor' | 'satellite' | 'ice' | 'mine' | 'sentry'
  x: number // world space X
  y: number // world space Y
  vx: number
  vy: number
  size: number
  points: { x: number; y: number }[]
  rot: number
  rotSpeed: number
  damage: number
  color: string
  detonated?: boolean
  detonatedTimer?: number
  laserCharge?: number // Sentry laser charge timer
  laserTargetX?: number
  laserTargetY?: number
  mineBlinkTimer?: number // Mine flashing timer
}

interface SpaceCollectible {
  id: number
  type: 'fuel' | 'shield' | 'beacon' | 'slingshot'
  x: number
  y: number
  size: number
  pulse: number
  collected?: boolean
}

interface Particle {
  x: number; y: number
  vx: number; vy: number
  size: number; color: string
  alpha: number; life: number; decay: number
  type: 'smoke' | 'spark' | 'debris'
}

export default function LunarTransit() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameStateRef = useRef<'start' | 'launch' | 'playing' | 'landing' | 'gameover' | 'victory'>('start')
  
  // Spaceship state
  const shipRef = useRef({
    x: 0,
    y: 0, // world space y (progress from 0 to MAX_DISTANCE)
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2, // starts pointing up
    speed: BASE_SPEED,
    shield: 100,
    fuel: 100,
    beacons: 0,
    activeThrust: false
  })

  const mouseRef = useRef({ sx: 0, sy: 0 })
  const cameraRef = useRef({ x: 0, y: 0 })
  const entitiesRef = useRef<{ debris: SpaceDebris[]; collectibles: SpaceCollectible[] }>({ debris: [], collectibles: [] })
  const particlesRef = useRef<Particle[]>([])
  const timeRef = useRef(0)
  const shakeIntensityRef = useRef(0)
  const shakeTimeRef = useRef(0)
  const lastSpawnRef = useRef(0)
  const warpFactorRef = useRef(1.0) // multiplier when hitting slingshots
  
  // EMP deflector blast state
  const empActiveRef = useRef(false)
  const empRadiusRef = useRef(0)
  const lastEmpTimeRef = useRef(0)
  const launchTimerRef = useRef(0)
  const landingTimerRef = useRef(0)

  const [gameState, setGameState] = useState<'start' | 'launch' | 'playing' | 'landing' | 'gameover' | 'victory'>('start')
  const [hud, setHud] = useState({
    distance: MAX_DISTANCE,
    speed: BASE_SPEED,
    shield: 100,
    fuel: 100,
    beacons: 0,
    warning: '',
    empReady: true
  })
  
  const [audioOn, setAudioOn] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(6)
  const [objectivesOpen, setObjectivesOpen] = useState(false)
  const [telemetryOpen, setTelemetryOpen] = useState(false)

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

  // Audio nodes
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioOnRef = useRef(false)
  const synthGainRef = useRef<GainNode | null>(null)
  const synthOscRef = useRef<OscillatorNode | null>(null)

  const initAudio = () => {
    if (audioCtxRef.current) return
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (AC) audioCtxRef.current = new AC()
  }

  const toggleAudio = () => {
    if (!audioOnRef.current) {
      initAudio(); audioOnRef.current = true; setAudioOn(true); startAmbientDrone()
    } else {
      audioOnRef.current = false; setAudioOn(false); stopAmbientDrone()
    }
  }

  const startAmbientDrone = () => {
    if (!audioCtxRef.current || !audioOnRef.current || synthGainRef.current) return
    const ctx = audioCtxRef.current, now = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.04, now + 2.0)
    gain.connect(ctx.destination)
    synthGainRef.current = gain

    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(55, now) // low A note

    // Add lowpass filter to make it a deep rumble
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(120, now)

    // LFO for filter sweep
    const lfo = ctx.createOscillator()
    lfo.frequency.setValueAtTime(0.08, now)
    const lfoGain = ctx.createGain()
    lfoGain.gain.setValueAtTime(40, now)
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)

    osc.connect(filter)
    filter.connect(gain)
    osc.start(now)
    lfo.start(now)
    synthOscRef.current = osc
  }

  const stopAmbientDrone = () => {
    if (!synthGainRef.current || !audioCtxRef.current) return
    const now = audioCtxRef.current.currentTime, g = synthGainRef.current
    g.gain.cancelScheduledValues(now)
    g.gain.linearRampToValueAtTime(0, now + 0.8)
    const osc = synthOscRef.current
    synthOscRef.current = null
    synthGainRef.current = null
    setTimeout(() => { try { osc?.stop() } catch {} }, 1000)
  }

  const playSynthPulse = (freq: number, dur = 0.5) => {
    if (!audioCtxRef.current || !audioOnRef.current) return
    const ctx = audioCtxRef.current, now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + dur + 0.1)
  }

  const triggerDeflectorEMP = () => {
    if (gameStateRef.current !== 'playing') return
    const ship = shipRef.current
    if (ship.shield <= 12) return // EMP offline if shield is too low
    const nowMs = performance.now()
    if (nowMs - lastEmpTimeRef.current > 3000) {
      lastEmpTimeRef.current = nowMs
      ship.shield -= 12 // Deduct shield cost for EMP
      empActiveRef.current = true
      empRadiusRef.current = 0
      playSynthPulse(180, 0.8)
      triggerShake(4, 0.2)
    }
  }

  const triggerShake = (intensity: number, duration: number) => {
    shakeIntensityRef.current = intensity
    shakeTimeRef.current = duration
  }

  const generateDebrisPoints = (size: number) => {
    const pts = []
    const sides = 5 + Math.floor(Math.random() * 5)
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2
      const r = size * (0.75 + Math.random() * 0.45)
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
    }
    return pts
  }

  const spawnCollectBurst = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2
      const sp = 2 + Math.random() * 4
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * sp * 18,
        vy: Math.sin(angle) * sp * 18,
        size: 1.5 + Math.random() * 2,
        color, alpha: 1.0,
        life: 0.6, decay: 1.6,
        type: 'spark'
      })
    }
  }

  const handleStart = () => {
    initAudio()
    shipRef.current = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      speed: BASE_SPEED,
      shield: 100,
      fuel: 100,
      beacons: 0,
      activeThrust: false
    }
    cameraRef.current = { x: 0, y: 0 }
    entitiesRef.current = { debris: [], collectibles: [] }
    particlesRef.current = []
    timeRef.current = 0
    warpFactorRef.current = 1.0
    lastSpawnRef.current = 0
    empActiveRef.current = false

    gameStateRef.current = 'launch'
    setGameState('launch')
    launchTimerRef.current = 4.0
    if (audioOnRef.current) startAmbientDrone()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0, h = 0
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight
      canvas.width = w; canvas.height = h
    }
    resize()

    mouseRef.current = { sx: w * 0.5, sy: h * 0.4 }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { sx: e.clientX - rect.left, sy: e.clientY - rect.top }
    }
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect()
        mouseRef.current = { sx: e.touches[0].clientX - rect.left, sy: e.touches[0].clientY - rect.top }
      }
    }

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchstart', onTouch, { passive: true })

    // Starfield backdrop
    const localStars: { x: number; y: number; speed: number; size: number; alpha: number }[] = []
    for (let i = 0; i < 200; i++) {
      localStars.push({
        x: Math.random(),
        y: Math.random(),
        speed: 0.15 + Math.random() * 0.55,
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.2 + Math.random() * 0.7
      })
    }

    let frameId = 0, lastFrameTime = performance.now(), hudThrottle = 0

    const loop = (now: number) => {
      frameId = requestAnimationFrame(loop)
      const dt = Math.min(0.04, (now - lastFrameTime) / 1000)
      lastFrameTime = now

      if (w <= 0 || h <= 0) return

      if (gameStateRef.current === 'launch') {
        updateLaunch(dt)
      } else if (gameStateRef.current === 'playing') {
        update(dt)
      } else if (gameStateRef.current === 'landing') {
        updateLanding(dt)
      }
      render()

      hudThrottle++
      if (hudThrottle >= 8) {
        hudThrottle = 0
        const ship = shipRef.current
        const nowMs = performance.now()
        let warning = ''
        const progress = Math.min(1, Math.max(0, ship.y / MOON_WORLD_Y))
        if (progress > 0.62 && ship.shield < 55) warning = 'METEOR SHOWER CORRIDOR'
        else if (ship.fuel < 25) warning = 'CRITICAL FUEL LEVEL'
        else if (ship.shield < 30) warning = 'SHIELD INTEGRITY LOW'
        else if (warpFactorRef.current > 1.2) warning = 'WARP VELOCITY BURST'

        setHud({
          distance: Math.max(0, Math.round(MAX_DISTANCE * (1 - progress))),
          speed: Math.round((BASE_SPEED + Math.max(0, -ship.vy * 800)) * warpFactorRef.current),
          shield: Math.round(ship.shield),
          fuel: Math.round(ship.fuel),
          beacons: ship.beacons,
          warning,
          empReady: nowMs - lastEmpTimeRef.current > 3000
        })
      }
    }

    const updateLaunch = (dt: number) => {
      const ship = shipRef.current
      timeRef.current += dt
      launchTimerRef.current -= dt

      // Engine ignition particle blast!
      if (Math.random() < 0.8) {
        const tailAngle = Math.PI/2 + (Math.random() - 0.5) * 0.5 // pointing downwards
        const trailX = ship.x + (Math.random() - 0.5) * 10
        const trailY = ship.y - 0.1 // world Y
        particlesRef.current.push({
          x: trailX,
          y: trailY,
          vx: Math.cos(tailAngle) * (150 + Math.random() * 150),
          vy: Math.sin(tailAngle) * (4 + Math.random() * 5),
          size: 4 + Math.random() * 6,
          color: Math.random() > 0.4 ? '#f97316' : '#ef4444',
          alpha: 0.95,
          life: 0.8, decay: 1.2,
          type: 'smoke'
        })
      }
      
      // Screen rumble
      triggerShake(6, 0.1)

      // Move ship up slightly at the very end of launch
      if (launchTimerRef.current < 1.0) {
        ship.y += (1 - launchTimerRef.current) * 8 * dt
      }

      // Update particles
      particlesRef.current.forEach(p => {
        p.life -= p.decay * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
      })
      particlesRef.current = particlesRef.current.filter(p => p.life > 0)

      if (launchTimerRef.current <= 0) {
        gameStateRef.current = 'playing'
        setGameState('playing')
        warpFactorRef.current = 1.6 // initial speed boost!
      }
    }

    const updateLanding = (dt: number) => {
      const ship = shipRef.current
      timeRef.current += dt
      landingTimerRef.current -= dt

      const canvas = canvasRef.current
      const canvasW = canvas ? canvas.width : window.innerWidth
      const moonWorldY = MOON_WORLD_Y
      const targetY = moonWorldY - (canvasW * 0.15) / DISTANCE_SCALE // touch down on moon surface
      
      ship.x += (0 - ship.x) * 3 * dt
      ship.angle += (-Math.PI / 2 - ship.angle) * 3 * dt
      
      if (ship.y < targetY) {
        ship.y = Math.min(targetY, ship.y + 120 * dt)
      }

      // Fire retro-thrusters to slow down descent (plumes pointing downwards)
      if (landingTimerRef.current > 1.2 && Math.random() < 0.65) {
        const tailAngle = Math.PI / 2 + (Math.random() - 0.5) * 0.2
        particlesRef.current.push({
          x: ship.x + (Math.random() - 0.5) * 6,
          y: ship.y - 0.15,
          vx: Math.cos(tailAngle) * (80 + Math.random() * 80),
          vy: Math.sin(tailAngle) * (2 + Math.random() * 3),
          size: 2.5 + Math.random() * 2,
          color: '#38bdf8', // cyan retro thruster fire!
          alpha: 0.8,
          life: 0.5, decay: 2.0,
          type: 'spark'
        })
      }

      // Update particles
      particlesRef.current.forEach(p => {
        p.life -= p.decay * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
      })
      particlesRef.current = particlesRef.current.filter(p => p.life > 0)

      if (landingTimerRef.current <= 0) {
        gameStateRef.current = 'victory'
        setGameState('victory')
        stopAmbientDrone()
        playSynthPulse(880, 1.2)
      }
    }

    const update = (dt: number) => {
      const ship = shipRef.current
      const cam = cameraRef.current
      timeRef.current += dt

      // Decay warp factor
      if (warpFactorRef.current > 1.0) {
        warpFactorRef.current -= dt * 0.65
        if (warpFactorRef.current < 1.0) warpFactorRef.current = 1.0
      }

      // Fuel consumption and steering
      if (ship.fuel > 0) {
        const dx = mouseRef.current.sx - w / 2
        const dy = mouseRef.current.sy - h * 0.6 // relative to screen center-ish
        const dist = Math.hypot(dx, dy)

        if (dist > 15) {
          const targetAngle = Math.atan2(dy, dx)
          let angleDiff = targetAngle - ship.angle
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
          
          ship.angle += angleDiff * 5.0 * dt

          // Active thrust
          ship.activeThrust = dist > 45
          if (ship.activeThrust) {
            const accel = 180 * dt
            ship.vx += Math.cos(ship.angle) * accel
            ship.vy += Math.sin(ship.angle) * accel
            // Drain fuel
            ship.fuel = Math.max(0, ship.fuel - dt * 3.8)
          } else {
            // Passive fuel drain while drifting
            ship.fuel = Math.max(0, ship.fuel - dt * 0.95)
          }
        } else {
          ship.activeThrust = false
          // Passive fuel drain while drifting
          ship.fuel = Math.max(0, ship.fuel - dt * 0.95)
        }
      } else {
        ship.activeThrust = false
      }

      // Drag / inertia
      ship.vx *= 0.985
      ship.vy *= 0.985

      // Cap ship speed to MAX_SHIP_SPEED
      const speedMag = Math.hypot(ship.vx, ship.vy)
      if (speedMag > MAX_SHIP_SPEED) {
        ship.vx = (ship.vx / speedMag) * MAX_SHIP_SPEED
        ship.vy = (ship.vy / speedMag) * MAX_SHIP_SPEED
      }
      
      ship.x += ship.vx * dt * 62
      // Always have a base forward speed scrolling upwards
      const verticalSpeed = BASE_FORWARD_WORLD_SPEED + Math.max(0, -ship.vy * 0.22)
      ship.y += (verticalSpeed * warpFactorRef.current) * dt
      
      // Keep X boundaries
      ship.x = Math.max(-w * 0.8, Math.min(w * 0.8, ship.x))

      // Camera tracks spaceship smoothly
      cam.x += (ship.x - cam.x) * 5.0 * dt
      cam.y = ship.y

      // Screen shakes
      if (shakeTimeRef.current > 0) {
        shakeTimeRef.current -= dt
      }

      // Spawners (spawn obstacles & collectibles ahead in world Y)
      const nowMs = performance.now()
      const progress = Math.min(1, Math.max(0, ship.y / MOON_WORLD_Y))
      const spawnInterval = 750 - progress * 400 // speeds up as we approach the moon
      if (nowMs - lastSpawnRef.current > spawnInterval && ship.y < MOON_WORLD_Y - 15) {
        lastSpawnRef.current = nowMs
        const spawnWorldY = ship.y + 9
        const targetPlayerX = Math.random() < 0.55
        const spawnX = targetPlayerX
          ? ship.x + (Math.random() - 0.5) * w * 0.45
          : cam.x + (Math.random() - 0.5) * w * 0.95

        // Spawn 2 obstacles at once at higher progress
        const spawnCount = Math.random() < 0.35 + progress * 0.4 ? 2 : 1
        
        for (let sIdx = 0; sIdx < spawnCount; sIdx++) {
          if (Math.random() < 0.85 && entitiesRef.current.debris.length < 45) {
            let kind: SpaceDebris['kind'] = 'asteroid'
            const hazardRoll = Math.random()
            
            if (progress > 0.15 && hazardRoll < 0.22) {
              kind = 'mine'
            } else if (progress > 0.30 && hazardRoll >= 0.22 && hazardRoll < 0.44) {
              kind = 'sentry'
            } else if (progress < 0.22) {
              kind = Math.random() < 0.55 ? 'satellite' : 'ice'
            } else if (progress > 0.64 && Math.random() < 0.65) {
              kind = 'meteor'
            } else if (Math.random() < 0.22) {
              kind = 'satellite'
            } else if (Math.random() < 0.35) {
              kind = 'ice'
            }

            const sz = kind === 'satellite'
              ? 18 + Math.random() * 12
              : kind === 'meteor'
                ? 12 + Math.random() * 18
                : kind === 'sentry'
                  ? 20
                  : kind === 'mine'
                    ? 12
                    : 16 + Math.random() * 28

            const meteorSide = Math.random() > 0.5 ? -1 : 1
            const xOffset = sIdx * (Math.random() > 0.5 ? 1 : -1) * 80
            
            entitiesRef.current.debris.push({
              id: Math.random(),
              kind,
              x: spawnX + xOffset,
              y: spawnWorldY + sIdx * 0.5,
              vx: kind === 'meteor' ? meteorSide * (3.0 + Math.random() * 2.0) : kind === 'mine' ? 0 : (Math.random() - 0.5) * 0.8,
              vy: kind === 'meteor' ? -1.4 - Math.random() * 0.8 : kind === 'mine' ? -0.22 : kind === 'sentry' ? -0.32 : (Math.random() - 0.5) * 0.4 - 0.75,
              size: sz,
              points: generateDebrisPoints(sz),
              rot: Math.random() * Math.PI,
              rotSpeed: kind === 'meteor' ? (Math.random() - 0.5) * 6.5 : kind === 'mine' ? 1.5 : (Math.random() - 0.5) * 3.0,
              damage: kind === 'meteor' ? 34 : kind === 'satellite' ? 25 : kind === 'mine' ? 50 : kind === 'sentry' ? 28 : 16,
              color: kind === 'meteor' ? '#f97316' : kind === 'satellite' ? '#94a3b8' : kind === 'ice' ? '#bfdbfe' : kind === 'mine' ? '#ef4444' : kind === 'sentry' ? '#a855f7' : '#4b5563',
              detonated: false,
              laserCharge: kind === 'sentry' ? 0 : undefined,
              mineBlinkTimer: kind === 'mine' ? 0 : undefined
            })
          }
        }

        // Spawn Collectibles
        if (Math.random() < 0.45 && entitiesRef.current.collectibles.length < 6) {
          const roll = Math.random()
          let type: 'fuel' | 'shield' | 'beacon' | 'slingshot' = 'fuel'
          if (roll < 0.35) type = 'fuel'
          else if (roll < 0.58) type = 'shield'
          else if (roll < 0.85) type = 'beacon'
          else type = 'slingshot'

          entitiesRef.current.collectibles.push({
            id: Math.random(),
            type,
            x: cam.x + (Math.random() - 0.5) * w * 1.0,
            y: spawnWorldY,
            size: type === 'slingshot' ? 36 : 10,
            pulse: Math.random() * Math.PI * 2,
            collected: false
          })
        }
      }

      // Deflector EMP Sweep Update
      if (empActiveRef.current) {
        empRadiusRef.current += 340 * dt
        if (empRadiusRef.current > 380) {
          empActiveRef.current = false
        }
      }

      // Check game over
      if (ship.shield <= 0) {
        gameStateRef.current = 'gameover'
        setGameState('gameover')
        stopAmbientDrone()
        spawnCollectBurst(w/2, h*0.6, '#ef4444')
      }

      // Check landing phase initiation
      if (ship.y >= MOON_WORLD_Y) {
        gameStateRef.current = 'landing'
        setGameState('landing')
        landingTimerRef.current = 6.0
        ship.vx = 0
        ship.vy = 0
        playSynthPulse(440, 0.6)
      }

      // ─── Update Debris & Collisions ───────────────────
      entitiesRef.current.debris = entitiesRef.current.debris.filter(d => {
        const distToShipY = d.y - ship.y
        // remove far behind
        if (distToShipY < -8) return false

        // Homing logic for active mines
        if (d.kind === 'mine' && !d.detonated) {
          const dxSub = ship.x - d.x
          const dySub = (ship.y - d.y) * DISTANCE_SCALE
          const distToShip = Math.hypot(dxSub, dySub)
          if (distToShip < 200) {
            d.vx += (dxSub > 0 ? 0.25 : -0.25) * dt
            d.vx = Math.max(-1.2, Math.min(1.2, d.vx))
          }
        }

        d.x += d.vx * dt * 10
        d.y += d.vy * dt

        if (d.detonated) {
          if (d.detonatedTimer !== undefined) {
            d.detonatedTimer -= dt
            if (d.detonatedTimer <= 0) return false
          }
        } else {
          // Check EMP hit
          const dxSub = d.x - ship.x
          const dySub = (d.y - ship.y) * DISTANCE_SCALE // scale world space Y
          const distToShip = Math.hypot(dxSub, dySub)

          if (empActiveRef.current && distToShip < empRadiusRef.current) {
            d.detonated = true
            d.detonatedTimer = 0.4
            spawnCollectBurst(d.x - cam.x + w/2, (ship.y - d.y) * DISTANCE_SCALE + h*0.6, '#00f2ff')
            playSynthPulse(380, 0.3)
          }

          // Special behavior for mine proximity detonation
          if (d.kind === 'mine' && d.mineBlinkTimer !== undefined) {
            d.mineBlinkTimer += dt
            if (distToShip < 65) {
              d.detonated = true
              d.detonatedTimer = 0.4
              ship.shield = Math.max(0, ship.shield - d.damage)
              ship.fuel = Math.max(0, ship.fuel - 10) // collision fuel loss
              ship.vx *= 0.3 // momentum loss
              ship.vy *= 0.3
              triggerShake(14, 0.45)
              spawnCollectBurst(d.x - cam.x + w/2, (ship.y - d.y) * DISTANCE_SCALE + h*0.6, '#ef4444')
              playSynthPulse(90, 0.5)
            }
          }

          // Special behavior for sentry targeting & laser firing
          if (d.kind === 'sentry' && d.laserCharge !== undefined) {
            d.laserCharge += dt
            if (d.laserCharge < 0.9) {
              d.laserTargetX = ship.x
              d.laserTargetY = ship.y
            } else if (d.laserCharge >= 0.9 && d.laserCharge < 1.6) {
              const px = ship.x
              const py = ship.y
              const x1 = d.x, y1 = d.y
              const x2 = d.laserTargetX ?? 0, y2 = d.laserTargetY ?? 0
              
              const l2 = (x2 - x1)**2 + (y2 - y1)**2
              let tVal = 0
              if (l2 > 0) {
                tVal = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2
                tVal = Math.max(0, Math.min(1, tVal))
              }
              const projX = x1 + tVal * (x2 - x1)
              const projY = y1 + tVal * (y2 - y1)
              const distToLaser = Math.hypot(px - projX, (py - projY) * DISTANCE_SCALE)

              if (distToLaser < 24) {
                ship.shield = Math.max(0, ship.shield - d.damage * 3.0 * dt)
                triggerShake(3, 0.1)
                if (Math.random() < 0.2) {
                  spawnCollectBurst(ship.x - cam.x + w/2, h*0.6, '#ef4444')
                  playSynthPulse(140, 0.1)
                }
              }
            } else if (d.laserCharge >= 2.1) {
              d.laserCharge = 0
            }
          }

          // Check physical sub collision
          if (distToShip < d.size + 15) {
            d.detonated = true
            d.detonatedTimer = 0.4
            ship.shield = Math.max(0, ship.shield - d.damage)
            ship.fuel = Math.max(0, ship.fuel - 10) // collision fuel loss
            ship.vx *= 0.3 // momentum loss
            ship.vy *= 0.3
            triggerShake(12, 0.45)
            spawnCollectBurst(d.x - cam.x + w/2, (ship.y - d.y) * DISTANCE_SCALE + h*0.6, '#f87171')
            playSynthPulse(120, 0.4)
          }
        }
        return true
      })

      // ─── Update Collectibles & Collisions ──────────────
      entitiesRef.current.collectibles = entitiesRef.current.collectibles.filter(c => {
        const distToShipY = c.y - ship.y
        if (distToShipY < -8) return false

        c.pulse += dt * 3.5

        if (!c.collected) {
          const dxSub = c.x - ship.x
          const dySub = (c.y - ship.y) * DISTANCE_SCALE
          const distToShip = Math.hypot(dxSub, dySub)

          if (distToShip < c.size + 20) {
            c.collected = true
            if (c.type === 'fuel') {
              ship.fuel = Math.min(100, ship.fuel + 20)
              spawnCollectBurst(c.x - cam.x + w/2, (ship.y - c.y) * DISTANCE_SCALE + h*0.6, '#f97316')
              playSynthPulse(330, 0.35)
            } else if (c.type === 'shield') {
              ship.shield = Math.min(100, ship.shield + 15)
              spawnCollectBurst(c.x - cam.x + w/2, (ship.y - c.y) * DISTANCE_SCALE + h*0.6, '#38bdf8')
              playSynthPulse(440, 0.4)
            } else if (c.type === 'beacon') {
              ship.beacons = Math.min(TARGET_BEACONS, ship.beacons + 1)
              spawnCollectBurst(c.x - cam.x + w/2, (ship.y - c.y) * DISTANCE_SCALE + h*0.6, '#34d399')
              playSynthPulse(587.33, 0.45)
            } else if (c.type === 'slingshot') {
              // Accelerate to warp velocity!
              warpFactorRef.current = 2.4
              ship.fuel = Math.min(100, ship.fuel + 15) // small fuel boost
              spawnCollectBurst(c.x - cam.x + w/2, (ship.y - c.y) * DISTANCE_SCALE + h*0.6, '#fbbf24')
              playSynthPulse(659.25, 0.6)
            }
            return false
          }
        }
        return true
      })

      // Update engine particle trail
      if (ship.activeThrust && Math.random() < 0.45) {
        const tailAngle = ship.angle + Math.PI + (Math.random() - 0.5) * 0.3
        const trailX = ship.x - Math.cos(ship.angle) * 12
        const trailY = ship.y - Math.sin(ship.angle) * 0.12 // world Y
        particlesRef.current.push({
          x: trailX,
          y: trailY,
          vx: Math.cos(tailAngle) * (40 + Math.random() * 60) + ship.vx,
          vy: Math.sin(tailAngle) * (1.2 + Math.random() * 1.5) + ship.vy,
          size: 2.5 + Math.random() * 3,
          color: Math.random() > 0.45 ? '#f97316' : '#ef4444',
          alpha: 0.85,
          life: 0.5, decay: 2.0,
          type: 'smoke'
        })
      }

      // Update other particles
      particlesRef.current.forEach(p => {
        p.life -= p.decay * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
      })
      particlesRef.current = particlesRef.current.filter(p => p.life > 0)
    }

    const render = () => {
      const ship = shipRef.current
      const cam = cameraRef.current
      const t = timeRef.current

      // Clear
      ctx.clearRect(0, 0, w, h)

      // Apply screen shake
      ctx.save()
      if (shakeTimeRef.current > 0) {
        const amt = shakeIntensityRef.current
        const dx = (Math.random() - 0.5) * amt
        const dy = (Math.random() - 0.5) * amt
        ctx.translate(dx, dy)
      }

      // World to Screen coordinates
      const sx = (wx: number) => wx - cam.x + w / 2
      const sy = (wy: number) => (cam.y - wy) * DISTANCE_SCALE + h * 0.6
      const voyageProgress = Math.min(1, Math.max(0, ship.y * DISTANCE_SCALE / MAX_DISTANCE))

      // ─── 1. Deep Space Background ───
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h)
      if (voyageProgress < 0.18) {
        skyGrad.addColorStop(0, '#050816')
        skyGrad.addColorStop(0.45, '#102a4c')
        skyGrad.addColorStop(1, '#2563eb')
      } else {
        skyGrad.addColorStop(0, '#090a0f')
        skyGrad.addColorStop(1, voyageProgress > 0.72 ? '#010205' : '#020817')
      }
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h)

      if (voyageProgress < 0.25) {
        const atmosphereAlpha = Math.max(0, 1 - voyageProgress / 0.25)
        const horizon = ctx.createLinearGradient(0, h * 0.35, 0, h)
        horizon.addColorStop(0, `rgba(125, 211, 252, ${0.18 * atmosphereAlpha})`)
        horizon.addColorStop(0.55, `rgba(59, 130, 246, ${0.22 * atmosphereAlpha})`)
        horizon.addColorStop(1, `rgba(14, 165, 233, ${0.34 * atmosphereAlpha})`)
        ctx.fillStyle = horizon
        ctx.fillRect(0, 0, w, h)
      }

      // ─── 2. Parallax Stars ───
      const warpMult = warpFactorRef.current
      localStars.forEach(s => {
        const sxStar = (s.x * w) % w
        let syStar = (s.y * h + ship.y * DISTANCE_SCALE * s.speed) % h
        if (syStar < 0) syStar += h

        ctx.fillStyle = `rgba(224, 242, 254, ${s.alpha})`
        ctx.beginPath()
        if (warpMult > 1.2) {
          // warp stretch lines!
          ctx.strokeStyle = `rgba(224, 242, 254, ${s.alpha * 0.85})`
          ctx.lineWidth = s.size
          ctx.moveTo(sxStar, syStar)
          ctx.lineTo(sxStar, syStar + s.size * 22 * warpMult)
          ctx.stroke()
        } else {
          ctx.arc(sxStar, syStar, s.size, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      // ─── 3. Starting Earth (grows smaller as we fly up) ───
      const earthWorldY = 0
      const earthSy = sy(earthWorldY)
      const earthDist = ship.y
      const earthScale = Math.max(0.02, 1.0 / (1.0 + earthDist * 0.12))
      if (earthScale > 0.05 && earthSy > -w * 0.4) {
        ctx.save()
        // Translate Earth center down so that the ship sits on its top edge at launch
        ctx.translate(w/2, earthSy + w * 0.21 * earthScale)
        
        // Glow
        const earthGlow = ctx.createRadialGradient(0, 0, 1, 0, 0, w * 0.35 * earthScale)
        earthGlow.addColorStop(0, 'rgba(14, 116, 144, 0.48)')
        earthGlow.addColorStop(0.6, 'rgba(6, 182, 212, 0.18)')
        earthGlow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = earthGlow
        ctx.beginPath(); ctx.arc(0, 0, w * 0.35 * earthScale, 0, Math.PI * 2); ctx.fill()

        // Planet circle
        ctx.beginPath()
        ctx.arc(0, 0, w * 0.22 * earthScale, 0, Math.PI * 2)
        const earthColor = ctx.createRadialGradient(-w*0.05 * earthScale, -w*0.05 * earthScale, 5, 0, 0, w * 0.22 * earthScale)
        earthColor.addColorStop(0, '#93c5fd')
        earthColor.addColorStop(0.5, '#0284c7')
        earthColor.addColorStop(1, '#0f172a')
        ctx.fillStyle = earthColor
        ctx.fill()

        ctx.strokeStyle = 'rgba(14, 165, 233, 0.65)'
        ctx.lineWidth = 1.8
        ctx.stroke()
        ctx.restore()
      }

      // Draw launch platform and tower if ship is close to Earth
      if (ship.y * DISTANCE_SCALE < 4000) {
        const platformY = sy(0) + 12
        const platformAlpha = Math.max(0, 1 - (ship.y * DISTANCE_SCALE) / 4000)
        
        ctx.save()
        ctx.strokeStyle = `rgba(71, 85, 105, ${platformAlpha})`
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(w/2 - 100, platformY)
        ctx.lineTo(w/2 + 100, platformY)
        ctx.stroke()

        ctx.strokeStyle = `rgba(51, 65, 85, ${platformAlpha})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(w/2 - 80, platformY); ctx.lineTo(w/2 - 80, platformY + 120)
        ctx.moveTo(w/2 + 80, platformY); ctx.lineTo(w/2 + 80, platformY + 120)
        ctx.stroke()

        ctx.strokeStyle = `rgba(100, 116, 139, ${platformAlpha})`
        ctx.lineWidth = 3
        ctx.strokeRect(w/2 - 70, platformY - 90, 25, 90)
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(w/2 - 70, platformY - 90); ctx.lineTo(w/2 - 45, platformY - 60)
        ctx.moveTo(w/2 - 45, platformY - 90); ctx.lineTo(w/2 - 70, platformY - 60)
        ctx.moveTo(w/2 - 70, platformY - 60); ctx.lineTo(w/2 - 45, platformY - 30)
        ctx.moveTo(w/2 - 45, platformY - 60); ctx.lineTo(w/2 - 70, platformY - 30)
        ctx.moveTo(w/2 - 70, platformY - 30); ctx.lineTo(w/2 - 45, platformY)
        ctx.moveTo(w/2 - 45, platformY - 30); ctx.lineTo(w/2 - 70, platformY)
        ctx.stroke()
        
        ctx.restore()
      }

      // ─── 4. Target Moon (grows larger as ship approaches MAX_DISTANCE) ───
      const moonWorldY = MOON_WORLD_Y
      const moonSy = sy(moonWorldY)
      const moonDist = moonWorldY - ship.y
      const moonScale = Math.max(0.04, 1.0 / (1.0 + moonDist * 0.15))
      if (moonSy < h + w * 0.5) {
        ctx.save()
        ctx.translate(w/2, moonSy)
        
        // Atmosphere Halo
        const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, w * 0.28 * moonScale)
        halo.addColorStop(0, 'rgba(100, 116, 139, 0.45)')
        halo.addColorStop(0.6, 'rgba(148, 163, 184, 0.15)')
        halo.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = halo
        ctx.beginPath(); ctx.arc(0, 0, w * 0.28 * moonScale, 0, Math.PI * 2); ctx.fill()

        // Lunar cratered circle
        ctx.beginPath()
        ctx.arc(0, 0, w * 0.18 * moonScale, 0, Math.PI * 2)
        const moonColor = ctx.createRadialGradient(-w*0.04 * moonScale, -w*0.04 * moonScale, 2, 0, 0, w * 0.18 * moonScale)
        moonColor.addColorStop(0, '#f1f5f9')
        moonColor.addColorStop(0.6, '#cbd5e1')
        moonColor.addColorStop(1, '#334155')
        ctx.fillStyle = moonColor
        ctx.fill()
        
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)'
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.fillStyle = 'rgba(71, 85, 105, 0.28)'
        const craters = [
          { x: -0.05, y: -0.05, r: 0.03 },
          { x: 0.06, y: 0.04, r: 0.025 },
          { x: -0.07, y: 0.06, r: 0.02 },
          { x: 0.02, y: -0.09, r: 0.015 }
        ]
        craters.forEach(c => {
          ctx.beginPath()
          ctx.arc(c.x * w * moonScale, c.y * w * moonScale, c.r * w * moonScale, 0, Math.PI * 2)
          ctx.fill()
        })

        ctx.restore()
      }

      // Draw landing pad platform line near the moon surface
      if (moonDist < 35) {
        const surfaceY = moonSy - w * 0.18 * moonScale
        const padAlpha = Math.min(1, Math.max(0, (35 - moonDist) / 25))
        
        ctx.save()
        ctx.strokeStyle = `rgba(34, 211, 238, ${padAlpha})` // cyan landing lights
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(w/2 - 60, surfaceY)
        ctx.lineTo(w/2 + 60, surfaceY)
        ctx.stroke()

        // Draw support pillars/structure for pad
        ctx.strokeStyle = `rgba(100, 116, 139, ${padAlpha * 0.6})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(w/2 - 45, surfaceY); ctx.lineTo(w/2 - 45, surfaceY + 15)
        ctx.moveTo(w/2 + 45, surfaceY); ctx.lineTo(w/2 + 45, surfaceY + 15)
        ctx.stroke()

        // Blinking beacon lights
        const blink = Math.sin(t * 8) > 0
        ctx.fillStyle = blink ? `rgba(34, 211, 238, ${padAlpha})` : `rgba(8, 47, 73, ${padAlpha})`
        ctx.beginPath()
        ctx.arc(w/2 - 50, surfaceY - 2, 3, 0, Math.PI * 2)
        ctx.arc(w/2 + 50, surfaceY - 2, 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `rgba(148, 163, 184, ${padAlpha * 0.8})`
        ctx.font = 'bold 9px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('L PAD 01', w/2, surfaceY + 13)
        ctx.restore()
      }

      // ─── 5. Space Collectibles ───
      entitiesRef.current.collectibles.forEach(c => {
        const csx = sx(c.x)
        const csy = sy(c.y)
        if (csx < -80 || csx > w + 80 || csy < -80 || csy > h + 80) return

        ctx.save()
        ctx.translate(csx, csy)
        
        const pulse = 1.0 + Math.sin(c.pulse) * 0.12
        const sz = c.size * pulse

        if (c.type === 'fuel') {
          ctx.beginPath()
          ctx.rect(-sz * 0.7, -sz * 1.1, sz * 1.4, sz * 2.2)
          ctx.fillStyle = '#f97316'
          ctx.strokeStyle = '#fdba74'
          ctx.lineWidth = 1.6
          ctx.fill()
          ctx.stroke()
          
          ctx.fillStyle = '#ffedd5'
          ctx.fillRect(-sz * 0.45, -sz * 0.2, sz * 0.9, sz * 0.4)
        } else if (c.type === 'shield') {
          ctx.strokeStyle = '#38bdf8'
          ctx.lineWidth = 2
          ctx.strokeRect(-sz, -sz, sz*2, sz*2)

          ctx.fillStyle = '#e0f2fe'
          ctx.fillRect(-sz * 0.7, -sz * 0.2, sz * 1.4, sz * 0.4)
          ctx.fillRect(-sz * 0.2, -sz * 0.7, sz * 0.4, sz * 1.4)
        } else if (c.type === 'beacon') {
          ctx.rotate(t * 1.8)
          ctx.beginPath()
          ctx.moveTo(0, -sz * 1.4)
          ctx.lineTo(sz, 0)
          ctx.lineTo(0, sz * 1.4)
          ctx.lineTo(-sz, 0)
          ctx.closePath()
          ctx.fillStyle = '#34d399'
          ctx.strokeStyle = '#a7f3d0'
          ctx.lineWidth = 1.5
          ctx.fill()
          ctx.stroke()
        } else if (c.type === 'slingshot') {
          ctx.rotate(t * 1.1)
          ctx.strokeStyle = '#fbbf24'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(0, 0, sz, 0, Math.PI * 2)
          ctx.stroke()

          ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(0, 0, sz * 1.5, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.restore()
      })

      // ─── 6. Space Debris / Asteroids ───
      entitiesRef.current.debris.forEach(d => {
        const dsx = sx(d.x)
        const dsy = sy(d.y)
        if (dsx < -120 || dsx > w + 120 || dsy < -120 || dsy > h + 120) return

        ctx.save()
        ctx.translate(dsx, dsy)
        
        if (d.detonated) {
          const detPct = 1.0 - (d.detonatedTimer || 0) / 0.4
          ctx.beginPath()
          ctx.arc(0, 0, d.size * (1.0 + detPct * 1.8), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(0, 242, 255, ${(1.0 - detPct) * 0.48})`
          ctx.fill()
        } else {
          ctx.rotate(d.rot + t * d.rotSpeed)

          if (d.kind === 'satellite') {
            ctx.fillStyle = '#cbd5e1'
            ctx.strokeStyle = '#e2e8f0'
            ctx.lineWidth = 1.2
            ctx.fillRect(-d.size * 0.45, -d.size * 0.32, d.size * 0.9, d.size * 0.64)
            ctx.strokeRect(-d.size * 0.45, -d.size * 0.32, d.size * 0.9, d.size * 0.64)
            ctx.fillStyle = '#38bdf8'
            ctx.fillRect(-d.size * 1.35, -d.size * 0.18, d.size * 0.75, d.size * 0.36)
            ctx.fillRect(d.size * 0.6, -d.size * 0.18, d.size * 0.75, d.size * 0.36)
          } else if (d.kind === 'meteor') {
            const tail = ctx.createLinearGradient(-d.size * 2.5, 0, d.size, 0)
            tail.addColorStop(0, 'rgba(249, 115, 22, 0)')
            tail.addColorStop(0.55, 'rgba(249, 115, 22, 0.34)')
            tail.addColorStop(1, 'rgba(255, 255, 255, 0.85)')
            ctx.fillStyle = tail
            ctx.beginPath()
            ctx.moveTo(-d.size * 2.8, -d.size * 0.35)
            ctx.lineTo(d.size * 0.65, -d.size * 0.75)
            ctx.lineTo(d.size * 0.95, d.size * 0.25)
            ctx.lineTo(-d.size * 2.2, d.size * 0.42)
            ctx.closePath()
            ctx.fill()
            ctx.fillStyle = '#fed7aa'
            ctx.beginPath()
            ctx.arc(d.size * 0.45, 0, d.size * 0.42, 0, Math.PI * 2)
            ctx.fill()
          } else if (d.kind === 'mine') {
            const isClose = Math.hypot(d.x - ship.x, (d.y - ship.y) * DISTANCE_SCALE) < 140
            const blinkSpeed = isClose ? 15 : 4
            const blink = Math.sin(t * blinkSpeed) > 0

            ctx.beginPath()
            ctx.arc(0, 0, d.size, 0, Math.PI * 2)
            ctx.fillStyle = blink ? '#ef4444' : '#7f1d1d'
            ctx.strokeStyle = '#fca5a5'
            ctx.lineWidth = 1.5
            ctx.fill()
            ctx.stroke()

            ctx.strokeStyle = '#ef4444'
            ctx.lineWidth = 2
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
              ctx.beginPath()
              ctx.moveTo(Math.cos(a) * d.size, Math.sin(a) * d.size)
              ctx.lineTo(Math.cos(a) * (d.size + 4), Math.sin(a) * (d.size + 4))
              ctx.stroke()
            }

            ctx.beginPath()
            ctx.arc(0, 0, d.size * 0.35, 0, Math.PI * 2)
            ctx.fillStyle = blink ? '#ffffff' : '#ef4444'
            ctx.fill()
          } else if (d.kind === 'sentry') {
            ctx.beginPath()
            ctx.moveTo(0, -d.size)
            ctx.lineTo(d.size * 0.85, -d.size * 0.5)
            ctx.lineTo(d.size * 0.85, d.size * 0.5)
            ctx.lineTo(0, d.size)
            ctx.lineTo(-d.size * 0.85, d.size * 0.5)
            ctx.lineTo(-d.size * 0.85, -d.size * 0.5)
            ctx.closePath()
            
            ctx.fillStyle = '#6b21a8'
            ctx.strokeStyle = '#c084fc'
            ctx.lineWidth = 1.8
            ctx.fill()
            ctx.stroke()

            ctx.beginPath()
            ctx.arc(0, 0, d.size * 0.35, 0, Math.PI * 2)
            ctx.fillStyle = d.laserCharge !== undefined && d.laserCharge > 1.1 ? '#ffffff' : '#f43f5e'
            ctx.fill()

            if (d.laserCharge !== undefined) {
              ctx.restore()
              ctx.save()

              const txScreen = sx(d.laserTargetX ?? 0)
              const tyScreen = sy(d.laserTargetY ?? 0)

              if (d.laserCharge < 0.9) {
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)'
                ctx.lineWidth = 1.2
                ctx.setLineDash([3, 3])
                ctx.beginPath()
                ctx.moveTo(dsx, dsy)
                ctx.lineTo(txScreen, tyScreen)
                ctx.stroke()
                ctx.setLineDash([])
              } else if (d.laserCharge >= 0.9 && d.laserCharge < 1.6) {
                const beamWidth = 4 + Math.sin(t * 30) * 2
                ctx.strokeStyle = 'rgba(244, 63, 94, 0.92)'
                ctx.lineWidth = beamWidth
                ctx.beginPath()
                ctx.moveTo(dsx, dsy)
                ctx.lineTo(txScreen, tyScreen)
                ctx.stroke()

                ctx.strokeStyle = '#ffffff'
                ctx.lineWidth = beamWidth * 0.4
                ctx.beginPath()
                ctx.moveTo(dsx, dsy)
                ctx.lineTo(txScreen, tyScreen)
                ctx.stroke()
              }
            }
          } else {
            ctx.beginPath()
            ctx.moveTo(d.points[0].x, d.points[0].y)
            for (let i = 1; i < d.points.length; i++) {
              ctx.lineTo(d.points[i].x, d.points[i].y)
            }
            ctx.closePath()

            const rockGrad = ctx.createRadialGradient(-d.size * 0.2, -d.size * 0.2, 1, 0, 0, d.size)
            rockGrad.addColorStop(0, d.kind === 'ice' ? '#e0f2fe' : '#4b5563')
            rockGrad.addColorStop(0.8, d.kind === 'ice' ? '#60a5fa' : '#1f2937')
            rockGrad.addColorStop(1, '#111827')
            ctx.fillStyle = rockGrad
            ctx.strokeStyle = d.kind === 'ice' ? '#bfdbfe' : '#374151'
            ctx.lineWidth = 1.5
            ctx.fill()
            ctx.stroke()
          }
        }
        ctx.restore()
      })

      // ─── 7. Spaceship (Origami Space Shuttle) ───
      const shipSx = sx(ship.x)
      const shipSy = h * 0.6

      ctx.save()
      ctx.translate(shipSx, shipSy)
      ctx.rotate(ship.angle)

      if (ship.activeThrust) {
        const flareSize = 18 + Math.sin(t * 18) * 5
        const flareGlow = ctx.createRadialGradient(-24, 0, 1, -24, 0, flareSize * 1.8)
        flareGlow.addColorStop(0, '#ffffff')
        flareGlow.addColorStop(0.3, 'rgba(249, 115, 22, 0.72)')
        flareGlow.addColorStop(1, 'rgba(239, 68, 68, 0)')
        ctx.fillStyle = flareGlow
        ctx.beginPath()
        ctx.arc(-24, 0, flareSize * 1.8, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(-18, -6)
        ctx.lineTo(-42 - Math.sin(t * 22) * 6, 0)
        ctx.lineTo(-18, 6)
        ctx.closePath()
        ctx.fillStyle = '#f97316'
        ctx.fill()
      }

      ctx.fillStyle = 'rgba(226, 232, 240, 0.96)'
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.9)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(25, 0)
      ctx.quadraticCurveTo(13, -12, -10, -10)
      ctx.lineTo(-24, -4)
      ctx.quadraticCurveTo(-28, 0, -24, 4)
      ctx.lineTo(-10, 10)
      ctx.quadraticCurveTo(13, 12, 25, 0)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = 'rgba(203, 213, 225, 0.9)'
      ctx.beginPath()
      ctx.moveTo(-5, -8)
      ctx.lineTo(-25, -22)
      ctx.lineTo(-18, -3)
      ctx.closePath()
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(-5, 8)
      ctx.lineTo(-25, 22)
      ctx.lineTo(-18, 3)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = '#0f172a'
      ctx.beginPath()
      ctx.ellipse(9, -3, 4, 2.6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(9, 3, 4, 2.6, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ef4444'
      ctx.fillRect(-23, -4, 5, 8)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
      ctx.lineWidth = 0.9
      ctx.beginPath()
      ctx.moveTo(22, 0)
      ctx.lineTo(-24, 0)
      ctx.stroke()

      ctx.restore()

      // ─── 8. EMP Deflector Pulse Ring ───
      if (empActiveRef.current) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(shipSx, shipSy, empRadiusRef.current, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0, 242, 255, ${1.0 - empRadiusRef.current / 380})`
        ctx.lineWidth = 3
        ctx.stroke()
        
        const empGrad = ctx.createRadialGradient(shipSx, shipSy, empRadiusRef.current - 16, shipSx, shipSy, empRadiusRef.current)
        empGrad.addColorStop(0, 'rgba(0, 242, 255, 0)')
        empGrad.addColorStop(0.5, `rgba(0, 242, 255, ${(1.0 - empRadiusRef.current / 380) * 0.16})`)
        empGrad.addColorStop(1, 'rgba(0, 242, 255, 0)')
        ctx.fillStyle = empGrad
        ctx.fill()
        ctx.restore()

        entitiesRef.current.debris.forEach(d => {
          const dsx = sx(d.x)
          const dsy = sy(d.y)
          const dxSub = d.x - ship.x
          const dySub = (d.y - ship.y) * DISTANCE_SCALE
          const dist = Math.hypot(dxSub, dySub)

          if (dist < empRadiusRef.current) {
            ctx.save()
            ctx.strokeStyle = '#22d3ee'
            ctx.lineWidth = 1.0
            const bSz = d.size * 2 + 8
            ctx.strokeRect(dsx - bSz/2, dsy - bSz/2, bSz, bSz)
            ctx.fillStyle = '#22d3ee'
            ctx.font = 'bold 8px monospace'
            ctx.fillText('TARGET DETECTED', dsx + bSz/2 + 4, dsy + 3)
            ctx.restore()
          }
        })
      }

      // ─── 9. Particles ───
      particlesRef.current.forEach(p => {
        const psx = sx(p.x)
        const psy = sy(p.y)
        ctx.save()
        ctx.globalAlpha = p.alpha * (p.life / 0.5)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(psx, psy, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      ctx.restore()
    }

    frameId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchstart', onTouch)
      stopAmbientDrone()
    }
  }, [])

  const progressPct = ((MAX_DISTANCE - hud.distance) / MAX_DISTANCE) * 100
  const beaconPct = (hud.beacons / TARGET_BEACONS) * 100

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-[#030712] select-none touch-none"
      onMouseDown={triggerDeflectorEMP}
      onTouchStart={triggerDeflectorEMP}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0 h-full w-full pointer-events-none" />

      <a
        href="/"
        data-astro-reload=""
        className="pointer-events-auto fixed right-6 top-6 z-40 border-2 border-slate-400/80 bg-black/85 px-4 py-2 font-mono text-xs text-white shadow-lg shadow-black/50 backdrop-blur-sm transition-all hover:bg-slate-500/30 sm:px-5 sm:py-2.5 sm:text-sm"
      >
        ← back
      </a>

      {gameState === 'start' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm p-6">
          <div className="max-w-md w-full border border-slate-500/30 bg-black/95 p-8 text-center shadow-2xl">
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-slate-400/60 mb-2">Lunar Transit Command</p>
            <h1 className="text-3xl font-bold tracking-widest text-slate-200 font-mono mb-4">
              LUNAR TRANSIT
            </h1>
            <p className="text-xs font-mono text-slate-300/70 leading-relaxed mb-6 space-y-2 text-left">
              <span>▸ Pilot the spaceship upward from Earth to Lunar orbit.</span><br />
              <span>▸ Move cursor/touch to steer. Spacecraft follows the coordinates.</span><br />
              <span>▸ Move cursor far from spaceship to apply active thrust booster.</span><br />
              <span>▸ Watch your fuels! Collect orange Fuel Canisters to avoid drifting.</span><br />
              <span>▸ Collect 8 glowing Space Data Beacons ✦ along the transit.</span><br />
              <span>▸ Click/Tap canvas to trigger EMP deflector blast (costing shield energy).</span>
            </p>
            <button
              onClick={handleStart}
              className="pointer-events-auto w-full border border-slate-400/80 hover:bg-slate-500/20 text-white font-mono text-xs px-6 py-3 transition-all tracking-widest cursor-pointer"
            >
              LAUNCH TRANSIT
            </button>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="max-w-md w-full border border-red-500/30 bg-black/95 p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold tracking-widest text-red-500 font-mono mb-4">SHIP COMPROMISED</h2>
            <p className="text-xs font-mono text-red-200/70 leading-relaxed mb-6">
              Spaceship suffered critical shield failure under asteroid impact.
            </p>
            <button
              onClick={handleStart}
              className="pointer-events-auto w-full border border-red-500/80 hover:bg-red-500/20 text-white font-mono text-xs px-6 py-3 transition-all tracking-widest cursor-pointer"
            >
              LAUNCH REPLACEMENT SHUTTLE
            </button>
          </div>
        </div>
      )}

      {gameState === 'victory' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="max-w-md w-full border border-slate-400/35 bg-black/95 p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold tracking-widest text-slate-200 font-mono mb-2">LUNAR ORBIT INSERTION</h2>
            <p className="text-xs font-mono text-slate-400 tracking-widest mb-6">
              Spaceship successfully entered Moon's orbit · Beacons collected: {hud.beacons} / {TARGET_BEACONS}
            </p>
            <p className="font-mono text-[11px] text-white/75 leading-relaxed mb-6 border-y border-slate-900/40 py-4 px-2">
              Redirecting to home page in <span className="text-slate-300 font-bold">{redirectCountdown}s</span>...
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleStart}
                className="pointer-events-auto flex-1 border border-slate-700/50 bg-black/50 hover:bg-slate-950/40 text-slate-200 font-mono text-[10px] px-4 py-2.5 transition-all tracking-widest cursor-pointer flex items-center justify-center"
              >
                PLAY AGAIN
              </button>
              <a
                href="/"
                data-astro-reload=""
                className="pointer-events-auto flex-1 border border-slate-400/80 bg-slate-500/10 hover:bg-slate-500/20 text-white font-mono text-[10px] px-4 py-2.5 transition-all tracking-widest cursor-pointer flex items-center justify-center"
              >
                RETURN HOME
              </a>
            </div>
          </div>
        </div>
      )}

      {gameState === 'playing' && hud.warning && (
        <div className="pointer-events-none absolute inset-x-0 top-1/4 z-10 flex justify-center">
          <p className="animate-pulse border border-orange-500/50 bg-orange-950/85 px-6 py-3 font-mono text-xs uppercase tracking-[0.25em] text-orange-200 shadow-xl backdrop-blur-sm">
            {hud.warning}
          </p>
        </div>
      )}

      {gameState === 'launch' && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-20 flex flex-col items-center justify-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-orange-400 mb-1.5 animate-pulse">Ignition Sequence Telemetry</p>
          <p className="font-mono text-3xl font-bold text-white tracking-widest tabular-nums">
            T-MINUS {Math.ceil(launchTimerRef.current)}s
          </p>
        </div>
      )}

      {gameState === 'landing' && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-20 flex flex-col items-center justify-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-cyan-400 mb-1.5 animate-pulse">Lunar Touchdown Procedure</p>
          <p className="font-mono text-lg font-bold text-white tracking-wider uppercase">
            Retro-burn thrust active
          </p>
        </div>
      )}

      {(gameState === 'playing' || gameState === 'launch' || gameState === 'landing') && (
        <div className="pointer-events-none absolute left-6 bottom-6 z-30 space-y-1 font-mono text-xs max-w-[240px]">
          {/* Mobile Toggle Button */}
          <button
            onClick={() => setObjectivesOpen(!objectivesOpen)}
            className="pointer-events-auto flex items-center justify-between w-full border border-slate-700/50 bg-black/85 px-3 py-1.5 text-[9px] uppercase tracking-wider text-slate-400 md:hidden shadow-lg backdrop-blur-sm font-bold"
          >
            <span>✦ Objectives</span>
            <span>{objectivesOpen ? '▼' : '▲'}</span>
          </button>

          {/* Checklist content */}
          <div className={`min-w-[220px] border border-slate-700/50 bg-black/85 px-4 py-3 shadow-lg shadow-black/50 backdrop-blur-sm transition-all duration-200
            ${objectivesOpen ? 'block' : 'hidden md:block'}`}
          >
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 hidden md:block">✦ Mission Objectives</p>
            
            <div className="space-y-2 text-[10px]">
              <div className="flex items-start gap-2">
                <span className={hud.distance === 0 ? 'text-slate-400 font-bold' : 'text-slate-600'}>
                  {hud.distance === 0 ? '☒' : '☐'}
                </span>
                <div>
                  <p className={hud.distance === 0 ? 'text-slate-400 line-through font-bold' : 'text-slate-200'}>
                    Reach Lunar Orbit
                  </p>
                  <p className="text-[9px] text-slate-400/70">
                    Remaining: {hud.distance.toLocaleString()} km
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className={hud.beacons >= TARGET_BEACONS ? 'text-slate-400 font-bold' : 'text-slate-600'}>
                  {hud.beacons >= TARGET_BEACONS ? '☒' : '☐'}
                </span>
                <div>
                  <p className={hud.beacons >= TARGET_BEACONS ? 'text-slate-400 line-through font-bold' : 'text-slate-200'}>
                    Gather Space Data Beacons
                  </p>
                  <p className="text-[9px] text-slate-400/70">
                    Collected: {hud.beacons} / {TARGET_BEACONS}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(gameState === 'playing' || gameState === 'launch' || gameState === 'landing') && (
        <div className="pointer-events-none absolute right-6 top-[5.25rem] z-30 space-y-1 font-mono text-xs scale-80 origin-top-right md:scale-100 max-w-[200px]">
          {/* Main card (acts as toggle button on mobile) */}
          <button
            onClick={() => setTelemetryOpen(!telemetryOpen)}
            className="pointer-events-auto w-full text-left border border-slate-700/50 bg-black/85 px-4 py-3 shadow-lg shadow-black/50 backdrop-blur-sm relative focus:outline-none"
          >
            {/* Toggle indicator arrow only on mobile */}
            <span className="absolute right-3 top-3 text-[9px] text-slate-400 font-bold md:hidden">
              {telemetryOpen ? '▼' : '▲'}
            </span>
            <p className="text-2xl font-bold tabular-nums text-white drop-shadow-md">
              {hud.distance.toLocaleString()}
              <span className="text-xs font-normal text-slate-400"> km</span>
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-widest text-slate-300">Lunar Distance</p>
            <p className="mt-0.5 text-[9px] text-slate-400/80 hidden md:block">Warp Speed: {(hud.speed / 1000).toFixed(1)}k km/h</p>
          </button>

          {/* Collapsible details box */}
          <div className={`space-y-1.5 border border-slate-900/50 bg-black/80 px-3 py-2.5 text-[10px] text-slate-300/90 shadow-lg shadow-black/40 transition-all duration-200
            ${telemetryOpen ? 'block' : 'hidden md:block'}`}
          >
            <div>
              <div className="flex justify-between mb-0.5">
                <span>▸ Deflector Shield</span>
                <span className={hud.shield < 30 ? 'text-red-500 animate-pulse font-bold' : 'text-slate-300'}>
                  {hud.shield}%
                </span>
              </div>
              <div className="w-full bg-black/50 h-1 border border-slate-950 rounded-sm overflow-hidden">
                <div 
                  className={`h-full transition-all duration-150 ${hud.shield < 30 ? 'bg-red-500' : 'bg-slate-400'}`} 
                  style={{ width: `${hud.shield}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-0.5">
                <span>▸ Fuel Reserves</span>
                <span className={hud.fuel < 25 ? 'text-orange-500 animate-pulse font-bold' : 'text-slate-300'}>
                  {hud.fuel}%
                </span>
              </div>
              <div className="w-full bg-black/50 h-1 border border-slate-950 rounded-sm overflow-hidden">
                <div 
                  className={`h-full transition-all duration-150 ${hud.fuel < 25 ? 'bg-orange-500' : 'bg-orange-400'}`} 
                  style={{ width: `${hud.fuel}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-0.5">
                <span>▸ Data Beacons</span>
                <span className="text-emerald-400 font-bold">
                  {hud.beacons} / {TARGET_BEACONS}
                </span>
              </div>
              <div className="w-full bg-black/50 h-1 border border-emerald-950 rounded-sm overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-150" 
                  style={{ width: `${beaconPct}%` }}
                />
              </div>
            </div>

            <p className="pt-0.5 hidden md:block">▸ EMP Charge <span className={`float-right font-bold ${hud.empReady ? 'text-cyan-400' : 'text-slate-500 animate-pulse'}`}>{hud.empReady ? 'ONLINE' : 'RECHARGING'}</span></p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-6 top-6 z-10 flex flex-col sm:inset-x-8 sm:top-8">
        <div className="max-w-[min(100%,36rem)] border-b-2 border-slate-500/60 pb-3 pr-28">
          <h1 className="text-2xl font-bold tracking-wider text-white drop-shadow-lg sm:text-3xl font-mono">
            LUNAR TRANSIT
          </h1>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-slate-300 sm:text-xs">
            {gameState === 'playing' ? 'ACTIVE ORBITAL FLIGHT TELEMETRY' : gameState === 'launch' ? 'LAUNCH IGNITION SEQUENCE' : gameState === 'landing' ? 'LUNAR DESCENT APPROACH' : 'STANDBY MODE'}
          </p>
        </div>
      </div>

      {(gameState === 'playing' || gameState === 'launch' || gameState === 'landing') && (
        <div className="pointer-events-none absolute right-6 top-1/2 z-30 hidden -translate-y-1/2 sm:block h-64 w-1 border-r border-slate-950/50">
          <div 
            className="absolute w-2.5 h-2.5 -left-[3px] bg-slate-400 border border-slate-100 rounded-full transition-all duration-300"
            style={{ top: `${100 - progressPct}%` }}
          />
        </div>
      )}

      {(gameState === 'playing' || gameState === 'launch' || gameState === 'landing') && (
        <button
          onClick={toggleAudio}
          className="pointer-events-auto absolute bottom-6 right-6 z-20
                     rounded-full border border-slate-500/20 bg-black/50 p-2.5
                     text-slate-300/70 hover:text-white hover:bg-slate-500/20
                     transition-all backdrop-blur-sm cursor-pointer"
          title={audioOn ? 'Mute' : 'Play ambient sound'}
        >
          {audioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      )}

      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,2,8,0.55) 100%)',
        }}
      />
    </div>
  )
}
