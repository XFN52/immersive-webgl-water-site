import { bus } from '../lib/state'

function scrollToVh(vh: number) {
  const y = (window.innerHeight * vh * 1.5) / 100
  if (bus.lenis) bus.lenis.scrollTo(y, { duration: 2.2 })
  else window.scrollTo(0, y)
}

export default function Footer() {
  const link = (vh: number, label: string) => (
    <a
      data-cursor
      href="#"
      onClick={(e) => {
        e.preventDefault()
        scrollToVh(vh)
      }}
    >
      {label}
    </a>
  )
  return (
    <footer className="footer">
      <div className="f-mark" aria-hidden="true">
        NIVIS
      </div>
      <div className="foot-grid">
        <div className="f-col">
          <p className="f-h mono dim">ХРОНИКА</p>
          {link(120, 'Источник')}
          {link(250, 'Лёд')}
          {link(330, 'Вода')}
          {link(470, 'Стакан')}
        </div>
        <div className="f-col">
          <p className="f-h mono dim">КОНТАКТ</p>
          <a data-cursor href="mailto:hello@nivis.ru">
            hello@nivis.ru
          </a>
          <a data-cursor href="tel:+78152000000">
            +7 8152 00-00-00
          </a>
        </div>
        <div className="f-col">
          <p className="f-h mono dim">СЛЕДИТЬ</p>
          <a data-cursor href="#" onClick={(e) => e.preventDefault()}>
            Telegram
          </a>
          <a data-cursor href="#" onClick={(e) => e.preventDefault()}>
            Instagram
          </a>
        </div>
      </div>
      <div className="f-bot mono dim">
        <span>NIVIS © 2026</span>
        <span>68°58′ N · 33°04′ E</span>
        <span>СДЕЛАНО В МУРМАНСКЕ</span>
      </div>
    </footer>
  )
}
