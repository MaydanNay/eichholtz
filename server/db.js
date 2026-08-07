import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function query(text, params) {
  return pool.query(text, params)
}

export async function ping() {
  await query('SELECT 1')
}

export async function closePool() {
  await pool.end()
}

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price DECIMAL(12, 2) NOT NULL DEFAULT 0,
      category TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      in_stock BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '',
      items JSONB NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'new',
      total DECIMAL(12, 2) NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      published BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS seasons (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      published BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS collections (
      id SERIAL PRIMARY KEY,
      season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      published BOOLEAN NOT NULL DEFAULT false,
      is_new BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      published BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL;

    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS catalog_id INTEGER REFERENCES collections(id) ON DELETE SET NULL;

    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

    ALTER TABLE collections
      ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT false;

    ALTER TABLE collections
      ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'category';

    UPDATE products p
    SET catalog_id = p.collection_id,
        collection_id = NULL
    FROM collections c
    WHERE p.collection_id = c.id
      AND c.kind = 'catalog'
      AND p.catalog_id IS NULL;

    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT true;

    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS specs JSONB NOT NULL DEFAULT '{}';

    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]';

    UPDATE products
    SET images = jsonb_build_array(image_url)
    WHERE image_url <> ''
      AND (images = '[]'::jsonb OR images IS NULL);

    ALTER TABLE collections
      ADD COLUMN IF NOT EXISTS pdf_url TEXT NOT NULL DEFAULT '';

    ALTER TABLE collections
      ADD COLUMN IF NOT EXISTS parent_collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL;

    ALTER TABLE collections
      ADD COLUMN IF NOT EXISTS hero_order INTEGER;

    ALTER TABLE collections
      ADD COLUMN IF NOT EXISTS hidden_categories JSONB NOT NULL DEFAULT '[]';

    ALTER TABLE collections
      ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT false;

    ALTER TABLE seasons
      ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT false;

    ALTER TABLE seasons
      ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      company TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    INSERT INTO settings (key, value) VALUES ('block2_title', 'Новые коллекции') ON CONFLICT DO NOTHING;
    INSERT INTO settings (key, value) VALUES ('product_attributes', '{
  "color": {
    "label": "Цвет",
    "options": [
      {
        "value": "Beige",
        "swatch": "#ffefc2"
      },
      {
        "value": "Beige | Sand",
        "swatch": "#dbc690"
      },
      {
        "value": "Black",
        "swatch": "#000000"
      },
      {
        "value": "Blue",
        "swatch": "#163480"
      },
      {
        "value": "Bronze",
        "swatch": "#382424"
      },
      {
        "value": "Brown",
        "swatch": "#6b4c03"
      },
      {
        "value": "Clear",
        "swatch": "#ffffff"
      },
      {
        "value": "Copper",
        "swatch": "#a64119"
      },
      {
        "value": "Gold",
        "swatch": "#c9a524"
      },
      {
        "value": "Green",
        "swatch": "#306115"
      },
      {
        "value": "Greige",
        "swatch": "#786757"
      },
      {
        "value": "Grey",
        "swatch": "#8c8c8c"
      },
      {
        "value": "Natural",
        "swatch": "#d4b082"
      },
      {
        "value": "Off-white",
        "swatch": "#f7f5ed"
      },
      {
        "value": "Orange",
        "swatch": "#d17a3d"
      },
      {
        "value": "Pink",
        "swatch": "#f095c1"
      },
      {
        "value": "Purple",
        "swatch": "#874a8c"
      },
      {
        "value": "Red",
        "swatch": "#c93c3c"
      },
      {
        "value": "Sand",
        "swatch": "#d4c699"
      },
      {
        "value": "Silver",
        "swatch": "#969696"
      },
      {
        "value": "White",
        "swatch": "#ffffff"
      },
      {
        "value": "White | Off-white",
        "swatch": "#f7f7e8"
      },
      {
        "value": "Yellow",
        "swatch": "#f5d536"
      }
    ]
  },
  "finish": {
    "label": "Отделка",
    "options": [
      {
        "value": "Antique gold",
        "swatch": "https://cdn.eichholtz.com/media/attribute/swatch//a/n/antique_gold.jpg"
      },
      {
        "value": "Antique silver",
        "swatch": "https://cdn.eichholtz.com/media/attribute/swatch//a/n/antique_silver_2_lr.jpg"
      },
      {
        "value": "Brass (antiqued)",
        "swatch": "https://cdn.eichholtz.com/media/attribute/swatch//a/n/antique_brass.jpg"
      },
      {
        "value": "Brass (brushed)",
        "swatch": "https://cdn.eichholtz.com/media/attribute/swatch//b/r/brushed_brass.jpg"
      },
      {
        "value": "Bronze",
        "swatch": "https://cdn.eichholtz.com/media/attribute/swatch//b/r/bronze_1.jpg"
      },
      {
        "value": "Bronze | Gunmetal",
        "swatch": "https://cdn.eichholtz.com/media/attribute/swatch//b/r/bronze.jpg"
      },
      {
        "value": "Charcoal",
        "swatch": "https://cdn.eichholtz.com/media/attribute/swatch//c/h/charcoal.jpg"
      },
      {
        "value": "Copper (brushed)",
        "swatch": "https://cdn.eichholtz.com/media/attribute/swatch//b/r/brushed_copper.jpg"
      },
      {
        "value": "Gunmetal",
        "swatch": "https://cdn.eichholtz.com/media/attribute/swatch//g/u/gunmetal.jpg"
      },
      {
        "value": "Mirror glass",
        "swatch": "https://cdn.eichholtz.com/media/attribute/swatch//m/i/mirror_glass.jpg"
      },
      {
        "value": "Steel (brushed)",
        "swatch": "https://cdn.eichholtz.com/media/attribute/swatch//b/r/brushed_steel.jpg"
      },
      {
        "value": "Weathered oak",
        "swatch": "https://cdn.eichholtz.com/media/attribute/swatch//w/e/weathered_oak_68_.jpg"
      }
    ]
  },
  "fabric": {
    "label": "Ткань",
    "options": []
  },
  "material": {
    "label": "Материал",
    "options": []
  }
}') ON CONFLICT DO NOTHING;


    ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE;
  `)

  const { backfillClientsFromOrders } = await import('./lib/clients.js')
  await backfillClientsFromOrders()

  const { seedDefaultCatalogs } = await import('./lib/catalogs.js')
  await seedDefaultCatalogs()

  const { seedDefaultCategories } = await import('./lib/categories.js')
  await seedDefaultCategories()

  const { seedDefaultHeroCollections } = await import('./lib/heroCollections.js')
  await seedDefaultHeroCollections()
}

export async function waitForDb(retries = 30, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await initDb()
      console.log('Database connected and migrated')
      return
    } catch (err) {
      console.log(`Waiting for database... (${i + 1}/${retries})`)
      if (i === retries - 1) {
        console.error(err.message)
        throw err
      }
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

export function validateEnv() {
  const required = ['DATABASE_URL', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'JWT_SECRET']
  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required env variables: ${missing.join(', ')}`)
  }

  if (process.env.JWT_SECRET.length < 16) {
    throw new Error('JWT_SECRET must be at least 16 characters')
  }
}

export default pool
