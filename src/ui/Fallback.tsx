// Shown when WebGL2 is unavailable: the whole story as a plain vertical page.
export default function Fallback() {
  return (
    <main className="fallback">
      <header className="fb-hero">
        <p className="mono dim above">NIVIS · GLACIAL SPRING</p>
        <h1 className="h1">
          <span className="h1l">12 000</span>
          <span className="h1l">ЛЕТ ВО ЛЬДУ</span>
        </h1>
      </header>

      <section>
        <p className="mono dim label">ИСТОЧНИК</p>
        <p className="body">
          Вода легла в лёд, когда на этой широте ещё не было людей. Мы достаём её с глубины
          84 метра и ничего с ней не делаем. Ни фильтров, ни минерализации, ни озона.
        </p>
      </section>

      <section>
        <h2 className="h2">СНАЧАЛА БЫЛ ЛЁД</h2>
      </section>

      <section className="specs">
        <div className="spec">
          <span className="spec-l mono">ГЛУБИНА ЗАБОРА</span>
          <span className="spec-v">84 м</span>
        </div>
        <div className="spec">
          <span className="spec-l mono">МИНЕРАЛИЗАЦИЯ</span>
          <span className="spec-v">112 мг/л</span>
        </div>
        <div className="spec">
          <span className="spec-l mono">pH</span>
          <span className="spec-v">7.4</span>
        </div>
        <div className="spec">
          <span className="spec-l mono">ВОЗРАСТ</span>
          <span className="spec-v warm">12 400 лет</span>
        </div>
      </section>

      <section>
        <h2 className="h2 h2s">ТРИ МИНУТЫ В ВАШЕМ СТАКАНЕ</h2>
        <p className="body">Дальше — только вы и вода, которой 12 000 лет.</p>
        <a className="cta mono" href="mailto:hello@nivis.ru">
          ПОПРОБОВАТЬ
        </a>
      </section>

      <footer className="fb-foot">
        <div className="f-bot mono dim">
          <span>NIVIS © 2026</span>
          <span>СДЕЛАНО В МУРМАНСКЕ</span>
        </div>
      </footer>
    </main>
  )
}
