// Перетворює оригінали з Arts/ на легкі webp для сайту.
// Прозорі шари обрізаються по контуру малюнка, а їхня позиція на полотні 1206x2622
// записується в src/art/manifest.json (щоб розставити шари відсотками).
import sharp from 'sharp';
import { globSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import subsetFont from 'subset-font';
import { dirname, extname } from 'node:path';

const CANVAS = { w: 1206, h: 2622 };
const files = globSync('Arts/**/*.{PNG,jpg}').filter((f) => !f.endsWith('sample.PNG')).sort();
const manifest = { canvas: CANVAS, art: {} };

for (const f of files) {
  const rel = f.replace(/^Arts\//, '');
  const key = rel.replace(/\.[^.]+$/, '').toLowerCase();
  const isCard = rel.startsWith('Tarot/') && extname(f) === '.jpg';
  const out = `public/art/${key}.webp`;
  mkdirSync(dirname(out), { recursive: true });

  if (isCard) {
    // На оригіналах навколо карти білі поля; рамка однакова для всіх арканів, колода має власну (з товщиною).
    const box = key.endsWith('tarot_deck')
      ? { left: 56, top: 164, width: 1042, height: 1712 }
      : { left: 122, top: 166, width: 973, height: 1669 };
    const info = await sharp(f).extract(box).resize({ width: 600 }).webp({ quality: 86 }).toFile(out);
    manifest.art[key] = { src: `/art/${key}.webp`, w: info.width, h: info.height };
    continue;
  }

  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  const box = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  await sharp(f).extract(box).webp({ quality: 90, alphaQuality: 95 }).toFile(out);
  manifest.art[key] = { src: `/art/${key}.webp`, x: box.left, y: box.top, w: box.width, h: box.height };
}

mkdirSync('src/art', { recursive: true });
writeFileSync('src/art/manifest.json', JSON.stringify(manifest, null, 1));

// Шрифти: лишаємо тільки латиницю, кирилицю й знаки пунктуації (Gothic A1 має ще тисячі корейських гліфів).
const chars = [
  ...Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => 0x20 + i),
  ...Array.from({ length: 0x4ff - 0x400 + 1 }, (_, i) => 0x400 + i),
  ...Array.from({ length: 0x206f - 0x2010 + 1 }, (_, i) => 0x2010 + i),
  0xa0, 0xab, 0xbb, 0x2116, 0x2605, 0x2606,
].map((c) => String.fromCodePoint(c)).join('');
mkdirSync('public/fonts', { recursive: true });
const fonts = {
  'Gothic_A1/GothicA1-Regular.ttf': 'GothicA1-Regular.woff2',
  'Gothic_A1/GothicA1-Bold.ttf': 'GothicA1-Bold.woff2',
  'Sofia_Sans_Extra_Condensed/SofiaSansExtraCondensed-VariableFont_wght.ttf': 'SofiaSansExtraCondensed.woff2',
};
for (const [from, to] of Object.entries(fonts)) {
  const out = await subsetFont(readFileSync(`Fonts/${from}`), chars, { targetFormat: 'woff2' });
  writeFileSync(`public/fonts/${to}`, out);
}
console.log(`Готово: ${files.length} зображень`);
