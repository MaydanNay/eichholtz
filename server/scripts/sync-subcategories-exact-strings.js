import { query, initDb, closePool } from "../db.js";

async function run() {
  console.log("=== СИНХРОНИЗАЦИЯ ПО ТОЧНЫМ СТРОКАМ ALGOLIA (EXACT CATEGORY STRINGS) ===");
  await initDb();

  const pageRes = await fetch("https://www.eichholtz.com/en/");
  const html = await pageRes.text();
  const key = html.match(/"apiKey"\s*:\s*"([^"]+)"/)?.[1];

  const { rows: dbCategories } = await query(`SELECT id, name, parent_id FROM categories`);
  const catById = new Map(dbCategories.map(c => [c.id, c]));

  function getDbChain(catId) {
    const chain = [];
    let curr = catById.get(catId);
    while (curr) {
      chain.unshift(curr);
      curr = curr.parent_id ? catById.get(curr.parent_id) : null;
    }
    return chain;
  }

  // Exact Algolia string to DB category ID mapping
  const exactMapping = [
    // --- FURNITURE (551) ---
    { alg: "Collection /// Furniture", dbId: 551 },
    { alg: "Collection /// Furniture /// Chairs", dbId: 554 },
    { alg: "Collection /// Furniture /// Chairs /// Armchairs", dbId: 555 },
    { alg: "Collection /// Furniture /// Chairs /// Dining chairs", dbId: 561 },
    { alg: "Collection /// Furniture /// Chairs /// Bar- & counterstools", dbId: 565 },
    { alg: "Collection /// Furniture /// Chairs /// Stools", dbId: 573 },

    { alg: "Collection /// Furniture /// Tables", dbId: 559 },
    { alg: "Collection /// Furniture /// Tables /// Dining tables", dbId: 560 },
    { alg: "Collection /// Furniture /// Tables /// Coffee tables", dbId: 568 },
    { alg: "Collection /// Furniture /// Tables /// Side tables", dbId: 569 },
    { alg: "Collection /// Furniture /// Tables /// Console tables", dbId: 574 },
    { alg: "Collection /// Furniture /// Tables /// Desks", dbId: 575 },
    { alg: "Collection /// Furniture /// Tables /// Trolleys", dbId: 566 },
    { alg: "Collection /// Furniture /// Tables /// Columns", dbId: 567 },
    { alg: "Collection /// Furniture /// Tables /// Bars | Butler trays", dbId: 572 },

    { alg: "Collection /// Furniture /// Sofas | Ottomans", dbId: 552 },
    { alg: "Collection /// Furniture /// Sofas | Ottomans /// Sofas", dbId: 553 },
    { alg: "Collection /// Furniture /// Sofas | Ottomans /// Modular sofas", dbId: 583 },
    { alg: "Collection /// Furniture /// Sofas | Ottomans /// Benches", dbId: 558 },
    { alg: "Collection /// Furniture /// Sofas | Ottomans /// Ottomans", dbId: 581 },
    { alg: "Collection /// Furniture /// Sofas | Ottomans /// Poufs", dbId: 720 },
    { alg: "Collection /// Furniture /// Sofas | Ottomans /// Chaise longues", dbId: 666 },

    { alg: "Collection /// Furniture /// Cabinets", dbId: 562 },
    { alg: "Collection /// Furniture /// Cabinets /// Display cabinets", dbId: 563 },
    { alg: "Collection /// Furniture /// Cabinets /// Dressers", dbId: 564 },
    { alg: "Collection /// Furniture /// Cabinets /// Bar cabinets", dbId: 570 },
    { alg: "Collection /// Furniture /// Cabinets /// Tv Cabinets", dbId: 582 },

    { alg: "Collection /// Furniture /// Bedroom", dbId: 556 },
    { alg: "Collection /// Furniture /// Bedroom /// Headboards & beds", dbId: 557 },
    { alg: "Collection /// Furniture /// Bedroom /// Nightstands", dbId: 571 },
    { alg: "Collection /// Furniture /// Bedroom /// Drawer dressers", dbId: 576 },

    { alg: "Collection /// Furniture /// Rugs | Carpets", dbId: 577 },

    // --- LIGHTING (585) ---
    { alg: "Collection /// Lighting", dbId: 585 },
    { alg: "Collection /// Lighting /// Chandeliers", dbId: 586 },
    { alg: "Collection /// Lighting /// Pendant lights", dbId: 587 },
    { alg: "Collection /// Lighting /// Table lamps", dbId: 588 },
    { alg: "Collection /// Lighting /// Floor lamps", dbId: 589 },
    { alg: "Collection /// Lighting /// Wall sconces", dbId: 664 },
    { alg: "Collection /// Lighting /// Lamp shades", dbId: 665 },
    { alg: "Collection /// Lighting /// Ceiling lamps", dbId: 586 },

    // --- ACCESSORIES (595) ---
    { alg: "Collection /// Accessories", dbId: 595 },
    { alg: "Collection /// Accessories /// Hurricanes | Candle holders", dbId: 596 },
    { alg: "Collection /// Accessories /// Candleholders | Hurricane", dbId: 596 },
    { alg: "Collection /// Accessories /// Hurricanes | Candle holders /// Candle holders", dbId: 597 },
    { alg: "Collection /// Accessories /// Hurricanes | Candle holders /// Hurricanes", dbId: 685 },
    { alg: "Collection /// Accessories /// Hurricanes | Candle holders /// Candles", dbId: 686 },

    { alg: "Collection /// Accessories /// Wall decorations", dbId: 598 },
    { alg: "Collection /// Accessories /// Wall Art", dbId: 598 },
    { alg: "Collection /// Accessories /// Wall decorations /// Wall objects", dbId: 601 },
    { alg: "Collection /// Accessories /// Wall decorations /// Prints", dbId: 606 },

    { alg: "Collection /// Accessories /// Home textiles", dbId: 607 },
    { alg: "Collection /// Accessories /// Home textiles /// Cushions", dbId: 608 },

    { alg: "Collection /// Accessories /// Mirrors", dbId: 609 },
    { alg: "Collection /// Accessories /// Mirrors /// Wall mirrors", dbId: 611 },
    { alg: "Collection /// Accessories /// Mirrors /// Table and floor mirrors", dbId: 617 },

    { alg: "Collection /// Accessories /// Vases | Planters", dbId: 717 },
    { alg: "Collection /// Accessories /// Vases | Planters /// Vases", dbId: 718 },
    { alg: "Collection /// Accessories /// Vases | Planters /// Planters", dbId: 719 },

    { alg: "Collection /// Accessories /// Decorative items", dbId: 667 },
    { alg: "Collection /// Accessories /// Decorative Objects", dbId: 667 },
    { alg: "Collection /// Accessories /// Decorative items /// Ashtrays", dbId: 668 },
    { alg: "Collection /// Accessories /// Decorative items /// Bookends", dbId: 669 },
    { alg: "Collection /// Accessories /// Decorative items /// Bowls", dbId: 670 },
    { alg: "Collection /// Accessories /// Decorative items /// Boxes", dbId: 671 },
    { alg: "Collection /// Accessories /// Decorative items /// Decorative objects", dbId: 672 },
    { alg: "Collection /// Accessories /// Decorative items /// Picture frames", dbId: 673 },
    { alg: "Collection /// Accessories /// Decorative items /// Statues", dbId: 674 },

    { alg: "Collection /// Accessories /// Serving accessories", dbId: 675 },
    { alg: "Collection /// Accessories /// Serving accessories /// Serving accessories", dbId: 676 },
    { alg: "Collection /// Accessories /// Serving accessories /// Wine coolers", dbId: 677 },
    { alg: "Collection /// Accessories /// Serving accessories /// Wine racks", dbId: 678 },

    { alg: "Collection /// Accessories /// Coat racks | Umbrella stands & more", dbId: 679 },
    { alg: "Collection /// Accessories /// Coat racks | Umbrella stands & more /// Coat racks", dbId: 680 },
    { alg: "Collection /// Accessories /// Coat racks | Umbrella stands & more /// Umbrella stands", dbId: 681 },
    { alg: "Collection /// Accessories /// Coat racks | Umbrella stands & more /// Fireplace accessories", dbId: 682 },
    { alg: "Collection /// Accessories /// Coat racks | Umbrella stands & more /// Bathroom accessories", dbId: 683 },

    { alg: "Collection /// Accessories /// Artificial Flowers & Greenery", dbId: 716 },

    // --- OUTDOOR (578) ---
    { alg: "Collection /// Outdoor", dbId: 578 },
    { alg: "Collection /// Outdoor /// Outdoor sofas | Daybeds", dbId: 579 },
    { alg: "Collection /// Outdoor /// Outdoor sofas | Daybeds /// Outdoor sofas", dbId: 631 },
    { alg: "Collection /// Outdoor /// Outdoor sofas | Daybeds /// Outdoor beds", dbId: 684 },

    { alg: "Collection /// Outdoor /// Outdoor tables", dbId: 628 },
    { alg: "Collection /// Outdoor /// Outdoor tables /// Outdoor dining tables", dbId: 580 },
    { alg: "Collection /// Outdoor /// Outdoor tables /// Outdoor coffee tables", dbId: 629 },
    { alg: "Collection /// Outdoor /// Outdoor tables /// Outdoor console tables", dbId: 636 },
    { alg: "Collection /// Outdoor /// Outdoor tables /// Outdoor side tables", dbId: 637 },

    { alg: "Collection /// Outdoor /// Outdoor chairs", dbId: 652 },
    { alg: "Collection /// Outdoor /// Outdoor chairs /// Outdoor armchairs", dbId: 633 },
    { alg: "Collection /// Outdoor /// Outdoor chairs /// Outdoor dining chairs", dbId: 635 },

    { alg: "Collection /// Outdoor /// Outdoor carpets", dbId: 638 },
    { alg: "Collection /// Outdoor /// Outdoor Rugs", dbId: 638 },
    { alg: "Collection /// Outdoor /// Outdoor accessories", dbId: 647 },
    { alg: "Collection /// Outdoor /// Outdoor lighting", dbId: 650 },
    { alg: "Collection /// Outdoor /// Outdoor covers", dbId: 655 },
  ];

  const algToDbId = new Map(exactMapping.map(r => [r.alg, r.dbId]));

  // Fetch all hits from Algolia
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

  const dedupHitsMap = new Map();
  for (const h of allHits) dedupHitsMap.set(String(h.objectID), h);
  const uniqueHits = Array.from(dedupHitsMap.values());

  console.log(`Всего товаров Algolia для сопоставления: ${uniqueHits.length}`);

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

  console.log(`Синхронизация по точным строкам завершена! Обновлено товаров: ${updatedCount}`);

  await closePool();
}

run().catch(console.error);
