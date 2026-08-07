import { query } from '../server/db.js';

async function run() {
  try {
    // Move Corey Damen Jenkins to NEW season (season_id = 9)
    // And set its image
    await query(`
      UPDATE collections 
      SET season_id = 9, image_url = '/images/designers/feature-1.webp' 
      WHERE name = 'Corey Damen Jenkins'
    `);
    
    // Set image for The Met x Eichholtz
    await query(`
      UPDATE collections 
      SET image_url = '/images/catalogues/the-met.webp' 
      WHERE name = 'The Met x Eichholtz'
    `);
    
    // Set image for New Collection - January 2026
    await query(`
      UPDATE collections 
      SET image_url = '/images/hero/hero-1.jpg' 
      WHERE name = 'New Collection - January 2026'
    `);
    
    // Insert New Arrivals into NEW season (season_id = 9)
    await query(`
      INSERT INTO collections (name, season_id, published, image_url) 
      VALUES ('New Arrivals', 9, true, '/images/hero/hero-2.jpg')
    `);
    
    console.log('Update successful');
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

run();
