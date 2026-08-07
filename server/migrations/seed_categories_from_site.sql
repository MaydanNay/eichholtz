-- =============================================================
-- Migration: Seed categories from original eichholtz.kz site
-- Source: https://eichholtz.kz (nav menu t1261_init JSON)
-- DB: PostgreSQL (pg), user: eicholtz, db: eicholtz
--
-- Категории с сайта eichholtz.kz:
--   Мебель → Гостиная, Спальня, Столы, Кресла, Диваны
--   Освещение → Потолочное, Настольное, Настенное
--   Аксессуары → Свечи и подсвечники, Оформление стен
--   Для улицы → Сидения, Столы уличные, Аксессуары для улицы
--
-- КАК ЗАПУСТИТЬ НА СЕРВЕРЕ:
--   psql postgresql://eicholtz:PASSWORD@HOST:5432/eicholtz \
--     -f seed_categories_from_site.sql
--
-- Или через Docker:
--   docker cp seed_categories_from_site.sql <container>:/tmp/
--   docker exec <container> psql -U eicholtz -d eicholtz -f /tmp/seed_categories_from_site.sql
--
-- Файл идемпотентен — безопасно запускать повторно.
-- =============================================================

BEGIN;

-- ---------------------------------------------------------------
-- Вспомогательная функция для idempotent upsert
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION _upsert_cat(
  p_name TEXT,
  p_description TEXT,
  p_image_url TEXT,
  p_sort_order INTEGER,
  p_parent_name TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_parent_id INTEGER := NULL;
  v_existing_id INTEGER;
  v_new_id INTEGER;
BEGIN
  IF p_parent_name IS NOT NULL THEN
    SELECT id INTO v_parent_id FROM categories
    WHERE name = p_parent_name AND parent_id IS NULL LIMIT 1;
  END IF;

  IF v_parent_id IS NULL THEN
    SELECT id INTO v_existing_id FROM categories
    WHERE name = p_name AND parent_id IS NULL LIMIT 1;
  ELSE
    SELECT id INTO v_existing_id FROM categories
    WHERE name = p_name AND parent_id = v_parent_id LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE categories SET sort_order = p_sort_order, published = true WHERE id = v_existing_id;
    RETURN v_existing_id;
  END IF;

  INSERT INTO categories (name, description, image_url, published, sort_order, parent_id)
  VALUES (p_name, p_description, p_image_url, true, p_sort_order, v_parent_id)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------
-- Родительские категории
-- ---------------------------------------------------------------
SELECT _upsert_cat('Мебель',     'Коллекция мебели Eichholtz',          '', 1, NULL);
SELECT _upsert_cat('Освещение',  'Коллекция освещения Eichholtz',        '', 2, NULL);
SELECT _upsert_cat('Аксессуары', 'Коллекция аксессуаров Eichholtz',      '', 3, NULL);
SELECT _upsert_cat('Для улицы',  'Уличная коллекция Eichholtz',          '', 4, NULL);

-- ---------------------------------------------------------------
-- Подкатегории → Мебель
-- ---------------------------------------------------------------
SELECT _upsert_cat('Гостиная', 'Мебель для гостиной',               '', 1, 'Мебель');
SELECT _upsert_cat('Спальня',  'Мебель для спальни',                '', 2, 'Мебель');
SELECT _upsert_cat('Столы',    'Столы и журнальные столики',        '', 3, 'Мебель');
SELECT _upsert_cat('Кресла',   'Кресла и стулья',                   '', 4, 'Мебель');
SELECT _upsert_cat('Диваны',   'Диваны и кушетки',                  '', 5, 'Мебель');

-- ---------------------------------------------------------------
-- Подкатегории → Освещение
-- ---------------------------------------------------------------
SELECT _upsert_cat('Потолочное', 'Потолочные люстры и светильники',  '', 1, 'Освещение');
SELECT _upsert_cat('Настольное', 'Настольные лампы',                 '', 2, 'Освещение');
SELECT _upsert_cat('Настенное',  'Настенные бра и светильники',      '', 3, 'Освещение');

-- ---------------------------------------------------------------
-- Подкатегории → Аксессуары
-- ---------------------------------------------------------------
SELECT _upsert_cat('Свечи и подсвечники', 'Декоративные свечи, подсвечники и фонари', '', 1, 'Аксессуары');
SELECT _upsert_cat('Оформление стен',      'Зеркала, картины и настенный декор',       '', 2, 'Аксессуары');

-- ---------------------------------------------------------------
-- Подкатегории → Для улицы
-- ---------------------------------------------------------------
SELECT _upsert_cat('Сидения',              'Уличные кресла, диваны и скамейки',         '', 1, 'Для улицы');
SELECT _upsert_cat('Столы уличные',        'Уличные обеденные и приставные столы',      '', 2, 'Для улицы');
SELECT _upsert_cat('Аксессуары для улицы', 'Уличные аксессуары и декор',                '', 3, 'Для улицы');

-- Очистить временную функцию
DROP FUNCTION _upsert_cat;

COMMIT;

-- Проверка результата:
SELECT
  c.id,
  COALESCE(p.name || ' → ', '') || c.name AS category,
  c.sort_order,
  c.published
FROM categories c
LEFT JOIN categories p ON p.id = c.parent_id
ORDER BY COALESCE(c.parent_id, c.id), c.sort_order;
