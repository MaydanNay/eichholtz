import Reveal from "../components/Reveal";
import { SITE_IMAGES } from "../data/siteImages";

const EICHHOLTZ_INTRO =
  "Когда в 1992 году основатель Тео Айххольц создал бренд, названный в его честь, " +
  "его целью было привезти в Европу лучшие азиатские аксессуары и мебель.";

const EICHHOLTZ_SECTIONS = [
  {
    text:
      "За прошедшие годы Eichholtz вырос в один из самых известных и уважаемых мировых брендов " +
      "в сегменте люксовой дизайнерской мебели, освещения и аксессуаров. Портфель бренда " +
      "насчитывает почти 4 000 дизайнов, при этом ежегодно запускается до 600 новых продуктов " +
      "в рамках двух полноценных коллекций. Eichholtz предлагает тонко современное прочтение " +
      "классических типологий, благодаря чему каждое изделие выглядит уникальным и желанным.",
    image: SITE_IMAGES.about[0],
    imageLeft: false,
  },
  {
    text:
      "Руководствуясь страстью к дизайну и безупречному сервису, Eichholtz считает поиск новых " +
      "путей неотъемлемой частью своей философии. Обеспечивая непревзойдённую доступность " +
      "складских запасов на международных складах (Нордвейкерхаут, Нидерланды, и Северная " +
      "Каролина, США), компания поддерживает и вдохновляет свою глобальную сеть партнёров, " +
      "розничных коллабораторов, а также архитекторов и дизайнеров интерьеров.",
    image: SITE_IMAGES.about[1],
    imageLeft: true,
  },
  {
    text:
      "Как компания, постоянно ориентированная на будущее, Eichholtz уже многие годы присутствует " +
      "на самых престижных международных выставках, включая Maison & Objet в Париже и " +
      "Salone del Mobile в Милане, а также на ведущих мероприятиях в Северной Америке и на " +
      "Ближнем Востоке. Именно здесь бренд представляет новые коллекции в формате иммерсивных " +
      "экспозиций, наилучшим образом передающих стиль и образ жизни Eichholtz.",
    image: SITE_IMAGES.about[2],
    imageLeft: false,
  },
];

export default function AboutPage() {
  return (
    <div className="about-page">
      <Reveal
        className="about-page__hero reveal-stagger"
        variant="blur-up"
        style={{ padding: "4rem 1rem 2rem" }}
      >
        <h1
          className="about-page__title"
          style={{ "--stagger": 0 }}
        >
          ОТКРОЙТЕ <em>историю</em> EICHHOLTZ
        </h1>
        <p className="about-page__intro" style={{ "--stagger": 1 }}>
          {EICHHOLTZ_INTRO}
        </p>
      </Reveal>

      <div className="about-page__sections" style={{ marginTop: 0 }}>
        {EICHHOLTZ_SECTIONS.map((section, index) => (
          <section
            key={section.text.slice(0, 32)}
            className={`about-page__row${section.imageLeft ? " about-page__row--image-left" : " about-page__row--text-left"}`}
          >
            <Reveal
              className="about-page__media"
              variant={section.imageLeft ? "left" : "right"}
              delay={index * 40}
            >
              <img src={section.image} alt="" />
            </Reveal>
            <Reveal
              className="about-page__text"
              variant={section.imageLeft ? "right" : "left"}
              delay={index * 40 + 80}
            >
              <p>{section.text}</p>
            </Reveal>
          </section>
        ))}
      </div>

      <Reveal className="about-page__hero reveal-stagger" variant="blur-up" style={{ marginTop: "4rem" }}>
        <h1 className="about-page__title" style={{ "--stagger": 0 }}>
          О КОМПАНИИ <em>Idea Decor</em>
        </h1>
        <p
          className="about-page__intro"
          style={{ "--stagger": 1, maxWidth: 800, margin: "0 auto" }}
        >
          Idea Decor — эксперт в создании премиальных интерьеров в Казахстане.
        </p>
      </Reveal>

      <section
        style={{
          maxWidth: 800,
          margin: "4rem auto",
          padding: "0 1rem",
          fontSize: "1.1rem",
          lineHeight: "1.8",
        }}
      >
        <Reveal variant="up" delay={100} style={{ marginBottom: "2rem" }}>
          <p style={{ marginBottom: "1.5rem" }}>
            С 2004 года мы помогаем воплощать в жизнь пространства, где
            безупречный дизайн сочетается с высоким качеством, комфортом и
            индивидуальным стилем. За более чем 20 лет работы компания стала
            одним из лидеров рынка интерьерных решений, объединяя лучшие
            европейские бренды мебели, освещения, текстиля, обоев, напольных
            покрытий и предметов декора.
          </p>
          <p style={{ marginBottom: "1.5rem" }}>
            Сегодня Idea Decor — это 4 интерьерных салона в Астане и Алматы,
            команда профессионалов и тысячи успешно реализованных проектов для
            частных резиденций, апартаментов, гостиниц, ресторанов, офисов и
            коммерческих пространств.
          </p>
          <p style={{ marginBottom: "1.5rem" }}>
            Мы работаем с ведущими европейскими фабриками, предлагая клиентам
            тщательно подобранные коллекции, отвечающие самым высоким стандартам
            качества, дизайна и функциональности. Наша команда регулярно
            посещает международные выставки и изучает мировые тенденции в сфере
            дизайна интерьера, чтобы первыми представлять в Казахстане
            актуальные коллекции и инновационные решения.
          </p>
          <p style={{ marginBottom: "1.5rem" }}>
            Мы убеждены, что интерьер — это отражение характера, образа жизни и
            ценностей человека. Поэтому каждый проект для нас — это
            индивидуальная история, где внимание уделяется каждой детали: от
            выбора материалов и предметов интерьера до создания целостной
            концепции пространства.
          </p>
        </Reveal>

        <Reveal
          variant="up"
          delay={200}
          style={{
            marginBottom: "3rem",
            padding: "2rem",
            backgroundColor: "var(--color-ui-bg-light)",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              marginBottom: "1rem",
              fontWeight: 500,
            }}
          >
            Наша миссия
          </h2>
          <p style={{ fontStyle: "italic", color: "var(--color-core-dark-grey)" }}>
            Создавать вдохновляющие пространства, объединяя мировые дизайнерские
            тренды, премиальное качество и профессиональную экспертизу, чтобы
            каждый интерьер становился воплощением стиля, комфорта и
            индивидуальности.
          </p>
        </Reveal>

        <Reveal variant="up" delay={300} style={{ marginBottom: "3rem" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              marginBottom: "1.5rem",
              fontWeight: 500,
              textAlign: "center",
            }}
          >
            Почему выбирают Idea Decor
          </h2>
          <ul style={{ paddingLeft: "1.5rem", display: "grid", gap: "1rem" }}>
            <li>Более 20 лет опыта на рынке Казахстана.</li>
            <li>
              Один из крупнейших поставщиков премиальных интерьерных брендов
              Европы.
            </li>
            <li>
              Официальный представитель Eichholtz в Казахстане с 2017 года.
            </li>
            <li>4 интерьерных салона в Астане и Алматы.</li>
            <li>Комплексные решения для жилых и коммерческих проектов.</li>
            <li>
              Персональное сопровождение клиентов, дизайнеров и архитекторов на
              всех этапах проекта.
            </li>
            <li>
              Оригинальная продукция, прямые поставки от европейских фабрик и
              высокий уровень сервиса.
            </li>
          </ul>
        </Reveal>

        <Reveal variant="up" delay={400} style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: "1.25rem",
              fontWeight: 500,
              letterSpacing: "0.05em",
            }}
          >
            Idea Decor — пространство, где рождаются идеи, вдохновляющие на
            создание интерьеров вне времени.
          </p>
        </Reveal>
      </section>

      <div
        style={{
          padding: "4rem 1rem",
          backgroundColor: "var(--color-bg)",
          textAlign: "center",
        }}
      >
        <Reveal variant="up">
          <h2
            style={{
              fontSize: "2rem",
              marginBottom: "1rem",
              fontWeight: 400,
              fontFamily: "var(--font-serif)",
            }}
          >
            Официальный представитель <em>Eichholtz</em>
          </h2>
          <p
            style={{
              maxWidth: 800,
              margin: "0 auto 3rem",
              fontSize: "1.1rem",
              lineHeight: "1.8",
            }}
          >
            Особое место в нашем портфеле занимает всемирно известный
            голландский бренд Eichholtz. С 2017 года Idea Decor является
            официальным представителем Eichholtz в Казахстане, предоставляя
            клиентам доступ к оригинальным коллекциям, эксклюзивным новинкам и
            фирменному сервису мирового уровня.
          </p>
        </Reveal>
      </div>
    </div>
  );
}
