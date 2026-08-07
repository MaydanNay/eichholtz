import { query, initDb, closePool } from "../db.js";

async function fetchCategoryHits(key, level1Path) {
  let hits = [];
  let page = 0;
  while (true) {
    const algRes = await fetch("https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query", {
      method: "POST",
      headers: {
        "X-Algolia-Application-Id": "L9823SLXQ4",
        "X-Algolia-API-Key": key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facetFilters: [[`categories.level1:${level1Path}`]],
        hitsPerPage: 500,
        page: page,
        attributesToRetrieve: ["objectID", "sku", "name"]
      })
    });
    const algData = await algRes.json();
    const pageHits = algData.hits || [];
    hits = hits.concat(pageHits);
    if (pageHits.length === 0 || page >= 10 || hits.length >= (algData.nbHits || 0)) break;
    page++;
  }
  return hits;
}

async function fetchLevel2Hits(key, level2Path) {
  let hits = [];
  let page = 0;
  while (true) {
    const algRes = await fetch("https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query", {
      method: "POST",
      headers: {
        "X-Algolia-Application-Id": "L9823SLXQ4",
        "X-Algolia-API-Key": key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facetFilters: [[`categories.level2:${level2Path}`]],
        hitsPerPage: 500,
        page: page,
        attributesToRetrieve: ["objectID", "sku", "name"]
      })
    });
    const algData = await algRes.json();
    const pageHits = algData.hits || [];
    hits = hits.concat(pageHits);
    if (pageHits.length === 0 || page >= 10 || hits.length >= (algData.nbHits || 0)) break;
    page++;
  }
  return hits;
}

async function run() {
  console.log("=== ПОЛНАЯ СИНХРОНИЗАЦИЯ 4 КАТЕГОРИЙ С ПОДДЕРЖКОЙ MULTI-CATEGORY ===");
  const pageRes = await fetch("https://www.eichholtz.com/en/");
  const html = await pageRes.text();
  const key = html.match(/"apiKey"\s*:\s*"([^"]+)"/)?.[1];

  await initDb();

  const mainCatConfigs = [
    { rootId: 551, name: "Мебель", level1: "Collection /// Furniture" },
    { rootId: 585, name: "Освещение", level1: "Collection /// Lighting" },
    { rootId: 595, name: "Аксессуары", level1: "Collection /// Accessories" },
    { rootId: 578, name: "Для улицы", level1: "Collection /// Outdoor" },
  ];

  for (const cfg of mainCatConfigs) {
    let hits = await fetchCategoryHits(key, cfg.level1);

    if (cfg.rootId === 551) {
      const furnitureSubcats = [
        "Collection /// Furniture /// Chairs",
        "Collection /// Furniture /// Tables",
        "Collection /// Furniture /// Sofas | Ottomans",
        "Collection /// Furniture /// Cabinets",
        "Collection /// Furniture /// Bedroom",
        "Collection /// Furniture /// Rugs | Carpets"
      ];
      for (const sc of furnitureSubcats) {
        const subHits = await fetchLevel2Hits(key, sc);
        hits = hits.concat(subHits);
      }
    }

    const dedupMap = new Map();
    for (const h of hits) dedupMap.set(String(h.objectID), h);
    const uniqueHits = Array.from(dedupMap.values());

    console.log(`Algolia [${cfg.name}]: ${uniqueHits.length} уникальных товаров.`);

    let count = 0;
    for (const h of uniqueHits) {
      const objId = String(h.objectID);
      const sku = h.sku ? String(h.sku) : null;
      
      const { rows } = await query(
        `SELECT id, category_id, specs FROM products WHERE specs->>'objectID' = $1 OR (specs->>'sku' = $2 AND $2 IS NOT NULL)`,
        [objId, sku]
      );

      if (rows.length > 0) {
        const p = rows[0];
        const specs = typeof p.specs === 'object' && p.specs !== null ? { ...p.specs } : {};
        const extraCats = Array.isArray(specs.extra_categories) ? [...specs.extra_categories] : [];

        if (!extraCats.includes(cfg.rootId)) {
          extraCats.push(cfg.rootId);
        }
        specs.extra_categories = extraCats;

        await query(
          `UPDATE products SET specs = $1 WHERE id = $2`,
          [JSON.stringify(specs), p.id]
        );
        count++;
      }
    }
    console.log(`Обновлено extra_categories для [${cfg.name}]: ${count}`);
  }

  await closePool();
}

run().catch(console.error);
