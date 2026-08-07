const fs = require('fs');

let content = fs.readFileSync('server/lib/categories.js', 'utf-8');

const regex = /\/\/ ─── Аксессуары → подкатегории ──────────────────────────────────────────[\s\S]*?\/\/ ─── Для улицы → подкатегории ───────────────────────────────────────────/m;

const newSection = `// ─── Аксессуары → подкатегории ──────────────────────────────────────────
  { name: 'Зеркала',                   description: '', image_url: '', sort_order: 10, parentName: 'Аксессуары' },
  { name: 'Настенные украшения',           description: '', image_url: '', sort_order: 20, parentName: 'Аксессуары' },
  { name: 'Декоративные предметы',     description: '', image_url: '', sort_order: 30, parentName: 'Аксессуары' },
  { name: 'Подсвечники | Подсвечники',              description: '', image_url: '', sort_order: 40, parentName: 'Аксессуары' },
  { name: 'Искусственные цветы и зелень',              description: '', image_url: '', sort_order: 45, parentName: 'Аксессуары' },
  { name: 'Вазы | Кашпо',              description: '', image_url: '', sort_order: 48, parentName: 'Аксессуары' },
  { name: 'Аксессуары для сервировки', description: '', image_url: '', sort_order: 50, parentName: 'Аксессуары' },
  { name: 'Домашний текстиль',        description: '', image_url: '', sort_order: 60, parentName: 'Аксессуары' },
  { name: 'Вешалки для одежды | Подставки для зонтов и многое другое',      description: '', image_url: '', sort_order: 70, parentName: 'Аксессуары' },

  // ─── Аксессуары → Зеркала → подподкатегории ────────────────────────────
  { name: 'Настольные и напольные зеркала', description: '', image_url: '', sort_order: 10, parentName: 'Зеркала' },
  { name: 'Настенные зеркала',              description: '', image_url: '', sort_order: 20, parentName: 'Зеркала' },

  // ─── Аксессуары → Настенные украшения → подподкатегории ────────────────────
  { name: 'Настенные объекты',    description: '', image_url: '', sort_order: 10, parentName: 'Настенные украшения' },
  { name: 'Отпечатки',    description: '', image_url: '', sort_order: 20, parentName: 'Настенные украшения' },

  // ─── Аксессуары → Декоративные предметы → подподкатегории ──────────────
  { name: 'Пепельницы',           description: '', image_url: '', sort_order: 10, parentName: 'Декоративные предметы' },
  { name: 'Подставки для книг',   description: '', image_url: '', sort_order: 20, parentName: 'Декоративные предметы' },
  { name: 'Боулз',                 description: '', image_url: '', sort_order: 30, parentName: 'Декоративные предметы' },
  { name: 'Коробки',             description: '', image_url: '', sort_order: 40, parentName: 'Декоративные предметы' },
  { name: 'Декоративные предметы', description: '', image_url: '', sort_order: 50, parentName: 'Декоративные предметы' },
  { name: 'Рамки для картин',            description: '', image_url: '', sort_order: 60, parentName: 'Декоративные предметы' },
  { name: 'Статуи',            description: '', image_url: '', sort_order: 70, parentName: 'Декоративные предметы' },

  // ─── Аксессуары → Подсвечники | Подсвечники → подподкатегории ────────────────────────
  { name: 'Подсвечники',                  description: '', image_url: '', sort_order: 10, parentName: 'Подсвечники | Подсвечники' },
  { name: 'Свечи',                        description: '', image_url: '', sort_order: 30, parentName: 'Подсвечники | Подсвечники' },
  { name: 'Ураганы',  description: '', image_url: '', sort_order: 20, parentName: 'Подсвечники | Подсвечники' },

  // ─── Аксессуары → Вазы | Кашпо → подподкатегории ────────────────────────
  { name: 'Вазы',                  description: '', image_url: '', sort_order: 10, parentName: 'Вазы | Кашпо' },
  { name: 'Плантаторы',                        description: '', image_url: '', sort_order: 20, parentName: 'Вазы | Кашпо' },

  // ─── Аксессуары → Аксессуары для сервировки → подподкатегории ───────────
  { name: 'Аксессуары для сервировки',              description: '', image_url: '', sort_order: 10, parentName: 'Аксессуары для сервировки' },
  { name: 'Охладители для вина',  description: '', image_url: '', sort_order: 20, parentName: 'Аксессуары для сервировки' },
  { name: 'Винные стеллажи',   description: '', image_url: '', sort_order: 30, parentName: 'Аксессуары для сервировки' },

  // ─── Аксессуары → Домашний текстиль → подподкатегории ──────────────────
  { name: 'Подушки', description: '', image_url: '', sort_order: 10, parentName: 'Домашний текстиль' },

  // ─── Аксессуары → Вешалки для одежды | Подставки для зонтов и многое другое → подподкатегории ─────────────────
  { name: 'Вешалки для одежды',                  description: '', image_url: '', sort_order: 10, parentName: 'Вешалки для одежды | Подставки для зонтов и многое другое' },
  { name: 'Подставки для зонтов',                 description: '', image_url: '', sort_order: 20, parentName: 'Вешалки для одежды | Подставки для зонтов и многое другое' },
  { name: 'Аксессуары для камина',  description: '', image_url: '', sort_order: 30, parentName: 'Вешалки для одежды | Подставки для зонтов и многое другое' },
  { name: 'Аксессуары для ванной комнаты',    description: '', image_url: '', sort_order: 40, parentName: 'Вешалки для одежды | Подставки для зонтов и многое другое' },

  // ─── Для улицы → подкатегории ───────────────────────────────────────────`;

content = content.replace(regex, newSection);

fs.writeFileSync('server/lib/categories.js', content);
console.log('categories.js updated successfully.');
