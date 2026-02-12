# PWA Icons Guide

## Quick Start

Your PWA needs icons in these sizes. You have 2 options:

### Option 1: Use the Generator Script (Recommended)

1. Install sharp:
   ```bash
   npm install --save-dev sharp
   ```

2. Create a 1024x1024 PNG logo and save as `public/icon-source.png`

3. Run:
   ```bash
   node scripts/generate-pwa-icons.js
   ```

### Option 2: Use Online Tool

1. Go to https://realfavicongenerator.net/
2. Upload your logo
3. Download the package
4. Copy these files to `public/`:
   - icon-72x72.png
   - icon-96x96.png
   - icon-128x128.png
   - icon-144x144.png
   - icon-152x152.png
   - icon-192x192.png ⭐ (minimum for Android)
   - icon-384x384.png
   - icon-512x512.png ⭐ (required for Android)
   - apple-touch-icon.png (180x180)
   - favicon.ico

## Create Simple Icon Manually

If you want a quick placeholder, create a simple SVG and convert to PNG:

```html
<!-- Save as icon.svg -->
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0a0a0a"/>
  <text x="256" y="320" font-size="280" font-weight="bold" 
        text-anchor="middle" fill="#facc15" font-family="Arial">C</text>
</svg>
```

Then use an online converter or ImageMagick:
```bash
convert icon.svg -resize 72x72 icon-72x72.png
convert icon.svg -resize 96x96 icon-96x96.png
convert icon.svg -resize 128x128 icon-128x128.png
convert icon.svg -resize 144x144 icon-144x144.png
convert icon.svg -resize 152x152 icon-152x152.png
convert icon.svg -resize 192x192 icon-192x192.png
convert icon.svg -resize 384x384 icon-384x384.png
convert icon.svg -resize 512x512 icon-512x512.png
convert icon.svg -resize 180x180 apple-touch-icon.png
```

## Icon Design Tips

- **Size:** Start with 1024x1024 or larger
- **Format:** PNG with transparency
- **Safe zone:** Keep important elements within 80% of center
- **Colors:** Use app's accent color (#facc15 yellow)
- **Background:** Dark (#0a0a0a) or transparent
- **Simple:** Icons look best when simple and recognizable
- **Padding:** Add 10-15% padding around the main symbol

## Test Your Icons

After adding icons:

1. Rebuild: `npm run build`
2. Start: `npm start`
3. Open DevTools → Application → Manifest
4. Check all icons load correctly
5. Test installation on mobile device

## Why These Sizes?

- **72-152px:** Android home screen, various densities
- **192px:** Android minimum requirement
- **512px:** Android splash screen
- **180px:** iOS home screen (apple-touch-icon)
- **144px:** Windows tile

Without these icons, your PWA won't be installable on mobile devices.
