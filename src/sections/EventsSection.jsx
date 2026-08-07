import ImagePlaceholder from '../components/ImagePlaceholder'

export default function EventsSection() {
  return (
    <section className="page-section">
      <h2 className="page-section__title">Мероприятия</h2>
      <p className="page-section__text">
        Приглашаем дизайнеров и партнёров на презентации новых коллекций,
        встречи с командой Eichholtz и эксклюзивные мероприятия в наших шоурумах.
      </p>
      <div className="events-grid">
        {['Презентация коллекции', 'Встреча с дизайнерами', 'Шоурум-тур'].map((event) => (
          <div key={event} className="event-card">
            <ImagePlaceholder className="event-card__img" label={event} aspectRatio="16/9" />
            <p className="event-card__title">{event}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
