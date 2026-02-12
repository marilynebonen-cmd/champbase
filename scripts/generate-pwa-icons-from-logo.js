/**
 * Generate PWA Icons from ChampBase Logo SVG
 * 
 * This script creates all required PWA icons from the app's logo
 */

const fs = require('fs');
const path = require('path');

// SVG content from the Logo component (32x32 viewBox, scaled to 512x512 canvas)
// Enhanced with proper centering and padding for mobile app icon
const logoSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Solid dark background (no transparency for iOS compatibility) -->
  <rect width="512" height="512" fill="#0a0a0a" rx="0"/>
  
  <!-- Logo centered with padding: scale 14 instead of 16 for 12.5% padding on each side -->
  <!-- Original viewBox: 32x32, Target: ~87.5% of 512 = 448px, Scale: 448/32 = 14 -->
  <!-- Offset: (512-448)/2 = 32px padding on each side -->
  <g transform="translate(32, 64) scale(14)">
    <!-- Podium: 2nd (left), 1st (center), 3rd (right) -->
    <path d="M2 20h8v10H2V20z" fill="#fafafa" opacity="0.5"/>
    <path d="M12 14h8v16h-8V14z" fill="#facc15"/>
    <path d="M22 18h8v12h-8V18z" fill="#fafafa" opacity="0.5"/>
    
    <!-- 3 happy faces (heads) -->
    <circle cx="6" cy="16" r="2.5" fill="#fafafa"/>
    <path d="M5.2 17.8a1 1 0 001.6 0" stroke="#0a0a0a" stroke-width="0.6" fill="none" stroke-linecap="round"/>
    <path d="M4 15.2l-1 .8M8 15.2l1 .8" stroke="#0a0a0a" stroke-width="0.8" stroke-linecap="round"/>
    
    <circle cx="16" cy="10" r="2.8" fill="#fafafa"/>
    <path d="M14.8 11.9a1.2 1.2 0 002.4 0" stroke="#0a0a0a" stroke-width="0.6" fill="none" stroke-linecap="round"/>
    <path d="M13.2 9.5l-1.2 .8M18.8 9.5l1.2 .8" stroke="#0a0a0a" stroke-width="0.8" stroke-linecap="round"/>
    
    <circle cx="26" cy="15" r="2.5" fill="#fafafa"/>
    <path d="M25.2 16.8a1 1 0 001.6 0" stroke="#0a0a0a" stroke-width="0.6" fill="none" stroke-linecap="round"/>
    <path d="M24 14.2l-1 .8M28 14.2l1 .8" stroke="#0a0a0a" stroke-width="0.8" stroke-linecap="round"/>
  </g>
  
  <!-- Optional: Add subtle border for better visibility on light backgrounds -->
  <rect width="512" height="512" fill="none" stroke="#1a1a1a" stroke-width="2" rx="0"/>
</svg>`;

// Try to use sharp if available, otherwise provide instructions
async function generateIcons() {
  console.log('🎨 Generating PWA Icons from ChampBase Logo...\n');

  const publicDir = path.join(__dirname, '..', 'public');
  
  // Sizes needed for PWA
  const sizes = [
    { size: 72, name: 'icon-72x72.png' },
    { size: 96, name: 'icon-96x96.png' },
    { size: 128, name: 'icon-128x128.png' },
    { size: 144, name: 'icon-144x144.png' },
    { size: 152, name: 'icon-152x152.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 192, name: 'icon-192x192.png' },
    { size: 384, name: 'icon-384x384.png' },
    { size: 512, name: 'icon-512x512.png' },
  ];

  // Save source SVG
  const svgPath = path.join(publicDir, 'logo-source.svg');
  fs.writeFileSync(svgPath, logoSVG);
  console.log('✅ Created logo-source.svg');

  // Try to use sharp
  try {
    const sharp = require('sharp');
    
    for (const { size, name } of sizes) {
      const outputPath = path.join(publicDir, name);
      
      await sharp(Buffer.from(logoSVG))
        .resize(size, size, {
          fit: 'contain',
          background: { r: 10, g: 10, b: 10, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${name} (${size}x${size})`);
    }

    // Generate favicon (32x32)
    const faviconPath = path.join(publicDir, 'favicon-32.png');
    await sharp(Buffer.from(logoSVG))
      .resize(32, 32)
      .png()
      .toFile(faviconPath);
    
    console.log('✅ Generated favicon-32.png');
    console.log('\n📝 Note: Convert favicon-32.png to favicon.ico using:');
    console.log('   - Online: https://convertio.co/png-ico/');
    console.log('   - Or ImageMagick: convert favicon-32.png favicon.ico\n');
    
    console.log('✨ All PWA icons generated successfully!');
    console.log('📱 Your app is now ready for installation on mobile devices.');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('⚠️  Sharp module not found. Installing sharp...\n');
      console.log('Please run:');
      console.log('  npm install --save-dev sharp');
      console.log('  node scripts/generate-pwa-icons-from-logo.js\n');
      
      // Create HTML fallback
      createHTMLGenerator(publicDir, logoSVG, sizes);
    } else {
      throw error;
    }
  }
}

function createHTMLGenerator(publicDir, svg, sizes) {
  const htmlPath = path.join(publicDir, 'generate-icons.html');
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Generate Champ PWA Icons</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 900px;
      margin: 50px auto;
      padding: 20px;
      background: #0a0a0a;
      color: #fafafa;
    }
    h1 { color: #facc15; margin-bottom: 10px; }
    .subtitle { color: #a1a1a1; margin-bottom: 30px; }
    button {
      background: #facc15;
      color: #0a0a0a;
      border: none;
      padding: 14px 28px;
      font-size: 16px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      margin: 10px 0;
    }
    button:hover { opacity: 0.9; }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .preview {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 15px;
      margin: 30px 0;
      padding: 20px;
      background: #1a1a1a;
      border-radius: 12px;
    }
    .preview-item {
      text-align: center;
    }
    .preview img {
      width: 100%;
      max-width: 80px;
      border: 2px solid #333;
      border-radius: 8px;
      background: #0a0a0a;
    }
    .preview-label {
      font-size: 11px;
      color: #888;
      margin-top: 8px;
    }
    .status {
      margin: 20px 0;
      padding: 15px;
      background: #1a1a1a;
      border-radius: 8px;
      border-left: 4px solid #facc15;
    }
    .progress {
      margin: 10px 0;
      color: #facc15;
    }
    .instructions {
      background: #1a1a1a;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
    }
    .instructions h3 {
      color: #facc15;
      margin-top: 0;
    }
    .instructions ol {
      line-height: 1.8;
    }
    code {
      background: #000;
      padding: 2px 6px;
      border-radius: 4px;
      color: #facc15;
      font-family: 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <h1>🎨 Generate Champ PWA Icons</h1>
  <p class="subtitle">Create all required icon sizes for Progressive Web App installation</p>
  
  <button id="generateBtn" onclick="generateAllIcons()">
    Generate & Download All Icons (9 files)
  </button>
  
  <div id="status" class="status" style="display:none;"></div>
  <div id="preview" class="preview"></div>

  <div class="instructions">
    <h3>📋 After Generating Icons:</h3>
    <ol>
      <li>Click the button above to generate and download all icons</li>
      <li>Move all downloaded PNG files to your <code>champbase/public/</code> folder</li>
      <li>Convert <code>favicon-32.png</code> to <code>favicon.ico</code>:
        <ul style="margin-top: 8px;">
          <li>Online: <a href="https://convertio.co/png-ico/" target="_blank" style="color: #facc15;">convertio.co/png-ico</a></li>
          <li>Or use ImageMagick: <code>convert favicon-32.png favicon.ico</code></li>
        </ul>
      </li>
      <li>Rebuild your app: <code>npm run build</code></li>
      <li>Test installation on mobile devices</li>
    </ol>
    
    <h3 style="margin-top: 30px;">✅ Icons You'll Get:</h3>
    <ul>
      <li>icon-72x72.png</li>
      <li>icon-96x96.png</li>
      <li>icon-128x128.png</li>
      <li>icon-144x144.png</li>
      <li>icon-152x152.png</li>
      <li>icon-192x192.png ⭐ (Required for Android)</li>
      <li>icon-384x384.png</li>
      <li>icon-512x512.png ⭐ (Required for Android)</li>
      <li>apple-touch-icon.png (180x180 for iOS)</li>
    </ul>
  </div>

  <script>
    const svgContent = \`${svg.replace(/`/g, '\\`')}\`;
    
    const sizes = ${JSON.stringify(sizes)};

    async function generateAllIcons() {
      const btn = document.getElementById('generateBtn');
      const statusDiv = document.getElementById('status');
      const previewDiv = document.getElementById('preview');
      
      btn.disabled = true;
      statusDiv.style.display = 'block';
      statusDiv.innerHTML = '<div class="progress">Generating icons...</div>';
      previewDiv.innerHTML = '';

      try {
        for (const { size, name } of sizes) {
          const canvas = await svgToCanvas(svgContent, size);
          
          // Add to preview
          const previewItem = document.createElement('div');
          previewItem.className = 'preview-item';
          previewItem.innerHTML = \`
            <img src="\${canvas.toDataURL()}" alt="\${name}">
            <div class="preview-label">\${name}<br>\${size}x\${size}</div>
          \`;
          previewDiv.appendChild(previewItem);
          
          // Download
          await downloadCanvas(canvas, name);
          await sleep(300);
        }
        
        // Generate favicon
        const faviconCanvas = await svgToCanvas(svgContent, 32);
        await downloadCanvas(faviconCanvas, 'favicon-32.png');

        statusDiv.innerHTML = \`
          <div style="color: #4ade80;">✅ Generated \${sizes.length + 1} icons!</div>
          <div style="margin-top: 10px;">
            📥 Check your Downloads folder<br>
            📁 Move all PNG files to <code>champbase/public/</code><br>
            🔄 Convert favicon-32.png to favicon.ico<br>
            🚀 Rebuild your app: <code>npm run build</code>
          </div>
        \`;
        
        btn.textContent = '✅ Icons Generated - Click to Regenerate';
        btn.disabled = false;
        
      } catch (error) {
        statusDiv.innerHTML = \`<div style="color: #ef4444;">❌ Error: \${error.message}</div>\`;
        btn.disabled = false;
      }
    }

    function svgToCanvas(svgString, size) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          
          // Dark background
          ctx.fillStyle = '#0a0a0a';
          ctx.fillRect(0, 0, size, size);
          
          // Draw SVG
          ctx.drawImage(img, 0, 0, size, size);
          
          URL.revokeObjectURL(url);
          resolve(canvas);
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load SVG'));
        };
        
        img.src = url;
      });
    }

    function downloadCanvas(canvas, filename) {
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        });
      });
    }

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html);
  console.log('\n✅ Created generate-icons.html');
  console.log('\n📝 To generate icons:');
  console.log('   1. Open public/generate-icons.html in your browser');
  console.log('   2. Click "Generate & Download All Icons"');
  console.log('   3. Move downloaded files to public/\n');
}

// Run the generator
generateIcons().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
