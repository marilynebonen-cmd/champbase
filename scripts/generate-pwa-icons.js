/**
 * Script to generate PWA icons from a source image
 * 
 * Usage:
 * 1. Place your logo/icon as 'icon-source.png' (1024x1024 or larger) in the public folder
 * 2. Run: node scripts/generate-pwa-icons.js
 * 
 * Requirements:
 * npm install --save-dev sharp
 * 
 * This will generate all required icon sizes for PWA installation
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourceIcon = path.join(__dirname, '..', 'public', 'icon-source.png');
const publicDir = path.join(__dirname, '..', 'public');

async function generateIcons() {
  if (!fs.existsSync(sourceIcon)) {
    console.error('❌ Error: icon-source.png not found in public folder');
    console.log('📝 Please add a 1024x1024 PNG image as public/icon-source.png');
    process.exit(1);
  }

  console.log('🎨 Generating PWA icons...\n');

  for (const size of sizes) {
    const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 10, g: 10, b: 10, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Error generating ${size}x${size} icon:`, error.message);
    }
  }

  // Generate apple-touch-icon (180x180 for iOS)
  const appleTouchIcon = path.join(publicDir, 'apple-touch-icon.png');
  try {
    await sharp(sourceIcon)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 10, g: 10, b: 10, alpha: 1 }
      })
      .png()
      .toFile(appleTouchIcon);
    
    console.log('✅ Generated apple-touch-icon.png (180x180)');
  } catch (error) {
    console.error('❌ Error generating apple-touch-icon:', error.message);
  }

  // Generate favicon
  const favicon = path.join(publicDir, 'favicon.ico');
  try {
    await sharp(sourceIcon)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon-32.png'));
    
    console.log('✅ Generated favicon-32.png');
    console.log('📝 Note: Convert favicon-32.png to favicon.ico using an online converter or ImageMagick');
  } catch (error) {
    console.error('❌ Error generating favicon:', error.message);
  }

  console.log('\n✨ Done! All icons generated successfully.');
  console.log('📱 Your PWA is now ready for installation on mobile devices.');
}

generateIcons().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
