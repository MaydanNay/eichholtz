const fs = require('fs');

let content = fs.readFileSync('server/lib/categories.js', 'utf-8');

// Replace the Map building and resolution logic
content = content.replace(
  `  // Build a name→id map for resolving parents at any depth
  const nameToId = new Map()

  // Pre-load all existing categories
  const { rows: existingAll } = await query('SELECT id, name FROM categories')
  for (const row of existingAll) {
    nameToId.set(row.name, row.id)
  }`,
  `  // We will build a full-path to ID map
  const pathToId = new Map()

  // Pre-load all existing categories with their parents
  const { rows: existingAll } = await query(\`
    WITH RECURSIVE c AS (
      SELECT id, name, parent_id, name::text AS path
      FROM categories
      WHERE parent_id IS NULL
      UNION ALL
      SELECT cat.id, cat.name, cat.parent_id, c.path || ' > ' || cat.name
      FROM categories cat
      INNER JOIN c ON cat.parent_id = c.id
    )
    SELECT id, path FROM c
  \`)
  for (const row of existingAll) {
    pathToId.set(row.path, row.id)
  }`
);

// Replace parentId resolution
content = content.replace(
  `    let parentId = null
    if (item.parentName) {
      parentId = nameToId.get(item.parentName) ?? null
      if (!parentId) {
        // Parent not yet created — will be resolved on next server start
        continue
      }
    }`,
  `    let parentId = null;
    let fullPath = item.name;
    if (item.parentName) {
      parentId = pathToId.get(item.parentName) ?? null;
      if (!parentId) {
        // Fallback: try finding by just name if full path fails
        // But in DEFAULT_CATEGORIES, we will now specify full path in parentName!
        const possibleParents = existingAll.filter(r => r.path.endsWith(item.parentName));
        if (possibleParents.length > 0) {
           parentId = possibleParents[0].id;
        } else {
           continue;
        }
      }
      fullPath = (pathToId.has(item.parentName) ? item.parentName : possibleParents[0].path) + ' > ' + item.name;
    }`
);

content = content.replace(
  `      nameToId.set(item.name, existing[0].id)
      continue
    }

    const { rows: inserted }`,
  `      pathToId.set(fullPath, existing[0].id)
      continue
    }

    const { rows: inserted }`
);

content = content.replace(
  `    nameToId.set(item.name, inserted[0].id)
  }

  // Привязываем продукты к категориям по имени`,
  `    pathToId.set(fullPath, inserted[0].id)
  }

  // Привязываем продукты к категориям по имени`
);

fs.writeFileSync('server/lib/categories.js', content);
console.log('Fixed categories logic');
