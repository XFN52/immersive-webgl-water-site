import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

// Hand-built silhouette (radius, height) — tall glacial bottle.
const GLASS_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0.001, 0.02],
  [0.2, 0.02],
  [0.27, 0.05],
  [0.315, 0.12],
  [0.335, 0.24],
  [0.34, 0.45],
  [0.34, 1.28],
  [0.332, 1.4],
  [0.3, 1.5],
  [0.245, 1.62],
  [0.175, 1.74],
  [0.125, 1.86],
  [0.105, 1.98],
  [0.1, 2.16],
  [0.112, 2.22],
  [0.112, 2.3],
  [0.098, 2.35],
  [0.098, 2.38],
  [0.001, 2.39],
]

const WATER_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0.001, 0.045],
  [0.22, 0.05],
  [0.28, 0.1],
  [0.3, 0.2],
  [0.3, 1.3],
  [0.285, 1.38],
  [0.24, 1.46],
  [0.16, 1.51],
  [0.06, 1.53],
  [0.001, 1.53],
]

// Procedural condensation: micro droplets on the glass.
// One canvas serves both roughnessMap (bright = rougher) and bumpMap.
function makeCondensation(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#2a2a2a'
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 1100; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const r = 0.6 + Math.random() * Math.random() * 3.4
    const a = 0.35 + Math.random() * 0.65
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255,255,255,${a})`)
    g.addColorStop(0.7, `rgba(200,200,200,${a * 0.5})`)
    g.addColorStop(1, 'rgba(42,42,42,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // a rare elongated trickle that ran down the glass
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const h = 18 + Math.random() * 46
    const w = 1.2 + Math.random() * 1.4
    ctx.fillStyle = `rgba(230,230,230,${0.25 + Math.random() * 0.3})`
    ctx.fillRect(x, y, w, h)
    ctx.beginPath()
    ctx.arc(x + w / 2, y, w * 1.6, 0, Math.PI * 2)
    ctx.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(3, 2)
  t.anisotropy = 4
  return t
}

function makeLabel(): { tex: THREE.CanvasTexture; redraw: () => void } {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 512
  const ctx = c.getContext('2d')!
  const draw = () => {
    ctx.clearRect(0, 0, 1024, 512)
    ctx.textAlign = 'center'
    const rule = (y: number) => {
      ctx.strokeStyle = 'rgba(127,212,232,0.55)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(292, y)
      ctx.lineTo(732, y)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(234,244,248,0.94)'
    ctx.font = '500 104px Georgia, "Times New Roman", serif'
    ctx.letterSpacing = '30px'
    rule(122)
    ctx.fillText('NIVIS', 527, 254)
    ctx.fillStyle = 'rgba(234,244,248,0.72)'
    ctx.font = '400 30px "JetBrains Mono", monospace'
    ctx.letterSpacing = '14px'
    ctx.fillText('GLACIAL SPRING', 519, 336)
    rule(394)
    ctx.fillStyle = 'rgba(127,212,232,0.8)'
    ctx.font = '400 22px "JetBrains Mono", monospace'
    ctx.letterSpacing = '8px'
    ctx.fillText('12 000 YEARS · 84 M', 514, 452)
  }
  draw()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return { tex, redraw: draw }
}

// Refine a hand-authored profile through a Catmull-Rom spline:
// smooth blown-glass shoulder and neck instead of faceted polylines.
function refinedProfile(
  profile: ReadonlyArray<readonly [number, number]>,
  samples: number
): THREE.Vector2[] {
  const curve = new THREE.SplineCurve(profile.map((p) => new THREE.Vector2(p[0], p[1])))
  return curve.getPoints(samples).map((p) => new THREE.Vector2(Math.max(0.0005, p.x), p.y))
}

export default function Bottle() {
  const glassGeo = useMemo(() => new THREE.LatheGeometry(refinedProfile(GLASS_PROFILE, 80), 128), [])
  const waterGeo = useMemo(() => new THREE.LatheGeometry(refinedProfile(WATER_PROFILE, 56), 96), [])
  const capGeo = useMemo(() => new THREE.CylinderGeometry(0.107, 0.107, 0.17, 96), [])
  const ringGeo = useMemo(() => new THREE.TorusGeometry(0.107, 0.011, 20, 96), [])
  const labelGeo = useMemo(() => new THREE.CylinderGeometry(0.347, 0.347, 0.56, 128, 1, true), [])
  const condTex = useMemo(makeCondensation, [])

  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        transmission: 1,
        thickness: 0.35,
        roughness: 0.09,
        roughnessMap: condTex,
        bumpMap: condTex,
        bumpScale: 0.012,
        ior: 1.5,
        color: new THREE.Color('#f2fbff'),
        attenuationColor: new THREE.Color('#cfeeff'),
        attenuationDistance: 3.5,
        specularIntensity: 1,
        envMapIntensity: 2.6,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      }),
    [condTex]
  )
  const waterMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        transmission: 0.96,
        thickness: 1.2,
        roughness: 0.04,
        ior: 1.33,
        color: new THREE.Color('#b7e6f2'),
        attenuationColor: new THREE.Color('#7FD4E8'),
        attenuationDistance: 1.6,
        specularIntensity: 1,
        envMapIntensity: 2.0,
        emissive: new THREE.Color('#123a48'),
        emissiveIntensity: 0.5,
      }),
    []
  )
  const capMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#16232b'),
        metalness: 0.85,
        roughness: 0.38,
        envMapIntensity: 1.4,
      }),
    []
  )
  const label = useMemo(makeLabel, [])
  const labelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: label.tex,
        transparent: true,
        roughness: 0.4,
        metalness: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        opacity: 0.96,
        envMapIntensity: 1.2,
      }),
    [label]
  )

  useEffect(() => {
    let live = true
    document.fonts?.ready.then(() => {
      if (!live) return
      label.redraw()
      label.tex.needsUpdate = true
    })
    return () => {
      live = false
    }
  }, [label])

  return (
    <group position={[0, -1.29, 0]}>
      <mesh geometry={waterGeo} material={waterMat} />
      <mesh geometry={glassGeo} material={glassMat} />
      <mesh geometry={labelGeo} material={labelMat} position={[0, 0.76, 0]} />
      <mesh geometry={capGeo} material={capMat} position={[0, 2.455, 0]} />
      <mesh geometry={ringGeo} material={capMat} position={[0, 2.372, 0]} rotation-x={Math.PI / 2} />
    </group>
  )
}
