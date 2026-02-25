import React, { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
  pulseSpeed: number
  pulsePhase: number
  type: 'star' | 'dust' | 'meteor'
}

export default function NightSkyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas to window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Initialize particles
    const particles: Particle[] = []

    // Create stars
    for (let i = 0; i < 200; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random(),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.7 + 0.3,
        color: ['#ffffff', '#e0e0ff', '#ffe0e0', '#e0ffe0', '#e0f0ff'][
          Math.floor(Math.random() * 5)
        ],
        pulseSpeed: Math.random() * 0.03 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
        type: 'star',
      })
    }

    // Create dust particles (slow floating)
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 0.5 + 0.25,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        size: Math.random() * 0.8 + 0.2,
        opacity: Math.random() * 0.3 + 0.05,
        color: '#b8a8ff',
        pulseSpeed: Math.random() * 0.01 + 0.005,
        pulsePhase: Math.random() * Math.PI * 2,
        type: 'dust',
      })
    }

    // Create occasional meteors
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.3,
        z: Math.random() * 0.8 + 0.2,
        vx: Math.random() * 2 + 1.5,
        vy: Math.random() * 1.5 + 1,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.6 + 0.3,
        color: '#ffddaa',
        pulseSpeed: 0.1,
        pulsePhase: 0,
        type: 'meteor',
      })
    }

    let animationId: number
    let time = 0

    const animate = () => {
      // Clear with semi-transparent background for trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.02)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      time += 1

      particles.forEach((p, i) => {
        // Update position
        p.x += p.vx
        p.y += p.vy

        // Wrap around screen with parallax
        if (p.x > canvas.width + 50) p.x = -50
        if (p.x < -50) p.x = canvas.width + 50
        if (p.y > canvas.height + 50) p.y = -50
        if (p.y < -50) p.y = canvas.height + 50

        // Calculate pulsing opacity
        let displayOpacity = p.opacity
        if (p.type === 'star') {
          displayOpacity =
            p.opacity * (0.5 + 0.5 * Math.sin(time * p.pulseSpeed + p.pulsePhase))
        } else if (p.type === 'dust') {
          displayOpacity =
            p.opacity * (0.4 + 0.6 * Math.sin(time * p.pulseSpeed * 0.5 + p.pulsePhase))
        } else if (p.type === 'meteor') {
          displayOpacity = Math.max(0, p.opacity - time * 0.005)
          // Reset meteor if it faded out
          if (displayOpacity < 0.01 && Math.random() > 0.95) {
            p.x = Math.random() * canvas.width
            p.y = Math.random() * canvas.height * 0.2
            p.opacity = Math.random() * 0.6 + 0.3
          }
        }

        ctx.fillStyle = p.color
        ctx.globalAlpha = displayOpacity

        if (p.type === 'star') {
          // Draw stars with glow
          ctx.shadowColor = p.color
          ctx.shadowBlur = p.size * 2
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        } else if (p.type === 'dust') {
          // Draw dust particles
          ctx.globalAlpha = displayOpacity * 0.6
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.type === 'meteor') {
          // Draw meteors with trail
          ctx.globalAlpha = displayOpacity
          ctx.shadowColor = '#ffeeaa'
          ctx.shadowBlur = 15
          ctx.strokeStyle = p.color
          ctx.lineWidth = p.size
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(p.x - p.vx * 8, p.y - p.vy * 8)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
          ctx.shadowBlur = 0
        }
      })

      ctx.globalAlpha = 1

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-50 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800"
      style={{
        background: `
          radial-gradient(circle at 15% 10%, oklch(0.35 0.15 280) 0%, transparent 45%),
          radial-gradient(circle at 85% 90%, oklch(0.30 0.12 210) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, oklch(0.08 0.02 260) 0%, oklch(0.03 0 0) 100%)
        `,
        backgroundAttachment: 'fixed',
      }}
    />
  )
}
