// Перетворює оригінали з Arts/ на легкі webp для сайту.
// Прозорі шари обрізаються по контуру малюнка, а їхня позиція на полотні 1206x2622
// записується в src/art/manifest.json (щоб розставити шари відсотками).
import sharp from 'sharp';
import { globSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import subsetFont from 'subset-font';
import { dirname, extname } from 'node:path';


/**
 * Прибирає біле тло навколо карти (JPG не має прозорості). Тло шукаємо заливкою від країв, але тільки
 * ззовні чорного контуру: щоб не «витекти» крізь дрібні шпарини, контур тимчасово потовщуємо.
 * Біле всередині контуру (краї сторінок колоди) лишається.
 */
function dilate(mask, w, h, r) {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let last = -1e9;
    for (let x = 0; x < w; x++) { if (mask[y * w + x]) last = x; if (x - last <= r) tmp[y * w + x] = 1; }
    last = 1e9;
    for (let x = w - 1; x >= 0; x--) { if (mask[y * w + x]) last = x; if (last - x <= r) tmp[y * w + x] = 1; }
  }
  for (let x = 0; x < w; x++) {
    let last = -1e9;
    for (let y = 0; y < h; y++) { if (tmp[y * w + x]) last = y; if (y - last <= r) out[y * w + x] = 1; }
    last = 1e9;
    for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) last = y; if (last - y <= r) out[y * w + x] = 1; }
  }
  return out;
}

async function removeWhiteBackground(input) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const dark = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) dark[i] = Math.min(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]) < 205 ? 1 : 0;

  const wall = dilate(dark, w, h, 4);
  const outside = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => { const i = y * w + x; if (!wall[i] && !outside[i]) { outside[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w, y = (i - x) / w;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  // Заливка зупинилась за 4 px до контуру: добираємо цю смугу, але лише там, де світле (не лінія).
  const reach = dilate(outside, w, h, 5);
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2];
    rgba[i * 4 + 3] = reach[i] && !dark[i] ? 0 : 255;
  }
  // Трохи згладжуємо край прозорості, щоб не було драбинки.
  const alpha = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).extractChannel(3).blur(0.8).toBuffer();
  const out = Buffer.from(rgba);
  for (let i = 0; i < w * h; i++) out[i * 4 + 3] = alpha[i];
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

const CANVAS = { w: 1206, h: 2622 };
const files = globSync('Arts/**/*.{PNG,jpg}').filter((f) => !f.endsWith('sample.PNG')).sort();
const manifest = { canvas: CANVAS, art: {} };

// Символи й плями для кави названі кирилицею. У коді й на сервері вони під латинськими іменами.
const COFFEE_SLUGS = {
  гора: 'mountain', дерево: 'tree', дім: 'house', змія: 'snake', зірка: 'star', каблучка: 'ring', ключ: 'key',
  комета: 'comet', конюшина: 'clover', корабель: 'ship', корона: 'crown', коса: 'scythe', крапка: 'dot',
  лист: 'letter', молнія: 'lightning', місяць: 'moon', ножиці: 'scissors', око: 'eye', орел: 'eagle',
  риба: 'fish', серце: 'heart', сонце: 'sun', хмара: 'cloud', якір: 'anchor',
  пляма1: 'spot1', пляма2: 'spot2', пляма3: 'spot3', пляма4: 'spot4', пляма5: 'spot5',
};
const slugKey = (key) => {
  const m = key.normalize('NFC').match(/^coffee\/(.+)$/);
  return m && COFFEE_SLUGS[m[1]] ? `coffee/${COFFEE_SLUGS[m[1]]}` : key;
};

for (const f of files) {
  const rel = f.replace(/^Arts\//, '');
  const key = slugKey(rel.replace(/\.[^.]+$/, '').toLowerCase());
  const isCard = rel.startsWith('Tarot/') && !rel.includes('button');
  const out = `public/art/${key}.webp`;
  mkdirSync(dirname(out), { recursive: true });

  if (isCard) {
    // Усі карти й колода мають спільне полотно: лице завжди на тому самому місці й одного розміру,
    // а корони й іскри, що виходять за рамку, не обрізаються.
    const box = { left: 56, top: 160, width: 1104, height: 1730 };
    // Старші аркани й колода — JPG з білим тлом; молодші аркани — PNG, вони вже прозорі.
    const cropped = await sharp(f).extract(box).png().toBuffer();
    const image = extname(f).toLowerCase() === '.jpg' ? await removeWhiteBackground(cropped) : sharp(cropped);
    const info = await image.resize({ width: 600 }).webp({ quality: 88, alphaQuality: 95 }).toFile(out);
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

// Кава в стаканчику окремим шаром (різниця між повним і порожнім стаканчиком), щоб «випити» її анімацією.
{
  const read = (f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const full = await read('Arts/Coffee/cup_with_coffee.PNG');
  const empty = await read('Arts/Coffee/cup_empthy1.PNG');
  const { width: w, height: h } = full.info;
  const changed = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const d = [0, 1, 2, 3].reduce((s, c) => s + Math.abs(full.data[i * 4 + c] - empty.data[i * 4 + c]), 0);
    if (d > 40) changed[i] = 1;
  }
  const mask = dilate(changed, w, h, 3);
  const rgba = Buffer.from(full.data);
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) { rgba[i * 4 + 3] = 0; continue; }
      if (rgba[i * 4 + 3] > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  const box = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  const out = 'public/art/coffee/liquid.webp';
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).extract(box).webp({ quality: 90, alphaQuality: 95 }).toFile(out);
  manifest.art['coffee/liquid'] = { src: '/art/coffee/liquid.webp', x: box.left, y: box.top, w: box.width, h: box.height };
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
