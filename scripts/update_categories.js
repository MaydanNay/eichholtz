const db = require('../server/db');

const dictionary = {
  'Ковры': 'Ковры | Ковровые покрытия',
  'Диваны и пуфы': 'Диваны | Пуфики',
  'Стулья и кресла': 'Стулья и кресла',
  'Sofas': 'Диваны',
  'Armchairs': 'Кресла',
  'Benches': 'Скамьи',
  'Dining tables': 'Обеденные столы',
  'Dining chairs': 'Обеденные стулья',
  'Display cabinets': 'Шкафы-витрины',
  'Dressers': 'Комоды',
  'Bar- & counterstools': 'Барные стулья',
  'Trolleys': 'Сервировочные столики',
  'Columns': 'Колонны',
  'Coffee tables': 'Журнальные столики',
  'Side tables': 'Приставные столики',
  'Bar cabinets': 'Барные шкафы',
  'Bars | Butler trays': 'Бары и подносы',
  'Stools': 'Табуреты',
  'Console tables': 'Консольные столы',
  'Desks': 'Письменные столы',
  'Outdoor dining tables': 'Обеденные столы для улицы',
  'Ottomans': 'Пуфики',
  'Tv Cabinets': 'ТВ-тумбы',
  'Modular sofas': 'Модульные диваны',
  'Outdoor carpets': 'Уличные ковры',
  'Wall lamps': 'Настенные светильники',
  'Outdoor lighting': 'Уличное освещение',
  'Ceiling lamps': 'Потолочные светильники',
  'LED bulbs': 'LED лампы',
  'Lamp shades': 'Абажуры',
  'Hurricanes | Candle holders': 'Подсвечники',
  'Candle holders': 'Подсвечники',
  'Vases | Planters': 'Вазы и кашпо',
  'Planters': 'Кашпо',
  'Wall decorations': 'Настенный декор',
  'Wall objects': 'Настенные объекты',
  'Decorative items': 'Декоративные элементы',
  'Bowls': 'Чаши',
  'Serving accessories': 'Аксессуары для сервировки',
  'Wine coolers': 'Охладители для вина',
  'Prints': 'Постеры и картины',
  'Home textiles': 'Домашний текстиль',
  'Vases': 'Вазы',
  'Wall mirrors': 'Настенные зеркала',
  'Picture frames': 'Фоторамки',
  'Boxes': 'Шкатулки',
  'Hurricanes': 'Стеклянные колбы для свечей',
  'Decorative objects': 'Декоративные предметы',
  'Statues': 'Статуэтки',
  'Table and floor mirrors': 'Настольные и напольные зеркала',
  'Coat racks | Umbrella stands & more': 'Вешалки и подставки',
  'Coat racks': 'Вешалки',
  'Artificial Flowers & Greenery': 'Искусственные цветы и растения',
  'Ashtrays': 'Пепельницы',
  'Bookends': 'Держатели для книг',
  'Fireplace accessories': 'Каминные аксессуары',
  'Wine racks': 'Винные полки',
  'Candles': 'Свечи',
  'Umbrella stands': 'Подставки для зонтов',
  'Bathroom accessories': 'Аксессуары для ванной',
  'Outdoor coffee tables': 'Журнальные столики для улицы',
  'Outdoor sofas | Daybeds': 'Диваны и лежаки для улицы',
  'Outdoor chairs': 'Стулья для улицы',
  'Outdoor armchairs': 'Кресла для улицы',
  'Outdoor beds': 'Лежаки для улицы',
  'Outdoor dining chairs': 'Обеденные стулья для улицы',
  'Outdoor console tables': 'Консольные столы для улицы',
  'Outdoor side tables': 'Приставные столики для улицы'
};

async function updateCategories() {
  for (const [oldName, newName] of Object.entries(dictionary)) {
    if (oldName === newName) continue;
    await db.query('UPDATE categories SET name = $1 WHERE name = $2', [newName, oldName]);
  }
  console.log('Categories updated!');
  process.exit(0);
}

updateCategories().catch(console.error);
