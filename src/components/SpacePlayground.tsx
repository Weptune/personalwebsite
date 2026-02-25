import React, { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  z: number
  color: string
  size: number
  brightness: number
  type: 'dwarf' | 'main' | 'supergiant' | 'red'
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
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

    // Camera with full control
    const camera = { x: 0, y: 0, z: 0, rotationX: 0, rotationY: 0 }
    const movement = { forward: false, backward: false, left: false, right: false, up: false, down: false }

    let mouseDown = false
    let lastMouseX = 0
    let lastMouseY = 0

    // Generate massive star field
    const stars: Star[] = []

    const starColors = {
      dwarf: ['#ffffff', '#ffffee'],
      main: ['#ffffdd', '#ffffcc', '#ffff99', '#fffeee'],
      supergiant: ['#66ccff', '#88ddff'],
      red: ['#ff9966', '#ff7744', '#ff6633', '#dd5522'],
    }

    // Generate 6000+ stars in a sphere
    for (let i = 0; i < 800; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 20000,
        y: (Math.random() - 0.5) * 20000,
        z: (Math.random() - 0.5) * 20000,
        color: starColors.dwarf[Math.floor(Math.random() * starColors.dwarf.length)],
        size: Math.random() * 1.5 + 0.8,
        brightness: Math.random() * 0.9 + 0.6,
        type: 'dwarf',
      })
    }

    for (let i = 0; i < 3500; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 20000,
        y: (Math.random() - 0.5) * 20000,
        z: (Math.random() - 0.5) * 20000,
        color: starColors.main[Math.floor(Math.random() * starColors.main.length)],
        size: Math.random() * 1.2 + 0.3,
        brightness: Math.random() * 0.8 + 0.3,
        type: 'main',
      })
    }

    for (let i = 0; i < 200; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 20000,
        y: (Math.random() - 0.5) * 20000,
        z: (Math.random() - 0.5) * 20000,
        color: starColors.supergiant[Math.floor(Math.random() * starColors.supergiant.length)],
        size: Math.random() * 2.5 + 1.2,
        brightness: Math.random() * 0.6 + 0.8,
        type: 'supergiant',
      })
    }

    for (let i = 0; i < 1500; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 20000,
        y: (Math.random() - 0.5) * 20000,
        z: (Math.random() - 0.5) * 20000,
        color: starColors.red[Math.floor(Math.random() * starColors.red.length)],
        size: Math.random() * 0.9 + 0.2,
        brightness: Math.random() * 0.5 + 0.15,
        type: 'red',
      })
    }

    const rotatePoint = (x: number, y: number, z: number, rotX: number, rotY: number) => {
      let y1 = y * Math.cos(rotX) - z * Math.sin(rotX)
      let z1 = y * Math.sin(rotX) + z * Math.cos(rotX)
      let x2 = x * Math.cos(rotY) + z1 * Math.sin(rotY)
      let z2 = -x * Math.sin(rotY) + z1 * Math.cos(rotY)
      return { x: x2, y: y1, z: z2 }
    }

    const project = (x: number, y: number, z: number) => {
      const relX = x - camera.x
      const relY = y - camera.y
      const relZ = z - camera.z
      const rotated = rotatePoint(relX, relY, relZ, camera.rotationX, camera.rotationY)
      const fov = 1000
      if (rotated.z > 10) {
        const scale = fov / rotated.z
        return {
          x: canvas.width / 2 + rotated.x * scale,
          y: canvas.height / 2 - rotated.y * scale,
          z: rotated.z,
          scale,
        }
      }
      return null
    }

    let animationId: number

    const animate = () => {
      const moveSpeed = 100
      const strafeSpeed = 70

      if (movement.forward) {
        camera.z += moveSpeed * Math.cos(camera.rotationY)
        camera.x += moveSpeed * Math.sin(camera.rotationY)
      }
      if (movement.backward) {
        camera.z -= moveSpeed * Math.cos(camera.rotationY)
        camera.x -= moveSpeed * Math.sin(camera.rotationY)
      }
      if (movement.left) {
        camera.x -= strafeSpeed * Math.cos(camera.rotationY)
        camera.z += strafeSpeed * Math.sin(camera.rotationY)
      }
      if (movement.right) {
        camera.x += strafeSpeed * Math.cos(camera.rotationY)
        camera.z -= strafeSpeed * Math.sin(camera.rotationY)
      }
      if (movement.up) camera.y -= moveSpeed
      if (movement.down) camera.y += moveSpeed

      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const spaceGlow = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height) * 0.8,
      )
      spaceGlow.addColorStop(0, 'rgba(15, 5, 25, 0.3)')
      spaceGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = spaceGlow
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const depthSorted = stars
        .map((star) => {
          const rotated = rotatePoint(
            star.x - camera.x,
            star.y - camera.y,
            star.z - camera.z,
            camera.rotationX,
            camera.rotationY,
          )
          return { star, z: rotated.z }
        })
        .filter((s) => s.z > 10)
        .sort((a, b) => b.z - a.z)

      for (const { star } of depthSorted) {
        const proj = project(star.x, star.y, star.z)
        if (proj && proj.z > 10 && proj.z < 20000) {
          const depthFade = Math.max(0, 1 - proj.z / 18000)
          const scaledSize = Math.max(star.size * proj.scale * 2, 1)
          const baseOpacity = Math.min(star.brightness * depthFade * 1.4, 1)

          const rgb = hexToRgb(star.color)

          // Core
          ctx.globalAlpha = Math.min(baseOpacity * 1.3, 1)
          ctx.fillStyle = star.color
          ctx.beginPath()
          ctx.arc(proj.x, proj.y, scaledSize * 1.5, 0, Math.PI * 2)
          ctx.fill()

          // Inner bloom
          if (scaledSize > 0.5) {
            const innerRadius = scaledSize * 3.5
            const innerGrad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, innerRadius)
            innerGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseOpacity * 1.2})`)
            innerGrad.addColorStop(0.4, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseOpacity * 0.6})`)
            innerGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
            ctx.fillStyle = innerGrad
            ctx.globalAlpha = 1
            ctx.beginPath()
            ctx.arc(proj.x, proj.y, innerRadius, 0, Math.PI * 2)
            ctx.fill()
          }

          // Atmospheric glow
          const glowRadius = scaledSize * 12
          const glowGrad = ctx.createRadialGradient(proj.x, proj.y, scaledSize, proj.x, proj.y, glowRadius)
          glowGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseOpacity * 0.7})`)
          glowGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseOpacity * 0.2})`)
          glowGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
          ctx.fillStyle = glowGrad
          ctx.globalAlpha = 1
          ctx.beginPath()
          ctx.arc(proj.x, proj.y, glowRadius, 0, Math.PI * 2)
          ctx.fill()

          // Bloom for supergiants
          if (baseOpacity > 0.35 && star.type === 'supergiant') {
            const bloomRadius = scaledSize * 20
            const bloomGrad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, bloomRadius)
            bloomGrad.addColorStop(0, `rgba(255, 255, 255, ${baseOpacity * 0.4})`)
            bloomGrad.addColorStop(0.6, `rgba(255, 255, 255, ${baseOpacity * 0.1})`)
            bloomGrad.addColorStop(1, `rgba(255, 255, 255, 0)`)
            ctx.fillStyle = bloomGrad
            ctx.globalAlpha = 1
            ctx.beginPath()
            ctx.arc(proj.x, proj.y, bloomRadius, 0, Math.PI * 2)
            ctx.fill()
          }

          // Spikes
          if (baseOpacity > 0.4 && scaledSize > 1.5) {
            const spikeLen = scaledSize * 8
            ctx.strokeStyle = star.color
            ctx.globalAlpha = baseOpacity * 0.8
            ctx.lineWidth = Math.max(1.5, scaledSize * 0.6)

            ctx.beginPath()
            ctx.moveTo(proj.x - spikeLen, proj.y)
            ctx.lineTo(proj.x + spikeLen, proj.y)
            ctx.stroke()

            ctx.beginPath()
            ctx.moveTo(proj.x, proj.y - spikeLen)
            ctx.lineTo(proj.x, proj.y + spikeLen)
            ctx.stroke()

            if (star.type === 'supergiant') {
              ctx.globalAlpha = baseOpacity * 0.6
              const diagLen = spikeLen * 0.85
              ctx.lineWidth = Math.max(1, scaledSize * 0.5)
              ctx.beginPath()
              ctx.moveTo(proj.x - diagLen, proj.y - diagLen)
              ctx.lineTo(proj.x + diagLen, proj.y + diagLen)
              ctx.stroke()

              ctx.beginPath()
              ctx.moveTo(proj.x + diagLen, proj.y - diagLen)
              ctx.lineTo(proj.x - diagLen, proj.y + diagLen)
              ctx.stroke()
            }
          }
        }
      }

      ctx.globalAlpha = 1
      animationId = requestAnimationFrame(animate)
    }

    animate()

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'w') movement.forward = true
      if (key === 's') movement.backward = true
      if (key === 'a') movement.left = true
      if (key === 'd') movement.right = true
      if (key === ' ') movement.up = true
      if (key === 'shift') movement.down = true
      if (key === 'escape') window.location.href = '/'
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'w') movement.forward = false
      if (key === 's') movement.backward = false
      if (key === 'a') movement.left = false
      if (key === 'd') movement.right = false
      if (key === ' ') movement.up = false
      if (key === 'shift') movement.down = false
    }

    const onMouseDown = (e: MouseEvent) => {
      mouseDown = true
      lastMouseX = e.clientX
      lastMouseY = e.clientY
    }

    const onMouseUp = () => {
      mouseDown = false
    }

    const onMouseMove = (e: MouseEvent) => {
      if (mouseDown) {
        const deltaX = e.clientX - lastMouseX
        const deltaY = e.clientY - lastMouseY
        camera.rotationY -= deltaX * 0.005
        camera.rotationX -= deltaY * 0.005
        camera.rotationX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, camera.rotationX))
        lastMouseX = e.clientX
        lastMouseY = e.clientY
      }
    }

    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return (
    <div className="fixed inset-0 w-full h-full z-50 bg-black overflow-hidden cursor-none">
      <canvas ref={canvasRef} className="w-full h-full block" />

      <div className="fixed inset-0 pointer-events-none flex flex-col">
        <div className="flex-shrink-0 p-8 pointer-events-auto">
          <div className="border-b-2 border-cyan-500 pb-4 mb-4">
            <h1 className="text-4xl font-bold text-cyan-400 tracking-wider">STARFIELD</h1>
            <p className="text-xs text-cyan-300 mt-2 font-mono">SYSTEMS ONLINE</p>
          </div>
          <p className="text-xs text-cyan-300 font-mono">
            ▸ WASD Navigate • SPACE/SHIFT Ascend/Descend • Click+Drag to Look • ESC to Return
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
            <p className="text-xs text-cyan-300 font-mono">▸ 6000+ STARS DETECTED • READY FOR EXPLORATION</p>
          </div>
        </div>
      </div>
    </div>
  )
}
