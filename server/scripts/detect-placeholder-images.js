import crypto from "node:crypto";
import { initDb, closePool } from "../db.js";

async function run() {
  await initDb();

  const urls = [
    'https://cdn.eichholtz.com/media/catalog/product/1/1/116223_0_1.jpg',
    'https://cdn.eichholtz.com/media/catalog/product/1/1/116223_1_1.jpg',
    'https://cdn.eichholtz.com/media/catalog/product/1/1/116223_2_1.jpg',
    'https://cdn.eichholtz.com/media/catalog/product/1/1/116223_3_1.jpg',
    'https://cdn.eichholtz.com/media/catalog/product/1/1/116223_4_1.jpg',
    'https://cdn.eichholtz.com/media/catalog/product/1/1/116223_5_1.jpg',
    'https://cdn.eichholtz.com/media/catalog/product/1/1/116223_6_1.jpg',
    'https://cdn.eichholtz.com/media/catalog/product/1/1/116223_7_1.jpg',
    'https://cdn.eichholtz.com/media/catalog/product/1/1/116223_8_1.jpg'
  ];

  console.log("Checking image sizes and hashes...");
  for (const url of urls) {
    try {
      const res = await fetch(url);
      const buffer = Buffer.from(await res.arrayBuffer());
      const md5 = crypto.createHash('md5').update(buffer).digest('hex');
      console.log(`URL: ${url.split('/').pop()} | Size: ${buffer.length} bytes | MD5: ${md5}`);
    } catch (e) {
      console.error(e.message);
    }
  }

  await closePool();
}

run().catch(console.error);
