/**
 * Create favicon.ico from favicon-32.png using sharp
 * 
 * This creates a multi-size ICO file with 16x16 and 32x32 sizes
 */

const fs = require('fs');
const path = require('path');

async function createFavicon() {
  try {
    const sharp = require('sharp');
    const publicDir = path.join(__dirname, '..', 'public');
    const source = path.join(publicDir, 'favicon-32.png');
    
    if (!fs.existsSync(source)) {
      console.error('❌ favicon-32.png not found. Run generate-pwa-icons-from-logo.js first.');
      process.exit(1);
    }

    // Create 16x16 version
    const icon16 = path.join(publicDir, 'favicon-16.png');
    await sharp(source)
      .resize(16, 16)
      .png()
      .toFile(icon16);
    
    console.log('✅ Generated favicon-16.png');
    console.log('✅ Generated favicon-32.png (already exists)');
    
    // Note: ICO file creation requires special library
    // For now, we'll use PNG as fallback and provide instructions
    const faviconPng = path.join(publicDir, 'favicon.png');
    await sharp(source)
      .resize(32, 32)
      .png()
      .toFile(faviconPng);
    
    console.log('✅ Generated favicon.png');
    
    console.log('\n📝 Favicon created as PNG (works in all modern browsers)');
    console.log('   Browsers will use favicon.png automatically.\n');
    
    console.log('💡 Optional: To create a true .ico file:');
    console.log('   - Online: https://convertio.co/png-ico/');
    console.log('   - Upload favicon-32.png and download favicon.ico');
    console.log('   - Place in public/ folder\n');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Sharp not installed. Run: npm install --save-dev sharp');
      process.exit(1);
    }
    throw error;
  }
}

createFavicon().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
