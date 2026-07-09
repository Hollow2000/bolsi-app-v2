const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const INPUT_SVG = path.join(__dirname, '..', 'public', 'img', 'Bolsi con fondo.svg');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

const SIZES = [48, 72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZE = 512;
const MASKABLE_PADDING = 0.2; // 20% safe zone

async function generate() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Generating PWA icons from:', INPUT_SVG);

  // Generate standard icons
  for (const size of SIZES) {
    const output = path.join(OUTPUT_DIR, `icon-${size}.png`);
    await sharp(INPUT_SVG)
      .resize(size, size, { fit: 'contain', background: '#26384E' })
      .png()
      .toFile(output);
    console.log(`  Created: icon-${size}.png`);
  }

  // Generate maskable icon with safe zone padding
  const paddedSize = Math.round(MASKABLE_SIZE * (1 - MASKABLE_PADDING * 2));
  const offset = Math.round(MASKABLE_SIZE * MASKABLE_PADDING);
  const maskableOutput = path.join(OUTPUT_DIR, 'icon-512-maskable.png');

  await sharp(INPUT_SVG)
    .resize(paddedSize, paddedSize, { fit: 'contain', background: '#26384E' })
    .extend({
      top: offset,
      bottom: offset,
      left: offset,
      right: offset,
      background: '#26384E',
    })
    .png()
    .toFile(maskableOutput);
  console.log('  Created: icon-512-maskable.png');

  console.log('Done! Generated', SIZES.length + 1, 'icons.');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
