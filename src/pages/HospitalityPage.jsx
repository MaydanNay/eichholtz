import React from 'react'
import ContactsPage from './ContactsPage'

export default function HospitalityPage() {
  return (
    <div className="hospitality-page">
      <section className="hospitality-header">
        <img src="/images/contract/hospitality/Eichholtz_Contract_Eichholtz_Contract_Flat_1.png" alt="Eichholtz Contract" className="hospitality-logo" />
      </section>

      <section className="hospitality-serve">
        <h2 className="hospitality-serve__title">Для кого мы работаем</h2>
        <div className="hospitality-serve__grid">
          <div className="hospitality-serve__item">
            <img src="/images/contract/hospitality/eichholtz-hospitality-hotels-1.jpg" alt="Отели" />
            <h3 className="hospitality-serve__item-title">Отели</h3>
          </div>
          <div className="hospitality-serve__item">
            <img src="/images/contract/hospitality/eichholtz-hospitality-restaurants-4.jpg" alt="Рестораны" />
            <h3 className="hospitality-serve__item-title">Рестораны</h3>
          </div>
          <div className="hospitality-serve__item">
            <img src="/images/contract/hospitality/eichholtz-hospitality-residential-developents-2.jpg" alt="Жилые комплексы" />
            <h3 className="hospitality-serve__item-title">Жилые комплексы</h3>
          </div>
        </div>
      </section>

      <section className="hospitality-services">
        <h2 className="hospitality-services__title">Наши услуги</h2>
        <h3 className="hospitality-services__subtitle">Возможности разработки продуктов</h3>
        <p className="hospitality-services__text">
          Наше всемирное производство на нескольких фабриках, экспертная логистика и экономически эффективные решения обеспечивают безупречный опыт. Обладая обширной международной сетью и значительной покупательной способностью, мы поддерживаем самые большие коллекции в наличии во всех категориях. Мы гарантируем быструю доставку и короткие сроки для эффективной поддержки ваших проектов.
        </p>
      </section>

      <section className="hospitality-project">
        <div className="hospitality-project__header">
          <h2 className="hospitality-project__title">Casa Miravella</h2>
          <p className="hospitality-project__label">ОБЗОР ПРОЕКТА</p>
        </div>
        
        <div className="hospitality-gallery">
          <div className="hospitality-gallery__track">
             <div className="hospitality-gallery__item"><img src="/images/contract/hospitality/eichholtz-hospitality-landingpage-1.jpg" alt="Casa Miravella" /></div>
             <div className="hospitality-gallery__item"><img src="/images/contract/hospitality/eichholtz-hospitality-landingpage-3.jpg" alt="Casa Miravella" /></div>
             <div className="hospitality-gallery__item"><img src="/images/contract/hospitality/eichholtz-hospitality-landingpage-5.jpg" alt="Casa Miravella" /></div>
             <div className="hospitality-gallery__item"><img src="/images/contract/hospitality/eichholtz-hospitality-landingpage-6.jpg" alt="Casa Miravella" /></div>
             <div className="hospitality-gallery__item"><img src="/images/contract/hospitality/eichholtz-hospitality-landingpage-7.jpg" alt="Casa Miravella" /></div>
             <div className="hospitality-gallery__item"><img src="/images/contract/hospitality/eichholtz-hospitality-landingpage-8.jpg" alt="Casa Miravella" /></div>
             <div className="hospitality-gallery__item"><img src="/images/contract/hospitality/eichholtz-hospitality-landingpage-2.jpg" alt="Casa Miravella" /></div>
             <div className="hospitality-gallery__item"><img src="/images/contract/hospitality/eichholtz-hospitality-landingpage-9.jpg" alt="Casa Miravella" /></div>
          </div>
        </div>
        <p className="hospitality-project__caption">Casa Miravella, Mallorca</p>
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
