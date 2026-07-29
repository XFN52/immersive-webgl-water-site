import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { director, quality } from '../lib/state'

function makePuff(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(215,242,252,0.85)')
  g.addColorStop(0.35, 'rgba(160,215,235,0.4)')
  g.addColorStop(0.7, 'rgba(90,150,175,0.12)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

const COUNT = 9
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

// A faint frozen breath that exhales when the monolith opens.
export default function Frost() {
  const tex = useMemo(makePuff, [])
  const sprites = useRef<Array<THREE.Sprite | null>>([])
  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        x: Math.sin(i * 2.4) * (0.7 + (i % 3) * 0.35),
        y: -0.7 + ((i * 41) % 100) / 100 * 2.0,
        z: Math.cos(i * 1.9) * (0.7 + ((i * 7) % 3) * 0.3),
        base: 0.5 + ((i * 13) % 10) / 14,
        speed: 0.85 + ((i * 29) % 10) / 22,
      })),
    []
  )
  const mats = useMemo(
    () =>
      Array.from(
        { length: COUNT },
        () =>
          new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false,
          })
      ),
    [tex]
  )

  useFrame(() => {
    if (quality.reduced) return
    const p = clamp01((director.reveal - 0.3) / 0.5)
    const breathe = Math.sin(Math.PI * p)
    const fadeOut = 1 - director.escape * 0.85
    for (let i = 0; i < COUNT; i++) {
      const sp = sprites.current[i]
      if (!sp) continue
      const s = seeds[i]
      const pp = clamp01(p * s.speed + 0.15)
      sp.scale.setScalar(s.base * (0.6 + pp * 2.4))
      sp.position.set(s.x * pp, s.y + pp * 0.5, s.z * pp)
      mats[i].opacity = breathe * fadeOut * 0.13
    }
  })

  return (
    <group>
      {seeds.map((s, i) => (
        <sprite
          key={i}
          ref={(el) => {
            sprites.current[i] = el
          }}
          material={mats[i]}
          position={[s.x, s.y, s.z]}
          scale={[0.001, 0.001, 0.001]}
        />
      ))}
    </group>
  )
}
