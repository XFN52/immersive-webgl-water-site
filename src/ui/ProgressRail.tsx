import { bus } from '../lib/state'

const MARKS = [0, 100, 200, 300, 452, 520]
const NAMES = ['ПОЯВЛЕНИЕ', 'ИСТОЧНИК', 'ЛЁД', 'ОБЪЕКТ', 'СТАКАН', 'ФИНАЛ']

export default function ProgressRail() {
  const go = (i: number) => {
    const vh = MARKS[i] === 0 ? 0 : MARKS[i] + 2
    const y = (window.innerHeight * vh * 1.5) / 100
    if (bus.lenis) bus.lenis.scrollTo(y, { duration: 2.2 })
    else window.scrollTo(0, y)
  }
  return (
    <nav className="rail" aria-label="Главы">
      {MARKS.map((_, i) => (
        <button
          key={i}
          data-cursor
          data-ri={i}
          className={`rail-b${i === 0 ? ' on' : ''}`}
          onClick={() => go(i)}
          aria-label={`Глава ${i + 1}: ${NAMES[i]}`}
        >
          <i />
          <span className="rail-tip mono">{NAMES[i]}</span>
        </button>
      ))}
      <span className="rail-idx mono">01 / 06</span>
    </nav>
  )
}
