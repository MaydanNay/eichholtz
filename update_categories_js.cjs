const fs = require('fs');

let content = fs.readFileSync('server/lib/categories.js', 'utf-8');

const replacements = {
  "'Шкафы и стеллажи'": "'Шкафы'",
  "'Стулья и кресла'": "'Стулья'",
  "'Шкафы-витрины'": "'Витрины'",
  "'ТВ-тумбы'": "'Тумбы под телевизор'",
  "'Барные стулья'": "'Барные и кухонные стулья'",
  "'Табуреты'": "'Стулья'",
  "'Пуфы'": "'Османы'",
  "'Скамьи'": "'Скамейки'",
  "'Журнальные столики'": "'Кофейные столики'",
  "'Письменные столы'": "'Столы'",
  "'Сервировочные столики'": "'Тележки'",
  "'Бары и подносы'": "'Барные стойки | Подносы для дворецкого'",
  "'Колонны'": "'Колонки'"
};

for (const [oldVal, newVal] of Object.entries(replacements)) {
  // Use global regex replace to replace all occurrences
  content = content.replace(new RegExp(oldVal, 'g'), newVal);
}

fs.writeFileSync('server/lib/categories.js', content);
console.log('categories.js updated successfully.');
