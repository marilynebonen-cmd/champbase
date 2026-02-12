# PWA Setup Guide

Your Next.js app has been converted to a Progressive Web App (PWA)!

## ✅ What's Been Configured

### 1. **next-pwa Package**
- Installed and configured in `next.config.ts`
- Service worker auto-generated on build
- Caching strategies for Firebase, images, and pages

### 2. **Manifest File**
- Created: `public/manifest.json`
- App name: "Champ - Leaderboards & Events"
- Theme color: #facc15 (yellow accent)
- Background: #0a0a0a (dark)

### 3. **Meta Tags**
- Added to `app/layout.tsx`
- iOS support (apple-mobile-web-app)
- Android support (mobile-web-app)
- Proper viewport settings

### 4. **Offline Support**
- Offline fallback page: `public/offline.html`
- Network-first strategy for pages
- Cache-first for static assets

## 🎨 Generate App Icons

### Option 1: Use the Icon Generator Script

1. Install sharp:
   ```bash
   npm install --save-dev sharp
   ```

2. Add your logo (1024x1024 PNG) as `public/icon-source.png`

3. Run the generator:
   ```bash
   node scripts/generate-pwa-icons.js
   ```

This will create all required icon sizes.

### Option 2: Manual Icon Creation

Create PNG icons in `public/` with these sizes:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png (minimum for Android)
- icon-384x384.png
- icon-512x512.png (required for Android)
- apple-touch-icon.png (180x180 for iOS)

### Icon Design Tips:
- Use a square logo with padding (safe zone)
- Dark background (#0a0a0a) for dark mode
- Yellow accent (#facc15) matches app theme
- Keep it simple and recognizable

## 📱 Testing Installation

### On Android (Chrome/Edge)
1. Open your app in Chrome
2. Look for "Install app" banner or
3. Menu → "Add to Home screen"

### On iOS (Safari)
1. Open your app in Safari
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"

### Desktop (Chrome/Edge)
1. Look for install icon in address bar
2. Or menu → "Install Champ"

## 🔍 Verify PWA Setup

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Check generated files:**
   - `public/sw.js` (service worker)
   - `public/workbox-*.js` (caching)

3. **Test locally:**
   ```bash
   npm start
   ```
   Open DevTools → Application → Manifest
   Check Service Workers tab

4. **Lighthouse audit:**
   - Open DevTools → Lighthouse
   - Run "Progressive Web App" audit
   - Should score 100% (after adding icons)

## 🚀 Firebase Integration

Firebase works seamlessly with PWA:
- ✅ Auth state persists offline
- ✅ Firestore queries cached automatically
- ✅ Storage images cached (30 days)
- ✅ Real-time listeners reconnect when online

## 🌐 Deployment

### Vercel (Recommended)
```bash
vercel --prod
```

### Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

## 📋 PWA Checklist

- [x] next-pwa installed and configured
- [x] manifest.json created
- [x] Meta tags added
- [x] Offline page created
- [x] Caching strategies configured
- [ ] Generate app icons (run script)
- [ ] Test on Android device
- [ ] Test on iOS device
- [ ] Run Lighthouse audit
- [ ] Deploy to production

## 🎯 Cache Strategies

| Resource Type | Strategy | Cache Duration |
|--------------|----------|----------------|
| Google Fonts | CacheFirst | 1 year |
| Firebase Storage | CacheFirst | 30 days |
| Images (jpg/png) | CacheFirst | 24 hours |
| JS/CSS | StaleWhileRevalidate | 24 hours |
| Firebase Data | NetworkFirst | 5 minutes |
| Pages | NetworkFirst | 24 hours |

## 🐛 Troubleshooting

### Service Worker Not Registering
- Clear browser cache
- Check DevTools → Console for errors
- Ensure HTTPS (or localhost)

### Icons Not Showing
- Icons must be PNG format
- Check file names match manifest.json
- Clear cache and reload

### App Not Installable
- HTTPS required (except localhost)
- manifest.json must be valid
- At least 192x192 and 512x512 icons required
- Service worker must be active

## 📚 Resources

- [next-pwa docs](https://github.com/shadowwalker/next-pwa)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Manifest Generator](https://www.simicart.com/manifest-generator.html/)
- [Icon Generator](https://realfavicongenerator.net/)

---

**Your app is now a Progressive Web App!** 🎉

Users can install it on their home screen and use it like a native app.
