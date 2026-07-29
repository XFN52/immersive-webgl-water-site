import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { bus } from '../lib/state'

export default function Preloader() {
  const pct = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const [done, setDone] = useState(false)
  const [gone, setGone] = useState(false)
  const up = useProgress()
  const upRef = useRef(up)
  upRef.current = up

  useEffect(() => {
    document.documentElement.classList.add('locked')
    let raf = 0
    let shown = 0
    let finished = false

    const loop = () => {
      // Real milestones from the scene boot (25 → 70 → 100),
      // held at 55 while drei's asset tracker reports pending work.
      const cap = Math.min(bus.stage, upRef.current.active ? 55 : 100)
      shown += (cap - shown) * 0.16
      if (cap >= 100 && shown > 99.2) shown = 100

      if (pct.current) pct.current.textContent = String(Math.floor(shown)).padStart(3, '0')
      if (bar.current) bar.current.style.transform = `scaleX(${shown / 100})`

      if (shown >= 100 && !finished) {
        finished = true
        window.setTimeout(() => {
          document.documentElement.classList.remove('locked')
          setDone(true)
          bus.introAt = performance.now()
          bus.intro?.()
          window.setTimeout(() => setGone(true), 1000)
        }, 300)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const safety = window.setTimeout(() => {
      bus.stage = 100
    }, 12000)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(safety)
      document.documentElement.classList.remove('locked')
    }
  }, [])

  if (gone) return null
  return (
    <div className={`loader${done ? ' done' : ''}`} aria-hidden="true">
      <div className="l-in">
        <span className="mono dim l-brand">NIVIS · GLACIAL SPRING</span>
        <span className="mono l-pct">
          <span ref={pct}>000</span>
        </span>
        <div className="l-line">
          <div ref={bar} />
        </div>
      </div>
    </div>
  )
}
