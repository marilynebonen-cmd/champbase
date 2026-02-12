# 🚀 PWA Deployment Checklist

Your Next.js app is now a Progressive Web App! Follow these steps to complete the setup:

## ✅ Pre-Deployment Checklist

### 1. Generate App Icons (REQUIRED)

**Quick Method - Use Browser Tool:**
1. Open `scripts/create-simple-icons.html` in your browser
2. Click "Generate & Download All Icons"
3. Move all downloaded PNG files to `public/` folder

**Professional Method - Use Your Logo:**
```bash
npm install --save-dev sharp
# Add your 1024x1024 logo as public/icon-source.png
npm run generate:icons
```

### 2. Verify Service Worker

The service worker is generated automatically during build. Check:
```bash
npm run build
```

After build, verify `public/sw.js` exists (it's in .gitignore).

### 3. Test Locally

```bash
npm start
# Open http://localhost:3000
```

**Check in DevTools:**
- Application → Manifest (should show all icons)
- Application → Service Workers (should be activated)
- Lighthouse → PWA audit (should pass)

## 📱 Test Installation

### Android (Chrome)
1. Open your deployed app
2. Look for "Install app" banner
3. Or Menu → "Add to Home screen"

### iOS (Safari)
1. Open your deployed app in Safari
2. Tap Share button
3. "Add to Home Screen"
4. Tap "Add"

### Desktop
1. Look for ⊕ install icon in address bar
2. Click to install

## 🌐 Deploy to Production

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_FIREBASE_API_KEY
# - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
# - NEXT_PUBLIC_FIREBASE_PROJECT_ID
# - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
# - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
# - NEXT_PUBLIC_FIREBASE_APP_ID
```

### Option 2: Firebase Hosting

```bash
# Build first
npm run build

# Deploy
firebase deploy --only hosting

# Or deploy everything
firebase deploy
```

**Add to firebase.json:**
```json
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/sw.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          },
          {
            "key": "Service-Worker-Allowed",
            "value": "/"
          }
        ]
      },
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
```

## 🔍 Post-Deployment Verification

### 1. PWA Criteria Check

Visit your deployed app and verify:
- ✅ Served over HTTPS
- ✅ Service worker registered
- ✅ Manifest.json loads
- ✅ Icons load (all sizes)
- ✅ Installable (shows install prompt)
- ✅ Works offline (basic pages)

### 2. Run Lighthouse Audit

```bash
# In Chrome DevTools
DevTools → Lighthouse → Progressive Web App → Generate report
```

**Target scores:**
- PWA: 100%
- Performance: 90%+
- Accessibility: 95%+
- Best Practices: 100%
- SEO: 100%

### 3. Test on Real Devices

**iOS (Safari):**
- [ ] Install on iPhone
- [ ] Launch from home screen
- [ ] Check full-screen mode
- [ ] Test offline mode

**Android (Chrome):**
- [ ] Install on Android device
- [ ] Launch from home screen
- [ ] Check splash screen
- [ ] Test offline mode

**Desktop (Chrome/Edge):**
- [ ] Install on desktop
- [ ] Launch as standalone app
- [ ] Test window controls

## 🐛 Troubleshooting

### Icons Not Showing
**Problem:** Manifest shows broken image icons  
**Solution:** 
1. Generate all required icon sizes
2. Ensure files are named exactly: `icon-192x192.png`, etc.
3. Rebuild: `npm run build`

### Not Installable on Mobile
**Problem:** No install prompt appears  
**Solution:**
1. Must be served over HTTPS (not http://)
2. Requires 192x192 and 512x512 icons minimum
3. Service worker must be active
4. Clear browser cache and reload

### Service Worker Not Registering
**Problem:** SW not found in DevTools  
**Solution:**
1. Check `public/sw.js` exists after build
2. Ensure HTTPS (or localhost)
3. Check console for errors
4. Clear cache: DevTools → Application → Clear storage

### Firebase Not Working Offline
**Problem:** Firebase queries fail offline  
**Solution:**
- Firebase has built-in offline support
- Enable persistence if needed
- Network-first caching already configured
- Real-time listeners auto-reconnect

### iOS Installation Issues
**Problem:** Can't find "Add to Home Screen"  
**Solution:**
1. MUST use Safari (not Chrome or other browsers)
2. Look in Share menu, scroll down
3. Ensure manifest has correct icons

## 📊 Monitor PWA Performance

### Analytics to Track
- Install rate (impressions vs installs)
- Retention (return visits)
- Offline usage
- Cache hit rates

### Firebase Analytics Events (optional)
```typescript
// Track PWA install
logEvent(analytics, 'pwa_installed');

// Track offline usage
if (!navigator.onLine) {
  logEvent(analytics, 'offline_usage');
}
```

## 🔄 Updating Your PWA

When you deploy updates:

1. **Service Worker Updates Automatically**
   - next-pwa handles versioning
   - Users get updates on next visit
   - skipWaiting: true = immediate updates

2. **Force Update (if needed)**
   ```typescript
   // In your app
   if ('serviceWorker' in navigator) {
     navigator.serviceWorker.getRegistrations().then(registrations => {
       registrations.forEach(reg => reg.update());
     });
   }
   ```

3. **Cache Invalidation**
   - Clear cache by changing cache names
   - Or clear all: DevTools → Application → Clear storage

## 📚 Resources

- [PWA Builder](https://www.pwabuilder.com/) - Test and improve your PWA
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Audit tool
- [Web.dev PWA](https://web.dev/progressive-web-apps/) - Best practices
- [Can I Use](https://caniuse.com/?search=pwa) - Browser support
- [next-pwa Docs](https://github.com/shadowwalker/next-pwa) - Configuration

## 🎯 Success Metrics

After deployment, your PWA should have:
- ✅ Lighthouse PWA score: 100%
- ✅ Installable on iOS Safari
- ✅ Installable on Android Chrome
- ✅ Installable on Desktop Chrome/Edge
- ✅ Works offline (basic navigation)
- ✅ Fast loading (cached assets)
- ✅ Firebase working seamlessly

---

**Next Steps:**
1. Generate icons (see instructions above)
2. Deploy to production
3. Test installation on mobile devices
4. Share install link: `yourapp.com/install-prompt`
