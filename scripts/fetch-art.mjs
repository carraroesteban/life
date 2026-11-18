// Baja las ilustraciones de Higgsfield y las guarda como WebP livianas en src/art/.
// Se corre solo al construir la imagen de Docker. Si una ya existe, no la vuelve a bajar.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/art/manifest.json'), 'utf8'));
let ok = 0, skipped = 0, failed = 0;
for (const [group, items] of Object.entries(manifest)) {
  for (const [id, url] of Object.entries(items)) {
    const out = path.join(root, 'src/art', group, `${id}.webp`);
    if (fs.existsSync(out)) { skipped++; continue; }
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await sharp(buf).resize({ width: group === 'ex' ? 960 : 1100, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
      ok++;
    } catch (e) {
      failed++;
      console.warn(`No se pudo bajar ${group}/${id}: ${e.message}`);
    }
  }
}
console.log(`Ilustraciones: ${ok} nuevas, ${skipped} ya estaban, ${failed} con error.`);
