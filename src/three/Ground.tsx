import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { director, quality } from '../lib/state'

function makeStreak(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const ctx = c.getContext('2d')!
  ctx.translate(256, 128)
  ctx.fillStyle = '#000'
  ctx.fillRect(-256, -128, 512, 256)
  // Elongated cold light pool — like a streak on wet black stone
  for (const [rx, ry, a] of [
    [200, 34, 0.5],
    [150, 24, 0.35],
    [90, 16, 0.5],
  ] as const) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    ctx.save()
    ctx.scale(rx, ry)
    g.addColorStop(0, `rgba(190,235,250,${a})`)
    g.addColorStop(0.55, `rgba(120,200,225,${a * 0.4})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, 1, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function makeContactShadow(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(0,0,0,0.78)')
  g.addColorStop(0.45, 'rgba(0,0,0,0.4)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

// A faint light pool + contact shadow under the artifact —
// grounds the object instead of letting it float in the void.
export default function Ground() {
  const streakMat = useRef<THREE.MeshBasicMaterial>(null)
  const streak = useMemo(makeStreak, [])
  const shadow = useMemo(makeContactShadow, [])

  useFrame((state) => {
    if (!streakMat.current || quality.reduced) return
    const t = state.clock.elapsedTime
    // brightens as the ice opens and the glint sweeps by
    const revealBoost = Math.sin(Math.PI * director.reveal) * 0.18
    streakMat.current.opacity = 0.3 + Math.sin(t * 0.5) * 0.06 + revealBoost
  })

  return (
    <group position={[0, -1.475, 0]}>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.001} renderOrder={1}>
        <planeGeometry args={[4.4, 4.4]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} renderOrder={2}>
        <planeGeometry args={[6.5, 3.2]} />
        <meshBasicMaterial
          ref={streakMat}
          map={streak}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.3}
        />
      </mesh>
    </group>
  )
}
