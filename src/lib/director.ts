import { bus, director, quality } from './state'

let prevReveal = 0
let lastCrack = 0

type V3 = [number, number, number]
interface KF {
  vh: number
  p: V3
  l: V3
  fog: number
}

// Camera keyframes over the 600vh scroll distance.
const KFS: KF[] = [
  { vh: 0,   p: [0, 0, 14],       l: [0, 0.2, 0], fog: 0.045 },
  { vh: 100, p: [0, 0, 14],       l: [0, 0.2, 0], fog: 0.045 },
  { vh: 200, p: [-1.2, 0, 6.5],   l: [0, 0.15, 0], fog: 0.02 },
  { vh: 300, p: [-1.0, 0.45, 5.3], l: [0, 0.2, 0], fog: 0.017 },
  { vh: 400, p: [2.2, 0.3, 4.6],  l: [0, 0.3, 0], fog: 0.012 },
  { vh: 450, p: [2.2, 0.3, 4.6],  l: [0, 0.3, 0], fog: 0.012 },
  { vh: 520, p: [0.8, 1.5, 9.0],  l: [0, 0.6, 0], fog: 0.035 },
  { vh: 600, p: [0.4, 3.4, 9.6],  l: [0, 0.9, 0], fog: 0.04 },
]

const REDUCED_VH = 330

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function samplePose(vh: number) {
  let i = 0
  while (i < KFS.length - 2 && vh > KFS[i + 1].vh) i++
  const a = KFS[i]
  const b = KFS[i + 1]
  const t = clamp01((vh - a.vh) / Math.max(1e-6, b.vh - a.vh))
  const e = t * t * (3 - 2 * t)
  return {
    px: lerp(a.p[0], b.p[0], e),
    py: lerp(a.p[1], b.p[1], e),
    pz: lerp(a.p[2], b.p[2], e),
    lx: lerp(a.l[0], b.l[0], e),
    ly: lerp(a.l[1], b.l[1], e),
    lz: lerp(a.l[2], b.l[2], e),
    fog: lerp(a.fog, b.fog, e),
  }
}

export function updateDirector(vh: number) {
  // Scroll drives the camera on every device; only prefers-reduced-motion
  // replaces the travelling with a fixed frame.
  const pose = samplePose(quality.reduced ? REDUCED_VH : vh)

  director.px = pose.px
  director.py = pose.py
  director.pz = pose.pz
  director.lx = pose.lx
  director.ly = pose.ly
  director.lz = pose.lz
  director.fog = pose.fog

  if (quality.reduced) {
    director.reveal = vh > 200 ? 1 : 0
    director.escape = vh > 300 ? 1 : 0
    director.snowSpeed = 0
    director.bloom = 0.55
    director.rot = 0
    return
  }

  director.reveal = smoothstep(200, 300, vh)
  director.escape = smoothstep(300, 400, vh)
  director.snowSpeed = 1 + 1.25 * smoothstep(450, 520, vh)
  director.bloom = 0.55 + Math.sin(Math.PI * clamp01((vh - 200) / 100)) * 0.25
  director.rot = smoothstep(100, 140, vh)

  // The "crack": crossing the reveal midpoint kicks the camera once
  const now = performance.now()
  if (
    ((prevReveal < 0.5 && director.reveal >= 0.5) ||
      (prevReveal > 0.5 && director.reveal <= 0.5)) &&
    now - lastCrack > 800
  ) {
    bus.crackAt = now
    lastCrack = now
  }
  prevReveal = director.reveal
}
