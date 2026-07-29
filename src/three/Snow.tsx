import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { director, quality } from '../lib/state'

const dummy = new THREE.Object3D()
const Y_MIN = -9
const Y_RANGE = 21

export default function Snow({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!)

  const data = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const speed = new Float32Array(count)
    const phase = new Float32Array(count)
    const drift = new Float32Array(count)
    const size = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26
      pos[i * 3 + 1] = Y_MIN + Math.random() * Y_RANGE
      pos[i * 3 + 2] = -18 + Math.random() * 23
      speed[i] = 0.35 + Math.random() * 0.6
      phase[i] = Math.random() * Math.PI * 2
      drift[i] = 0.15 + Math.random() * 0.4
      size[i] = 0.014 + Math.random() * 0.042
    }
    return { pos, speed, phase, drift, size }
  }, [count])

  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1), [])

  // Depth tint: flakes near the camera burn brighter, far ones sink.
  const dataRef = data
  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const col = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const z = dataRef.pos[i * 3 + 2] // -18..5
      const d = THREE.MathUtils.clamp((z + 18) / 23, 0, 1)
      const b = 0.55 + d * d * 0.75
      mesh.setColorAt(i, col.setRGB(b, b, b))
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [count, dataRef])

  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#e2f2f9'),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        fog: true,
      }),
    []
  )

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    const t = state.clock.elapsedTime
    // Wind gusts — the snowfall breathes
    const gust = quality.reduced
      ? 1
      : 0.85 + Math.sin(t * 0.11) * 0.2 + Math.sin(t * 0.043 + 2.1) * 0.12
    const sf = director.snowSpeed * gust
    const driftK = Math.min(1.4, sf)
    for (let i = 0; i < count; i++) {
      const yRaw = data.pos[i * 3 + 1] - t * data.speed[i] * sf
      const y = Y_MIN + ((((yRaw - Y_MIN) % Y_RANGE) + Y_RANGE) % Y_RANGE)
      const x =
        data.pos[i * 3] + Math.sin(t * 0.35 + data.phase[i]) * data.drift[i] * driftK
      const z =
        data.pos[i * 3 + 2] + Math.cos(t * 0.22 + data.phase[i]) * data.drift[i] * 0.6 * driftK
      dummy.position.set(x, y, z)
      dummy.quaternion.copy(state.camera.quaternion)
      dummy.scale.setScalar(data.size[i])
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}
