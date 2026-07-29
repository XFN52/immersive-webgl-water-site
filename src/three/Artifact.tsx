import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { buildIceMonolith, type IceFragment } from './ice'
import Bottle from './Bottle'
import Frost from './Frost'
import { director, quality } from '../lib/state'

// Trapped air bubbles glittering inside each shard's volume
function Bubbles({ f }: { f: IceFragment }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const count = f.bubbles.length / 4
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#dff3fb'),
        roughness: 0.06,
        metalness: 0,
        emissive: new THREE.Color('#7fd4e8'),
        emissiveIntensity: 0.3,
        envMapIntensity: 2.6,
      }),
    []
  )
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const s = f.bubbles[i * 4 + 3]
      d.position.set(f.bubbles[i * 4], f.bubbles[i * 4 + 1], f.bubbles[i * 4 + 2])
      d.scale.set(s, s * (0.7 + ((i * 37) % 10) / 16), s)
      d.rotation.set(i * 1.7, i * 2.3, i * 0.9)
      d.updateMatrix()
      m.setMatrixAt(i, d.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [f, count])
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}

// Branching crack veins frozen inside the ice
function makeCrackTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, 512, 512)
  ctx.lineCap = 'round'
  let seed = 7
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  for (let b = 0; b < 15; b++) {
    let x = 60 + rnd() * 390
    let y = 60 + rnd() * 390
    let ang = rnd() * Math.PI * 2
    const steps = 14 + Math.floor(rnd() * 22)
    ctx.strokeStyle = `rgba(200, 240, 255, ${0.35 + rnd() * 0.5})`
    ctx.lineWidth = 0.6 + rnd() * 2.2
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let s = 0; s < steps; s++) {
      ang += (rnd() - 0.5) * 1.3
      const len = 6 + rnd() * 18
      x += Math.cos(ang) * len
      y += Math.sin(ang) * len
      ctx.lineTo(x, y)
      if (rnd() < 0.22) {
        // fork
        const fx = x
        const fy = y
        let fa = ang + (rnd() - 0.5) * 2.2
        ctx.moveTo(fx, fy)
        const fSteps = 3 + Math.floor(rnd() * 6)
        let fxx = fx
        let fyy = fy
        for (let fs = 0; fs < fSteps; fs++) {
          fa += (rnd() - 0.5) * 1.1
          fxx += Math.cos(fa) * (4 + rnd() * 10)
          fyy += Math.sin(fa) * (4 + rnd() * 10)
          ctx.lineTo(fxx, fyy)
        }
        ctx.moveTo(x, y)
      }
    }
    ctx.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function CrackVeins({ seedOffset }: { seedOffset: number }) {
  const tex = useMemo(makeCrackTexture, [])
  const geo = useMemo(() => new THREE.PlaneGeometry(0.62, 0.95), [])
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    [tex]
  )
  const r1 = (seedOffset * 0.77) % (Math.PI * 2)
  const r2 = (seedOffset * 1.31) % Math.PI
  return (
    <group>
      <mesh geometry={geo} material={mat} position={[0, 0.1, 0.05]} rotation={[r2, r1, 0]} />
      <mesh
        geometry={geo}
        material={mat}
        position={[0.04, -0.25, -0.04]}
        rotation={[-r2 * 0.7, r1 + 1.9, 0.6]}
        scale={0.75}
      />
    </group>
  )
}

export default function Artifact() {
  const group = useRef<THREE.Group>(null)
  const glint = useRef<THREE.PointLight>(null)
  const inner = useRef<THREE.PointLight>(null)
  const frags = useMemo(buildIceMonolith, [])
  const fragRefs = useRef<Array<THREE.Mesh | null>>([])

  const iceMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        transmission: 1,
        thickness: 2.5,
        roughness: 0.14,
        ior: 1.31, // real ice
        dispersion: 0.06,
        color: new THREE.Color('#d6f1fb'),
        attenuationColor: new THREE.Color('#8fd4e8'),
        attenuationDistance: 3.0,
        specularIntensity: 1,
        envMapIntensity: 1.5,
        emissive: new THREE.Color('#16404f'),
        emissiveIntensity: 0.7,
        clearcoat: 0.4,
        clearcoatRoughness: 0.3,
        iridescence: 0.32,
        iridescenceIOR: 1.3,
        iridescenceThicknessRange: [120, 420],
        side: THREE.DoubleSide,
      }),
    []
  )

  // Milky crushed ice for fracture faces — bright, scattering, opaque-ish
  const fractureMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        transmission: 0.72,
        thickness: 1.1,
        roughness: 0.42,
        ior: 1.31,
        color: new THREE.Color('#e8f6fc'),
        attenuationColor: new THREE.Color('#a5dcee'),
        attenuationDistance: 1.4,
        specularIntensity: 1,
        envMapIntensity: 1.7,
        emissive: new THREE.Color('#2b5a68'),
        emissiveIntensity: 0.55,
        clearcoat: 0.1,
        clearcoatRoughness: 0.7,
        side: THREE.DoubleSide,
      }),
    []
  )

  const shardMats = useMemo(() => [iceMat, fractureMat], [iceMat, fractureMat])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime

    // Live light: a glint slowly orbits the artifact, the inner glow breathes
    if (!quality.reduced) {
      if (glint.current) {
        const a = t * 0.24
        glint.current.position.set(
          Math.cos(a) * 2.9,
          1.3 + Math.sin(t * 0.17) * 0.8,
          Math.sin(a) * 2.9
        )
        glint.current.intensity = 6 + Math.sin(t * 0.9) * 2.2
      }
      if (inner.current) {
        inner.current.intensity = 9 + Math.sin(t * 1.3) * 1.2 + Math.sin(t * 3.7 + 1) * 0.6
      }
    }

    g.rotation.y += dt * 0.072 * director.rot
    g.position.y = quality.reduced ? 0 : Math.sin(t * 0.4) * 0.04

    const r = director.reveal
    const esc = director.escape

    for (let i = 0; i < frags.length; i++) {
      const f = frags[i]
      const m = fragRefs.current[i]
      if (!m) continue
      const dist = 0.03 + r * 2.05 + esc * 5.2
      m.position.copy(f.centroid).addScaledVector(f.dir, dist)
      m.position.y += esc * (f.cap ? 1.7 : -0.5)
      m.scale.setScalar(1 - esc * 0.22)
      m.quaternion.setFromAxisAngle(f.axis, r * f.spin * 1.4 + t * 0.05 * f.spinSign * r)
    }
  })

  return (
    <group ref={group}>
      {frags.map((f, i) => (
        <mesh
          key={i}
          ref={(el) => {
            fragRefs.current[i] = el
          }}
          geometry={f.geometry}
          material={shardMats}
        >
          <Bubbles f={f} />
          <CrackVeins seedOffset={i * 1.618 + 0.7} />
        </mesh>
      ))}
      <Frost />
      <Bottle />
      <pointLight ref={inner} position={[0, 0.9, 0]} intensity={9} color="#8fdcf0" distance={5} decay={2} />
      <pointLight ref={glint} position={[2.9, 1.3, 0]} intensity={6} color="#bfeaf5" distance={7} decay={2} />
    </group>
  )
}
