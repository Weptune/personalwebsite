import React, { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  z: number
  color: string
  size: number
  brightness: number
  type:
    | 'dwarf'
    | 'main'
    | 'supergiant'
    | 'red'
    | 'bluegiant'
    | 'gold'
    | 'pulsar'
    | 'ghost'
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result =
    /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 }
}

export default function SpacePlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()

    // =========================
    // CONFIG
    // =========================

    const STAR_COUNT = 6000
    const MAX_DEPTH = 20000
    const FOV = 1000

    let speed = 0
    const targetSpeed = 950

    const stars: Star[] = []

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

      let type: Star['type']

      if (roll < 0.5) type = 'main'
      else if (roll < 0.7) type = 'dwarf'
      else if (roll < 0.82) type = 'red'
      else if (roll < 0.9) type = 'bluegiant'
      else if (roll < 0.95) type = 'gold'
      else if (roll < 0.985) type = 'supergiant'
      else if (roll < 0.995) type = 'pulsar'
      else type = 'ghost'

      const colors =
        starColors[type as keyof typeof starColors]

      return {
        x: (Math.random() - 0.5) * 15000,
        y: (Math.random() - 0.5) * 15000,
        z: Math.random() * MAX_DEPTH + 1000,
        color:
          colors[Math.floor(Math.random() * colors.length)],
        size:
          type === 'supergiant'
            ? Math.random() * 2.5 + 1.5
            : type === 'bluegiant'
            ? Math.random() * 2 + 1.2
            : type === 'gold'
            ? Math.random() * 2 + 1.5
            : type === 'pulsar'
            ? Math.random() * 0.8 + 0.6
            : type === 'ghost'
            ? Math.random() * 0.4 + 0.2
            : Math.random() * 1.5 + 0.4,
        brightness:
          type === 'ghost'
            ? Math.random() * 0.2 + 0.05
            : type === 'pulsar'
            ? Math.random() * 1 + 0.8
            : type === 'supergiant'
            ? Math.random() * 0.6 + 0.8
            : Math.random() * 0.8 + 0.3,
        type,
      }
    }

    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push(spawnStar())
    }

    const project = (x: number, y: number, z: number) => {
      const scale = FOV / z
      return {
        x: canvas.width / 2 + x * scale,
        y: canvas.height / 2 - y * scale,
        scale,
      }
    }

    let animationId: number
        const animate = () => {
      const time = performance.now() * 0.001

      // Smooth cinematic acceleration
      speed += (targetSpeed - speed) * 0.01

      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Subtle radial vignette
      const spaceGlow = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height) * 0.8,
      )
      spaceGlow.addColorStop(0, 'rgba(15,5,25,0.3)')
      spaceGlow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = spaceGlow
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let star of stars) {
        // Move star toward viewer
        star.z -= speed

        // Recycle star when it passes camera
        if (star.z <= 1) {
          const fresh = spawnStar()
          star.x = fresh.x
          star.y = fresh.y
          star.z = MAX_DEPTH
          star.color = fresh.color
          star.size = fresh.size
          star.brightness = fresh.brightness
          star.type = fresh.type
        }

        const proj = project(star.x, star.y, star.z)
        if (!proj) continue

        const scaledSize = star.size * proj.scale * 2
        if (scaledSize <= 0) continue

        const depthFade = Math.max(0, 1 - star.z / MAX_DEPTH)

        const twinkle =
          Math.sin(time * 2 + star.x * 0.0001) * 0.08

        let baseOpacity = Math.min(
          (star.brightness + twinkle) *
            depthFade *
            1.4,
          1,
        )

        // Ghost stars softly fade
        if (star.type === 'ghost') {
          baseOpacity *=
            0.5 + Math.sin(time * 1.5) * 0.3
        }

        const rgb = hexToRgb(star.color)

        // Hyperspace stretch factor
        const stretch =
          speed * 0.015 * proj.scale

        // =====================
        // CORE (elliptical stretch)
        // =====================

        ctx.globalAlpha = Math.min(baseOpacity * 1.3, 1)
        ctx.fillStyle = star.color
        ctx.beginPath()
        ctx.ellipse(
          proj.x,
          proj.y,
          scaledSize,
          scaledSize + stretch,
          0,
          0,
          Math.PI * 2,
        )
        ctx.fill()

        // =====================
        // INNER BLOOM
        // =====================

        if (scaledSize > 0.5) {
          const innerRadius = scaledSize * 3.5
          const innerGrad =
            ctx.createRadialGradient(
              proj.x,
              proj.y,
              0,
              proj.x,
              proj.y,
              innerRadius,
            )

          innerGrad.addColorStop(
            0,
            `rgba(${rgb.r},${rgb.g},${rgb.b},${baseOpacity * 1.2})`,
          )
          innerGrad.addColorStop(
            0.4,
            `rgba(${rgb.r},${rgb.g},${rgb.b},${baseOpacity * 0.6})`,
          )
          innerGrad.addColorStop(
            1,
            `rgba(${rgb.r},${rgb.g},${rgb.b},0)`,
          )

          ctx.fillStyle = innerGrad
          ctx.globalAlpha = 1
          ctx.beginPath()
          ctx.arc(
            proj.x,
            proj.y,
            innerRadius,
            0,
            Math.PI * 2,
          )
          ctx.fill()
        }

        // =====================
        // ATMOSPHERIC GLOW
        // =====================

        const glowRadius = scaledSize * 12
        const glowGrad =
          ctx.createRadialGradient(
            proj.x,
            proj.y,
            scaledSize,
            proj.x,
            proj.y,
            glowRadius,
          )

        glowGrad.addColorStop(
          0,
          `rgba(${rgb.r},${rgb.g},${rgb.b},${baseOpacity * 0.7})`,
        )
        glowGrad.addColorStop(
          0.5,
          `rgba(${rgb.r},${rgb.g},${rgb.b},${baseOpacity * 0.2})`,
        )
        glowGrad.addColorStop(
          1,
          `rgba(${rgb.r},${rgb.g},${rgb.b},0)`,
        )

        ctx.fillStyle = glowGrad
        ctx.beginPath()
        ctx.arc(
          proj.x,
          proj.y,
          glowRadius,
          0,
          Math.PI * 2,
        )
        ctx.fill()

        // =====================
        // SUPERGIANT BLOOM
        // =====================

        if (
          baseOpacity > 0.35 &&
          star.type === 'supergiant'
        ) {
          const bloomRadius =
            scaledSize * 20

          const bloomGrad =
            ctx.createRadialGradient(
              proj.x,
              proj.y,
              0,
              proj.x,
              proj.y,
              bloomRadius,
            )

          bloomGrad.addColorStop(
            0,
            `rgba(255,255,255,${baseOpacity * 0.4})`,
          )
          bloomGrad.addColorStop(
            0.6,
            `rgba(255,255,255,${baseOpacity * 0.1})`,
          )
          bloomGrad.addColorStop(
            1,
            `rgba(255,255,255,0)`,
          )

          ctx.fillStyle = bloomGrad
          ctx.beginPath()
          ctx.arc(
            proj.x,
            proj.y,
            bloomRadius,
            0,
            Math.PI * 2,
          )
          ctx.fill()
        }

        // =====================
        // GOLDEN GIANT BLOOM
        // =====================

        if (star.type === 'gold') {
          const goldGlow = scaledSize * 18

          const goldGrad =
            ctx.createRadialGradient(
              proj.x,
              proj.y,
              0,
              proj.x,
              proj.y,
              goldGlow,
            )

          goldGrad.addColorStop(
            0,
            `rgba(255,200,100,${baseOpacity * 0.5})`,
          )
          goldGrad.addColorStop(
            1,
            `rgba(255,200,100,0)`,
          )

          ctx.fillStyle = goldGrad
          ctx.beginPath()
          ctx.arc(
            proj.x,
            proj.y,
            goldGlow,
            0,
            Math.PI * 2,
          )
          ctx.fill()
        }

        // =====================
        // SPIKES
        // =====================

        if (
          baseOpacity > 0.4 &&
          scaledSize > 1.5
        ) {
          const spikeLen =
            scaledSize * 8 + stretch

          ctx.strokeStyle = star.color
          ctx.globalAlpha =
            baseOpacity * 0.8
          ctx.lineWidth =
            Math.max(1.5, scaledSize * 0.6)

          ctx.beginPath()
          ctx.moveTo(
            proj.x - spikeLen,
            proj.y,
          )
          ctx.lineTo(
            proj.x + spikeLen,
            proj.y,
          )
          ctx.stroke()

          ctx.beginPath()
          ctx.moveTo(
            proj.x,
            proj.y - spikeLen,
          )
          ctx.lineTo(
            proj.x,
            proj.y + spikeLen,
          )
          ctx.stroke()
        }
      }

      ctx.globalAlpha = 1
      animationId =
        requestAnimationFrame(animate)
    }

    animate()
        window.addEventListener('resize', resizeCanvas)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <div className="fixed inset-0 w-full h-full z-50 bg-black overflow-hidden cursor-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />

      <div className="fixed inset-0 pointer-events-none flex flex-col">
        <div className="flex-shrink-0 p-8 pointer-events-auto">
          <div className="border-b-2 border-cyan-500 pb-4 mb-4">
            <h1 className="text-4xl font-bold text-cyan-400 tracking-wider">
              HYPERSPACE
            </h1>
            <p className="text-xs text-cyan-300 mt-2 font-mono">
              WARP ENGINES ENGAGED
            </p>
          </div>
          <p className="text-xs text-cyan-300 font-mono">
            ▸ TRAVELING THROUGH 6000+ STARS
          </p>
        </div>

        <div className="absolute top-8 right-8 pointer-events-auto z-50">
          <a
            href="/"
            className="block px-6 py-3 border-2 border-cyan-400 bg-black text-cyan-400 hover:bg-cyan-400 hover:text-black font-mono text-sm transition-all"
          >
            ← back
          </a>
        </div>

        <div className="flex-1" />

        <div className="flex-shrink-0 p-8 pointer-events-auto">
          <div className="border-t-2 border-cyan-500 pt-4">
            <p className="text-xs text-cyan-300 font-mono">
              ▸ STELLAR FIELD STABLE • VELOCITY MAXIMIZING
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}