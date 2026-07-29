// Shared mutable state. Read/written every frame — no React re-renders on purpose.

export interface Quality {
  tier: 'high' | 'low'
  mobile: boolean
  reduced: boolean
  snow: number
  dpr: number | [number, number]
  dof: boolean
  ca: boolean
  noise: boolean
}

const hasWindow = typeof window !== 'undefined'
const mobile = hasWindow ? window.innerWidth < 768 : false
const reduced = hasWindow
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

// Single quality tier everywhere — no degradation.
export const quality: Quality = {
  tier: 'high',
  mobile,
  reduced,
  snow: 2600,
  dpr: [1, 1.75],
  dof: true,
  ca: true,
  noise: true,
}

// Normalized pointer position (-1..1)
export const mouse = { x: 0, y: 0 }

// Scroll position in vh units of *scrolled distance* (0..600)
export const scroll = { vh: 0 }

// Everything the 3D scene needs to know this frame
export const director = {
  px: 0,
  py: 0,
  pz: 14,
  lx: 0,
  ly: 0.2,
  lz: 0,
  fog: 0.045,
  reveal: 0, // ice monolith opens (chapter 3)
  escape: 0, // fragments leave the frame (chapter 4)
  snowSpeed: 1,
  bloom: 0.55,
  rot: 0, // artifact spin factor
}

export const bus: {
  lenis: { scrollTo: (target: number | string, opts?: Record<string, unknown>) => void } | null
  stage: number // 0 → 25 → 70 → 100, set by the scene boot sequence
  intro: (() => void) | null
  introAt: number | null // timestamp of the curtain lift — camera awakening
  crackAt: number | null // timestamp of the ice-crack camera kick
} = { lenis: null, stage: 0, intro: null, introAt: null, crackAt: null }

export function canUseWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2')
  } catch {
    return false
  }
}
