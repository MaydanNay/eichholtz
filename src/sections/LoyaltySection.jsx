import { SITE_IMAGES } from '../data/siteImages'
import Reveal from '../components/Reveal'

export default function LoyaltySection({ onJoin }) {
  return (
    <section className="loyalty">
      <Reveal className="loyalty__image" variant="left">
        <img src={SITE_IMAGES.loyalty} alt="" />
      </Reveal>
      <Reveal className="loyalty__content reveal-stagger" variant="right" delay={100}>
        <h2 className="loyalty__title section-heading section-heading--left" style={{ '--stagger': 0 }}>
          Программа лояльности
        </h2>
        <p className="loyalty__subtitle" style={{ '--stagger': 1 }}>Партнерство нового уровня.</p>
        <p className="loyalty__text" style={{ '--stagger': 2 }}>
          Для нас, как и для вас, время и экспертиза дизайнера — это ключевая ценность.
          Присоединившись к нашей Программе лояльности для дизайнеров, вы получите
          эксклюзивные цены, гибкие условия доставки, ранний доступ к коллекциям
          и персонализированную поддержку.
        </p>
        <button type="button" className="link-underline" style={{ '--stagger': 3 }} onClick={onJoin}>
          Присоединиться
        </button>
      </Reveal>
    </section>
  )
}
