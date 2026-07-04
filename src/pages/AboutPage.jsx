import Reveal from '../components/Reveal'
import { SITE_IMAGES } from '../data/siteImages'

const INTRO =
  'Когда в 1992 году основатель Тео Айххольц создал бренд, названный в его честь, ' +
  'его целью было привезти в Европу лучшие азиатские аксессуары и мебель.'

const SECTIONS = [
  {
    text:
      'За прошедшие годы Eichholtz вырос в один из самых известных и уважаемых мировых брендов ' +
      'в сегменте люксовой дизайнерской мебели, освещения и аксессуаров. Портфель бренда ' +
      'насчитывает почти 4 000 дизайнов, при этом ежегодно запускается до 600 новых продуктов ' +
      'в рамках двух полноценных коллекций. Eichholtz предлагает тонко современное прочтение ' +
      'классических типологий, благодаря чему каждое изделие выглядит уникальным и желанным.',
    image: SITE_IMAGES.about[0],
    imageLeft: false,
  },
  {
    text:
      'Руководствуясь страстью к дизайну и безупречному сервису, Eichholtz считает поиск новых ' +
      'путей неотъемлемой частью своей философии. Обеспечивая непревзойдённую доступность ' +
      'складских запасов на международных складах (Нордвейкерхаут, Нидерланды, и Северная ' +
      'Каролина, США), компания поддерживает и вдохновляет свою глобальную сеть партнёров, ' +
      'розничных коллабораторов, а также архитекторов и дизайнеров интерьеров.',
    image: SITE_IMAGES.about[1],
    imageLeft: true,
  },
  {
    text:
      'Как компания, постоянно ориентированная на будущее, Eichholtz уже многие годы присутствует ' +
      'на самых престижных международных выставках, включая Maison & Objet в Париже и ' +
      'Salone del Mobile в Милане, а также на ведущих мероприятиях в Северной Америке и на ' +
      'Ближнем Востоке. Именно здесь бренд представляет новые коллекции в формате иммерсивных ' +
      'экспозиций, наилучшим образом передающих стиль и образ жизни Eichholtz.',
    image: SITE_IMAGES.about[2],
    imageLeft: false,
  },
]

export default function AboutPage() {
  return (
    <div className="about-page">
      <Reveal className="about-page__hero reveal-stagger" variant="blur-up">
        <h1 className="about-page__title" style={{ '--stagger': 0 }}>
          ОТКРОЙТЕ <em>историю</em> EICHHOLTZ
        </h1>
        <p className="about-page__intro" style={{ '--stagger': 1 }}>{INTRO}</p>
      </Reveal>

      <div className="about-page__sections">
        {SECTIONS.map((section, index) => (
          <section
            key={section.text.slice(0, 32)}
            className={`about-page__row${section.imageLeft ? ' about-page__row--image-left' : ' about-page__row--text-left'}`}
          >
            <Reveal
              className="about-page__media"
              variant={section.imageLeft ? 'left' : 'right'}
              delay={index * 40}
            >
              <img src={section.image} alt="" />
            </Reveal>
            <Reveal
              className="about-page__text"
              variant={section.imageLeft ? 'right' : 'left'}
              delay={index * 40 + 80}
            >
              <p>{section.text}</p>
            </Reveal>
          </section>
        ))}
      </div>
    </div>
  )
}
