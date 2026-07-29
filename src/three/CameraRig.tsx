import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { bus, director, mouse, quality, scroll } from '../lib/state'
import { updateDirector } from '../lib/director'

const _look = new THREE.Vector3()
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export default function CameraRig() {
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const st = useRef({ vh: 0, mx: 0, my: 0, lx: 0, ly: 0.2, lz: 0, prevRaw: 0, vel: 0 })

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    const t = state.clock.elapsedTime
    const still = quality.reduced ? 0 : 1

    // Smoothed scroll position drives everything in the scene
    s.vh += (scroll.vh - s.vh) * (1 - Math.exp(-dt * 3.5))
    updateDirector(s.vh)

    // Awakening: right after the preloader lifts, the camera flies the last
    // stretch out of the fog (dolly + fog rush over ~2.6s)
    let introZ = 0
    let introFog = 0
    if (bus.introAt !== null) {
      const k = (performance.now() - bus.introAt) / 2600
      if (k >= 1) {
        bus.introAt = null
      } else {
        const e = 1 - easeOutCubic(clamp(k, 0, 1))
        introZ = e * 2.8
        introFog = e * 0.022
      }
    }

    // Scroll velocity (story vh / s) — feeds the camera bank and fov breath
    const instVel = dt > 0.0001 ? (scroll.vh - s.prevRaw) / dt : 0
    s.prevRaw = scroll.vh
    s.vel += (instVel - s.vel) * (1 - Math.exp(-dt * 3.2))

    const fog = scene.fog as THREE.FogExp2 | null
    if (fog) fog.density += (director.fog + introFog - fog.density) * (1 - Math.exp(-dt * 3))

    // Mouse parallax: felt, not noticed (±0.15, lerp ≈ 0.03 @60fps)
    const mOn = quality.mobile || quality.reduced ? 0 : 1
    const mk = 1 - Math.exp(-dt * 1.8)
    s.mx += (mouse.x * 0.15 * mOn - s.mx) * mk
    s.my += (-mouse.y * 0.12 * mOn - s.my) * mk

    // Handheld micro-drift — the frame never fully stops
    let hx = (Math.sin(t * 0.55) * 0.6 + Math.sin(t * 1.31 + 1.7) * 0.4) * 0.012 * still
    let hy = (Math.sin(t * 0.7 + 0.9) * 0.6 + Math.sin(t * 1.9 + 3.1) * 0.4) * 0.01 * still

    // Turbulence: fast scrolling shakes the frame ever so slightly
    const vAbs = Math.abs(s.vel) * still
    const jit = Math.min(vAbs * 0.0009, 0.028)
    hx += Math.sin(t * 43.7) * jit * 0.6
    hy += Math.sin(t * 37.9 + 2) * jit * 0.5

    // The ice "cracks" — one sharp decaying kick
    if (bus.crackAt !== null && still) {
      const k = (performance.now() - bus.crackAt) / 520
      if (k >= 1) {
        bus.crackAt = null
      } else {
        const amp = (1 - k) * (1 - k) * 0.024
        hx += Math.sin(t * 61.3) * amp
        hy += Math.sin(t * 53.7 + 1.2) * amp * 0.8
      }
    }

    const kp = 1 - Math.exp(-dt * 5)
    camera.position.x += (director.px + s.mx + hx - camera.position.x) * kp
    camera.position.y += (director.py + s.my + hy - camera.position.y) * kp
    camera.position.z += (director.pz + introZ - camera.position.z) * kp

    const kl = 1 - Math.exp(-dt * 4)
    s.lx += (director.lx - s.lx) * kl
    s.ly += (director.ly - s.ly) * kl
    s.lz += (director.lz - s.lz) * kl
    camera.lookAt(_look.set(s.lx, s.ly, s.lz))

    // Bank into the scroll direction + fov breath while travelling
    const v = s.vel * still
    const bank = clamp(v * 0.00006, -0.012, 0.012)
    camera.rotateZ(-bank)
    const pc = camera as THREE.PerspectiveCamera
    const fovT = 32 + Math.min(Math.abs(v) * 0.004, 2.2)
    if (Math.abs(pc.fov - fovT) > 0.005) {
      pc.fov += (fovT - pc.fov) * (1 - Math.exp(-dt * 2.6))
      pc.updateProjectionMatrix()
    }
  })

  return null
}
