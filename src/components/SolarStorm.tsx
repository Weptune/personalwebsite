import { useEffect, useRef, useState } from 'react'

const TARGET_DATA = 20

const VERT = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

const FRAG = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform vec2 u_sunCenter;
  uniform float u_sunRadius;
  uniform float u_storm;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
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
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.48; }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy;
    float t = u_time * 0.001;
    vec2 fc = uv - u_sunCenter;
    float d = length(fc);
    float R = u_sunRadius;
    vec2 p = fc / R;
    float r = length(p);

    vec2 uvNorm = uv / u_resolution;
    vec2 mouseNorm = u_mouse / u_resolution;
    float mouseDist = distance(uvNorm, mouseNorm);

    float spaceN = fbm(uv * 0.0008 + vec2(t * 0.015, -t * 0.008));
    vec3 spaceBg = mix(vec3(0.006, 0.002, 0.001), vec3(0.025, 0.008, 0.002), spaceN);

    float outside = max(d - R, 0.0);
    float ang = atan(fc.y, fc.x);
    float coronaN = fbm(vec2(ang * 3.0, t * 0.12)) * 0.5 + 0.5;
    float cInner = exp(-outside * 0.022) * (0.85 + u_storm * 0.85);
    float cOuter = exp(-outside * 0.0045) * (0.35 + u_storm * 0.65);
    vec3 corona = vec3(1.0, 0.38, 0.06) * cInner * coronaN
                + vec3(0.75, 0.15, 0.02) * cOuter;

    float rim = exp(-abs(d - R) * 0.35) * 0.25 * (1.0 + u_storm * 0.6);
    corona += vec3(1.0, 0.55, 0.12) * rim;

    if (r > 1.004) {
      vec3 col = spaceBg + corona;
      col = pow(col, vec3(0.95));
      gl_FragColor = vec4(col, 1.0);
      return;
    }

    float mu = sqrt(max(0.0001, 1.0 - r * r));
    float theta = atan(p.y, p.x);
    float rot = t * 0.035;
    float cT = cos(theta + rot);
    float sT = sin(theta + rot);
    vec3 S = vec3(cT * r, sT * r, mu);

    vec2 sampleP = S.xy;
    if (mouseDist < 0.28) {
      float pull = (1.0 - mouseDist / 0.28) * 0.12;
      sampleP += normalize(uvNorm - mouseNorm + 0.0001) * pull;
    }

    vec2 gBase = sampleP * 9.5 + vec2(t * 0.06, t * 0.025);
    float g1 = fbm(gBase);
    float g2 = fbm(gBase * 2.1 + vec2(-t * 0.03, t * 0.05));
    float gran = mix(g1, g2, 0.45);
    float cellBright = pow(max(0.0, gran - 0.42) / 0.58, 1.4);
    float cellLane = pow(max(0.0, 0.55 - gran) / 0.55, 2.0);

    float fine = fbm(sampleP * 22.0 + vec2(t * 0.1, -t * 0.04));
    float micro = fbm(sampleP * 45.0 - vec2(t * 0.15, t * 0.07));

    vec2 spotUv = sampleP * 2.8 + vec2(t * 0.012, t * 0.006);
    float spotN = fbm(spotUv);
    float umbra = smoothstep(0.72 - u_storm * 0.08, 0.80, spotN);
    float penumbra = smoothstep(0.58, 0.72, spotN) * (1.0 - umbra);
    float plage = smoothstep(0.48, 0.58, spotN) * (1.0 - umbra - penumbra);

    vec3 laneCol = vec3(0.92, 0.28, 0.04);
    vec3 midCol  = vec3(1.0, 0.58, 0.10);
    vec3 hotCol  = vec3(1.0, 0.92, 0.62);
    vec3 umbraCol = vec3(0.45, 0.08, 0.02);
    vec3 penCol   = vec3(0.72, 0.18, 0.04);

    vec3 surface = mix(laneCol, midCol, cellBright);
    surface = mix(surface, hotCol, cellBright * gran * 0.9);
    surface -= cellLane * vec3(0.12, 0.06, 0.01);
    surface += fine * 0.04 + micro * 0.02;
    surface = mix(surface, penCol, penumbra * 0.65);
    surface = mix(surface, umbraCol, umbra * 0.75);
    surface += plage * vec3(0.18, 0.08, 0.01) * (1.0 + u_storm * 0.7);

    float flarePatch = fbm(sampleP * 4.0 + vec2(t * 0.2, 0.0));
    surface += smoothstep(0.78, 0.92, flarePatch) * u_storm * vec3(0.35, 0.18, 0.03);

    float limb = pow(mu, 0.28);
    surface *= mix(0.52, 1.0, limb);
    surface = mix(surface * 0.88, surface, smoothstep(0.0, 0.35, mu));

    float aa = smoothstep(1.006, 0.994, r);
    vec3 col = mix(spaceBg + corona, surface, aa);
    col += corona * (1.0 - aa) * 0.35;
    col = pow(col, vec3(0.94));
    gl_FragColor = vec4(col, 1.0);
  }
`

interface SolarFlare {
  id: number
  angle: number
  state: 'warning' | 'active'
  timer: number // in seconds
  width: number
}

interface CmeWave {
  id: number
  radius: number
  speed: number
  hasHitPlayer: boolean
}

interface Collectible {
  id: number
  type: 'data' | 'coolant'
  x: number
  y: number
  size: number
  angle: number
  pulse: number
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  color: string
}

interface FloatingText {
  id: number
  x: number
  y: number
  text: string
  color: string
  life: number
}

export default function SolarStorm() {
  const glRef = useRef<HTMLCanvasElement>(null)
  const fxRef = useRef<HTMLCanvasElement>(null)

  // Game state controls
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'victory'>('start')
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
  const [hudData, setHudData] = useState({
    score: 0,
    shield: 100,
    temp: 0,
    altitude: 0,
    warning: '',
  })

  // Refs for loop values (to avoid closures stale values in RAF)
  const gameStateRef = useRef<'start' | 'playing' | 'gameover' | 'victory'>('start')
  const shieldActiveRef = useRef(false)
  const mouseRef = useRef({ x: 0, y: 0 })
  const scoreRef = useRef(0)
  const shieldRef = useRef(100)
  const tempRef = useRef(0)
  const needResetRef = useRef(false)

  // Initialize mouse position in center initially
  useEffect(() => {
    mouseRef.current = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 }
  }, [])

  const handleStartGame = () => {
    console.log('[SolarStorm debug] handleStartGame called');
    scoreRef.current = 0
    shieldRef.current = 100
    tempRef.current = 0
    needResetRef.current = true
    setGameState('playing')
    gameStateRef.current = 'playing'
  }

  useEffect(() => {
    const glCanvas = glRef.current
    const fxCanvas = fxRef.current
    if (!glCanvas || !fxCanvas) return

    const gl = glCanvas.getContext('webgl', { antialias: false })
    const fx = fxCanvas.getContext('2d')
    if (!gl || !fx) return

    // WebGL setup
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

    const vs = compile(VERT, gl.VERTEX_SHADER)
    const fs = compile(FRAG, gl.FRAGMENT_SHADER)
    if (!vs || !fs) return

    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return

    const posLoc = gl.getAttribLocation(prog, 'position')
    const resLoc = gl.getUniformLocation(prog, 'u_resolution')
    const timeLoc = gl.getUniformLocation(prog, 'u_time')
    const mouseLoc = gl.getUniformLocation(prog, 'u_mouse')
    const centerLoc = gl.getUniformLocation(prog, 'u_sunCenter')
    const radiusLoc = gl.getUniformLocation(prog, 'u_sunRadius')
    const stormLoc = gl.getUniformLocation(prog, 'u_storm')

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)

    let w = 0, h = 0
    let sunCx = 0, sunCy = 0, sunR = 0

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      glCanvas.width = w
      glCanvas.height = h
      fxCanvas.width = w
      fxCanvas.height = h
      gl.viewport(0, 0, w, h)
      sunCx = w * 0.5
      sunCy = h * 0.5
      sunR = Math.min(w, h) * 0.28
    }
    resize()

    // Physics parameters
    let px = sunCx + sunR * 1.6
    let py = sunCy
    let vx = 0
    let vy = 210 // Start with tangential orbital velocity
    const shipTrail: { x: number; y: number }[] = []
    
    // Play lists
    let flares: SolarFlare[] = []
    let cmeWaves: CmeWave[] = []
    let collectibles: Collectible[] = []
    const sparks: Spark[] = []
    const floatTexts: FloatingText[] = []

    let flareIdCounter = 0
    let cmeIdCounter = 0
    let collectibleIdCounter = 0
    let textIdCounter = 0

    let lastFlareSpawn = 0
    let lastCmeSpawn = 0
    let lastCoolantSpawn = 0

    let lastFrame = performance.now()
    const start = performance.now()
    let raf = 0

    const spawnSparks = (x: number, y: number, color: string, count = 12, speedMult = 1) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = (1 + Math.random() * 4) * speedMult
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          size: 2 + Math.random() * 3,
          color,
        })
      }
    }

    const spawnFloatingText = (x: number, y: number, text: string, color: string) => {
      floatTexts.push({
        id: textIdCounter++,
        x,
        y,
        text,
        color,
        life: 1.0,
      })
    }

    // Pre-populate some data cores
    const spawnDataCore = () => {
      const angle = Math.random() * Math.PI * 2
      const radius = sunR + 60 + Math.random() * 180
      collectibles.push({
        id: collectibleIdCounter++,
        type: 'data',
        x: sunCx + Math.cos(angle) * radius,
        y: sunCy + Math.sin(angle) * radius,
        size: 7,
        angle: Math.random() * Math.PI,
        pulse: Math.random() * 10,
      })
    }

    for (let i = 0; i < 5; i++) {
      spawnDataCore()
    }

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }

    const onMouseDown = () => {
      shieldActiveRef.current = true
    }

    const onMouseUp = () => {
      shieldActiveRef.current = false
    }

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchstart', onMouseDown, { passive: true })
    window.addEventListener('touchend', onMouseUp, { passive: true })

    const frame = (now: number) => {
      const dt = Math.min(0.04, (now - lastFrame) / 1000)
      lastFrame = now

      if (w <= 0 || h <= 0) {
        raf = requestAnimationFrame(frame)
        return
      }
      const t = now - start

      if (needResetRef.current) {
        console.log('[SolarStorm debug] needResetRef is true, resetting game state. sunCx:', sunCx, 'sunR:', sunR);
        needResetRef.current = false
        
        // Robust fallback window dimensions in case resize was not triggered or values are zero
        const activeSunCx = sunCx > 0 ? sunCx : window.innerWidth * 0.5
        const activeSunCy = sunCy > 0 ? sunCy : window.innerHeight * 0.5
        const activeSunR = sunR > 0 ? sunR : Math.min(window.innerWidth, window.innerHeight) * 0.28
        
        px = activeSunCx + activeSunR * 1.6
        py = activeSunCy
        vx = 0
        vy = 210
        shipTrail.length = 0
        flares = []
        cmeWaves = []
        sparks.length = 0
        floatTexts.length = 0
        collectibles = []
        for (let i = 0; i < 5; i++) {
          spawnDataCore()
        }
      }

      // 1. WebGL Background Render
      gl.clearColor(0.008, 0.003, 0.001, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.enableVertexAttribArray(posLoc)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
      gl.uniform2f(resLoc, w, h)
      gl.uniform1f(timeLoc, t)
      gl.uniform2f(mouseLoc, mouseRef.current.x, h - mouseRef.current.y)
      gl.uniform2f(centerLoc, sunCx, sunCy)
      gl.uniform1f(radiusLoc, sunR)
      gl.uniform1f(stormLoc, tempRef.current / 100)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // 2. Clear 2D context
      fx.clearRect(0, 0, w, h)

      const isPlaying = gameStateRef.current === 'playing'

      // Render Orbit Guideline grid lines
      fx.beginPath()
      fx.arc(sunCx, sunCy, sunR + 100, 0, Math.PI * 2)
      fx.strokeStyle = 'rgba(0, 220, 255, 0.04)'
      fx.lineWidth = 1
      fx.stroke()

      fx.beginPath()
      fx.arc(sunCx, sunCy, sunR + 200, 0, Math.PI * 2)
      fx.strokeStyle = 'rgba(0, 220, 255, 0.03)'
      fx.stroke()

      let d = 0
      if (isPlaying) {
        // --- PHYSICS CALCULATION ---
        const dx = sunCx - px
        const dy = sunCy - py
        d = Math.sqrt(dx * dx + dy * dy)
        const altitude = d - sunR

        // Gravity acceleration
        const GM = 1800000 // Solar mass pull strength
        const gravityForce = GM / (d * d)
        let ax = (dx / d) * gravityForce
        let ay = (dy / d) * gravityForce

        // Player thruster input
        const tx = mouseRef.current.x - px
        const ty = mouseRef.current.y - py
        const tdist = Math.sqrt(tx * tx + ty * ty)
        const isThrusting = tdist > 25

        if (isThrusting) {
          const thrustStrength = 480 // thrust acceleration
          ax += (tx / tdist) * thrustStrength
          ay += (ty / tdist) * thrustStrength

          // Spawn back-thruster particle sparks
          if (Math.random() < 0.35) {
            const oppositeAngle = Math.atan2(-ty, -tx) + (Math.random() - 0.5) * 0.4
            sparks.push({
              x: px - (tx / tdist) * 12,
              y: py - (ty / tdist) * 12,
              vx: Math.cos(oppositeAngle) * (2 + Math.random() * 4) + vx * 0.3,
              vy: Math.sin(oppositeAngle) * (2 + Math.random() * 4) + vy * 0.3,
              life: 0.6,
              size: 1.5 + Math.random() * 2,
              color: `hsl(${15 + Math.random() * 20}, 100%, ${60 + Math.random() * 30}%)`,
            })
          }
        }

        // Apply physics
        const drag = 0.993 // Orbit friction drag
        vx = (vx + ax * dt) * drag
        vy = (vy + ay * dt) * drag

        // Speed limit cap
        const speed = Math.sqrt(vx * vx + vy * vy)
        if (speed > 580) {
          vx = (vx / speed) * 580
          vy = (vy / speed) * 580
        }

        px += vx * dt
        py += vy * dt

        // Outer space boundary boundary pull
        if (d > Math.max(w, h) * 0.72) {
          vx -= (dx / d) * 200 * dt
          vy -= (dy / d) * 200 * dt
        }

        // --- TRAIL UPDATE ---
        shipTrail.push({ x: px, y: py })
        if (shipTrail.length > 20) {
          shipTrail.shift()
        }

        // --- ALTITUDE & COLLISION CHECKS ---
        if (altitude <= 8) {
          console.log('[SolarStorm debug] altitude crash triggered! altitude:', altitude, 'px:', px, 'py:', py, 'sunCx:', sunCx, 'sunR:', sunR);
          // Melted inside the Sun!
          shieldRef.current = 0
          spawnSparks(px, py, '#ffffff', 40, 2)
          spawnSparks(px, py, '#ff6600', 30, 1.5)
          gameStateRef.current = 'gameover'
          setGameState('gameover')
        }

        // Heat accumulation near the Sun
        if (altitude < 100) {
          const proximityMult = (100 - altitude) / 100
          tempRef.current = Math.min(100, tempRef.current + 12 * proximityMult * dt)
        } else {
          tempRef.current = Math.max(0, tempRef.current - 8 * dt)
        }

        // Critical temperature damages shields
        if (tempRef.current >= 100) {
          shieldRef.current = Math.max(0, shieldRef.current - 12 * dt)
          if (Math.random() < 0.08) {
            spawnSparks(px, py, '#ff3300', 2, 0.8)
          }
        }

        // Deflector Shield Activation
        let isShieldActive = shieldActiveRef.current && shieldRef.current > 0
        if (isShieldActive) {
          // Drains energy
          shieldRef.current = Math.max(0, shieldRef.current - 8 * dt)
        } else {
          // Slow recovery when deactivated
          shieldRef.current = Math.min(100, shieldRef.current + 3 * dt)
        }

        // Check shield depletion death
        if (shieldRef.current <= 0) {
          console.log('[SolarStorm debug] shield depletion crash triggered! shield:', shieldRef.current);
          spawnSparks(px, py, '#ff3300', 35, 1.6)
          gameStateRef.current = 'gameover'
          setGameState('gameover')
        }

        // --- HAZARD SPAWNING ---
        // Flares (beams)
        const flareInterval = Math.max(2800, 5200 - scoreRef.current * 120)
        if (now - lastFlareSpawn > flareInterval) {
          flares.push({
            id: flareIdCounter++,
            angle: Math.random() * Math.PI * 2,
            state: 'warning',
            timer: 1.5, // warning duration
            width: 25,
          })
          lastFlareSpawn = now
        }

        // CMEs (rings)
        if (now - lastCmeSpawn > 13000) {
          cmeWaves.push({
            id: cmeIdCounter++,
            radius: sunR,
            speed: 160 + scoreRef.current * 1.5,
            hasHitPlayer: false,
          })
          lastCmeSpawn = now
        }

        // Coolant capsule spawning
        if (now - lastCoolantSpawn > 6000) {
          const angle = Math.random() * Math.PI * 2
          const radius = sunR + 80 + Math.random() * 140
          collectibles.push({
            id: collectibleIdCounter++,
            type: 'coolant',
            x: sunCx + Math.cos(angle) * radius,
            y: sunCy + Math.sin(angle) * radius,
            size: 9,
            angle: 0,
            pulse: 0,
          })
          lastCoolantSpawn = now
        }

        // --- PROCESS HAZARDS & COLLISION ---
        // 1. Solar Flares (Beams)
        for (let i = flares.length - 1; i >= 0; i--) {
          const f = flares[i]
          f.timer -= dt

          if (f.state === 'warning') {
            if (f.timer <= 0) {
              f.state = 'active'
              f.timer = 0.85; // active damage time
              spawnSparks(sunCx + Math.cos(f.angle) * sunR, sunCy + Math.sin(f.angle) * sunR, '#ffffff', 12, 1.2)
            }
          } else {
            if (f.timer <= 0) {
              flares.splice(i, 1)
              continue
            }

            // Beam Damage Check (Line projection)
            const ux = Math.cos(f.angle)
            const uy = Math.sin(f.angle)
            const shipDx = px - sunCx
            const shipDy = py - sunCy
            const projDist = shipDx * ux + shipDy * uy

            if (projDist > sunR - 10) {
              const perpDist = Math.abs(shipDx * (-uy) + shipDy * ux)
              if (perpDist < f.width / 2 + 10) {
                // Ship is hit by the active flare beam!
                if (isShieldActive) {
                  shieldRef.current = Math.max(0, shieldRef.current - 18 * dt)
                  spawnSparks(px, py, '#00ffff', 4, 1.0)
                  if (Math.random() < 0.1) {
                    spawnFloatingText(px, py - 15, 'SHIELDED', '#00ffff')
                  }
                } else {
                  shieldRef.current = Math.max(0, shieldRef.current - 24 * dt)
                  tempRef.current = Math.min(100, tempRef.current + 45 * dt)
                  spawnSparks(px, py, '#ff3300', 3, 1.2)
                  if (Math.random() < 0.15) {
                    spawnFloatingText(px, py - 15, 'CRITICAL THERMAL', '#ff3300')
                  }
                }
              }
            }
          }
        }

        // 2. CME Waves (Rings)
        for (let i = cmeWaves.length - 1; i >= 0; i--) {
          const wItem = cmeWaves[i]
          wItem.radius += wItem.speed * dt

          // Check if wave has expanded off screen
          if (wItem.radius > Math.max(w, h) * 1.2) {
            cmeWaves.splice(i, 1)
            continue
          }

          // Check collision with player
          if (!wItem.hasHitPlayer) {
            const shipDist = d
            if (Math.abs(shipDist - wItem.radius) < 16) {
              wItem.hasHitPlayer = true
              if (isShieldActive) {
                shieldRef.current = Math.max(0, shieldRef.current - 5)
                spawnSparks(px, py, '#00ffff', 20, 1.3)
                spawnFloatingText(px, py - 18, 'CME DEFLECTED', '#00ffcc')
              } else {
                shieldRef.current = Math.max(0, shieldRef.current - 14)
                tempRef.current = Math.min(100, tempRef.current + 15)
                // Blast vector pushing player outwards
                const pushStrength = 420
                vx += (-dx / d) * pushStrength
                vy += (-dy / d) * pushStrength
                spawnSparks(px, py, '#ff3300', 25, 1.8)
                spawnFloatingText(px, py - 18, 'CME IMPACT -14%', '#ff4400')
              }
            }
          }
        }

        // 3. Process Collectibles
        for (let i = collectibles.length - 1; i >= 0; i--) {
          const c = collectibles[i]
          c.pulse += dt * 5
          c.angle += dt * 0.8

          const collectDist = Math.sqrt((c.x - px) * (c.x - px) + (c.y - py) * (c.y - py))
          if (collectDist < c.size + 15) {
            // Collected!
            if (c.type === 'data') {
              scoreRef.current += 1
              spawnSparks(c.x, c.y, '#ffd23f', 18, 1.0)
              spawnFloatingText(c.x, c.y - 10, '+1 HELIO DATA', '#ffd23f')

              // Victory check
              if (scoreRef.current >= TARGET_DATA) {
                gameStateRef.current = 'victory'
                setGameState('victory')
              } else {
                // Spawn a new data core replacement
                spawnDataCore()
              }
            } else if (c.type === 'coolant') {
              tempRef.current = 0
              shieldRef.current = Math.min(100, shieldRef.current + 25)
              spawnSparks(c.x, c.y, '#00f2ff', 22, 1.2)
              spawnFloatingText(c.x, c.y - 10, 'COOLANT RESTORED', '#00f2ff')
            }
            collectibles.splice(i, 1)
            continue
          }

          // If coolant capsule is left uncollected for too long in solar orbits, it evaporates
          if (c.type === 'coolant') {
            c.size -= dt * 0.16
            if (c.size <= 1.0) {
              collectibles.splice(i, 1)
            }
          }
        }

        // --- DRAW GAMEPLAY GRAPHICS ---

        // 1. Draw gravitational pull dashed line
        fx.save()
        fx.setLineDash([4, 6])
        fx.beginPath()
        fx.moveTo(px, py)
        fx.lineTo(sunCx, sunCy)
        fx.strokeStyle = 'rgba(255, 140, 30, 0.22)'
        fx.lineWidth = 1
        fx.stroke()
        fx.restore()

        // 2. Draw active Collectibles
        for (const c of collectibles) {
          fx.save()
          fx.translate(c.x, c.y)
          fx.rotate(c.angle)
          const pulseSize = c.size + Math.sin(c.pulse) * 1.5

          if (c.type === 'data') {
            fx.beginPath()
            fx.arc(0, 0, pulseSize * 1.6, 0, Math.PI * 2)
            fx.strokeStyle = 'rgba(255, 210, 60, 0.15)'
            fx.lineWidth = 4
            fx.stroke()

            fx.beginPath()
            fx.arc(0, 0, pulseSize, 0, Math.PI * 2)
            fx.fillStyle = '#ffd23f'
            fx.fill()

            fx.beginPath()
            fx.arc(-pulseSize * 0.25, -pulseSize * 0.25, pulseSize * 0.2, 0, Math.PI * 2)
            fx.fillStyle = '#ffffff'
            fx.fill()
          } else {
            // Ice coolant cross
            fx.beginPath()
            fx.rect(-pulseSize, -pulseSize * 0.3, pulseSize * 2, pulseSize * 0.6)
            fx.rect(-pulseSize * 0.3, -pulseSize, pulseSize * 0.6, pulseSize * 2)
            fx.fillStyle = '#00f2ff'
            fx.fill()

            fx.beginPath()
            fx.rect(-pulseSize * 0.7, -pulseSize * 0.2, pulseSize * 1.4, pulseSize * 0.4)
            fx.rect(-pulseSize * 0.2, -pulseSize * 0.7, pulseSize * 0.4, pulseSize * 1.4)
            fx.fillStyle = '#ffffff'
            fx.fill()

            // Outer glow circle
            fx.beginPath()
            fx.arc(0, 0, pulseSize * 1.5, 0, Math.PI * 2)
            fx.strokeStyle = 'rgba(0, 242, 255, 0.25)'
            fx.lineWidth = 1
            fx.stroke()
          }
          fx.restore()
        }

        // 3. Draw Solar Flare warnings & active beams
        for (const f of flares) {
          const ux = Math.cos(f.angle)
          const uy = Math.sin(f.angle)
          const len = Math.max(w, h) * 1.5

          if (f.state === 'warning') {
            // Draw warning dotted lines
            fx.save()
            fx.setLineDash([5, 8])
            fx.beginPath()
            fx.moveTo(sunCx + ux * sunR, sunCy + uy * sunR)
            fx.lineTo(sunCx + ux * len, sunCy + uy * len)
            fx.strokeStyle = `rgba(255, 30, 30, ${0.4 + Math.sin(t * 0.015) * 0.3})`
            fx.lineWidth = 2
            fx.stroke()

            // Warning icon near Sun surface
            const iconX = sunCx + ux * (sunR + 40)
            const iconY = sunCy + uy * (sunR + 40)
            fx.beginPath()
            fx.arc(iconX, iconY, 11, 0, Math.PI * 2)
            fx.fillStyle = 'rgba(255, 0, 0, 0.7)'
            fx.fill()
            fx.fillStyle = '#ffffff'
            fx.font = 'bold 10px monospace'
            fx.textAlign = 'center'
            fx.textBaseline = 'middle'
            fx.fillText('!', iconX, iconY)
            fx.restore()
          } else {
            // Draw active beam
            const grad = fx.createLinearGradient(
              sunCx + ux * sunR, sunCy + uy * sunR,
              sunCx + ux * len, sunCy + uy * len
            )
            grad.addColorStop(0, '#ffffff')
            grad.addColorStop(0.12, 'rgba(255, 255, 255, 0.95)')
            grad.addColorStop(0.3, '#ffaa00')
            grad.addColorStop(1, 'rgba(255, 30, 0, 0)')

            fx.save()
            fx.beginPath()
            fx.moveTo(sunCx + ux * sunR - uy * (f.width / 2), sunCy + uy * sunR + ux * (f.width / 2))
            fx.lineTo(sunCx + ux * len - uy * (f.width / 2), sunCy + uy * len + ux * (f.width / 2))
            fx.lineTo(sunCx + ux * len + uy * (f.width / 2), sunCy + uy * len - ux * (f.width / 2))
            fx.lineTo(sunCx + ux * sunR + uy * (f.width / 2), sunCy + uy * sunR - ux * (f.width / 2))
            fx.closePath()

            // Outer atmospheric bloom
            fx.shadowColor = '#ff6600'
            fx.shadowBlur = 25
            fx.fillStyle = grad
            fx.fill()
            fx.restore()

            // Draw core beam line
            fx.beginPath()
            fx.moveTo(sunCx + ux * sunR, sunCy + uy * sunR)
            fx.lineTo(sunCx + ux * len, sunCy + uy * len)
            fx.strokeStyle = '#ffffff'
            fx.lineWidth = f.width * 0.35
            fx.stroke()
          }
        }

        // 4. Draw CME waves
        for (const wItem of cmeWaves) {
          fx.save()
          fx.beginPath()
          fx.arc(sunCx, sunCy, wItem.radius, 0, Math.PI * 2)
          fx.strokeStyle = 'rgba(255, 80, 20, 0.45)'
          fx.lineWidth = 14
          fx.stroke()

          fx.beginPath()
          fx.arc(sunCx, sunCy, wItem.radius - 6, 0, Math.PI * 2)
          fx.strokeStyle = '#ffffff'
          fx.lineWidth = 2
          fx.stroke()
          fx.restore()
        }

        // 5. Draw Spacecraft Trail
        if (shipTrail.length > 2) {
          fx.beginPath()
          fx.moveTo(shipTrail[0].x, shipTrail[0].y)
          for (let i = 1; i < shipTrail.length; i++) {
            fx.lineTo(shipTrail[i].x, shipTrail[i].y)
          }
          fx.strokeStyle = 'rgba(0, 242, 255, 0.12)'
          fx.lineWidth = 4.5
          fx.lineCap = 'round'
          fx.stroke()
        }

        // 6. Draw Spacecraft
        fx.save()
        fx.translate(px, py)
        const heading = Math.atan2(vy, vx)
        fx.rotate(heading)

        // Thruster plume graphics
        if (isThrusting) {
          fx.beginPath()
          fx.moveTo(-8, 0)
          fx.lineTo(-20, -5 - Math.sin(t * 0.08) * 2)
          fx.lineTo(-14, 0)
          fx.lineTo(-20, 5 + Math.sin(t * 0.08) * 2)
          fx.closePath()
          fx.fillStyle = `rgba(255, 140, 20, ${0.75 + Math.sin(t * 0.1) * 0.25})`
          fx.fill()
        }

        // Spacecraft body
        fx.beginPath()
        fx.rect(-7, -7, 14, 14)
        fx.fillStyle = '#111827'
        fx.strokeStyle = '#00f2ff'
        fx.lineWidth = 2
        fx.fill()
        fx.stroke()

        // Scientific panel decals
        fx.fillStyle = '#00f2ff'
        fx.fillRect(-2, -2, 4, 4)

        // Wing solar arrays
        fx.fillStyle = '#ff9f1c'
        fx.strokeStyle = '#ffffff'
        fx.lineWidth = 1
        fx.fillRect(-2, -18, 4, 11)
        fx.strokeRect(-2, -18, 4, 11)
        fx.fillRect(-2, 7, 4, 11)
        fx.strokeRect(-2, 7, 4, 11)

        // Deflector shield bubble ring
        if (isShieldActive) {
          fx.beginPath()
          fx.arc(0, 0, 23, 0, Math.PI * 2)
          const shieldGrad = fx.createRadialGradient(0, 0, 18, 0, 0, 24)
          shieldGrad.addColorStop(0, 'rgba(0, 242, 255, 0)')
          shieldGrad.addColorStop(0.7, `rgba(0, 242, 255, ${0.45 + Math.sin(t * 0.02) * 0.15})`)
          shieldGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
          fx.fillStyle = shieldGrad
          fx.fill()

          fx.beginPath()
          fx.arc(0, 0, 22, 0, Math.PI * 2)
          fx.strokeStyle = '#00f2ff'
          fx.lineWidth = 1.5
          fx.stroke()
        }

        fx.restore()
      } else {
        // Start/End state passive float of the spaceship in the background
        const floatAngle = t * 0.0004
        const floatX = sunCx + Math.cos(floatAngle) * (sunR + 130)
        const floatY = sunCy + Math.sin(floatAngle) * (sunR + 130)
        
        fx.save()
        fx.translate(floatX, floatY)
        fx.rotate(floatAngle + Math.PI / 2)
        
        fx.beginPath()
        fx.rect(-6, -6, 12, 12)
        fx.fillStyle = '#111827'
        fx.strokeStyle = 'rgba(0, 242, 255, 0.4)'
        fx.lineWidth = 1.5
        fx.fill()
        fx.stroke()

        fx.fillStyle = 'rgba(255, 159, 28, 0.4)'
        fx.fillRect(-2, -15, 4, 9)
        fx.fillRect(-2, 6, 4, 9)
        fx.restore()
      }

      // --- COMMON RENDER: PARTICLES & FLOATING TEXTS ---
      // Sparks particles
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x += s.vx
        s.y += s.vy
        s.life -= dt * 1.5
        if (s.life <= 0) {
          sparks.splice(i, 1)
          continue
        }

        fx.beginPath()
        fx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2)
        fx.fillStyle = s.color
        fx.globalAlpha = s.life
        fx.fill()
        fx.globalAlpha = 1.0
      }

      // Floating Texts
      for (let i = floatTexts.length - 1; i >= 0; i--) {
        const fText = floatTexts[i]
        fText.y -= dt * 38
        fText.life -= dt * 1.2
        if (fText.life <= 0) {
          floatTexts.splice(i, 1)
          continue
        }

        fx.save()
        fx.fillStyle = fText.color
        fx.font = 'bold 9px monospace'
        fx.textAlign = 'center'
        fx.globalAlpha = fText.life
        fx.fillText(fText.text, fText.x, fText.y)
        fx.restore()
      }

      // Update React HUD state periodically
      if (isPlaying) {
        setHudData({
          score: scoreRef.current,
          shield: Math.round(shieldRef.current),
          temp: Math.round(tempRef.current),
          altitude: Math.max(0, Math.round(d - sunR)),
          warning: cmeWaves.some(w => !w.hasHitPlayer && w.radius < d) ? 'CME DETECTED' : '',
        })
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchstart', onMouseDown)
      window.removeEventListener('touchend', onMouseUp)
      gl.deleteProgram(prog)
    }
  }, [])

  const progressPct = (hudData.score / TARGET_DATA) * 100

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#0a0300] select-none touch-none">
      <canvas ref={glRef} className="absolute inset-0 z-0 h-full w-full" />
      <canvas ref={fxRef} className="absolute inset-0 z-[1] h-full w-full" />

      {/* Return back to index link */}
      <a
        href="/"
        data-astro-reload=""
        className="pointer-events-auto fixed right-6 top-6 z-40 border-2 border-orange-500/80 bg-black/85 px-4 py-2 font-mono text-xs text-white shadow-lg shadow-black/50 backdrop-blur-sm transition-all hover:bg-orange-500/30 sm:px-5 sm:py-2.5 sm:text-sm"
      >
        ← back
      </a>

      {/* Mobile-friendly bottom deflector shield trigger */}
      {gameState === 'playing' && (
        <button
          onTouchStart={() => { shieldActiveRef.current = true }}
          onTouchEnd={() => { shieldActiveRef.current = false }}
          onMouseDown={() => { shieldActiveRef.current = true }}
          onMouseUp={() => { shieldActiveRef.current = false }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 border-2 border-cyan-400 bg-black/90 text-cyan-200 active:bg-cyan-500/20 px-8 py-3.5 font-mono text-xs uppercase tracking-widest shadow-xl rounded backdrop-blur-md transition-all touch-none sm:hidden"
        >
          Activate Deflector (Hold)
        </button>
      )}

      {/* Start screen overlay */}
      {gameState === 'start' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm p-6">
          <div className="max-w-md w-full border border-amber-500/30 bg-black/95 p-8 text-center shadow-2xl">
            <h1 className="text-2xl font-bold tracking-widest text-amber-400 font-mono mb-4">
              SOLAR ORBITAL SURFER
            </h1>
            <p className="text-xs font-mono text-amber-100/70 leading-relaxed mb-6 space-y-2 text-left">
              <span>▸ Pilot a science probe in high-radiation orbits around the Sun.</span><br />
              <span>▸ Move cursor/touch to steer probe. The ship accelerates towards target.</span><br />
              <span>▸ Dodging eruptions: Red dashed line indicates a solar flare path prior to eruption.</span><br />
              <span>▸ Hold Click / Touch Button to deploy deflector shield against CME waves.</span><br />
              <span>▸ Collect {TARGET_DATA} Helio Data cores. Collect Coolant packs to cool down.</span>
            </p>
            <button
              onClick={handleStartGame}
              className="pointer-events-auto w-full border border-amber-400/80 hover:bg-amber-500/20 text-white font-mono text-xs px-6 py-3 transition-all tracking-widest"
            >
              LAUNCH MISSION
            </button>
          </div>
        </div>
      )}

      {/* Game Over screen overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="max-w-md w-full border border-red-500/30 bg-black/95 p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold tracking-widest text-red-500 font-mono mb-4">PROBE DESTROYED</h2>
            <p className="text-xs font-mono text-red-200/70 leading-relaxed mb-6">
              Thermal overload or shield depletion caused satellite disintegrating. Critical loss of telemetry grid.
            </p>
            <button
              onClick={handleStartGame}
              className="pointer-events-auto w-full border border-red-500/80 hover:bg-red-500/20 text-white font-mono text-xs px-6 py-3 transition-all tracking-widest"
            >
              LAUNCH RECOVERY PROBE
            </button>
          </div>
        </div>
      )}

      {/* Victory screen overlay */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="max-w-md w-full border border-green-500/30 bg-black/95 p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold tracking-widest text-green-400 font-mono mb-4">MISSION COMPLETED</h2>
            <p className="text-xs font-mono text-green-200/80 leading-relaxed mb-6">
              Vessel gathered {TARGET_DATA} data packets of deep coronal solar loops and successfully stabilized Earth's science grid.
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
                className="pointer-events-auto flex-1 border border-orange-500/80 bg-orange-500/10 hover:bg-orange-500/20 text-white font-mono text-[10px] px-4 py-2.5 transition-all tracking-widest cursor-pointer flex items-center justify-center"
              >
                RETURN HOME
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Active gameplay warning banner */}
      {gameState === 'playing' && hudData.warning && (
        <div className="pointer-events-none absolute inset-x-0 top-1/4 z-10 flex justify-center">
          <p className="animate-pulse border border-red-500/50 bg-red-950/85 px-6 py-3 font-mono text-xs uppercase tracking-[0.25em] text-red-200 shadow-xl backdrop-blur-sm">
            {hudData.warning}
          </p>
        </div>
      )}

      {gameState === 'playing' && hudData.temp >= 85 && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-10 flex justify-center">
          <p className="animate-pulse border border-orange-500/50 bg-orange-950/85 px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-orange-200 shadow-xl backdrop-blur-sm">
            CRITICAL THERMAL LEVEL
          </p>
        </div>
      )}

      {/* Progress tracker meter - Left */}
      {gameState === 'playing' && (
        <div className="pointer-events-none absolute left-6 top-1/2 z-10 hidden -translate-y-1/2 sm:block">
          <div className="h-64 w-1.5 overflow-hidden rounded-full border border-amber-900/40 bg-black/50">
            <div
              className="w-full bg-gradient-to-t from-cyan-950 via-cyan-400 to-white transition-all duration-300"
              style={{ height: `${progressPct}%`, marginTop: `${100 - progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-center font-mono text-[9px] text-cyan-400/60">0</p>
          <p className="mt-[200px] text-center font-mono text-[9px] text-cyan-400/60">{TARGET_DATA}</p>
        </div>
      )}

      {/* HUD scientific status - Right */}
      {gameState === 'playing' && (
        <div className="pointer-events-none absolute right-6 top-[5.25rem] z-10 space-y-1 font-mono text-xs">
          <div className="min-w-[190px] border border-amber-700/50 bg-black/85 px-4 py-3 shadow-lg shadow-black/50 backdrop-blur-sm">
            <p className="text-2xl font-bold tabular-nums text-white drop-shadow-md">
              {hudData.score}
              <span className="text-sm font-normal text-amber-300/80"> / {TARGET_DATA}</span>
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-amber-200">Helio Cores Collected</p>
          </div>
          
          <div className="space-y-1.5 border border-amber-900/50 bg-black/80 px-3 py-2.5 text-[10px] text-amber-300/90 shadow-lg shadow-black/40">
            <div>
              <div className="flex justify-between mb-0.5">
                <span>▸ Shields</span>
                <span className={hudData.shield < 30 ? 'text-red-500 animate-pulse font-bold' : 'text-cyan-400 font-bold'}>
                  {hudData.shield}%
                </span>
              </div>
              <div className="w-full bg-black/50 h-1 border border-cyan-950 rounded-sm overflow-hidden">
                <div 
                  className={`h-full transition-all duration-150 ${hudData.shield < 30 ? 'bg-red-500' : 'bg-cyan-400'}`} 
                  style={{ width: `${hudData.shield}%` }}
                />
              </div>
            </div>

            <div className="pt-0.5">
              <div className="flex justify-between mb-0.5">
                <span>▸ Core Temp</span>
                <span className={hudData.temp >= 85 ? 'text-red-400 animate-pulse font-bold' : 'text-amber-400 font-bold'}>
                  {hudData.temp}%
                </span>
              </div>
              <div className="w-full bg-black/50 h-1 border border-amber-950 rounded-sm overflow-hidden">
                <div 
                  className={`h-full transition-all duration-150 ${hudData.temp >= 85 ? 'bg-red-500' : 'bg-amber-400'}`} 
                  style={{ width: `${hudData.temp}%` }}
                />
              </div>
            </div>

            <p className="pt-0.5">▸ Orbit Alt <span className="float-right text-amber-400">{hudData.altitude} km</span></p>
            <p>▸ Heliocentric <span className="float-right text-amber-400">Parker-V</span></p>
          </div>
        </div>
      )}

      {/* Screen Title Overlay */}
      <div className="pointer-events-none absolute inset-x-6 top-6 z-10 flex flex-col sm:inset-x-8 sm:top-8">
        <div className="max-w-[min(100%,36rem)] border-b-2 border-amber-500/60 pb-3 pr-28">
          <h1 className="text-2xl font-bold tracking-wider text-white drop-shadow-lg sm:text-3xl font-mono">
            CHASING SOLAR SKIES
          </h1>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-amber-200 sm:text-xs">
            {gameState === 'playing' ? 'ACTIVE TELEMETRY ORBIT MODE' : 'MISSION INTERRUPT / STANDBY'}
          </p>
        </div>
      </div>
      
      {/* Decorative vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 35%, rgba(8,2,0,0.55) 100%)',
        }}
      />
    </div>
  )
}
