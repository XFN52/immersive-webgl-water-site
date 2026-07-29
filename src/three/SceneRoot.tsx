import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import Artifact from './Artifact'
import Snow from './Snow'
import Ground from './Ground'
import CameraRig from './CameraRig'
import Effects from './Effects'
import { bus, quality } from '../lib/state'

// Cinematic lighting: the rim (back) light is stronger than the fill,
// the object reads by its edge — not by flat illumination.
// Point intensities are physical (candela, decay 2) for three r155+.
function Lights() {
  return (
    <>
      <ambientLight intensity={0.15} color="#1A2838" />
      <directionalLight position={[4, 6, 3]} intensity={3.2} color="#BFEAF5" />
      <pointLight position={[-3, 1, -4]} intensity={70} color="#7FD4E8" distance={12} decay={2} />
      <pointLight position={[0, -2, 2]} intensity={6} color="#2A4050" distance={10} decay={2} />
      <pointLight position={[-1.5, 0.5, 6]} intensity={9} color="#3E7A8C" distance={16} decay={2} />
    </>
  )
}

// Fully procedural environment (no HDRI files) — a few light-formers
// that paint long icy streaks into the glass and the ice.
function Env() {
  return (
    <Environment resolution={384} frames={1} background={false}>
      <color attach="background" args={['#04080d']} />
      <Lightformer
        form="rect"
        intensity={5}
        color="#BFEAF5"
        position={[0, 5, 0]}
        rotation-x={Math.PI / 2}
        scale={[9, 4, 1]}
      />
      <Lightformer
        form="rect"
        intensity={10}
        color="#7FD4E8"
        position={[-6, 1, -2]}
        rotation-y={Math.PI / 2}
        scale={[1, 7, 1]}
      />
      <Lightformer
        form="rect"
        intensity={4}
        color="#9fdcec"
        position={[0, 2, -7]}
        scale={[8, 3, 1]}
      />
      <Lightformer
        form="rect"
        intensity={2.2}
        color="#2A4050"
        position={[6, -1, 2]}
        rotation-y={-Math.PI / 2}
        scale={[1, 5, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.4}
        color="#C8956D"
        position={[2.5, -4, -1]}
        rotation-x={-Math.PI / 3}
        scale={[3, 1, 1]}
      />
    </Environment>
  )
}

// Slowly rotates the environment map — reflections on the ice keep drifting.
function EnvDrift() {
  const scene = useThree((s) => s.scene)
  useFrame((_, dt) => {
    if (quality.reduced) return
    const rot = (scene as THREE.Scene & { environmentRotation?: THREE.Euler }).environmentRotation
    if (rot) rot.y += dt * 0.028
  })
  return null
}

// Real loading telemetry: renderer up → shaders compiled → frames rendered.
function BootGate() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const frames = useRef(0)
  const done = useRef(false)

  useEffect(() => {
    bus.stage = Math.max(bus.stage, 25)
    let live = true
    const compileAsync = (
      gl as unknown as { compileAsync?: (s: THREE.Scene, c: THREE.Camera) => Promise<void> }
    ).compileAsync
    const p = compileAsync ? compileAsync.call(gl, scene, camera) : Promise.resolve()
    p.catch(() => undefined).then(() => {
      if (live) bus.stage = 70
    })
    return () => {
      live = false
    }
  }, [gl, scene, camera])

  useFrame(() => {
    if (done.current) return
    if (bus.stage >= 70) {
      frames.current += 1
      if (frames.current > 6) {
        bus.stage = 100
        done.current = true
      }
    }
  })

  return null
}

export default function SceneRoot() {
  return (
    <Canvas
      dpr={quality.dpr}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMappingExposure: 1.12,
      }}
      camera={{ fov: 32, near: 0.1, far: 100, position: [0, 0, 14] }}
    >
      <color attach="background" args={['#05070A']} />
      <fogExp2 attach="fog" args={['#05070A', 0.045]} />
      <Suspense fallback={null}>
        <Lights />
        <Env />
        <Artifact />
        <Ground />
        <Snow count={quality.snow} />
      </Suspense>
      <CameraRig />
      <EnvDrift />
      <BootGate />
      <Effects />
    </Canvas>
  )
}
