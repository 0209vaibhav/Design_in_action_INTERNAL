const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [
  { size: 512, name: 'icon-512x512.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 180, name: 'icon-180x180.png' },
  { size: 167, name: 'icon-167x167.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' }
];

const inputSvg = path.join(__dirname, '../data/logo/Logo.svg');
const outputDir = path.join(__dirname, '../data/logo');

// Add padding to make the logo square and centered
async function generateIcons() {
  const svgBuffer = fs.readFileSync(inputSvg);
  
  for (const { size, name } of sizes) {
    await sharp(svgBuffer)
      .resize(Math.floor(size * 0.8), Math.floor(size * 0.8), {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .extend({
        top: Math.floor(size * 0.1),
        bottom: Math.floor(size * 0.1),
        left: Math.floor(size * 0.1),
        right: Math.floor(size * 0.1),
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(outputDir, name));
  }
}

generateIcons().catch(console.error); 