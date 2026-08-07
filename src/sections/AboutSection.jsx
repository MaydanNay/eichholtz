import ImagePlaceholder from '../components/ImagePlaceholder'

export default function AboutSection() {
  return (
    <section className="about">
      <div className="about__content">
        <h2 className="page-section__title">О компании</h2>
        <p className="page-section__text">
          Eichholtz — голландский бренд премиальной мебели, освещения и аксессуаров
          с более чем 30-летней историей. В Казахстане мы представляем коллекции,
          созданные для тех, кто ценит безупречный вкус и качество.
        </p>
        <p className="page-section__text">
          Наши шоурумы в Алматы и Астане — это пространства, где можно увидеть
          коллекции вживую, получить консультацию и вдохновиться для своих проектов.
        </p>
      </div>
      <div className="about__image">
        <ImagePlaceholder label="О компании" aspectRatio="4/3" />
      </div>
    </section>
  )
}
