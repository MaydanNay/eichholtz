const fs = require('fs');
const content = fs.readFileSync('/home/maydan/.gemini/antigravity-ide/brain/d95d22da-f636-47f3-a1d0-74238486fcdd/.system_generated/steps/243/content.md', 'utf-8');
const match = content.match(/window\.algoliaConfig = (\{.*?\});/);
if (match) {
  const config = JSON.parse(match[1]);
  const attributes = {
    color: { label: 'Цвет', options: [] },
    finish: { label: 'Отделка', options: [] },
    fabric: { label: 'Ткань', options: [] },
    material: { label: 'Материал', options: [] },
  };

  const swatches = config.swatches || {};
  
  if (swatches.color) {
    for (const [key, val] of Object.entries(swatches.color)) {
      attributes.color.options.push({ value: key, swatch: val.value });
    }
  }
  
  if (swatches.finish) {
    for (const [key, val] of Object.entries(swatches.finish)) {
      attributes.finish.options.push({ value: key, swatch: val.value });
    }
  }
  
  // Fabric and material might not have swatches, but maybe we can extract from facets if they exist?
  // But wait, the site doesn't list all facet values in algoliaConfig, only the swatches.
  // Facets only list the *names* of the attributes, e.g. {"attribute":"fabric","label":"Fabric"}.
  // Let's just output what we have.
  
  fs.writeFileSync('product_attributes.json', JSON.stringify(attributes, null, 2));
  console.log("Extracted attributes to product_attributes.json");
} else {
  console.log("Could not find algoliaConfig");
}
