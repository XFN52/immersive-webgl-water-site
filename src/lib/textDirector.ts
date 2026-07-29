// Hand-rolled animation director for the text chapters.
// No GSAP timelines, no ScrollTrigger, no Lenis dependency:
// every element has a group window [A,B] in vh and a progress mapping,
// opacity/transform are computed straight from scroll.vh each frame.

import { scroll, quality } from './state'

/* ---------------------------------- helpers ---------------------------- */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** smoothstep 0→1 over [a,b] */
export const ramp = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** 1 over [a,b], smoothly fading in from [a-in,a] and out over [b,b+out] */
const pulse = (x: number, a: number, b: number, inn: number, out: number) =>
  ramp(a - inn, a, x) * (1 - ramp(b, b + out, x))

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInCubic = (t: number) => t * t * t
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/* ------------------------------- definitions --------------------------- */

type Mapping =
  | { kind: 'alpha'; a: number; b: number }
  | { kind: 'alphaY'; a: number; b: number; y0: number; y1: number }
  | { kind: 'exitY'; a: number; b: number; y1: number } // fully visible until [a], exits by [b]
  | {
      kind: 'alphaX'
      a: number
      b: number
      x0: number
      x1: number
      stagger: number
      dur: number
    }
  | {
      kind: 'words'
      a: number
      b: number
      stagger: number
      dur: number
      tailHold: number
      tail: number
    }

interface Def {
  sel: string
  map: Mapping
}

// Per-chapter timeline in vh coordinates
const DEFS: Def[] = [
  // CH1 exits
  { sel: '.ch1', map: { kind: 'exitY', a: 55, b: 96, y1: -70 } },

  // CH2 — the source
  { sel: '.ch2', map: { kind: 'alphaY', a: 112, b: 196, y0: 20, y1: -20 } },
  {
    sel: '.ch2 .wi',
    map: { kind: 'words', a: 114, b: 194, stagger: 0.9, dur: 6, tailHold: 0.5, tail: 0.7 },
  },
  { sel: '.ch2 .reveal', map: { kind: 'alphaY', a: 124, b: 190, y0: 26, y1: -16 } },

  // CH3 — first there was ice
  { sel: '.ch3', map: { kind: 'alphaY', a: 230, b: 296, y0: 24, y1: -24 } },
  {
    sel: '.ch3 .wi',
    map: { kind: 'words', a: 232, b: 294, stagger: 1.2, dur: 7, tailHold: 0.5, tail: 0.72 },
  },

  // CH4 — specs
  { sel: '.ch4', map: { kind: 'alphaY', a: 310, b: 397, y0: 16, y1: -16 } },
  {
    sel: '.ch4 .spec',
    map: { kind: 'alphaX', a: 314, b: 394, x0: -18, x1: -14, stagger: 3.2, dur: 9 },
  },

  // CH5 — three minutes
  { sel: '.ch5', map: { kind: 'alphaY', a: 452, b: 517, y0: 26, y1: -40 } },
  {
    sel: '.ch5 .wi',
    map: { kind: 'words', a: 454, b: 514, stagger: 1.1, dur: 7, tailHold: 0.42, tail: 0.72 },
  },
  { sel: '.ch5 .reveal', map: { kind: 'alphaY', a: 464, b: 512, y0: 26, y1: -12 } },
  { sel: '.ch5 .cta', map: { kind: 'alphaY', a: 470, b: 512, y0: 20, y1: -8 } },
]

interface Bound {
  els: HTMLElement[]
  map: Mapping
}

let bound: Bound[] = []
let ch1: HTMLElement | null = null
let lastVh = -1
let frame = 0
let mode: 'auto' | 'static' = 'auto'
let staticSet = false

function forEachEl(b: Bound, fn: (el: HTMLElement, i: number) => void) {
  for (let i = 0; i < b.els.length; i++) fn(b.els[i], i)
}

/** Evaluate one mapping and apply it. */
function apply(b: Bound, vh: number) {
  const m = b.map
  if (m.kind === 'alpha') {
    const a = pulse(vh, m.a, m.b, 4, 6)
    forEachEl(b, (el) => {
      el.style.opacity = a.toFixed(3)
      el.style.visibility = a > 0.001 ? 'visible' : 'hidden'
    })
    return
  }
  if (m.kind === 'alphaY') {
    const a = pulse(vh, m.a, m.b, 5, 7)
    const t = clamp01((vh - m.a) / (m.b - m.a))
    const y = lerp(m.y0, m.y1, t)
    forEachEl(b, (el) => {
      el.style.opacity = a.toFixed(3)
      el.style.visibility = a > 0.001 ? 'visible' : 'hidden'
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`
    })
    return
  }
  if (m.kind === 'exitY') {
    const t = ramp(m.a, m.b, vh)
    const a = 1 - t
    const y = m.y1 * t
    forEachEl(b, (el) => {
      el.style.opacity = a.toFixed(3)
      el.style.visibility = a > 0.001 ? 'visible' : 'hidden'
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`
    })
    return
  }
  if (m.kind === 'alphaX') {
    forEachEl(b, (el, i) => {
      const a = m.a + i * m.stagger
      const alpha = pulse(vh, a, m.b, 4, 6)
      const tin = easeOutCubic(clamp01((vh - a) / m.dur))
      const tout = easeInCubic(clamp01((vh - m.b) / 7))
      const x = lerp(m.x0, 0, tin) + lerp(0, m.x1, tout)
      el.style.opacity = alpha.toFixed(3)
      el.style.visibility = alpha > 0.001 ? 'visible' : 'hidden'
      el.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`
    })
    return
  }
  // words
  forEachEl(b, (el, i) => {
    const a = m.a + i * m.stagger
    const holdEnd = m.b - (1 - m.tailHold) * 10
    const tin = clamp01((vh - a) / m.dur)
    const tout = clamp01((vh - holdEnd) / (m.dur * 0.9))
    const y = lerp(120, 0, easeOutCubic(tin)) + lerp(0, -120, easeInCubic(tout))
    el.style.transform = `translate3d(0, ${y.toFixed(2)}%, 0)`
  })
}

/** Instant static representation for reduced / broken-animation mode. */
function applyStatic(vh: number) {
  const ranges: Array<[string, number, number]> = [
    ['.ch2', 112, 196],
    ['.ch3', 230, 296],
    ['.ch4', 310, 397],
    ['.ch5', 452, 518],
  ]
  for (const [sel, a, b] of ranges) {
    const els = document.querySelectorAll<HTMLElement>(sel)
    const on = vh >= a && vh <= b
    els.forEach((el) => {
      el.style.opacity = on ? '1' : '0'
      el.style.visibility = on ? 'visible' : 'hidden'
      el.style.transform = 'none'
    })
  }
  document.querySelectorAll<HTMLElement>('.wi').forEach((el) => {
    el.style.transform = 'none'
  })
  if (ch1) {
    const on = vh < 96
    ch1.style.opacity = on ? '1' : '0'
    ch1.style.visibility = on ? 'visible' : 'hidden'
    ch1.style.transform = 'none'
  }
}

interface Api {
  tick: () => void
  intro: () => void
  kill: () => void
}

export function startTextDirector(): Api {
  bound = DEFS.map((d) => ({
    els: Array.from(document.querySelectorAll<HTMLElement>(d.sel)),
    map: d.map,
  }))
  ch1 = document.querySelector<HTMLElement>('.ch1')
  lastVh = -1
  frame = 0
  staticSet = false
  mode = quality.reduced ? 'static' : 'auto'
  let killed = false
  let introDone = false

  // Hidden start states (before first paint of chapters)
  document.querySelectorAll<HTMLElement>('.wi').forEach((el) => {
    el.style.transform = 'translate3d(0, 120%, 0)'
  })
  if (!quality.reduced) {
    document.querySelectorAll<HTMLElement>('.ch2, .ch3, .ch4, .ch5, .ch1 .reveal').forEach((el) => {
      el.style.opacity = '0'
      el.style.visibility = 'hidden'
    })
  }

  function tick() {
    if (killed) return
    frame++
    const vh = scroll.vh

    if (mode === 'static') {
      if (!staticSet || Math.abs(vh - lastVh) > 0.01) {
        applyStatic(vh)
        staticSet = true
      }
    } else {
      if (introDone && Math.abs(vh - lastVh) > 0.01) {
        for (const b of bound) apply(b, vh)
      }
    }
    lastVh = vh
  }

  function intro() {
    if (killed || introDone) return
    introDone = true
    if (mode === 'static') {
      applyStatic(scroll.vh)
      staticSet = true
      return
    }
    // word-by-word hero entrance, driven by plain rAF
    const heroWords = Array.from(document.querySelectorAll<HTMLElement>('.ch1 .wi'))
    const reveals = Array.from(document.querySelectorAll<HTMLElement>('.ch1 .reveal'))
    const hud = document.querySelector<HTMLElement>('.hud')
    const rail = document.querySelector<HTMLElement>('.rail')
    const hint = document.querySelector<HTMLElement>('.scroll-hint')
    const t0 = performance.now()
    const ease = (t: number) => 1 - Math.pow(1 - t, 4) // ~expo.out

    const anim = (now: number) => {
      if (killed) return
      const t = (now - t0) / 1000
      if (hud) hud.style.opacity = String(ease(clamp01((t - 0.2) / 1.1)))
      if (rail) rail.style.opacity = String(ease(clamp01((t - 0.35) / 1.1)))
      heroWords.forEach((el, i) => {
        const p = ease(clamp01((t - 0.4 - i * 0.08) / 1.6))
        el.style.transform = `translate3d(0, ${(lerp(120, 0, p)).toFixed(2)}%, 0)`
      })
      reveals.forEach((el) => {
        const p = ease(clamp01((t - 0.9) / 1.2))
        el.style.opacity = String(p)
        el.style.visibility = p > 0.001 ? 'visible' : 'hidden'
        el.style.transform = `translate3d(0, ${lerp(24, 0, p).toFixed(2)}px, 0)`
      })
      if (hint) hint.style.opacity = String(ease(clamp01((t - 1.2) / 1)))
    }
    const loop = (now: number) => {
      if (killed) return
      anim(now)
      const t = (now - t0) / 1000
      if (t < 3.6) requestAnimationFrame(loop)
      else applyStaticFix()
    }
    const applyStaticFix = () => {
      // hero at rest
      heroWords.forEach((el) => (el.style.transform = 'translate3d(0, 0%, 0)'))
      reveals.forEach((el) => {
        el.style.opacity = '1'
        el.style.visibility = 'visible'
        el.style.transform = 'none'
      })
      if (hint) hint.style.opacity = '1'
    }
    requestAnimationFrame(loop)
  }

  return {
    tick,
    intro,
    kill() {
      killed = true
    },
  }
}

/** Force-switch into static mode (used by the runtime watchdog). */
export function forceStaticChapterMode() {
  mode = 'static'
  staticSet = false
}
