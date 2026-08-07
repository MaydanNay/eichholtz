import { query, initDb, closePool } from "../db.js";

async function run() {
  console.log("=== АВТОМАТИЧЕСКОЕ СОПОСТАВЛЕНИЕ И СИНХРОНИЗАЦИЯ ВСЕХ ПОДКАТЕГОРИЙ 1-В-1 С ALGOLIA ===");
  await initDb();

  const pageRes = await fetch("https://www.eichholtz.com/en/");
  const html = await pageRes.text();
  const key = html.match(/"apiKey"\s*:\s*"([^"]+)"/)?.[1];

  // Fetch all categories from DB
  const { rows: dbCategories } = await query(`SELECT id, name, parent_id FROM categories`);
  const catById = new Map(dbCategories.map(c => [c.id, c]));

  // Build full hierarchy chain for each DB category
  function getDbChain(catId) {
    const chain = [];
    let curr = catById.get(catId);
    while (curr) {
      chain.unshift(curr);
      curr = curr.parent_id ? catById.get(curr.parent_id) : null;
    }
    return chain;
  }

  // Category mapping definitions between Algolia paths and DB Category IDs
  const mappingRules = [
    // --- FURNITURE (551) ---
    { alg: "Collection /// Furniture", dbId: 551 },
    { alg: "Collection /// Furniture /// Chairs", dbId: 554 },
    { alg: "Collection /// Furniture /// Chairs /// Armchairs", dbId: 555 },
    { alg: "Collection /// Furniture /// Chairs /// Dining Chairs", dbId: 561 },
    { alg: "Collection /// Furniture /// Chairs /// Bar & Counter Stools", dbId: 565 },
    { alg: "Collection /// Furniture /// Chairs /// Stools", dbId: 573 },

    { alg: "Collection /// Furniture /// Tables", dbId: 559 },
    { alg: "Collection /// Furniture /// Tables /// Dining Tables", dbId: 560 },
    { alg: "Collection /// Furniture /// Tables /// Coffee Tables", dbId: 568 },
    { alg: "Collection /// Furniture /// Tables /// Side Tables", dbId: 569 },
    { alg: "Collection /// Furniture /// Tables /// Console Tables", dbId: 574 },
    { alg: "Collection /// Furniture /// Tables /// Desks", dbId: 575 },
    { alg: "Collection /// Furniture /// Tables /// Trolleys", dbId: 566 },
    { alg: "Collection /// Furniture /// Tables /// Columns", dbId: 567 },
    { alg: "Collection /// Furniture /// Tables /// Bar Units | Butler Trays", dbId: 572 },

    { alg: "Collection /// Furniture /// Sofas | Ottomans", dbId: 552 },
    { alg: "Collection /// Furniture /// Sofas | Ottomans /// Sofas", dbId: 553 },
    { alg: "Collection /// Furniture /// Sofas | Ottomans /// Modular Sofas", dbId: 583 },
    { alg: "Collection /// Furniture /// Sofas | Ottomans /// Benches", dbId: 558 },
    { alg: "Collection /// Furniture /// Sofas | Ottomans /// Ottomans", dbId: 581 },
    { alg: "Collection /// Furniture /// Sofas | Ottomans /// Poufs", dbId: 720 },
    { alg: "Collection /// Furniture /// Sofas | Ottomans /// Chaise Longues", dbId: 666 },

    { alg: "Collection /// Furniture /// Cabinets", dbId: 562 },
    { alg: "Collection /// Furniture /// Cabinets /// Display Cabinets", dbId: 563 },
    { alg: "Collection /// Furniture /// Cabinets /// Dressers", dbId: 564 },
    { alg: "Collection /// Furniture /// Cabinets /// Bar Cabinets", dbId: 570 },
    { alg: "Collection /// Furniture /// Cabinets /// TV Cabinets", dbId: 582 },

    { alg: "Collection /// Furniture /// Bedroom", dbId: 556 },
    { alg: "Collection /// Furniture /// Bedroom /// Headboards & Beds", dbId: 557 },
    { alg: "Collection /// Furniture /// Bedroom /// Nightstands", dbId: 571 },
    { alg: "Collection /// Furniture /// Bedroom /// Chest of Drawers", dbId: 576 },

    { alg: "Collection /// Furniture /// Rugs | Carpets", dbId: 577 },

    // --- LIGHTING (585) ---
    { alg: "Collection /// Lighting", dbId: 585 },
    { alg: "Collection /// Lighting /// Chandeliers", dbId: 586 },
    { alg: "Collection /// Lighting /// Pendant Lights", dbId: 587 },
    { alg: "Collection /// Lighting /// Table Lamps", dbId: 588 },
    { alg: "Collection /// Lighting /// Floor Lamps", dbId: 589 },
    { alg: "Collection /// Lighting /// Wall Sconces", dbId: 664 },
    { alg: "Collection /// Lighting /// Lamp Shades", dbId: 665 },

    // --- ACCESSORIES (595) ---
    { alg: "Collection /// Accessories", dbId: 595 },
    { alg: "Collection /// Accessories /// Candleholders | Hurricane", dbId: 596 },
    { alg: "Collection /// Accessories /// Candleholders | Hurricane /// Candleholders", dbId: 597 },
    { alg: "Collection /// Accessories /// Candleholders | Hurricane /// Hurricanes", dbId: 685 },
    { alg: "Collection /// Accessories /// Candleholders | Hurricane /// Candles", dbId: 686 },

    { alg: "Collection /// Accessories /// Wall Art", dbId: 598 },
    { alg: "Collection /// Accessories /// Wall Art /// Wall Objects", dbId: 601 },
    { alg: "Collection /// Accessories /// Wall Art /// Prints", dbId: 606 },

    { alg: "Collection /// Accessories /// Home Textiles", dbId: 607 },
    { alg: "Collection /// Accessories /// Home Textiles /// Cushions", dbId: 608 },

    { alg: "Collection /// Accessories /// Mirrors", dbId: 609 },
    { alg: "Collection /// Accessories /// Mirrors /// Wall Mirrors", dbId: 611 },
    { alg: "Collection /// Accessories /// Mirrors /// Table & Standing Mirrors", dbId: 617 },

    { alg: "Collection /// Accessories /// Vases | Planters", dbId: 717 },
    { alg: "Collection /// Accessories /// Vases | Planters /// Vases", dbId: 718 },
    { alg: "Collection /// Accessories /// Vases | Planters /// Planters", dbId: 719 },

    { alg: "Collection /// Accessories /// Decorative Objects", dbId: 667 },
    { alg: "Collection /// Accessories /// Decorative Objects /// Ashtrays", dbId: 668 },
    { alg: "Collection /// Accessories /// Decorative Objects /// Bookends", dbId: 669 },
    { alg: "Collection /// Accessories /// Decorative Objects /// Bowls", dbId: 670 },
    { alg: "Collection /// Accessories /// Decorative Objects /// Boxes", dbId: 671 },
    { alg: "Collection /// Accessories /// Decorative Objects /// Decorative Objects", dbId: 672 },
    { alg: "Collection /// Accessories /// Decorative Objects /// Picture Frames", dbId: 673 },
    { alg: "Collection /// Accessories /// Decorative Objects /// Statues", dbId: 674 },

    { alg: "Collection /// Accessories /// Serving Accessories", dbId: 675 },
    { alg: "Collection /// Accessories /// Serving Accessories /// Serving Accessories", dbId: 676 },
    { alg: "Collection /// Accessories /// Serving Accessories /// Wine Coolers", dbId: 677 },
    { alg: "Collection /// Accessories /// Serving Accessories /// Wine Racks", dbId: 678 },

    { alg: "Collection /// Accessories /// Coat Racks | Umbrella Stands & More", dbId: 679 },
    { alg: "Collection /// Accessories /// Coat Racks | Umbrella Stands & More /// Coat Racks", dbId: 680 },
    { alg: "Collection /// Accessories /// Coat Racks | Umbrella Stands & More /// Umbrella Stands", dbId: 681 },
    { alg: "Collection /// Accessories /// Coat Racks | Umbrella Stands & More /// Fireplace Accessories", dbId: 682 },
    { alg: "Collection /// Accessories /// Coat Racks | Umbrella Stands & More /// Bathroom Accessories", dbId: 683 },

    { alg: "Collection /// Accessories /// Artificial Plants & Flora", dbId: 716 },

    // --- OUTDOOR (578) ---
    { alg: "Collection /// Outdoor", dbId: 578 },
    { alg: "Collection /// Outdoor /// Outdoor Sofas | Daybeds", dbId: 579 },
    { alg: "Collection /// Outdoor /// Outdoor Sofas | Daybeds /// Outdoor Sofas", dbId: 631 },
    { alg: "Collection /// Outdoor /// Outdoor Sofas | Daybeds /// Outdoor Daybeds", dbId: 684 },

    { alg: "Collection /// Outdoor /// Outdoor Tables", dbId: 628 },
    { alg: "Collection /// Outdoor /// Outdoor Tables /// Outdoor Dining Tables", dbId: 580 },
    { alg: "Collection /// Outdoor /// Outdoor Tables /// Outdoor Coffee Tables", dbId: 629 },
    { alg: "Collection /// Outdoor /// Outdoor Tables /// Outdoor Console Tables", dbId: 636 },
    { alg: "Collection /// Outdoor /// Outdoor Tables /// Outdoor Side Tables", dbId: 637 },

    { alg: "Collection /// Outdoor /// Outdoor Chairs", dbId: 652 },
    { alg: "Collection /// Outdoor /// Outdoor Chairs /// Outdoor Armchairs", dbId: 633 },
    { alg: "Collection /// Outdoor /// Outdoor Chairs /// Outdoor Dining Chairs", dbId: 635 },

    { alg: "Collection /// Outdoor /// Outdoor Rugs", dbId: 638 },
    { alg: "Collection /// Outdoor /// Outdoor Accessories", dbId: 647 },
    { alg: "Collection /// Outdoor /// Outdoor Lighting", dbId: 650 },
    { alg: "Collection /// Outdoor /// Outdoor Covers", dbId: 655 },
  ];

  const algToDbId = new Map(mappingRules.map(r => [r.alg, r.dbId]));

  let page = 0;
  let allHits = [];
  while (true) {
    const algRes = await fetch("https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query", {
      method: "POST",
      headers: {
        "X-Algolia-Application-Id": "L9823SLXQ4",
        "X-Algolia-API-Key": key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        hitsPerPage: 1000,
        page: page,
        attributesToRetrieve: ["objectID", "sku", "categories"]
      })
    });
    const algData = await algRes.json();
    const pageHits = algData.hits || [];
    allHits = allHits.concat(pageHits);
    if (pageHits.length === 0 || page >= 10 || allHits.length >= (algData.nbHits || 0)) break;
    page++;
  }

  // Also specifically query each level1 path to capture all products completely
  for (const rootPath of ["Collection /// Furniture", "Collection /// Lighting", "Collection /// Accessories", "Collection /// Outdoor"]) {
    let rootPage = 0;
    while (true) {
      const algRes = await fetch("https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query", {
        method: "POST",
        headers: {
          "X-Algolia-Application-Id": "L9823SLXQ4",
          "X-Algolia-API-Key": key,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          facetFilters: [[`categories.level1:${rootPath}`]],
          hitsPerPage: 500,
          page: rootPage,
          attributesToRetrieve: ["objectID", "sku", "categories"]
        })
      });
      const algData = await algRes.json();
      const pageHits = algData.hits || [];
      allHits = allHits.concat(pageHits);
      if (pageHits.length === 0 || rootPage >= 10 || allHits.length >= (algData.nbHits || 0)) break;
      rootPage++;
    }
  }

  // Deduplicate all hits by objectID
  const dedupHitsMap = new Map();
  for (const h of allHits) dedupHitsMap.set(String(h.objectID), h);
  const uniqueHits = Array.from(dedupHitsMap.values());

  console.log(`Всего уникальных товаров из Algolia для сопоставления: ${uniqueHits.length}`);

  let updatedCount = 0;
  for (const h of uniqueHits) {
    const objId = String(h.objectID);
    const sku = h.sku ? String(h.sku) : null;
    const catsObj = h.categories || {};

    const matchedCatIds = new Set();
    let deepestCatId = null;
    let maxDepth = -1;

    for (const levelKey of ["level1", "level2", "level3"]) {
      const levelArr = Array.isArray(catsObj[levelKey]) ? catsObj[levelKey] : [];
      for (const algPath of levelArr) {
        const dbId = algToDbId.get(algPath);
        if (dbId) {
          matchedCatIds.add(dbId);
          const chain = getDbChain(dbId);
          for (const c of chain) matchedCatIds.add(c.id);

          if (chain.length > maxDepth) {
            maxDepth = chain.length;
            deepestCatId = dbId;
          }
        }
      }
    }

    if (matchedCatIds.size > 0) {
      const { rows } = await query(
        `SELECT id, category_id, specs FROM products WHERE specs->>'objectID' = $1 OR (specs->>'sku' = $2 AND $2 IS NOT NULL)`,
        [objId, sku]
      );

      if (rows.length > 0) {
        const p = rows[0];
        const specs = typeof p.specs === 'object' && p.specs !== null ? { ...p.specs } : {};
        const existingExtra = Array.isArray(specs.extra_categories) ? specs.extra_categories : [];

        const combinedExtra = Array.from(new Set([...existingExtra, ...matchedCatIds]));
        specs.extra_categories = combinedExtra;

        const newCatId = deepestCatId || p.category_id;

        await query(
          `UPDATE products SET category_id = $1, specs = $2 WHERE id = $3`,
          [newCatId, JSON.stringify(specs), p.id]
        );
        updatedCount++;
      }
    }
  }

  console.log(`Полная синхронизация завершена! Обновлено товаров: ${updatedCount}`);

  await closePool();
}

run().catch(console.error);
