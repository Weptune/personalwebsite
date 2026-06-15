import { useEffect, useRef, useState } from 'react'
import {
  drawDepthWildlife,
  initDepthWildlife,
  spawnDepthFish,
  updateDepthWildlife,
  type DepthWildlife,
} from '@/lib/oceanWildlife'

const MAX_DEPTH = 10994 // Challenger Deep
const BASE_DESCENT_RATE = 12 // m/s - slow crawl when cursor is high
const TARGET_SAMPLES = 20 // target samples needed to complete mission

type OceanZone = {
  name: string
  short: string
  min: number
  max: number
}

const ZONES: OceanZone[] = [
  { name: 'Epipelagic Zone', short: 'SUNLIGHT', min: 0, max: 200 },
  { name: 'Mesopelagic Zone', short: 'TWILIGHT', min: 200, max: 1000 },
  { name: 'Bathypelagic Zone', short: 'MIDNIGHT', min: 1000, max: 4000 },
  { name: 'Abyssopelagic Zone', short: 'ABYSSAL', min: 4000, max: 6000 },
  { name: 'Hadal Zone', short: 'HADAL TRENCH', min: 6000, max: MAX_DEPTH },
]

function getZone(depth: number): OceanZone {
  return ZONES.find((z) => depth >= z.min && depth < z.max) ?? ZONES[ZONES.length - 1]
}

function pressureAtm(depth: number) {
  return 1 + depth / 10.06
}

function tempC(depth: number) {
  if (depth < 200) return 22 - depth * 0.04
  if (depth < 1000) return 14 - (depth - 200) * 0.01
  if (depth < 4000) return 6 - (depth - 1000) * 0.001
  return Math.max(1.5, 3 - (depth - 4000) * 0.0002)
}

function lightPercent(depth: number) {
  return Math.max(0, 100 * Math.exp(-depth * 0.018))
}

const VERT_SHADER = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

const FRAG_SHADER = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_viewerDepth;
  uniform vec2 u_mouse;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float hash3(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = rot * p * 2.03 + 0.07; a *= 0.48; }
    return v;
  }
  float caustics(vec2 uv, float t) {
    float c = 0.0;
    vec2 p1 = uv * 0.011 + vec2(t * 0.22, t * 0.14);
    vec2 p2 = uv * 0.019 - vec2(t * 0.16, t * 0.20);
    vec2 p3 = uv * 0.035 + vec2(-t * 0.10, t * 0.18);
    c += pow(abs(fbm(p1) - fbm(p1 * 1.07 + 1.7)), 1.6) * 0.42;
    c += pow(abs(fbm(p2) - fbm(p2 * 1.05)), 1.5) * 0.28;
    c += pow(abs(fbm(p3) - fbm(p3 * 1.1)), 1.4) * 0.15;
    return smoothstep(0.03, 0.7, c);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy;
    vec2 uvNorm = uv / u_resolution;
    float t = u_time * 0.001;

    float viewRange = mix(120.0, 35.0, smoothstep(100.0, 5000.0, u_viewerDepth));
    float waterDepth = u_viewerDepth + uvNorm.y * viewRange;

    vec2 refractUv = uv;
    float shallowZone = 1.0 - smoothstep(0.0, 0.35, u_viewerDepth / 800.0);

    refractUv += vec2(
      sin(uvNorm.y * 13.0 - t * 2.6) * 6.0,
      cos(uvNorm.x * 9.0 + t * 2.0) * 4.0
    ) * shallowZone;

    float current = fbm(refractUv * 0.0008 + vec2(-t * 0.25, t * 0.08));
    refractUv.x += current * 14.0 * shallowZone;

    vec3 atten = exp(-waterDepth * 0.001 * vec3(4.8, 0.52, 0.10));

    vec3 shallow = vec3(0.05, 0.22, 0.32);
    vec3 twilight = vec3(0.015, 0.10, 0.20);
    vec3 midnight = vec3(0.003, 0.025, 0.055);
    vec3 abyss = vec3(0.001, 0.006, 0.014);

    float dn = clamp(waterDepth / 5500.0, 0.0, 1.0);
    vec3 water = mix(shallow, twilight, smoothstep(0.0, 0.12, dn));
    water = mix(water, midnight, smoothstep(0.08, 0.55, dn));
    water = mix(water, abyss, smoothstep(0.4, 1.0, dn));

    vec3 sunlight = vec3(1.0, 0.92, 0.78) * atten;
    vec3 lit = water + sunlight * 0.42;

    float surfaceScreenY = -u_viewerDepth / viewRange;
    if (uvNorm.y < surfaceScreenY + 0.02) {
      float skyBlend = smoothstep(surfaceScreenY + 0.02, surfaceScreenY - 0.12, uvNorm.y);
      vec3 skyLow = vec3(0.18, 0.58, 0.72);
      vec3 skyHi = vec3(0.42, 0.78, 0.92);
      vec3 sky = mix(skyLow, skyHi, uvNorm.y * 3.0);
      float sunDisc = exp(-pow(distance(uvNorm, vec2(0.62, surfaceScreenY - 0.08)) * 8.0, 2.0));
      sky += vec3(1.0, 0.9, 0.6) * sunDisc * 0.35;
      lit = mix(lit, sky, skyBlend);
    }

    float caustStr = exp(-max(waterDepth, 0.0) * 0.022);
    float caust = caustics(refractUv, t * 1.4);
    lit += vec3(0.35, 0.82, 0.92) * caust * caustStr * 0.7;

    float rays = 0.0;
    for (float i = 0.0; i < 6.0; i++) {
      float xOff = (hash(vec2(i, 0.0)) - 0.5) * 0.9;
      float shaft = exp(-pow((uvNorm.x - 0.5 - xOff) * (2.2 + dn * 5.0), 2.0));
      shaft *= fbm(vec2(uvNorm.x * 6.0 + i, uvNorm.y * 3.0 - t * 0.2));
      rays += shaft * (0.06 + hash(vec2(i, 1.0)) * 0.05);
    }
    lit += vec3(0.18, 0.55, 0.65) * rays * exp(-max(waterDepth, 0.0) * 0.006);

    float surfaceBand = exp(-max(waterDepth, 0.0) * 0.04);
    lit += vec3(0.25, 0.70, 0.80) * surfaceBand * smoothstep(0.15, 0.0, abs(uvNorm.y - surfaceScreenY)) * 0.4;

    for (float L = 0.0; L < 3.0; L++) {
      float sc = 0.002 + L * 0.0015;
      vec2 gv = refractUv * sc + vec2(t * 0.003 * (L + 1.0), -t * 0.005);
      vec2 id = floor(gv);
      if (hash(id + L * 17.0) > 0.87 - L * 0.01) {
        vec2 pp = (id + vec2(hash(id+1.0), hash(id+2.0))) / sc;
        float dd = length(uv - pp);
        float sz = 0.5 + hash(id+3.0) * 2.0;
        lit += vec3(0.65, 0.72, 0.78) * exp(-dd*dd/(sz*sz)) * (0.04 + dn * 0.06);
      }
    }

    if (waterDepth > 600.0) {
      float bioAmt = smoothstep(600.0, 3000.0, waterDepth) * 0.55;
      for (float b = 0.0; b < 3.0; b++) {
        vec2 bv = refractUv * (0.0009 + b * 0.0003) + vec2(-t * 0.012, t * 0.008);
        vec2 bid = floor(bv);
        float bh = hash3(vec3(bid, b));
        if (bh > 0.952) {
          vec2 bp = (bid + vec2(hash(bid+4.0), hash(bid+5.0))) / (0.0009 + b * 0.0003);
          float pulse = 0.5 + 0.5 * sin(t * 2.0 + bh * 40.0);
          lit += vec3(0.02, 0.28, 0.35) * exp(-pow(length(uv-bp)*0.06, 2.0)) * pulse * bioAmt;
        }
      }
    }

    float murk = 1.0 - exp(-waterDepth * 0.00025);
    lit = mix(lit, abyss, murk * 0.45);

    lit = lit / (lit + vec3(0.32));
    lit = pow(lit, vec3(0.88));
    gl_FragColor = vec4(lit, 1.0);
  }
`

interface SnowParticle {
  worldDepth: number
  x: number
  z: number
  r: number
  drift: number
  alpha: number
}

interface BioOrganism {
  worldDepth: number
  x: number
  kind: 'pinpoint' | 'chain' | 'puff' | 'colony'
  phase: number
  hue: number
  scale: number
}

interface RiseBubble {
  worldDepth: number
  x: number
  r: number
  wobble: number
  speed: number
}

interface DepthStreak {
  worldDepth: number
  x: number
  len: number
  speed: number
  alpha: number
}

interface Seamount {
  worldDepth: number
  x: number
  width: number
  height: number
  shade: number
}

interface GameJelly {
  id: number
  x: number // 0 to 1
  y: number // screen pixel Y
  speedY: number
  size: number
  phase: number
  pulseSpeed: number
}

interface GameCollectible {
  id: number
  type: 'data' | 'repair' | 'relic'
  x: number // 0 to 1
  y: number // screen pixel Y
  size: number
  angle: number
  pulse: number
}

interface GameMine {
  id: number
  x: number // 0 to 1
  y: number // screen pixel Y
  size: number
  phase: number
  speedY: number
  disabled: boolean
  disabledTimer: number
  detonated: boolean
  detonatedTimer?: number
}

interface HydrothermalPlume {
  id: number
  side: 'left' | 'right'
  worldDepth: number
  width: number
  height: number
  bubbles: { x: number; y: number; vx: number; vy: number; size: number; life: number }[]
}

interface FallingRock {
  id: number
  x: number // screen pixel X
  y: number // screen pixel Y
  speedY: number
  size: number
  angle: number
  rotSpeed: number
}

interface EyeProwler {
  id: number
  x: number // 0 to 1
  worldDepth: number
  size: number
  alpha: number
  scatterX: number
  scatterY: number
  vx: number
  vy: number
  state: 'idle' | 'scatter'
  hue: number
}

interface GameSpark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  color: string
}

export default function OceanDescent() {
  const glRef = useRef<HTMLCanvasElement>(null)
  const fxRef = useRef<HTMLCanvasElement>(null)
  const depthRef = useRef(0)
  const mouseRef = useRef({ x: 0.5, y: 0.5 })

  // Game state controls
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'victory'>('start')
  const [hud, setHud] = useState({
    depth: 0,
    zone: ZONES[0],
    pressure: 1,
    temp: 22,
    light: 100,
    rate: BASE_DESCENT_RATE,
    hull: 100,
    score: 0,
    warning: '',
  })

  const [webglOk, setWebglOk] = useState(true)
  const [zoneFlash, setZoneFlash] = useState('')
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

  // Refs for animation loop values
  const gameStateRef = useRef<'start' | 'playing' | 'gameover' | 'victory'>('start')
  const hullRef = useRef(100)
  const scoreRef = useRef(0)
  const needResetRef = useRef(false)
  const vxRef = useRef(0)
  const vyRef = useRef(0)
  const tiltRef = useRef(0)

  const sonarActiveRef = useRef(false)
  const sonarRadiusRef = useRef(0)
  const lastSonarPingRef = useRef(0)

  const shakeTimeRef = useRef(0)
  const shakeIntensityRef = useRef(0)
  const damageFlashTimeRef = useRef(0)

  const handleStartGame = () => {
    hullRef.current = 100
    scoreRef.current = 0
    depthRef.current = 0
    needResetRef.current = true
    setGameState('playing')
    gameStateRef.current = 'playing'
  }

  const triggerSonarPing = () => {
    if (gameStateRef.current !== 'playing') return
    const nowMs = performance.now()
    if (nowMs - lastSonarPingRef.current > 3000) {
      lastSonarPingRef.current = nowMs
      sonarActiveRef.current = true
      sonarRadiusRef.current = 0
    }
  }

  useEffect(() => {
    const glCanvas = glRef.current
    const fxCanvas = fxRef.current
    if (!glCanvas || !fxCanvas) return

    const gl = glCanvas.getContext('webgl', { antialias: false })
    const fx = fxCanvas.getContext('2d')
    if (!gl || !fx) return

    const compile = (src: string, type: number) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s))
        gl.deleteShader(s)
        return null
      }
      return s
    }
    const vs = compile(VERT_SHADER, gl.VERTEX_SHADER)
    const fs = compile(FRAG_SHADER, gl.FRAGMENT_SHADER)
    if (!vs || !fs) {
      setWebglOk(false)
      return
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog))
      setWebglOk(false)
      return
    }

    const posLoc = gl.getAttribLocation(prog, 'position')
    const resLoc = gl.getUniformLocation(prog, 'u_resolution')
    const timeLoc = gl.getUniformLocation(prog, 'u_time')
    const depthLoc = gl.getUniformLocation(prog, 'u_viewerDepth')
    const mouseLoc = gl.getUniformLocation(prog, 'u_mouse')

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)

    let w = 0, h = 0
    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      glCanvas.width = w
      glCanvas.height = h
      fxCanvas.width = w
      fxCanvas.height = h
      gl.viewport(0, 0, w, h)
    }
    resize()

    // Submarine player position on screen
    let px = w * 0.5
    let py = h * 0.3
    let targetPx = w * 0.5
    let targetPy = h * 0.3

    // Background passive/parallax scroll variables
    const snow: SnowParticle[] = []
    for (let i = 0; i < 240; i++) {
      const large = Math.random() > 0.9
      snow.push({
        worldDepth: Math.random() * MAX_DEPTH,
        x: Math.random(),
        z: Math.random(),
        r: large ? 0.7 + Math.random() * 1.8 : 0.15 + Math.random() * 0.55,
        drift: (Math.random() - 0.5) * 0.0006,
        alpha: large ? 0.1 + Math.random() * 0.2 : 0.03 + Math.random() * 0.1,
      })
    }

    const riseBubbles: RiseBubble[] = []
    for (let i = 0; i < 55; i++) {
      riseBubbles.push({
        worldDepth: Math.random() * MAX_DEPTH,
        x: Math.random(),
        r: 0.4 + Math.random() * 2.2,
        wobble: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.2,
      })
    }

    const streaks: DepthStreak[] = []
    for (let i = 0; i < 30; i++) {
      streaks.push({
        worldDepth: Math.random() * MAX_DEPTH,
        x: Math.random(),
        len: 20 + Math.random() * 80,
        speed: 0.6 + Math.random() * 1.4,
        alpha: 0.04 + Math.random() * 0.08,
      })
    }

    const seamounts: Seamount[] = []
    for (let d = 300; d < MAX_DEPTH; d += 400 + Math.random() * 800) {
      seamounts.push({
        worldDepth: d,
        x: 0.08 + Math.random() * 0.84,
        width: 0.25 + Math.random() * 0.45,
        height: 0.08 + Math.random() * 0.18,
        shade: 0.4 + Math.random() * 0.35,
      })
    }

    const bios: BioOrganism[] = []
    for (let i = 0; i < 18; i++) {
      bios.push({
        worldDepth: 800 + Math.random() * (MAX_DEPTH - 800),
        x: Math.random(),
        kind: 'pinpoint',
        phase: Math.random() * Math.PI * 2,
        hue: 170 + Math.random() * 40,
        scale: 0.5 + Math.random() * 1.5,
      })
    }

    // Active gameplay elements
    let gameJellies: GameJelly[] = []
    let gameCollectibles: GameCollectible[] = []
    let gameMines: GameMine[] = []
    let gamePlumes: HydrothermalPlume[] = []
    let gameRocks: FallingRock[] = []
    let gameSparks: GameSpark[] = []

    let eyes: EyeProwler[] = []
    for (let i = 0; i < 24; i++) {
      eyes.push({
        id: i,
        x: Math.random(),
        worldDepth: 800 + Math.random() * (MAX_DEPTH - 800),
        size: 1.2 + Math.random() * 1.5,
        alpha: 0.2 + Math.random() * 0.5,
        scatterX: 0,
        scatterY: 0,
        vx: 0,
        vy: 0,
        state: 'idle',
        hue: Math.random() > 0.85 ? 0 : 170 + Math.random() * 60,
      })
    }

    let predator: {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      state: 'approach' | 'chase' | 'blinded' | 'retreat'
      blindTimer: number
      hue: number
      pulse: number
    } | null = null

    let lastPredatorSpawn = 0

    let jellyIdCounter = 0
    let collectibleIdCounter = 0
    let mineIdCounter = 0
    let plumeIdCounter = 0
    let rockIdCounter = 0

    let lastJellySpawn = 0
    let lastCollectibleSpawn = 0
    let lastMineSpawn = 0
    let lastPlumeSpawn = 0
    let lastRockSpawn = 0

    const spawnSparks = (x: number, y: number, color: string, count = 12, speedMult = 1) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = (1 + Math.random() * 4) * speedMult
        gameSparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          size: 1.5 + Math.random() * 2,
          color,
        })
      }
    }

    const wildlife: DepthWildlife = initDepthWildlife(MAX_DEPTH)

    let lastHud = 0
    let lastSpawn = 0
    let lastFrame = performance.now()
    let lastZoneIdx = 0
    let paused = false
    const start = performance.now()
    let raf = 0
    let mx = w * 0.5, my = h * 0.5

    const worldToScreenY = (worldDepth: number, depth: number, vr: number) =>
      ((worldDepth - depth) / vr) * h

    const recycleAhead = (
      worldDepth: number,
      depth: number,
      bgVr: number,
      spread = 0.85,
    ) => {
      if (worldDepth < depth - 40) return depth + 20 + Math.random() * bgVr * spread
      if (worldDepth > depth + bgVr + 60) return depth + Math.random() * bgVr * 0.5
      return worldDepth
    }

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
      mouseRef.current = { x: mx / w, y: my / h }
      targetPx = mx
      targetPy = my
    }
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mx = e.touches[0].clientX
        my = e.touches[0].clientY
        mouseRef.current = { x: mx / w, y: my / h }
        targetPx = mx
        targetPy = my
      }
    }
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchstart', onTouch, { passive: true })
    document.addEventListener('visibilitychange', () => { paused = document.hidden })

    const viewRangeAt = (d: number) => 120 - (120 - 35) * Math.min(1, Math.max(0, (d - 100) / 4900))

    const frame = (now: number) => {
      if (paused) { raf = requestAnimationFrame(frame); return }
      const dt = Math.min(0.04, (now - lastFrame) / 1000)
      lastFrame = now

      if (w <= 0 || h <= 0) {
        raf = requestAnimationFrame(frame)
        return
      }

      const isPlaying = gameStateRef.current === 'playing'

      // Check Need Reset
      if (needResetRef.current) {
        needResetRef.current = false
        px = w * 0.5
        py = h * 0.3
        targetPx = w * 0.5
        targetPy = h * 0.3
        gameJellies = []
        gameCollectibles = []
        gameMines = []
        gamePlumes = []
        gameRocks = []
        gameSparks = []
        lastJellySpawn = now
        lastCollectibleSpawn = now
        lastMineSpawn = now
        lastPlumeSpawn = now
        lastRockSpawn = now

        vxRef.current = 0
        vyRef.current = 0
        tiltRef.current = 0
        sonarActiveRef.current = false
        predator = null
        lastPredatorSpawn = now
        eyes.forEach(eye => {
          eye.state = 'idle'
          eye.scatterX = 0
          eye.scatterY = 0
          eye.alpha = 0.2 + Math.random() * 0.5
        })
      }

      // 1. Calculate descent rate based on submarine vertical viewport position
      let descentRate = 0
      if (isPlaying) {
        // Diving rate: if submarine is low, descents up to 180 m/s. If high, slows down to 12 m/s
        const depthPctRatio = Math.max(0, (py - 120) / (h - 220))
        descentRate = BASE_DESCENT_RATE + depthPctRatio * 168
        depthRef.current = Math.min(MAX_DEPTH, depthRef.current + descentRate * dt)
      } else {
        descentRate = 12 // passive visual scroll
        depthRef.current = Math.min(MAX_DEPTH, depthRef.current + descentRate * dt)
      }

      const depth = depthRef.current
      const vr = viewRangeAt(depth)
      const t = now - start
      const light = lightPercent(depth)

      // 2. WebGL Background Render
      gl.clearColor(0.005, 0.02, 0.04, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.enableVertexAttribArray(posLoc)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
      gl.uniform2f(resLoc, w, h)
      gl.uniform1f(timeLoc, t)
      gl.uniform1f(depthLoc, depth)
      gl.uniform2f(mouseLoc, mx, h - my)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // 3. Clear 2D context
      fx.clearRect(0, 0, w, h)

      const isShakeActive = shakeTimeRef.current > 0
      if (isShakeActive) {
        const amt = shakeIntensityRef.current
        const dx = (Math.random() - 0.5) * amt
        const dy = (Math.random() - 0.5) * amt
        fx.save()
        fx.translate(dx, dy)
      }

      // Parallax seamount silhouettes scrolling upward
      for (const mount of seamounts) {
        const sy = worldToScreenY(mount.worldDepth, depth, vr * 1.4) + h * 0.55
        if (sy < -h * 0.3 || sy > h + h * 0.3) continue
        const mw = w * mount.width
        const mh = h * mount.height
        const mxPos = mount.x * w - mw * 0.5
        const mountAlpha = Math.min(1, depth / 1200) * mount.shade * 0.55

        fx.beginPath()
        fx.moveTo(mxPos, sy + mh)
        fx.quadraticCurveTo(mxPos + mw * 0.5, sy - mh * 0.35, mxPos + mw, sy + mh)
        fx.lineTo(mxPos + mw, h + 20)
        fx.lineTo(mxPos, h + 20)
        fx.closePath()
        fx.fillStyle = `rgba(2, 8, 14, ${mountAlpha})`
        fx.fill()
      }

      // Upward velocity streaks
      fx.beginPath()
      fx.strokeStyle = 'rgba(140, 190, 210, 0.06)'
      fx.lineWidth = 1
      for (const s of streaks) {
        s.worldDepth = recycleAhead(s.worldDepth, depth, vr, 1.0)
        const sy = worldToScreenY(s.worldDepth, depth, vr)
        if (sy < -s.len || sy > h + s.len) continue
        const sx = s.x * w + Math.sin(t * 0.0005 + s.worldDepth) * 8
        fx.moveTo(sx, sy + s.len * 0.5)
        fx.lineTo(sx, sy - s.len * 0.5)
      }
      fx.stroke()

      // Rising bubbles
      for (const b of riseBubbles) {
        b.wobble += dt * 1.2
        b.worldDepth -= b.speed * dt * 2.5
        b.worldDepth = recycleAhead(b.worldDepth, depth, vr, 0.95)
        const sy = worldToScreenY(b.worldDepth, depth, vr) + h * 0.05
        if (sy < -10 || sy > h + 10) continue
        const sx = b.x * w + Math.sin(b.wobble) * 6 * b.r
        const bubbleAlpha = 0.1 + (depth / MAX_DEPTH) * 0.15

        fx.beginPath()
        fx.arc(sx, sy, b.r, 0, Math.PI * 2)
        fx.strokeStyle = `rgba(120, 210, 230, ${bubbleAlpha})`
        fx.lineWidth = 0.6
        fx.stroke()
        fx.beginPath()
        fx.arc(sx - b.r * 0.25, sy - b.r * 0.25, b.r * 0.18, 0, Math.PI * 2)
        fx.fillStyle = `rgba(255, 255, 255, ${bubbleAlpha * 0.35})`
        fx.fill()
      }

      // Marine snow
      fx.fillStyle = 'rgba(200, 220, 235, 0.12)'
      fx.beginPath()
      for (const p of snow) {
        p.worldDepth += p.drift * dt * 40
        p.worldDepth = recycleAhead(p.worldDepth, depth, vr, 0.9)
        const sy = worldToScreenY(p.worldDepth, depth, vr)
        if (sy < -20 || sy > h + 20) continue
        const sx = p.x * w + Math.sin(t * 0.0004 + p.z * 10) * 8 * p.z
        const pr = p.r * (0.5 + p.z)
        fx.moveTo(sx + pr, sy)
        fx.arc(sx, sy, pr, 0, Math.PI * 2)
      }
      fx.fill()

      if (depth > 500) {
        fx.globalCompositeOperation = 'lighter'
        for (const b of bios) {
          b.worldDepth = recycleAhead(b.worldDepth, depth, vr, 0.8)
          const sy = worldToScreenY(b.worldDepth, depth, vr) + h * 0.08
          if (sy < -50 || sy > h + 50) continue
          const bx = b.x * w + Math.sin(t * 0.0003 + b.phase) * 20
          const pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.002 + b.phase))
          const bioVis = Math.min(1, Math.max(0, (depth - 500) / 1500)) * pulse
          fx.beginPath()
          fx.arc(bx, sy, 1.2 * b.scale, 0, Math.PI * 2)
          fx.fillStyle = `hsla(${b.hue}, 80%, 55%, ${bioVis * 0.7})`
          fx.fill()
        }
        fx.globalCompositeOperation = 'source-over'
      }

      // Update passive depth wildlife in background
      updateDepthWildlife(wildlife, depth, w, h, t, dt, vr)
      drawDepthWildlife(fx, wildlife, depth, vr, w, h, t, light)

      if (now - lastSpawn > 900 && wildlife.fish.length < 50) {
        const batch = depth > 2000 ? 1 : 2
        for (let i = 0; i < batch; i++) spawnDepthFish(wildlife, depth)
        lastSpawn = now
      }

      // --- GAMEPLAY MODE LOGIC ---
      let warningAlert = ''
      const triggerDamage = (intensity: number, duration: number) => {
        shakeIntensityRef.current = intensity
        shakeTimeRef.current = duration
        damageFlashTimeRef.current = duration * 0.8
      }

      if (shakeTimeRef.current > 0) {
        shakeTimeRef.current -= dt
      }
      if (damageFlashTimeRef.current > 0) {
        damageFlashTimeRef.current -= dt
      }

      if (isPlaying) {
        // Submarine controls & physics with weight/inertia
        const targetVx = (targetPx - px) * 5.5
        const targetVy = (targetPy - py) * 5.5
        vxRef.current += (targetVx - vxRef.current) * 4.5 * dt
        vyRef.current += (targetVy - vyRef.current) * 4.5 * dt
        
        const subSpeed = Math.hypot(vxRef.current, vyRef.current)
        const maxSubSpeed = 350
        if (subSpeed > maxSubSpeed) {
          vxRef.current = (vxRef.current / subSpeed) * maxSubSpeed
          vyRef.current = (vyRef.current / subSpeed) * maxSubSpeed
        }
        
        px += vxRef.current * dt
        py += vyRef.current * dt
        px = Math.max(40, Math.min(w - 40, px))
        py = Math.max(120, Math.min(h - 100, py))
        
        const targetTilt = (vxRef.current / maxSubSpeed) * 0.16
        tiltRef.current += (targetTilt - tiltRef.current) * 8 * dt

        // Propeller bubbles
        if (Math.random() < 0.35) {
          const isFacingRight = mx > px
          const propX = px + (isFacingRight ? -22 : 22)
          const propY = py + 3
          riseBubbles.push({
            worldDepth: depth + (propY / h) * vr,
            x: propX / w,
            r: 0.6 + Math.random() * 1.5,
            wobble: Math.random() * Math.PI * 2,
            speed: 0.8 + Math.random() * 1.2,
          })
        }

        // Check hull breaches
        if (hullRef.current <= 0) {
          spawnSparks(px, py, '#ffffff', 30, 1.8)
          spawnSparks(px, py, '#00f2ff', 25, 1.5)
          gameStateRef.current = 'gameover'
          setGameState('gameover')
        }

        // Check Challenger Deep reached with enough samples
        if (depth >= MAX_DEPTH && scoreRef.current >= TARGET_SAMPLES) {
          gameStateRef.current = 'victory'
          setGameState('victory')
        }

        // 1. Spawning Bioluminescent Jellyfish (> 200m depth)
        if (depth > 200 && now - lastJellySpawn > 2600 && gameJellies.length < 8) {
          gameJellies.push({
            id: jellyIdCounter++,
            x: 0.1 + Math.random() * 0.8,
            y: h + 40,
            speedY: 25 + Math.random() * 45,
            size: 12 + Math.random() * 16,
            phase: Math.random() * Math.PI,
            pulseSpeed: 1 + Math.random() * 1.5,
          })
          lastJellySpawn = now
        }

        // 2. Spawning Bio Samples Canisters, Battery Repairs & Trench Relics
        if (now - lastCollectibleSpawn > 3500 && gameCollectibles.length < 6) {
          const isRepair = hullRef.current < 75 && Math.random() > 0.65
          const isRelic = depth > 6000 && Math.random() > 0.45
          gameCollectibles.push({
            id: collectibleIdCounter++,
            type: isRepair ? 'repair' : (isRelic ? 'relic' : 'data'),
            x: 0.15 + Math.random() * 0.7,
            y: h + 30,
            size: isRelic ? 11 : 8,
            angle: Math.random() * Math.PI,
            pulse: Math.random() * 10,
          })
          lastCollectibleSpawn = now
        }

        // 2.5 Spawning Coral Mines (below 3000m)
        if (depth > 3000 && now - lastMineSpawn > 4000 && gameMines.length < 4) {
          gameMines.push({
            id: mineIdCounter++,
            x: 0.12 + Math.random() * 0.76,
            y: h + 35,
            size: 14 + Math.random() * 6,
            phase: Math.random() * Math.PI * 2,
            speedY: 20 + Math.random() * 30,
            disabled: false,
            disabledTimer: 0,
            detonated: false,
            detonatedTimer: 0
          })
          lastMineSpawn = now
        }

        // 3. Spawning Hydrothermal Plumes (Midnight / Abyssal depth: 1500m - 6500m)
        if (depth > 1200 && depth < 6800 && now - lastPlumeSpawn > 9000 && gamePlumes.length < 2) {
          gamePlumes.push({
            id: plumeIdCounter++,
            side: Math.random() > 0.5 ? 'left' : 'right',
            worldDepth: depth + vr * 1.2,
            width: 50 + Math.random() * 40,
            height: 120 + Math.random() * 90,
            bubbles: [],
          })
          lastPlumeSpawn = now
        }

        // 4. Spawning Hadal Rocks (Hadal trench: > 6000m depth)
        if (depth > 5800 && now - lastRockSpawn > 2200 && gameRocks.length < 6) {
          gameRocks.push({
            id: rockIdCounter++,
            x: 0.08 * w + Math.random() * 0.84 * w,
            y: -30,
            speedY: 130 + Math.random() * 110,
            size: 14 + Math.random() * 16,
            angle: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 2.5,
          })
          lastRockSpawn = now
        }

        // --- UPDATE HAZARDS ---
        // A. Jellies Update & Collision
        for (let i = gameJellies.length - 1; i >= 0; i--) {
          const j = gameJellies[i]
          j.y -= (descentRate + j.speedY) * dt
          j.phase += dt * 2.2

          if (j.y < -50) {
            gameJellies.splice(i, 1)
            continue
          }

          const dist = Math.hypot(j.x * w - px, j.y - py)
          if (dist < j.size + 14) {
            // Collision!
            hullRef.current = Math.max(0, hullRef.current - 15)
            triggerDamage(9, 0.4)
            spawnSparks(j.x * w, j.y, '#00f2ff', 20, 1.2)
            spawnSparks(j.x * w, j.y, '#ffffff', 10, 1)
            gameJellies.splice(i, 1)
            continue
          }
        }

        // B. Collectibles Update & Collision
        for (let i = gameCollectibles.length - 1; i >= 0; i--) {
          const c = gameCollectibles[i]
          c.y -= descentRate * dt
          c.pulse += dt * 4.5
          c.angle += dt * 0.6

          if (c.y < -40) {
            gameCollectibles.splice(i, 1)
            continue
          }

          const dist = Math.hypot(c.x * w - px, c.y - py)
          if (dist < c.size + 16) {
            if (c.type === 'data') {
              scoreRef.current += 1
              spawnSparks(c.x * w, c.y, '#34d399', 16, 0.9)
            } else if (c.type === 'relic') {
              scoreRef.current += 2
              hullRef.current = Math.min(100, hullRef.current + 15)
              spawnSparks(c.x * w, c.y, '#fbbf24', 32, 1.4)
              spawnSparks(c.x * w, c.y, '#ffffff', 12, 1.0)
            } else {
              hullRef.current = Math.min(100, hullRef.current + 25)
              spawnSparks(c.x * w, c.y, '#60a5fa', 22, 1.2)
            }
            gameCollectibles.splice(i, 1)
            continue
          }
        }

        // B.5. Coral Mines Update, Sonar Sweep & Collision
        for (let i = gameMines.length - 1; i >= 0; i--) {
          const m = gameMines[i]
          m.y -= (descentRate + m.speedY) * dt
          m.phase += dt * 1.5

          if (m.y < -50) {
            gameMines.splice(i, 1)
            continue
          }

          if (m.detonated) {
            if (m.detonatedTimer !== undefined) {
              m.detonatedTimer -= dt
              if (m.detonatedTimer <= 0) {
                gameMines.splice(i, 1)
                continue
              }
            }
          } else {
            // Check sonar sweep neutralization
            const distToSub = Math.hypot(m.x * w - px, m.y - py)
            if (sonarActiveRef.current && distToSub < sonarRadiusRef.current) {
              m.detonated = true
              m.detonatedTimer = 0.5
              spawnSparks(m.x * w, m.y, '#00f2ff', 16, 0.9)
              spawnSparks(m.x * w, m.y, '#ffffff', 8, 0.7)
              continue
            }

            // Check collision with sub
            if (distToSub < m.size + 14) {
              m.detonated = true
              m.detonatedTimer = 0.5
              hullRef.current = Math.max(0, hullRef.current - 25)
              triggerDamage(16, 0.5)
              spawnSparks(m.x * w, m.y, '#ef4444', 24, 1.5)
              spawnSparks(m.x * w, m.y, '#f97316', 15, 1.2)
              continue
            }
          }
        }

        // C. Hydrothermal Plumes Update, Bubbles & Damage
        for (let i = gamePlumes.length - 1; i >= 0; i--) {
          const p = gamePlumes[i]
          const pyScreen = worldToScreenY(p.worldDepth, depth, vr)

          if (pyScreen < -h * 0.4) {
            gamePlumes.splice(i, 1)
            continue
          }

          // Emit plume bubbles
          if (pyScreen > -50 && pyScreen < h + 50 && Math.random() < 0.42) {
            p.bubbles.push({
              x: p.side === 'left' ? p.width * (0.6 + Math.random() * 0.3) : w - p.width * (0.6 + Math.random() * 0.3),
              y: pyScreen + 5,
              vx: (Math.random() - 0.5) * 12,
              vy: -(80 + Math.random() * 90),
              size: 2.2 + Math.random() * 4,
              life: 1.0,
            })
          }

          // Update plume bubbles
          for (let bIdx = p.bubbles.length - 1; bIdx >= 0; bIdx--) {
            const b = p.bubbles[bIdx]
            b.x += b.vx * dt
            b.y += (b.vy - descentRate) * dt
            b.life -= dt * 0.85
            if (b.life <= 0 || b.y < -20) {
              p.bubbles.splice(bIdx, 1)
            }
          }

          // Check sub proximity/collision with thermal bubble stream
          const pxLeftBorder = p.side === 'left' ? 0 : w - p.width - 25
          const pxRightBorder = p.side === 'left' ? p.width + 25 : w
          const isSubInColumnX = px >= pxLeftBorder && px <= pxRightBorder

          if (isSubInColumnX && py < pyScreen && py > pyScreen - p.height * 1.8) {
            warningAlert = 'THERMAL VENT CURRENT'
            hullRef.current = Math.max(0, hullRef.current - 18 * dt)
            if (Math.random() < 0.18) {
              spawnSparks(px, py, '#f97316', 2, 0.7)
            }
            triggerDamage(2.2, 0.15)
          }
        }

        // D. Hadal Rocks Update & Collision
        for (let i = gameRocks.length - 1; i >= 0; i--) {
          const r = gameRocks[i]
          r.y += (descentRate + r.speedY) * dt
          r.angle += r.rotSpeed * dt

          if (r.y > h + 50) {
            gameRocks.splice(i, 1)
            continue
          }

          const dist = Math.hypot(r.x - px, r.y - py)
          if (dist < r.size + 14) {
            hullRef.current = Math.max(0, hullRef.current - 20)
            triggerDamage(14, 0.48)
            spawnSparks(r.x, r.y, '#4b5563', 24, 1.4)
            gameRocks.splice(i, 1)
            continue
          }
        }

        // E. Predator Anglerfish AI Update
        if (depth > 2000 && depth < 8500 && !predator && now - lastPredatorSpawn > 25000) {
          predator = {
            x: Math.random() > 0.5 ? -120 : w + 120,
            y: py + (Math.random() - 0.5) * 150,
            vx: 0,
            vy: 0,
            size: 28,
            state: 'approach',
            blindTimer: 0,
            hue: 290,
            pulse: 0,
          }
          lastPredatorSpawn = now
        }

        if (predator) {
          predator.pulse += dt * 5
          
          if (predator.state === 'approach') {
            warningAlert = 'HOSTILE BIO-SIGNATURE APPROACHING'
            const targetX = predator.x < w/2 ? 100 : w - 100
            const targetY = py
            predator.x += (targetX - predator.x) * 2.5 * dt
            predator.y += (targetY - predator.y) * 2.5 * dt
            if (Math.abs(predator.x - targetX) < 120) {
              predator.state = 'chase'
            }
          } else if (predator.state === 'chase') {
            const dx = px - predator.x
            const dy = py - predator.y
            const dist = Math.hypot(dx, dy)
            const speed = 125 + (depth / MAX_DEPTH) * 65
            predator.vx = (dx / dist) * speed
            predator.vy = (dy / dist) * speed
            
            predator.x += predator.vx * dt
            predator.y += predator.vy * dt
            
            // Check searchlight blind
            if (dist < 220) {
              const lightAngle = Math.atan2(my - py, mx - px)
              const predAngle = Math.atan2(dy, dx)
              let angleDiff = Math.abs(lightAngle - predAngle)
              if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff
              
              if (angleDiff < 0.26) {
                predator.state = 'blinded'
                predator.blindTimer = 1.6
                predator.vx = -predator.vx * 0.7
                predator.vy = -predator.vy * 0.7
              }
            }
          } else if (predator.state === 'blinded') {
            warningAlert = 'PREDATOR BLINDED'
            predator.blindTimer -= dt
            predator.x += predator.vx * dt
            predator.y += predator.vy * dt
            predator.vx *= 0.94
            predator.vy *= 0.94
            
            if (predator.blindTimer <= 0) {
              predator.state = 'chase'
            }
          } else if (predator.state === 'retreat') {
            predator.x += predator.vx * dt
            predator.y += (predator.vy - descentRate) * dt
            if (predator.x < -200 || predator.x > w + 200 || predator.y < -200) {
              predator = null
            }
          }

          if (predator) {
            const dist = Math.hypot(predator.x - px, predator.y - py)
            if (dist < predator.size + 15 && predator.state !== 'retreat') {
              hullRef.current = Math.max(0, hullRef.current - 25)
              triggerDamage(18, 0.6)
              spawnSparks(predator.x, predator.y, '#f43f5e', 30, 1.8)
              predator.state = 'retreat'
              predator.vx = predator.x < px ? -300 : 300
              predator.vy = -200
            }
          }
        }

      // --- RENDERING GAME STUFF ---

      // A. Draw hydrothermal plumes chimneys and bubble streams
      for (const p of gamePlumes) {
        const pyScreen = worldToScreenY(p.worldDepth, depth, vr)
        if (pyScreen < -p.height - 20 || pyScreen > h + 20) continue

        // Draw bubble particles
        for (const b of p.bubbles) {
          fx.beginPath()
          fx.arc(b.x, b.y, b.size * b.life, 0, Math.PI * 2)
          fx.fillStyle = `rgba(${230 + Math.random() * 25}, 110, 20, ${b.life * 0.75})`
          fx.fill()
        }

        // Chimney body
        fx.save()
        fx.shadowColor = '#ea580c'
        fx.shadowBlur = 10
        fx.beginPath()
        if (p.side === 'left') {
          fx.moveTo(0, pyScreen + p.height)
          fx.lineTo(p.width, pyScreen + p.height * 0.8)
          fx.lineTo(p.width - 15, pyScreen)
          fx.lineTo(0, pyScreen)
        } else {
          fx.moveTo(w, pyScreen + p.height)
          fx.lineTo(w - p.width, pyScreen + p.height * 0.8)
          fx.lineTo(w - p.width + 15, pyScreen)
          fx.lineTo(w, pyScreen)
        }
        fx.closePath()
        fx.fillStyle = '#1e293b'
        fx.strokeStyle = '#f97316'
        fx.lineWidth = 2
        fx.fill()
        fx.stroke()
        fx.restore()
      }

      // B. Draw Collectibles
      for (const c of gameCollectibles) {
        fx.save()
        fx.translate(c.x * w, c.y)
        fx.rotate(c.angle)
        const pulseSize = c.size + Math.sin(c.pulse) * 1.5

        if (c.type === 'data') {
          fx.beginPath()
          fx.arc(0, 0, pulseSize * 1.6, 0, Math.PI * 2)
          fx.strokeStyle = 'rgba(52, 211, 153, 0.18)'
          fx.lineWidth = 4
          fx.stroke()

          fx.beginPath()
          fx.arc(0, 0, pulseSize, 0, Math.PI * 2)
          fx.fillStyle = '#34d399'
          fx.fill()

          fx.beginPath()
          fx.arc(-pulseSize * 0.25, -pulseSize * 0.25, pulseSize * 0.2, 0, Math.PI * 2)
          fx.fillStyle = '#ffffff'
          fx.fill()
        } else if (c.type === 'relic') {
          // Golden Trench Relic: Glowing gold/amber diamond with red/orange jewel core
          fx.beginPath()
          fx.moveTo(0, -pulseSize * 1.4)
          fx.lineTo(pulseSize * 0.95, 0)
          fx.lineTo(0, pulseSize * 1.4)
          fx.lineTo(-pulseSize * 0.95, 0)
          fx.closePath()
          
          const relicGrad = fx.createRadialGradient(0, 0, 1, 0, 0, pulseSize * 1.4)
          relicGrad.addColorStop(0, '#fffbeb')
          relicGrad.addColorStop(0.3, '#fbbf24') // gold amber
          relicGrad.addColorStop(1, '#d97706') // deep bronze
          fx.fillStyle = relicGrad
          fx.strokeStyle = '#fef08a'
          fx.lineWidth = 1.8
          fx.fill()
          fx.stroke()
          
          // Outer gold glow rings
          fx.beginPath()
          fx.arc(0, 0, pulseSize * 2.2, 0, Math.PI * 2)
          fx.strokeStyle = 'rgba(251, 191, 36, 0.12)'
          fx.lineWidth = 2
          fx.stroke()

          // Jewel core
          fx.beginPath()
          fx.arc(0, 0, pulseSize * 0.42, 0, Math.PI * 2)
          fx.fillStyle = '#ef4444' // red core jewel
          fx.fill()
        } else {
          // Repair toolbox
          fx.beginPath()
          fx.rect(-pulseSize, -pulseSize * 0.6, pulseSize * 2, pulseSize * 1.2)
          fx.fillStyle = '#3b82f6'
          fx.strokeStyle = '#93c5fd'
          fx.lineWidth = 1.2
          fx.fill()
          fx.stroke()

          // Cross sign
          fx.beginPath()
          fx.rect(-pulseSize * 0.4, -pulseSize * 0.15, pulseSize * 0.8, pulseSize * 0.3)
          fx.rect(-pulseSize * 0.15, -pulseSize * 0.4, pulseSize * 0.3, pulseSize * 0.8)
          fx.fillStyle = '#ffffff'
          fx.fill()
        }
        fx.restore()
      }

      // B.5 Draw Coral Mines
      for (const m of gameMines) {
        fx.save()
        fx.translate(m.x * w, m.y)
        
        if (m.detonated) {
          const detPct = 1.0 - (m.detonatedTimer || 0) / 0.5
          const glowSize = m.size * (1.0 + detPct * 2.5)
          
          fx.beginPath()
          fx.arc(0, 0, glowSize, 0, Math.PI * 2)
          fx.fillStyle = `rgba(0, 242, 255, ${(1.0 - detPct) * 0.45})`
          fx.fill()
        } else {
          const pulse = 1.0 + Math.sin(m.phase) * 0.08
          const sz = m.size * pulse
          
          const mineGlow = fx.createRadialGradient(0, 0, 2, 0, 0, sz * 2.0)
          mineGlow.addColorStop(0, 'rgba(239, 68, 68, 0.45)')
          mineGlow.addColorStop(0.6, 'rgba(153, 27, 27, 0.15)')
          mineGlow.addColorStop(1, 'rgba(0,0,0,0)')
          fx.fillStyle = mineGlow
          fx.beginPath(); fx.arc(0, 0, sz * 2.0, 0, Math.PI * 2); fx.fill()

          fx.strokeStyle = '#ef4444'
          fx.lineWidth = 2.5
          for (let spIdx = 0; spIdx < 8; spIdx++) {
            const angle = (spIdx / 8) * Math.PI * 2 + m.phase * 0.3
            fx.beginPath()
            fx.moveTo(0, 0)
            fx.lineTo(Math.cos(angle) * sz * 1.5, Math.sin(angle) * sz * 1.5)
            fx.stroke()
          }

          fx.beginPath()
          fx.arc(0, 0, sz, 0, Math.PI * 2)
          const coreGrad = fx.createRadialGradient(-sz * 0.2, -sz * 0.2, 1, 0, 0, sz)
          coreGrad.addColorStop(0, '#fca5a5')
          coreGrad.addColorStop(0.6, '#b91c1c')
          coreGrad.addColorStop(1, '#450a0a')
          fx.fillStyle = coreGrad
          fx.fill()
          
          fx.strokeStyle = '#f87171'
          fx.lineWidth = 1.2
          fx.stroke()
        }
        fx.restore()
      }

      // C. Draw Jellies
      for (const j of gameJellies) {
        fx.save()
        fx.translate(j.x * w, j.y)
        const pulse = Math.sin(t * 0.003 * j.pulseSpeed + j.phase) * 0.15 + 0.85

        // Tentacles
        fx.beginPath()
        fx.strokeStyle = 'rgba(0, 242, 255, 0.38)'
        fx.lineWidth = 1.2
        for (let tIdx = -2; tIdx <= 2; tIdx++) {
          const tx = tIdx * j.size * 0.22
          fx.moveTo(tx, 0)
          fx.bezierCurveTo(
            tx + Math.sin(t * 0.01 + tIdx) * 3, j.size * 0.6,
            tx - Math.sin(t * 0.015 + tIdx) * 3, j.size * 1.2,
            tx + Math.sin(t * 0.008 + tIdx) * 4, j.size * 1.7 * pulse
          )
        }
        fx.stroke()

        // Dome Head
        fx.beginPath()
        fx.arc(0, 0, j.size * pulse, Math.PI, 0, false)
        fx.quadraticCurveTo(j.size * 0.65 * pulse, j.size * 0.25, 0, j.size * 0.35)
        fx.quadraticCurveTo(-j.size * 0.65 * pulse, j.size * 0.25, -j.size * pulse, 0)
        fx.closePath()
        const jellyGrad = fx.createRadialGradient(0, -j.size * 0.2, 2, 0, 0, j.size)
        jellyGrad.addColorStop(0, '#ffffff')
        jellyGrad.addColorStop(0.5, 'rgba(0, 242, 255, 0.75)')
        jellyGrad.addColorStop(1, 'rgba(0, 100, 255, 0.1)')
        fx.fillStyle = jellyGrad
        fx.fill()
        fx.restore()
      }

      // D. Draw Hadal Rocks
      for (const r of gameRocks) {
        fx.save()
        fx.translate(r.x, r.y)
        fx.rotate(r.angle)

        fx.beginPath()
        fx.moveTo(-r.size * 0.8, -r.size * 0.4)
        fx.lineTo(-r.size * 0.2, -r.size * 0.8)
        fx.lineTo(r.size * 0.5, -r.size * 0.7)
        fx.lineTo(r.size * 0.9, -r.size * 0.1)
        fx.lineTo(r.size * 0.6, r.size * 0.6)
        fx.lineTo(-r.size * 0.4, r.size * 0.8)
        fx.closePath()

        fx.fillStyle = '#374151'
        fx.strokeStyle = '#1e293b'
        fx.lineWidth = 2
        fx.fill()
        fx.stroke()
        fx.restore()
      }

      // --- EYE PROWLERS DRAWING & UPDATING ---
      for (const eye of eyes) {
        const eyScreen = worldToScreenY(eye.worldDepth, depth, vr)
        const exScreen = eye.x * w + eye.scatterX
        
        if (eyScreen < -50 || eyScreen > h + 50) {
          if (eye.state === 'scatter') {
            eye.state = 'idle'
            eye.scatterX = 0
            eye.scatterY = 0
            eye.alpha = 0.2 + Math.random() * 0.5
            eye.worldDepth = depth + vr * 1.1
            eye.x = Math.random()
          }
          continue
        }
        
        if (eye.state === 'scatter') {
          eye.scatterX += eye.vx * dt
          eye.worldDepth += (eye.vy - descentRate) * dt
          eye.alpha -= dt * 1.5
        } else {
          // Check if searchlight cone hits the eye
          const dx = exScreen - px
          const dy = eyScreen - py
          const dist = Math.hypot(dx, dy)
          
          if (dist < 220) {
            const lightAngle = Math.atan2(my - py, mx - px)
            const eyeAngle = Math.atan2(dy, dx)
            let angleDiff = Math.abs(lightAngle - eyeAngle)
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff
            
            if (angleDiff < 0.26) {
              eye.state = 'scatter'
              const runAngle = eyeAngle + (Math.random() - 0.5) * 0.5
              const speed = 260 + Math.random() * 220
              eye.vx = Math.cos(runAngle) * speed
              eye.vy = Math.sin(runAngle) * speed
            }
          }
        }
        
        if (eye.alpha > 0) {
          fx.save()
          fx.fillStyle = `hsla(${eye.hue}, 100%, 65%, ${eye.alpha * 0.85})`
          fx.shadowColor = `hsla(${eye.hue}, 100%, 65%, 1.0)`
          fx.shadowBlur = 5
          fx.beginPath()
          fx.arc(exScreen - 3.5, eyScreen, eye.size, 0, Math.PI * 2)
          fx.arc(exScreen + 3.5, eyScreen, eye.size, 0, Math.PI * 2)
          fx.fill()
          fx.restore()
        }
      }

      // --- SONAR ACTIVE DRAWING & UPDATE ---
      if (sonarActiveRef.current) {
        sonarRadiusRef.current += 320 * dt
        if (sonarRadiusRef.current > 420) {
          sonarActiveRef.current = false
        } else {
          fx.save()
          fx.beginPath()
          fx.arc(px, py, sonarRadiusRef.current, 0, Math.PI * 2)
          fx.strokeStyle = `rgba(0, 242, 255, ${1.0 - sonarRadiusRef.current / 420})`
          fx.lineWidth = 2.5
          fx.stroke()
          
          const sonarGrad = fx.createRadialGradient(px, py, sonarRadiusRef.current - 18, px, py, sonarRadiusRef.current)
          sonarGrad.addColorStop(0, 'rgba(0, 242, 255, 0)')
          sonarGrad.addColorStop(0.5, `rgba(0, 242, 255, ${(1.0 - sonarRadiusRef.current / 420) * 0.15})`)
          sonarGrad.addColorStop(1, 'rgba(0, 242, 255, 0)')
          fx.fillStyle = sonarGrad
          fx.fill()
          fx.restore()
        }
      }

      // Helper function to draw scanning HUD boxes
      const drawSonarScanTag = (x: number, y: number, name: string, isHazard: boolean, size: number) => {
        const dist = Math.hypot(x - px, y - py)
        const isSwept = sonarActiveRef.current && dist < sonarRadiusRef.current && (sonarRadiusRef.current - dist < 60)
        
        if (isSwept || (sonarActiveRef.current && dist < sonarRadiusRef.current)) {
          fx.save()
          const color = isHazard ? '#f87171' : '#34d399'
          fx.strokeStyle = color
          fx.lineWidth = 1.0
          const boxSize = size * 2 + 10
          fx.strokeRect(x - boxSize/2, y - boxSize/2, boxSize, boxSize)
          
          // Corner ticks
          fx.beginPath()
          fx.moveTo(x - boxSize/2, y - boxSize/4)
          fx.lineTo(x - boxSize/2, y - boxSize/2)
          fx.lineTo(x - boxSize/4, y - boxSize/2)
          fx.moveTo(x + boxSize/4, y - boxSize/2)
          fx.lineTo(x + boxSize/2, y - boxSize/2)
          fx.lineTo(x + boxSize/2, y - boxSize/4)
          fx.moveTo(x - boxSize/2, y + boxSize/4)
          fx.lineTo(x - boxSize/2, y + boxSize/2)
          fx.lineTo(x - boxSize/4, y + boxSize/2)
          fx.moveTo(x + boxSize/4, y + boxSize/2)
          fx.lineTo(x + boxSize/2, y + boxSize/2)
          fx.lineTo(x + boxSize/2, y + boxSize/4)
          fx.stroke()
          
          fx.fillStyle = color
          fx.font = 'bold 8px monospace'
          fx.fillText(name, x + boxSize/2 + 4, y + 3)
          fx.restore()
        }
      }

      // Draw Sonar HUD tags for Jellies
      for (const j of gameJellies) {
        drawSonarScanTag(j.x * w, j.y, 'HAZARD: JELLY', true, j.size)
      }
      // Draw Sonar HUD tags for Collectibles
      for (const c of gameCollectibles) {
        let tag = 'SPECIMEN'
        if (c.type === 'repair') tag = 'REPAIR KIT'
        if (c.type === 'relic') tag = '★ GOLDEN RELIC ★'
        drawSonarScanTag(c.x * w, c.y, tag, false, c.size)
      }
      // Draw Sonar HUD tags for Hadal Rocks
      for (const r of gameRocks) {
        drawSonarScanTag(r.x, r.y, 'HAZARD: HADAL ROCK', true, r.size)
      }
      // Draw Sonar HUD tags for Coral Mines
      for (const m of gameMines) {
        drawSonarScanTag(m.x * w, m.y, 'HAZARD: CORAL MINE', true, m.size)
      }

      // --- DRAW ANGLERFISH PREDATOR ---
      if (predator) {
        fx.save()
        fx.translate(predator.x, predator.y)
        const isFacingRight = predator.vx > 0 || px > predator.x
        if (!isFacingRight) fx.scale(-1, 1)
        
        // Body (spooky purple/cyan gradient)
        fx.beginPath()
        fx.ellipse(0, 0, predator.size, predator.size * 0.85, 0, 0, Math.PI * 2)
        const pGrad = fx.createRadialGradient(0, 0, 5, 0, 0, predator.size)
        pGrad.addColorStop(0, '#312e81')
        pGrad.addColorStop(0.7, '#1e1b4b')
        pGrad.addColorStop(1, '#6b21a8')
        fx.fillStyle = pGrad
        fx.strokeStyle = '#a855f7'
        fx.lineWidth = 2
        fx.fill()
        fx.stroke()
        
        // Jaw with sharp teeth
        fx.beginPath()
        fx.moveTo(predator.size * 0.2, predator.size * 0.3)
        fx.lineTo(predator.size * 0.85, predator.size * 0.1)
        fx.lineTo(predator.size * 0.55, predator.size * 0.5)
        fx.closePath()
        fx.fillStyle = '#1e1b4b'
        fx.strokeStyle = '#a855f7'
        fx.lineWidth = 1.5
        fx.fill()
        fx.stroke()
        
        // Sharp triangle teeth
        fx.fillStyle = '#ffffff'
        fx.beginPath()
        fx.moveTo(predator.size * 0.35, predator.size * 0.2)
        fx.lineTo(predator.size * 0.45, predator.size * 0.38)
        fx.lineTo(predator.size * 0.5, predator.size * 0.2)
        fx.lineTo(predator.size * 0.6, predator.size * 0.38)
        fx.lineTo(predator.size * 0.65, predator.size * 0.2)
        fx.fill()
        
        // Lure stem
        fx.beginPath()
        fx.moveTo(-predator.size * 0.2, -predator.size * 0.8)
        fx.quadraticCurveTo(predator.size * 0.6, -predator.size * 1.35, predator.size * 0.75, -predator.size * 0.55)
        fx.strokeStyle = '#a855f7'
        fx.lineWidth = 2
        fx.stroke()
        
        // Lure Bulb (Bioluminescent Cyan glow)
        const bulbPulse = 7 + Math.sin(predator.pulse) * 2.5
        const bulbX = predator.size * 0.75
        const bulbY = -predator.size * 0.55
        
        fx.beginPath()
        fx.arc(bulbX, bulbY, bulbPulse, 0, Math.PI * 2)
        const lureGrad = fx.createRadialGradient(bulbX, bulbY, 1, bulbX, bulbY, bulbPulse)
        lureGrad.addColorStop(0, '#ffffff')
        lureGrad.addColorStop(0.4, '#22d3ee')
        lureGrad.addColorStop(1, 'rgba(34, 211, 238, 0)')
        fx.fillStyle = lureGrad
        fx.fill()
        
        // Eye (glow red or go gray if blinded)
        fx.beginPath()
        fx.arc(predator.size * 0.3, -predator.size * 0.2, 3, 0, Math.PI * 2)
        fx.fillStyle = predator.state === 'blinded' ? '#64748b' : '#ef4444'
        fx.fill()
        
        // Blind sparkles
        if (predator.state === 'blinded') {
          fx.fillStyle = '#ffffff'
          for (let sIdx = 0; sIdx < 5; sIdx++) {
            const sx = (Math.random() - 0.5) * 45
            const sy = (Math.random() - 0.5) * 45
            fx.fillRect(sx, sy, 1.8, 1.8)
          }
        }
        
        fx.restore()
        
        // Draw Sonar Warning on Predator
        drawSonarScanTag(predator.x, predator.y, 'HOSTILE: DEEP PREDATOR', true, predator.size)
      }

      }

      // E. Draw Submarine
      if (isPlaying) {
        const isFacingRight = mx > px

        // Draw Searchlight cone
        const angle = Math.atan2(my - py, mx - px)
        const coneLen = 220
        const coneAngle = 0.26
        fx.save()
        fx.beginPath()
        fx.moveTo(px, py)
        fx.arc(px, py, coneLen, angle - coneAngle, angle + coneAngle)
        fx.closePath()
        const lightGrad = fx.createRadialGradient(px, py, 10, px, py, coneLen)
        lightGrad.addColorStop(0, 'rgba(0, 242, 255, 0.38)')
        lightGrad.addColorStop(0.5, 'rgba(0, 220, 255, 0.12)')
        lightGrad.addColorStop(1, 'rgba(0, 100, 255, 0)')
        fx.fillStyle = lightGrad
        fx.fill()
        fx.restore()

        // Draw Submarine body
        fx.save()
        fx.translate(px, py)
        fx.rotate(tiltRef.current)
        if (!isFacingRight) fx.scale(-1, 1)

        // Propeller spin
        const propY = Math.sin(t * 0.05) * 8
        fx.beginPath()
        fx.moveTo(-18, -propY)
        fx.lineTo(-18, propY)
        fx.strokeStyle = '#00f2ff'
        fx.lineWidth = 2
        fx.stroke()

        // Propeller shaft
        fx.fillStyle = '#6b7280'
        fx.fillRect(-18, -2, 4, 4)

        // Tail fin
        fx.beginPath()
        fx.moveTo(-14, 0)
        fx.lineTo(-20, -6)
        fx.lineTo(-22, -6)
        fx.lineTo(-18, 0)
        fx.lineTo(-22, 6)
        fx.lineTo(-20, 6)
        fx.closePath()
        fx.fillStyle = '#374151'
        fx.fill()

        // Ellipse hull
        fx.beginPath()
        fx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2)
        fx.fillStyle = '#4b5563'
        fx.strokeStyle = '#00f2ff'
        fx.lineWidth = 1.5
        fx.fill()
        fx.stroke()

        // Viewport window
        fx.beginPath()
        fx.arc(8, -1, 4, 0, Math.PI * 2)
        fx.fillStyle = '#93c5fd'
        fx.strokeStyle = '#00f2ff'
        fx.lineWidth = 1
        fx.fill()
        fx.stroke()

        // Viewport highlight
        fx.beginPath()
        fx.arc(6.5, -2.5, 1.2, 0, Math.PI * 2)
        fx.fillStyle = '#ffffff'
        fx.fill()

        // Conning tower top hatch
        fx.beginPath()
        fx.rect(-4, -15, 8, 6)
        fx.fillStyle = '#374151'
        fx.strokeStyle = '#00f2ff'
        fx.lineWidth = 1.5
        fx.fill()
        fx.stroke()

        // Periscope
        fx.beginPath()
        fx.moveTo(0, -15)
        fx.lineTo(0, -22)
        fx.lineTo(4, -22)
        fx.strokeStyle = '#00f2ff'
        fx.lineWidth = 1.5
        fx.stroke()

        fx.restore()
      } else {
        // Passive start screen submarine float
        const floatAngle = t * 0.0004
        const floatX = w * 0.5 + Math.cos(floatAngle) * 120
        const floatY = h * 0.5 + Math.sin(floatAngle) * 35

        fx.save()
        fx.translate(floatX, floatY)
        fx.scale(Math.cos(floatAngle) > 0 ? 1 : -1, 1)

        fx.beginPath()
        fx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2)
        fx.fillStyle = '#4b5563'
        fx.strokeStyle = 'rgba(0, 242, 255, 0.4)'
        fx.lineWidth = 1.5
        fx.fill()
        fx.stroke()

        fx.beginPath()
        fx.rect(-3, -13, 6, 4)
        fx.fillStyle = '#374151'
        fx.fill()
        fx.restore()
      }

      // F. Sparks Update & Render
      for (let i = gameSparks.length - 1; i >= 0; i--) {
        const s = gameSparks[i]
        s.x += s.vx
        s.y += s.vy
        s.life -= dt * 1.5
        if (s.life <= 0) {
          gameSparks.splice(i, 1)
          continue
        }

        fx.beginPath()
        fx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2)
        fx.fillStyle = s.color
        fx.globalAlpha = s.life
        fx.fill()
        fx.globalAlpha = 1.0
      }

      if (isShakeActive) {
        fx.restore()
      }

      // Draw damage flash vignette overlay
      if (damageFlashTimeRef.current > 0) {
        const flashAlpha = (damageFlashTimeRef.current / (0.45 * 0.8)) * 0.45
        fx.save()
        const flashGrad = fx.createRadialGradient(w/2, h/2, Math.min(w, h) * 0.3, w/2, h/2, Math.max(w, h) * 0.8)
        flashGrad.addColorStop(0, 'rgba(239, 68, 68, 0)')
        flashGrad.addColorStop(1, `rgba(239, 68, 68, ${Math.max(0, Math.min(0.45, flashAlpha))})`)
        fx.fillStyle = flashGrad
        fx.fillRect(0, 0, w, h)
        fx.restore()
      }

      // --- PROCESS HUD UPDATES ---
      if (now - lastHud > 100) {
        lastHud = now
        const zone = getZone(depth)
        const zoneIdx = ZONES.indexOf(zone)
        if (zoneIdx !== lastZoneIdx && depth > 5) {
          lastZoneIdx = zoneIdx
          setZoneFlash(zone.short)
          window.setTimeout(() => setZoneFlash(''), 2200)
        }
        
        setHud({
          depth,
          zone,
          pressure: pressureAtm(depth),
          temp: tempC(depth),
          light,
          rate: Math.round(descentRate),
          hull: Math.round(hullRef.current),
          score: scoreRef.current,
          warning: warningAlert,
        })
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchstart', onTouch)
      gl.deleteProgram(prog)
    }
  }, [])

  const depthPct = (hud.depth / MAX_DEPTH) * 100
  const progressPct = (hud.score / TARGET_SAMPLES) * 100

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-[#010810] select-none touch-none"
      onMouseDown={triggerSonarPing}
      onTouchStart={triggerSonarPing}
    >
      <canvas ref={glRef} className="absolute inset-0 z-0 h-full w-full" />
      <canvas ref={fxRef} className="absolute inset-0 z-[1] h-full w-full" />

      {!webglOk && (
        <div
          className="absolute inset-0 z-[2]"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(8,55,68,0.9) 0%, rgba(1,8,16,1) 55%), linear-gradient(180deg, #0a2830 0%, #010810 100%)',
          }}
        />
      )}

      {/* Return link */}
      <a
        href="/"
        data-astro-reload=""
        className="pointer-events-auto fixed right-6 top-6 z-40 border-2 border-teal-400/80 bg-black/85 px-4 py-2 font-mono text-xs text-white shadow-lg shadow-black/50 backdrop-blur-sm transition-all hover:bg-teal-500/30 sm:px-5 sm:py-2.5 sm:text-sm"
      >
        ← back
      </a>

      {/* Start overlay screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm p-6">
          <div className="max-w-md w-full border border-teal-500/30 bg-black/95 p-8 text-center shadow-2xl">
            <h1 className="text-2xl font-bold tracking-widest text-teal-400 font-mono mb-4">
              ABYSSAL DESCENT
            </h1>
            <p className="text-xs font-mono text-teal-100/70 leading-relaxed mb-6 space-y-2 text-left">
              <span>▸ Pilot the bathyscaphe into the Challenger Deep trench floor.</span><br />
              <span>▸ Move cursor/touch to steer. The submarine follows targets.</span><br />
              <span>▸ Hold sub low on screen to dive faster. Hold high to slow down.</span><br />
              <span>▸ Avoid hazards: Hydrothermal vents, toxic bubbles, Jellies, falling rocks.</span><br />
              <span>▸ Gather {TARGET_SAMPLES} glowing Bio Samples and reach 10,994m to win.</span>
            </p>
            <button
              onClick={handleStartGame}
              className="pointer-events-auto w-full border border-teal-400/80 hover:bg-teal-500/20 text-white font-mono text-xs px-6 py-3 transition-all tracking-widest"
            >
              LAUNCH EXPEDITION
            </button>
          </div>
        </div>
      )}

      {/* Game Over screen */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="max-w-md w-full border border-red-500/30 bg-black/95 p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold tracking-widest text-red-500 font-mono mb-4">HULL COMPROMISED</h2>
            <p className="text-xs font-mono text-red-200/70 leading-relaxed mb-6">
              Vessel suffered structural failure. Structural hull imploded under crushing deep ocean pressures.
            </p>
            <button
              onClick={handleStartGame}
              className="pointer-events-auto w-full border border-red-500/80 hover:bg-red-500/20 text-white font-mono text-xs px-6 py-3 transition-all tracking-widest"
            >
              LAUNCH RECOVERY SUB
            </button>
          </div>
        </div>
      )}

      {/* Victory screen */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="max-w-md w-full border border-green-500/30 bg-black/95 p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold tracking-widest text-green-400 font-mono mb-4">MISSION COMPLETE</h2>
            <p className="text-xs font-mono text-green-200/85 leading-relaxed mb-6">
              Bathyscaphe successfully navigated to Challenger Deep (10,994m) and secured {hud.score} abyssal marine bio-specimens.
            </p>
            <p className="font-mono text-[11px] text-white/75 leading-relaxed mb-6 border-y border-green-900/40 py-4 px-2">
              Redirecting to home page in <span className="text-green-400 font-bold">{redirectCountdown}s</span>...
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleStartGame}
                className="pointer-events-auto flex-1 border border-green-700/50 bg-black/50 hover:bg-green-950/40 text-green-200 font-mono text-[10px] px-4 py-2.5 transition-all tracking-widest cursor-pointer flex items-center justify-center"
              >
                PLAY AGAIN
              </button>
              <a
                href="/"
                data-astro-reload=""
                className="pointer-events-auto flex-1 border border-green-500/80 bg-green-500/10 hover:bg-green-500/20 text-white font-mono text-[10px] px-4 py-2.5 transition-all tracking-widest cursor-pointer flex items-center justify-center"
              >
                RETURN HOME
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Warning Alert Banner */}
      {gameState === 'playing' && hud.warning && (
        <div className="pointer-events-none absolute inset-x-0 top-1/4 z-10 flex justify-center">
          <p className="animate-pulse border border-orange-500/50 bg-orange-950/85 px-6 py-3 font-mono text-xs uppercase tracking-[0.25em] text-orange-200 shadow-xl backdrop-blur-sm">
            {hud.warning}
          </p>
        </div>
      )}

      {gameState === 'playing' && hud.hull < 30 && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-10 flex justify-center">
          <p className="animate-pulse border border-red-500/50 bg-red-950/85 px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-red-200 shadow-xl backdrop-blur-sm">
            WARNING: STRUCTURAL COMPROMISE
          </p>
        </div>
      )}

      {/* Progress tracker samples meter - Left */}
      {gameState === 'playing' && (
        <div className="pointer-events-none absolute left-6 top-1/2 z-30 hidden -translate-y-1/2 sm:block">
          <div className="h-64 w-1.5 overflow-hidden rounded-full border border-teal-900/40 bg-black/50">
            <div
              className="w-full bg-gradient-to-t from-teal-950 via-teal-400 to-white transition-all duration-300"
              style={{ height: `${progressPct}%`, marginTop: `${100 - progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-center font-mono text-[9px] text-teal-400/60">0</p>
          <p className="mt-[200px] text-center font-mono text-[9px] text-teal-400/60">{TARGET_SAMPLES}</p>
        </div>
      )}

      {/* HUD Objective Checklist - Left */}
      {gameState === 'playing' && (
        <div className="pointer-events-none absolute left-6 bottom-6 z-30 space-y-1 font-mono text-xs max-w-[240px]">
          {/* Mobile Toggle Button */}
          <button
            onClick={() => setObjectivesOpen(!objectivesOpen)}
            className="pointer-events-auto flex items-center justify-between w-full border border-teal-700/50 bg-black/85 px-3 py-1.5 text-[9px] uppercase tracking-wider text-teal-400 md:hidden shadow-lg backdrop-blur-sm font-bold"
          >
            <span>✦ Objectives</span>
            <span>{objectivesOpen ? '▼' : '▲'}</span>
          </button>

          {/* Checklist content */}
          <div className={`min-w-[220px] border border-teal-700/50 bg-black/85 px-4 py-3 shadow-lg shadow-black/50 backdrop-blur-sm transition-all duration-200
            ${objectivesOpen ? 'block' : 'hidden md:block'}`}
          >
            <p className="text-[10px] uppercase tracking-widest text-teal-400 font-bold mb-2 hidden md:block">✦ Mission Objectives</p>
            
            <div className="space-y-2 text-[10px]">
              {/* Objective 1: Depth */}
              <div className="flex items-start gap-2">
                <span className={hud.depth >= MAX_DEPTH ? 'text-teal-400 font-bold' : 'text-slate-500'}>
                  {hud.depth >= MAX_DEPTH ? '☒' : '☐'}
                </span>
                <div>
                  <p className={hud.depth >= MAX_DEPTH ? 'text-teal-300 line-through font-bold' : 'text-teal-100'}>
                    Reach Challenger Deep
                  </p>
                  <p className="text-[9px] text-teal-400/70">
                    Target: {MAX_DEPTH}m (Current: {Math.floor(hud.depth)}m)
                  </p>
                </div>
              </div>

              {/* Objective 2: Samples */}
              <div className="flex items-start gap-2">
                <span className={hud.score >= TARGET_SAMPLES ? 'text-teal-400 font-bold' : 'text-slate-500'}>
                  {hud.score >= TARGET_SAMPLES ? '☒' : '☐'}
                </span>
                <div>
                  <p className={hud.score >= TARGET_SAMPLES ? 'text-teal-300 line-through font-bold' : 'text-teal-100'}>
                    Gather Bio Samples
                  </p>
                  <p className="text-[9px] text-teal-400/70">
                    Target: {TARGET_SAMPLES} (Current: {hud.score} / {TARGET_SAMPLES})
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HUD status - Right */}
      {gameState === 'playing' && (
        <div className="pointer-events-none absolute right-6 top-[5.25rem] z-30 space-y-1 font-mono text-xs scale-80 origin-top-right md:scale-100 max-w-[200px]">
          {/* Main card (acts as toggle button on mobile) */}
          <button
            onClick={() => setTelemetryOpen(!telemetryOpen)}
            className="pointer-events-auto w-full text-left border border-teal-700/50 bg-black/85 px-4 py-3 shadow-lg shadow-black/50 backdrop-blur-sm relative focus:outline-none"
          >
            {/* Toggle indicator arrow only on mobile */}
            <span className="absolute right-3 top-3 text-[9px] text-teal-400 font-bold md:hidden">
              {telemetryOpen ? '▼' : '▲'}
            </span>
            <p className="text-2xl font-bold tabular-nums text-white drop-shadow-md">
              {Math.floor(hud.depth)}
              <span className="text-sm font-normal text-teal-300/90"> m</span>
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-teal-200">{hud.zone.short}</p>
            <p className="mt-0.5 text-[10px] text-teal-400/80">{hud.zone.name}</p>
          </button>

          {/* Collapsible details box */}
          <div className={`space-y-1.5 border border-teal-900/50 bg-black/80 px-3 py-2.5 text-[10px] text-teal-300/90 shadow-lg shadow-black/40 transition-all duration-200
            ${telemetryOpen ? 'block' : 'hidden md:block'}`}
          >
            <div>
              <div className="flex justify-between mb-0.5">
                <span>▸ Hull Integrity</span>
                <span className={hud.hull < 30 ? 'text-red-500 animate-pulse font-bold' : 'text-teal-400 font-bold'}>
                  {hud.hull}%
                </span>
              </div>
              <div className="w-full bg-black/50 h-1 border border-teal-950 rounded-sm overflow-hidden">
                <div 
                  className={`h-full transition-all duration-150 ${hud.hull < 30 ? 'bg-red-500' : 'bg-teal-400'}`} 
                  style={{ width: `${hud.hull}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-0.5">
                <span>▸ Bio Samples</span>
                <span className="text-emerald-400 font-bold">
                  {hud.score} / {TARGET_SAMPLES}
                </span>
              </div>
              <div className="w-full bg-black/50 h-1 border border-emerald-950 rounded-sm overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-150" 
                  style={{ width: `${Math.min(100, progressPct)}%` }}
                />
              </div>
            </div>

            <p className="pt-0.5 hidden md:block">▸ Descent Speed <span className="float-right text-teal-300">{hud.rate} m/s</span></p>
            <p className="hidden md:block">▸ Pressure <span className="float-right text-teal-300">{hud.pressure.toFixed(0)} ATM</span></p>
            <p className="hidden md:block">▸ Temp / Light <span className="float-right text-teal-300">{hud.temp.toFixed(1)}°C / {hud.light.toFixed(1)}%</span></p>
          </div>
        </div>
      )}

      {/* Screen Title Overlay */}
      <div className="pointer-events-none absolute inset-x-6 top-6 z-10 flex flex-col sm:inset-x-8 sm:top-8">
        <div className="max-w-[min(100%,36rem)] border-b-2 border-teal-500/60 pb-3 pr-28">
          <h1 className="text-2xl font-bold tracking-wider text-white drop-shadow-lg sm:text-3xl font-mono">
            ABYSSAL DESCENT
          </h1>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-teal-200 sm:text-xs">
            {gameState === 'playing' ? 'ACTIVE TELEMETRY ORBIT MODE' : 'MISSION INTERRUPT / STANDBY'}
          </p>
        </div>
      </div>

      {/* Zone flash notifications */}
      {zoneFlash && (
        <div className="pointer-events-none absolute inset-x-0 top-1/4 z-10 flex justify-center">
          <p className="animate-pulse border border-teal-500/40 bg-teal-950/85 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.25em] text-teal-200 shadow-xl backdrop-blur-sm">
            entering {zoneFlash} zone
          </p>
        </div>
      )}

      {/* Bottom depth gauge scrollbar - Right boundary */}
      <div className="pointer-events-none absolute right-6 top-1/2 z-30 hidden -translate-y-1/2 sm:block h-64 w-1 border-r border-teal-950/50">
        <div 
          className="absolute w-2.5 h-2.5 -left-[3px] bg-teal-400 border border-teal-100 rounded-full transition-all duration-300"
          style={{ top: `${depthPct}%` }}
        />
      </div>

      {/* Decorative vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,4,10,0.55) 100%)',
        }}
      />
    </div>
  )
}
