import { bus } from '../lib/state'

// Split into words (not letters); each word slides out of an overflow mask.
function Txt({ text, accent }: { text: string; accent?: string }) {
  const words = text.split(' ')
  return (
    <>
      {words.map((w, i) => (
        <span className="w" key={i}>
          <span className={`wi${accent && w === accent ? ' ice-w' : ''}`}>{w}</span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </>
  )
}

export default function Chapters() {
  const goEnd = () => {
    const y = window.innerHeight * 7.1
    if (bus.lenis) bus.lenis.scrollTo(y, { duration: 2.2 })
    else window.scrollTo(0, y)
  }

  return (
    <div className="chapters">
      <section className="ch ch1">
        <div className="ch1-core">
          <p className="mono dim above reveal">NIVIS · GLACIAL SPRING</p>
          <h1 className="h1">
            <span className="h1l">
              <Txt text={'12 000'} />
            </span>
            <span className="h1l">
              <Txt text="ЛЕТ ВО ЛЬДУ" />
            </span>
          </h1>
          <p className="mono dim cap reveal">прокрутите</p>
        </div>
        <div className="scroll-hint">
          <i />
        </div>
      </section>

      <section className="ch ch2">
        <div className="col-r">
          <p className="mono label">
            <Txt text="ИСТОЧНИК" />
          </p>
          <p className="body reveal">
            Вода легла в лёд, когда на этой широте ещё не было людей. Мы достаём её с глубины
            84 метра и ничего с ней не делаем. Ни фильтров, ни минерализации, ни озона.
          </p>
        </div>
      </section>

      <section className="ch ch3">
        <h2 className="h2">
          <Txt text="СНАЧАЛА БЫЛ ЛЁД" accent="ЛЁД" />
        </h2>
      </section>

      <section className="ch ch4">
        <div className="specs">
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
        </div>
      </section>

      <section className="ch ch5">
        <div className="ch5-core">
          <h2 className="h2 h2s">
            <Txt text="ТРИ МИНУТЫ В ВАШЕМ СТАКАНЕ" />
          </h2>
          <p className="body reveal">Дальше — только вы и вода, которой 12 000 лет.</p>
          <button className="cta mono" data-cursor onClick={goEnd}>
            ПОПРОБОВАТЬ
          </button>
        </div>
      </section>
    </div>
  )
}
