import db from '../server/db.js'

const updates = [
  { id: 210, url: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-sofas_2.jpg' },
  { id: 212, url: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-chandeliers-1_3.jpg' },
  { id: 211, url: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-tables-1_1.jpg' },
  { id: 207, url: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-cabinets-1_1.jpg' },
  { id: 204, url: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-accessories-1_3.jpg' },
  { id: 209, url: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-outdoor-homepage-carpets_6.jpg' },
  { id: 203, url: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-category-lighting-week-16-1_2.jpg' },
  { id: 205, url: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-outdoofr_3.jpg' }
]

async function run() {
  try {
    for (const u of updates) {
      await db.query('UPDATE categories SET image_url = $1 WHERE id = $2', [u.url, u.id])
    }
    console.log('Homepage category images updated successfully!')
  } catch (err) {
    console.error('Error updating images:', err)
  } finally {
    process.exit(0)
  }
}

run()
