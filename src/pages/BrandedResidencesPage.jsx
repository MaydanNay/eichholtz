import React from 'react'
import ContactsPage from './ContactsPage'

export default function BrandedResidencesPage() {
  return (
    <div className="branded-page">
      <section className="branded-header">
        <img src="/images/contract/hospitality/Eichholtz_Contract_Eichholtz_Contract_Flat_1.png" alt="Eichholtz Contract" className="branded-logo" />
      </section>

      <section className="branded-intro">
        <h2 className="branded-intro__title">Брендированные резиденции</h2>
        <p className="branded-intro__text">
          Работа с Eichholtz выходит за рамки простого лицензирования имени — это партнерство со всемирно признанным брендом класса люкс. Мы объединяем отличительный дизайн, международный охват и решения под ключ, чтобы превратить жилые проекты в брендированные пространства для жизни. Опираясь на сильную операционную экспертизу и мировое признание, мы помогаем возвысить ваше видение, укрепить позиционирование на рынке и повысить ценность проекта с самого первого дня.
        </p>
      </section>

      <section className="branded-video" style={{ maxWidth: '100%', margin: '0 auto' }}>
        <div style={{ padding: '56.25% 0 0 0', position: 'relative' }}>
          <iframe 
            src="https://player.vimeo.com/video/1176105443?badge=0&amp;autoplay=1&amp;muted=1&amp;loop=1&amp;player_id=0&amp;app_id=58479" 
            frameBorder="0" 
            allow="autoplay; fullscreen; picture-in-picture" 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            title="Branded Residences Video"
          ></iframe>
        </div>
      </section>

      <section className="branded-benefits">
        <div className="branded-benefits__grid">
          <div className="branded-benefits__item">
            <img src="/images/contract/branded-residences/branded-residences-eichholtz-contract-3.jpg" alt="Создано для вас" />
            <h3 className="branded-benefits__item-title">Создано для вас</h3>
            <p className="branded-benefits__item-text">
              Благодаря коллекции из более чем 4000 тщательно отобранных предметов — от мягкой мебели для дома и улицы до корпусной мебели, освещения и аксессуаров — каждый элемент создан, чтобы отражать индивидуальный вкус и формировать абсолютно гармоничные, изысканные интерьеры и экстерьеры.
            </p>
          </div>
          <div className="branded-benefits__item">
            <img src="/images/contract/branded-residences/branded-residences-eichholtz-contract-7.jpg" alt="Спокойствие и уверенность" />
            <h3 className="branded-benefits__item-title">Спокойствие и уверенность</h3>
            <p className="branded-benefits__item-text">
              Ощутите безупречное совершенство с Eichholtz, где каждое пространство профессионально разрабатывается, производится и доставляется. От интерьерной до уличной мебели, каждый проект воплощается в жизнь с подробными 2D и 3D рендерами, гарантируя идеальный дизайн и безукоризненное исполнение.
            </p>
          </div>
          <div className="branded-benefits__item">
            <img src="/images/contract/branded-residences/eichholtz-hospitality-contract-landingpage-2.jpg" alt="То, что мы делаем лучше всего" />
            <h3 className="branded-benefits__item-title">То, что мы делаем лучше всего</h3>
            <p className="branded-benefits__item-text">
              От продуманного дизайна до разработки новых коллекций, Eichholtz славится созданием пространств, отражающих вкус каждого человека. В каждый дом вложены десятилетия опыта, мастерства и скрупулезного внимания к деталям, что гарантирует неповторимые и неподвластные времени интерьеры.
            </p>
          </div>
        </div>
      </section>

      <section className="branded-project">
        <div className="branded-project__split">
          <div className="branded-project__content">
            <h2 className="branded-project__title">Luna Nova</h2>
            <h3 className="branded-project__subtitle">Испания</h3>
            <p className="branded-project__text">
              Luna Nova — это современный жилой комплекс, сочетающий в себе современную архитектуру и изысканную средиземноморскую жизнь. Коллекция премиальных домов, созданных для комфорта, стиля и долгосрочной ценности. Eichholtz реализует полную интерьерную концепцию для Luna Nova. От планировки до финального стайлинга каждый дом полностью обставлен тщательно подобранными предметами, которые повышают ценность и привлекательность проекта.
            </p>
            <ul className="branded-project__list">
              <li>32 Квартиры и 39 Таунхаусов</li>
              <li>2 Бассейна с захватывающими видами</li>
              <li>Клубный дом с баром у бассейна и зоной барбекю</li>
              <li>Тренажерный зал и студия пилатеса</li>
              <li>Корт для падел-тенниса</li>
              <li>Продуманные коворкинг-пространства</li>
              <li>Спа и велнес зона</li>
              <li>Впечатляющий ландшафт от архитекторов</li>
            </ul>
          </div>
          <div className="branded-project__image">
            <img src="/images/contract/branded-residences/branded-residences-luna-nova-landingpage.jpg" alt="Luna Nova" />
          </div>
        </div>
      </section>

      <section className="branded-gallery">
        <div className="branded-gallery__track">
           <div className="branded-gallery__item"><img src="/images/contract/branded-residences/branded-residences-inspiration-3.jpg" alt="Inspiration" /></div>
           <div className="branded-gallery__item"><img src="/images/contract/branded-residences/branded-residences-eichholtz-contract-8.jpg" alt="Inspiration" /></div>
           <div className="branded-gallery__item"><img src="/images/contract/branded-residences/branded-residences-inspiration-1.jpg" alt="Inspiration" /></div>
           <div className="branded-gallery__item"><img src="/images/contract/branded-residences/eichholtz-luna-nova-plattegrond-2.jpg" alt="Floor plan" /></div>
           <div className="branded-gallery__item"><img src="/images/contract/branded-residences/branded-residences-inspiration-2.jpg" alt="Inspiration" /></div>
        </div>
      </section>

      <section className="hospitality-contact-intro">
        <h2 className="hospitality-contact-intro__title">Наша команда готова вам помочь</h2>
        <p className="hospitality-contact-intro__text">
          Телефон: <a href="tel:+31252755484">+31 25 275 5484</a><br/>
          Email: <a href="mailto:contract@eichholtz.com">contract@eichholtz.com</a>
        </p>
      </section>

      <ContactsPage />
    </div>
  )
}
