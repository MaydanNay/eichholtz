import db from './server/db.js';

const dict = {
    'Free form': 'Свободная форма', 'Square': 'Квадратная', 'Semi round': 'Полукруглая',
    'Round': 'Круглая', 'Rectangular': 'Прямоугольная', 'Oval': 'Овальная',
    'Hexagonal': 'Шестиугольная', 'Triangular': 'Треугольная', 'Octagonal': 'Восьмиугольная',
    
    'Brass (antiqued)': 'Состаренная латунь', 'Bronze': 'Бронза', 'Gunmetal': 'Оружейная сталь',
    'Brass (brushed)': 'Матовая латунь', 'Antique gold': 'Состаренное золото',
    'Copper (brushed)': 'Матовая медь', 'Steel (brushed)': 'Матовая сталь',
    'Charcoal': 'Угольный', 'Antique silver': 'Состаренное серебро',
    
    'Leather': 'Кожа', 'Faux leather': 'Искусственная кожа', 'Leather look': 'Экокожа',
    'Bouclé': 'Букле', 'Chenille': 'Шенилл', 'Jacquard': 'Жаккард',
    'Wool': 'Шерсть', 'Linen': 'Лён', 'Cotton': 'Хлопок', 'Velvet': 'Бархат'
};

const translateStr = (str) => {
    if (!str) return str;
    const parts = String(str).split(/[,|]/);
    return parts.map(p => {
        const trimmed = p.trim();
        return dict[trimmed] || trimmed;
    }).join(', ');
}

async function run() {
    // Update settings for finish
    const { rows: settingsRows } = await db.query("SELECT value FROM settings WHERE key = 'product_attributes'");
    if (settingsRows.length > 0) {
        const attrs = typeof settingsRows[0].value === 'string' ? JSON.parse(settingsRows[0].value) : settingsRows[0].value;
        if (attrs.finish && attrs.finish.options) {
            attrs.finish.options = attrs.finish.options.map(opt => {
                return { ...opt, value: translateStr(opt.value) };
            });
        }
        await db.query("UPDATE settings SET value = $1 WHERE key = 'product_attributes'", [JSON.stringify(attrs)]);
    }

    // Update products
    const { rows: products } = await db.query("SELECT id, specs FROM products");
    let updatedCount = 0;
    for (const p of products) {
        let specs = p.specs;
        if (typeof specs === 'string') { try { specs = JSON.parse(specs) } catch(e){} }
        if (!specs) continue;
        
        let changed = false;
        if (specs.shape) {
            const t = translateStr(specs.shape);
            if (t !== specs.shape) { specs.shape = t; changed = true; }
        }
        if (specs.finish) {
            const t = translateStr(specs.finish);
            if (t !== specs.finish) { specs.finish = t; changed = true; }
        }
        if (specs.fabric) {
            const t = translateStr(specs.fabric);
            if (t !== specs.fabric) { specs.fabric = t; changed = true; }
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
