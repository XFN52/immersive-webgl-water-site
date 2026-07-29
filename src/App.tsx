import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import Lenis from 'lenis'
import SceneRoot from './three/SceneRoot'
import Preloader from './ui/Preloader'
import Cursor from './ui/Cursor'
import Footer from './ui/Footer'
import Fallback from './ui/Fallback'
import SceneBoundary from './ui/SceneBoundary'
import ChapterOverlay from './ui/ChapterOverlay'
import { bus, mouse, quality, scroll } from './lib/state'
import { smoothstep } from './lib/director'
import { startTextDirector } from './lib/textDirector'

// The story is told in 600 "story vh", but the physical scroll track is
// 900vh — the journey feels 1.5× longer and calmer.
const PHYS_OVER_STORY = 1.5

export default function App() {
  const canvasWrap = useRef<HTMLDivElement>(null)
  const [sceneDead, setSceneDead] = useState(false)
  const directorRef = useRef<ReturnType<typeof startTextDirector> | null>(null)

  useLayoutEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    let lenis: Lenis | null = null
    let rafFn: ((t: number) => void) | null = null
    if (!quality.reduced) {
      lenis = new Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 0.85 })
      bus.lenis = lenis
      rafFn = (t: number) => lenis!.raf(t * 1000)
      gsap.ticker.add(rafFn)
      gsap.ticker.lagSmoothing(0)
    }

    const director = startTextDirector()
    directorRef.current = director
    bus.intro = director.intro

    // Rail activity: direct DOM class swap, no react state churn.
    let railIdx = 0
    const railBtns = Array.from(document.querySelectorAll<HTMLElement>('.rail-b'))
    const railCounter = document.querySelector<HTMLElement>('.rail-idx')
    const EDGES = [100, 200, 300, 400, 520]
    const updateRail = (vh: number) => {
      let idx = 0
      for (let i = 0; i < EDGES.length; i++) if (vh >= EDGES[i]) idx = i + 1
      if (idx !== railIdx) {
        railBtns.forEach((b, i) => b.classList.toggle('on', i === idx))
        if (railCounter) railCounter.textContent = `${String(idx + 1).padStart(2, '0')} / 06`
        railIdx = idx
      }
    }

    const tick = () => {
      const rawVh = (window.scrollY / window.innerHeight) * 100
      const vh = Math.min(600, rawVh / PHYS_OVER_STORY)
      scroll.vh = vh
      if (canvasWrap.current) {
        canvasWrap.current.style.opacity = (1 - 0.75 * smoothstep(520, 585, vh)).toFixed(3)
      }
      updateRail(vh)
      director.tick()
    }
    gsap.ticker.add(tick)

    // Live telemetry in the header — a quiet sign of life.
    const tele = document.querySelector<HTMLElement>('.tele')
    const teleId =
      tele && !quality.reduced
        ? window.setInterval(() => {
            const c = (-12.2 - Math.random() * 0.5).toFixed(1)
            tele.textContent = `GLACIAL SPRING · 84 M · ${c}°C`
          }, 1800)
        : undefined

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.clearInterval(teleId)
      gsap.ticker.remove(tick)
      if (rafFn) gsap.ticker.remove(rafFn)
      lenis?.destroy()
      bus.lenis = null
      bus.intro = null
      director.kill()
    }
  }, [])

  if (sceneDead) return <Fallback />

  return (
    <>
      <div ref={canvasWrap} className="canvas-wrap" aria-hidden="true">
        <SceneBoundary onError={() => setSceneDead(true)}>
          <SceneRoot />
        </SceneBoundary>
      </div>
      <header className="hud">
        <span className="mono">NIVIS</span>
        <span className="mono dim tele">GLACIAL SPRING · 84 M · −12.4°C</span>
      </header>
      <ChapterOverlay />
      <div className="scroll-space">
        <Footer />
      </div>
      <Preloader />
      <Cursor />
    </>
  )
}
