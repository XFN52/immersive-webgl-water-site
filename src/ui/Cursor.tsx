import { useEffect, useRef } from 'react'

const fine =
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fine || !ref.current) return
    const el = ref.current
    let tx = -100
    let ty = -100
    let x = -100
    let y = -100
    let big = false
    let raf = 0

    const move = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
    }
    const over = (e: Event) => {
      const t = e.target as HTMLElement | null
      const hit = !!t?.closest?.('a, button, [data-cursor]')
      if (hit !== big) {
        big = hit
        el.classList.toggle('big', big)
      }
    }
    const loop = () => {
      x += (tx - x) * 0.12
      y += (ty - y) * 0.12
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
      raf = requestAnimationFrame(loop)
    }

    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('mouseover', over, { passive: true })
    raf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('mouseover', over)
      cancelAnimationFrame(raf)
    }
  }, [])

  if (!fine) return null
  return <div className="cursor" ref={ref} />
}
