import db from './server/db.js';

const dict = {
    'White': 'Белый', 'Off-white': 'Слоновая кость', 'Beige': 'Бежевый', 'Sand': 'Песочный',
    'Gold': 'Золотой', 'Blue': 'Синий', 'Pink': 'Розовый', 'Natural': 'Натуральный',
    'Bronze': 'Бронзовый', 'Green': 'Зеленый', 'Silver': 'Серебряный', 'Grey': 'Серый',
    'Black': 'Черный', 'Copper': 'Медный', 'Brown': 'Коричневый', 'Orange': 'Оранжевый',
    'Clear': 'Прозрачный', 'Red': 'Красный', 'Greige': 'Серо-бежевый', 'Yellow': 'Желтый',
    'Purple': 'Фиолетовый',
    'Faux marble': 'Искусственный мрамор', 'Fabric': 'Ткань', 'Wood': 'Дерево', 'Metal': 'Металл',
    'Glass': 'Стекло', 'Faux rattan': 'Искусственный ротанг', 'Marble/stone': 'Мрамор/камень',
    'Fiberglass': 'Стекловолокно', 'Mirror glass': 'Зеркальное стекло', 'Leather': 'Кожа',
    'Ceramic': 'Керамика', 'Rattan': 'Ротанг', 'Wool': 'Шерсть', 'Viscose': 'Вискоза',
    'Acrylic': 'Акрил', 'Horn/bone look': 'Под рог/кость', 'Concrete': 'Бетон',
    'Leather look': 'Экокожа', 'Resin': 'Смола', 'Jute': 'Джут', 'Horn/bone': 'Рог/кость',
    'Raffia': 'Рафия'
};

const translateStr = (str) => {
    if (!str) return str;
    let newStr = str;
    Object.keys(dict).forEach(en => {
        const ru = dict[en];
        // replace exact words, handle comma/pipe
        // using regex with boundaries is hard because of slashes, so we just split by comma/pipe
        const parts = String(newStr).split(/[,|]/);
        const translatedParts = parts.map(p => {
            const trimmed = p.trim();
            if (dict[trimmed]) return dict[trimmed];
            return trimmed;
        });
        newStr = translatedParts.join(', ');
    });
    return newStr;
}

async function run() {
    // 1. Update settings
    const { rows: settingsRows } = await db.query("SELECT value FROM settings WHERE key = 'product_attributes'");
    if (settingsRows.length > 0) {
        const attrs = typeof settingsRows[0].value === 'string' ? JSON.parse(settingsRows[0].value) : settingsRows[0].value;
        if (attrs.color && attrs.color.options) {
            attrs.color.options = attrs.color.options.map(opt => {
                return { ...opt, value: translateStr(opt.value) };
            });
        }
        if (attrs.material && attrs.material.options) {
            attrs.material.options = attrs.material.options.map(opt => {
                return { ...opt, value: translateStr(opt.value) };
            });
        }
        await db.query("UPDATE settings SET value = $1 WHERE key = 'product_attributes'", [JSON.stringify(attrs)]);
        console.log("Updated settings");
    }

    // 2. Update products
    const { rows: products } = await db.query("SELECT id, specs FROM products");
    let updatedCount = 0;
    for (const p of products) {
        let specs = p.specs;
        if (typeof specs === 'string') { try { specs = JSON.parse(specs) } catch(e){} }
        if (!specs) continue;
        
        let changed = false;
        if (specs.color) {
            const t = translateStr(specs.color);
            if (t !== specs.color) { specs.color = t; changed = true; }
        }
        if (specs.material) {
            const t = translateStr(specs.material);
            if (t !== specs.material) { specs.material = t; changed = true; }
        }
        
        if (changed) {
            await db.query("UPDATE products SET specs = $1 WHERE id = $2", [JSON.stringify(specs), p.id]);
            updatedCount++;
        }
    }
    console.log(`Updated ${updatedCount} products`);
    process.exit(0);
}
run().catch(console.error);
