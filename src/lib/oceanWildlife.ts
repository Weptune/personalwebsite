export type FishSpecies =
  | 'tuna'
  | 'barracuda'
  | 'school'
  | 'manta'
  | 'shark'
  | 'ray'
  | 'angler'

export interface OceanFish {
  x: number
  y: number
  vx: number
  len: number
  species: FishSpecies
  phase: number
  dir: 1 | -1
  yDrift: number
  depth: number
}

export interface Jellyfish {
  x: number
  y: number
  vy: number
  vx: number
  size: number
  phase: number
}

export interface OceanLifeState {
  fish: OceanFish[]
  jellies: Jellyfish[]
}

export interface DepthFish extends OceanFish {
  worldDepth: number
}

export interface DepthJelly extends Jellyfish {
  worldDepth: number
}

export interface DepthWildlife {
  fish: DepthFish[]
  jellies: DepthJelly[]
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Half-height as fraction of body length at normalized position u (0=nose, 1=tail tip) */
type BodyProfile = (u: number) => number

const PROFILES: Record<string, BodyProfile> = {
  tuna: (u) => {
    if (u < 0.08) return lerp(0.04, 0.11, u / 0.08)
    if (u < 0.42) return lerp(0.11, 0.145, (u - 0.08) / 0.34)
    if (u < 0.78) return lerp(0.145, 0.09, (u - 0.42) / 0.36)
    return lerp(0.09, 0.015, (u - 0.78) / 0.22)
  },
  barracuda: (u) => {
    if (u < 0.25) return lerp(0.035, 0.075, u / 0.25)
    if (u < 0.7) return lerp(0.075, 0.08, (u - 0.25) / 0.45)
    return lerp(0.08, 0.012, (u - 0.7) / 0.3)
  },
  shark: (u) => {
    if (u < 0.12) return lerp(0.05, 0.12, u / 0.12)
    if (u < 0.55) return lerp(0.12, 0.135, (u - 0.12) / 0.43)
    return lerp(0.135, 0.02, (u - 0.55) / 0.45)
  },
  sardine: (u) => {
    if (u < 0.15) return lerp(0.05, 0.12, u / 0.15)
    if (u < 0.65) return lerp(0.12, 0.1, (u - 0.15) / 0.5)
    return lerp(0.1, 0.018, (u - 0.65) / 0.35)
  },
  angler: (u) => {
    if (u < 0.2) return lerp(0.06, 0.16, u / 0.2)
    if (u < 0.75) return lerp(0.16, 0.12, (u - 0.2) / 0.55)
    return lerp(0.12, 0.025, (u - 0.75) / 0.25)
  },
}

function profileFor(species: FishSpecies): BodyProfile {
  if (species === 'barracuda') return PROFILES.barracuda
  if (species === 'shark') return PROFILES.shark
  if (species === 'angler') return PROFILES.angler
  if (species === 'school') return PROFILES.sardine
  return PROFILES.tuna
}

function segmentColor(
  u: number,
  alpha: number,
  light: number,
  species: FishSpecies,
): string {
  const dorsal = u < 0.5 ? 0.85 : 0.65
  const r = Math.floor(lerp(8, 28, dorsal) + light * 12)
  const g = Math.floor(lerp(22, 55, dorsal) + light * 18)
  const b = Math.floor(lerp(32, 68, dorsal) + light * 10)
  const a = alpha * lerp(0.55, 0.92, 1 - u * 0.35)
  if (species === 'shark') return `rgba(${r},${g},${b},${a * 0.95})`
  return `rgba(${r},${g},${b},${a})`
}

/**
 * Spine-and-taper renderer (inspired by procedural fish anatomy):
 * overlapping ellipses along a sine spine, radius tapers toward tail.
 * Reads as smooth photographic silhouette at distance.
 */
function drawSpineFish(
  ctx: CanvasRenderingContext2D,
  len: number,
  profile: BodyProfile,
  swim: number,
  alpha: number,
  light: number,
  species: FishSpecies,
) {
  const segs = Math.max(10, Math.floor(len * 0.42))
  const tailPhase = swim * 4.5
  const bodyWave = Math.sin(swim * 1.3) * len * 0.018

  for (let i = segs; i >= 0; i--) {
    const u = i / segs
    const x = lerp(len * 0.46, -len * 0.44, u)
    const wave =
      bodyWave * (1 - u * 0.85) +
      Math.sin(tailPhase + u * 2.8) * len * 0.035 * u * u
    const rh = len * profile(u)
    const rw = rh * (species === 'barracuda' ? 1.15 : 1.05)

    ctx.beginPath()
    ctx.ellipse(x, wave, rw, rh * 0.88, 0, 0, Math.PI * 2)
    ctx.fillStyle = segmentColor(u, alpha, light, species)
    ctx.fill()
  }

  const tailU = 1
  const tx = lerp(len * 0.46, -len * 0.44, tailU)
  const ty = bodyWave * 0.15 + Math.sin(tailPhase + 2.8) * len * 0.035
  const fork = len * 0.14
  const spread = Math.sin(tailPhase) * len * 0.06

  ctx.beginPath()
  ctx.moveTo(tx, ty)
  ctx.lineTo(tx - fork, ty - fork * 0.55 + spread)
  ctx.lineTo(tx - fork * 0.55, ty)
  ctx.lineTo(tx - fork, ty + fork * 0.55 - spread)
  ctx.closePath()
  ctx.fillStyle = `rgba(6, 18, 28, ${alpha * 0.9})`
  ctx.fill()

  const ex = len * 0.38
  const ey = bodyWave - len * 0.02
  ctx.beginPath()
  ctx.arc(ex, ey, len * 0.022, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(4, 10, 16, ${alpha * 0.95})`
  ctx.fill()
  ctx.beginPath()
  ctx.arc(ex + len * 0.008, ey - len * 0.008, len * 0.007, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(200, 230, 240, ${alpha * (0.25 + light * 0.35)})`
  ctx.fill()

  if (species === 'shark') {
    ctx.beginPath()
    ctx.moveTo(len * 0.08, bodyWave - len * 0.12)
    ctx.lineTo(len * 0.02, bodyWave - len * 0.22)
    ctx.lineTo(-len * 0.02, bodyWave - len * 0.1)
    ctx.closePath()
    ctx.fillStyle = `rgba(8, 20, 30, ${alpha * 0.85})`
    ctx.fill()
  }

  if (species === 'barracuda') {
    ctx.save()
    ctx.globalAlpha = alpha * 0.25
    ctx.strokeStyle = 'rgba(180, 200, 210, 0.5)'
    ctx.lineWidth = 0.35
    for (let j = 0; j < 4; j++) {
      const bx = len * (0.34 - j * 0.035)
      ctx.beginPath()
      ctx.moveTo(bx, bodyWave)
      ctx.lineTo(bx - len * 0.018, bodyWave + len * 0.012)
      ctx.stroke()
    }
    ctx.restore()
  }

  if (species === 'angler') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const lx = len * 0.2
    const ly = bodyWave - len * 0.28
    ctx.beginPath()
    ctx.moveTo(len * 0.25, bodyWave - len * 0.1)
    ctx.quadraticCurveTo(lx + len * 0.05, ly, lx, ly - len * 0.04)
    ctx.strokeStyle = `rgba(30, 50, 55, ${alpha * 0.5})`
    ctx.lineWidth = 0.5
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(lx, ly - len * 0.04, len * 0.018, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(140, 210, 190, ${alpha * 0.45})`
    ctx.fill()
    ctx.restore()
  }
}

function drawManta(
  ctx: CanvasRenderingContext2D,
  len: number,
  swim: number,
  alpha: number,
  light: number,
) {
  const flap = Math.sin(swim * 0.8) * len * 0.03
  const grad = ctx.createRadialGradient(0, flap, 0, 0, flap, len * 0.52)
  grad.addColorStop(0, `rgba(38, 68, 82, ${alpha * 0.82})`)
  grad.addColorStop(0.7, `rgba(22, 45, 58, ${alpha * 0.7})`)
  grad.addColorStop(1, `rgba(10, 25, 35, ${alpha * 0.45})`)

  ctx.beginPath()
  ctx.moveTo(len * 0.3, flap)
  ctx.quadraticCurveTo(0, -len * 0.48 + flap, -len * 0.36, flap * 0.35)
  ctx.quadraticCurveTo(0, len * 0.06 + flap, len * 0.3, flap)
  ctx.fillStyle = grad
  ctx.fill()

  ctx.strokeStyle = `rgba(100, 170, 190, ${alpha * (0.1 + light * 0.15)})`
  ctx.lineWidth = 0.5
  ctx.stroke()
}

function drawRay(
  ctx: CanvasRenderingContext2D,
  len: number,
  swim: number,
  alpha: number,
) {
  const wave = Math.sin(swim * 0.6) * len * 0.02
  ctx.beginPath()
  ctx.moveTo(len * 0.2, wave)
  ctx.quadraticCurveTo(0, -len * 0.22 + wave, -len * 0.28, wave)
  ctx.quadraticCurveTo(0, len * 0.08 + wave, len * 0.2, wave)
  ctx.fillStyle = `rgba(18, 42, 52, ${alpha * 0.75})`
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-len * 0.05, wave)
  ctx.quadraticCurveTo(-len * 0.12, wave + len * 0.25, -len * 0.06, wave + len * 0.45)
  ctx.strokeStyle = `rgba(12, 32, 42, ${alpha * 0.5})`
  ctx.lineWidth = 0.6
  ctx.stroke()
}

export function drawFish(
  ctx: CanvasRenderingContext2D,
  fish: OceanFish,
  t: number,
  alpha: number,
  lightFromAbove = 0.6,
) {
  if (alpha <= 0.015) return

  const len = fish.len
  const swim = t * 0.0035 + fish.phase
  const light = lightFromAbove * (1 - (fish.depth ?? 0.5) * 0.3)

  ctx.save()
  ctx.translate(fish.x, fish.y)
  ctx.scale(fish.dir, 1)

  if (fish.species === 'manta') {
    drawManta(ctx, len, swim, alpha, light)
  } else if (fish.species === 'ray') {
    drawRay(ctx, len, swim, alpha)
  } else if (fish.species === 'school') {
    const n = 6
    for (let i = 0; i < n; i++) {
      const ox = (i % 3 - 1) * len * 0.28
      const oy = (Math.floor(i / 3) - 0.5) * len * 0.2
      ctx.save()
      ctx.translate(ox, oy)
      drawSpineFish(ctx, len * 0.55, PROFILES.sardine, swim + i * 0.4, alpha * 0.7, light, 'school')
      ctx.restore()
    }
  } else {
    drawSpineFish(ctx, len, profileFor(fish.species), swim, alpha, light, fish.species)
  }

  ctx.restore()
}

function drawJellyfish(
  ctx: CanvasRenderingContext2D,
  j: Jellyfish,
  t: number,
  alpha: number,
) {
  const pulse = 0.9 + 0.1 * Math.sin(t * 0.0018 + j.phase)
  const sz = j.size * pulse

  ctx.save()
  ctx.translate(j.x, j.y)

  const bell = ctx.createRadialGradient(0, -sz * 0.06, 0, 0, 0, sz * 0.45)
  bell.addColorStop(0, `rgba(90, 160, 180, ${alpha * 0.12})`)
  bell.addColorStop(1, `rgba(15, 45, 58, ${alpha * 0.03})`)

  ctx.beginPath()
  ctx.ellipse(0, 0, sz * 0.48, sz * 0.17, 0, Math.PI, 0)
  ctx.fillStyle = bell
  ctx.fill()

  for (let i = 0; i < 5; i++) {
    const spread = (i / 4 - 0.5) * sz * 0.4
    ctx.beginPath()
    ctx.moveTo(spread * 0.3, sz * 0.03)
    ctx.lineTo(spread, sz * 0.85)
    ctx.strokeStyle = `rgba(35, 90, 110, ${alpha * 0.12})`
    ctx.lineWidth = 0.4
    ctx.stroke()
  }

  ctx.restore()
}

/** Fade wildlife behind central content column */
function contentZoneAlpha(x: number, y: number, w: number, h: number, base: number) {
  const cx = w * 0.5
  const colHalf = Math.min(w * 0.38, 420)
  const dx = Math.abs(x - cx) / colHalf
  const dy = y / h
  const colFade = dx < 1 ? lerp(base * 0.35, base, Math.pow(dx, 1.8)) : base
  const vertFade = dy > 0.15 && dy < 0.88 ? colFade * 0.7 : colFade
  return vertFade
}

export function initOceanLife(w: number, h: number, count = 7): OceanLifeState {
  const fish: OceanFish[] = []
  const species: FishSpecies[] = ['tuna', 'barracuda', 'school', 'manta', 'shark', 'ray']
  const margin = w * 0.08

  for (let i = 0; i < count; i++) {
    const sp = species[Math.floor(Math.random() * species.length)]
    const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1
    const len =
      sp === 'school'
        ? 28 + Math.random() * 20
        : sp === 'manta' || sp === 'ray'
          ? 100 + Math.random() * 80
          : sp === 'shark'
            ? 75 + Math.random() * 55
            : 55 + Math.random() * 45

    let x = Math.random() * w
    let y = h * (0.2 + Math.random() * 0.65)
    if (Math.random() > 0.4) {
      x = Math.random() > 0.5 ? margin + Math.random() * w * 0.12 : w - margin - Math.random() * w * 0.12
    }

    fish.push({
      x,
      y,
      vx: dir * (0.18 + Math.random() * 0.55),
      len,
      species: sp,
      phase: Math.random() * Math.PI * 2,
      dir,
      yDrift: (Math.random() - 0.5) * 0.04,
      depth: Math.random(),
    })
  }

  const jellies: Jellyfish[] = []
  for (let i = 0; i < 3; i++) {
    jellies.push({
      x: margin + Math.random() * (w - margin * 2),
      y: h * (0.4 + Math.random() * 0.45),
      vy: -0.05 - Math.random() * 0.08,
      vx: (Math.random() - 0.5) * 0.08,
      size: 22 + Math.random() * 28,
      phase: Math.random() * Math.PI * 2,
    })
  }

  return { fish, jellies }
}

export function updateOceanLife(
  life: OceanLifeState,
  w: number,
  h: number,
  t: number,
  dt: number,
) {
  for (const f of life.fish) {
    f.x += f.vx * dt * 60
    f.y += f.yDrift * dt * 60 + Math.sin(t * 0.0008 + f.phase) * 0.025
    if (f.x < -f.len * 2) {
      f.x = w + f.len
      f.y = h * (0.2 + Math.random() * 0.65)
    }
    if (f.x > w + f.len * 2) {
      f.x = -f.len
      f.y = h * (0.2 + Math.random() * 0.65)
    }
  }

  for (const j of life.jellies) {
    j.x += j.vx + Math.sin(t * 0.0006 + j.phase) * 0.04
    j.y += j.vy
    if (j.y < h * 0.12) {
      j.y = h * 0.88
      j.x = w * 0.1 + Math.random() * w * 0.8
    }
  }
}

export function drawOceanLife(
  ctx: CanvasRenderingContext2D,
  life: OceanLifeState,
  t: number,
  h: number,
  w: number,
  lightFromAbove = 0.65,
) {
  ctx.imageSmoothingEnabled = true

  for (const j of life.jellies) {
    const fade = contentZoneAlpha(j.x, j.y, w, h, 0.35 + (j.y / h) * 0.4)
    drawJellyfish(ctx, j, t, fade)
  }

  const sorted = [...life.fish].sort((a, b) => a.y - b.y)
  for (const f of sorted) {
    const base = 0.42 + (f.y / h) * 0.48
    const fade = contentZoneAlpha(f.x, f.y, w, h, base)
    const light = lightFromAbove * (1 - (f.y / h) * 0.4)
    drawFish(ctx, { ...f, depth: f.y / h }, t, fade, light)
  }
}

export function initDepthWildlife(maxDepth: number): DepthWildlife {
  const species: FishSpecies[] = ['tuna', 'barracuda', 'school', 'manta', 'shark', 'ray', 'angler']
  const fish: DepthFish[] = []

  for (let d = 15; d < maxDepth; d += 40 + Math.random() * 70) {
    const sp = species[Math.floor(Math.random() * species.length)]
    const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1
    const len =
      sp === 'school'
        ? 24 + Math.random() * 18
        : sp === 'manta' || sp === 'ray'
          ? 90 + Math.random() * 70
          : sp === 'shark'
            ? 65 + Math.random() * 50
            : sp === 'angler'
              ? 30 + Math.random() * 25
              : 48 + Math.random() * 40

    fish.push({
      x: Math.random(),
      y: 0.25 + Math.random() * 0.5,
      vx: dir * (0.003 + Math.random() * 0.01),
      len,
      species: sp,
      phase: Math.random() * Math.PI * 2,
      dir,
      yDrift: (Math.random() - 0.5) * 0.00015,
      depth: Math.random(),
      worldDepth: d + (Math.random() - 0.5) * 50,
    })
  }

  const jellies: DepthJelly[] = []
  for (let i = 0; i < 8; i++) {
    jellies.push({
      x: Math.random(),
      y: 0.35 + Math.random() * 0.4,
      vy: -0.00006 - Math.random() * 0.0001,
      vx: (Math.random() - 0.5) * 0.00008,
      size: 18 + Math.random() * 24,
      phase: Math.random() * Math.PI * 2,
      worldDepth: 500 + Math.random() * (maxDepth - 500),
    })
  }

  return { fish, jellies }
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function spawnDepthFish(wildlife: DepthWildlife, viewerDepth: number) {
  const species: FishSpecies[] = ['tuna', 'barracuda', 'school', 'manta', 'shark', 'ray', 'angler']
  const sp = species[Math.floor(Math.random() * species.length)]
  const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1
  const len =
    sp === 'school'
      ? 24 + Math.random() * 18
      : sp === 'manta' || sp === 'ray'
        ? 90 + Math.random() * 70
        : 48 + Math.random() * 40

  if (wildlife.fish.length > 70) return

  wildlife.fish.push({
    x: Math.random(),
    y: 0.15 + Math.random() * 0.65,
    vx: dir * (0.004 + Math.random() * 0.012),
    len,
    species: sp,
    phase: Math.random() * Math.PI * 2,
    dir,
    yDrift: (Math.random() - 0.5) * 0.0002,
    depth: Math.random(),
    worldDepth: viewerDepth + 30 + Math.random() * 280,
  })
}

export function updateDepthWildlife(
  wildlife: DepthWildlife,
  viewerDepth: number,
  _w: number,
  _h: number,
  t: number,
  dt: number,
  viewRange = 120,
) {
  for (const f of wildlife.fish) {
    f.x += f.vx * dt * 60
    f.y += f.yDrift * dt * 60 + Math.sin(t * 0.0008 + f.phase) * 0.0002
    if (f.x < -0.08) f.x = 1.08
    if (f.x > 1.08) f.x = -0.08

    if (f.worldDepth < viewerDepth - 60) {
      f.worldDepth = viewerDepth + 40 + Math.random() * viewRange * 0.85
      f.x = Math.random()
      f.phase = Math.random() * Math.PI * 2
    }
  }

  for (const j of wildlife.jellies) {
    j.x += j.vx + Math.sin(t * 0.0006 + j.phase) * 0.00006
    j.worldDepth += j.vy * dt * 60
    if (j.worldDepth < viewerDepth - 30) {
      j.worldDepth = viewerDepth + 50 + Math.random() * viewRange * 0.7
      j.x = Math.random()
    }
  }
}

export function drawDepthWildlife(
  ctx: CanvasRenderingContext2D,
  wildlife: DepthWildlife,
  viewerDepth: number,
  viewRange: number,
  w: number,
  h: number,
  t: number,
  lightPercent: number,
) {
  const light = lightPercent / 100

  for (const j of wildlife.jellies) {
    const rel = j.worldDepth - viewerDepth
    const sy = (rel / viewRange) * h + h * j.y * 0.12
    if (sy < -50 || sy > h + 50) continue
    const vis = smoothstep(400, 1400, viewerDepth) * (0.4 + light * 0.15)
    drawJellyfish(ctx, { ...j, x: j.x * w, y: sy }, t, vis)
  }

  const visible = wildlife.fish
    .map((f) => {
      const rel = f.worldDepth - viewerDepth
      const sy = (rel / viewRange) * h + h * f.y * 0.1
      const dist = Math.abs(rel)
      const depthFade = Math.max(0, 1 - dist / (viewRange * 0.9))
      const lightVis = Math.min(1, 0.45 + light * 0.55)
      const bioBoost = viewerDepth > 800 ? smoothstep(800, 2500, viewerDepth) * 0.35 : 0
      const vis = depthFade * Math.max(0.28, lightVis + bioBoost)
      return { f, sy, vis }
    })
    .filter((o) => o.sy > -100 && o.sy < h + 100 && o.vis > 0.015)
    .sort((a, b) => a.sy - b.sy)
    .slice(0, 18)

  for (const { f, sy, vis } of visible) {
    drawFish(ctx, { ...f, x: f.x * w, y: sy, depth: sy / h }, t, vis, light)
  }
}
