// Іконка додатка: фрагмент ларька з вивіскою, збирається з шарів Arts/.
import sharp from 'sharp';

const layers = [
  'background.PNG',
  'laryok.PNG',
  'Characters/babka/babka_neutral.PNG',
  'Tarot/tarot_button.PNG',
  'magic_ball/magic_ball_button.PNG',
  'Coffee/coffee_button.PNG',
  'I-Tsin/i_tsin_batton.PNG',
  'newspaper/newspaper_button.PNG',
];

const scene = await sharp('Arts/background.PNG')
  .composite(layers.slice(1).map((f) => ({ input: `Arts/${f}` })))
  .png()
  .toBuffer();

const square = await sharp(scene).extract({ left: 3, top: 640, width: 1200, height: 1200 }).toBuffer();
for (const [name, size] of [['icon-512', 512], ['icon-192', 192], ['apple-touch-icon', 180]]) {
  await sharp(square).resize(size, size).png().toFile(`public/${name}.png`);
}
console.log('Іконки готові');
