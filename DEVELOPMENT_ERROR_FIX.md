
# 🔧 DEVELOPMENT ENVIRONMENT ERRORS - FIX GUIDE

## 🚨 Errors Encountered

### Error 1: `RefreshRuntime.getRefreshReg is not a function`
**Location**: AuthContext.jsx:117 (or similar)
**Type**: React Fast Refresh (HMR) Error
**Severity**: 🔴 High (blocks development)

### Error 2: `Failed to execute 'put' on 'Cache': Request scheme 'chrome-extension' is unsupported`
**Location**: sw.js:70
**Type**: Service Worker Cache Error
**Severity**: 🟡 Medium (doesn't block but causes warnings)

### Error 3: `WebSocket connection to 'ws://localhost:5173/?token=oKTKFMYAXQxn' failed`
**Location**: Vite client
**Type**: HMR WebSocket Connection Error
**Severity**: 🔴 High (prevents auto-reload)

---

## 🎯 ROOT CAUSES

### 1. React Fast Refresh Issue
- **Cause**: React 19.1.1 + @vitejs/plugin-react interaction
- **Issue**: Plugin tries to inject refresh runtime but it's not available
- **Environment**: Development only
- **Fix**: Proper Vite configuration + plugin settings

### 2. Service Worker Cache Issue
- **Cause**: Browser cache or Chrome extension intercepting requests
- **Issue**: Service worker tries to cache chrome-extension:// URLs
- **Environment**: Development + browser cache
- **Fix**: Clear cache + disable extensions during dev

### 3. WebSocket Connection Issue
- **Cause**: Vite HMR not properly configured
- **Issue**: Browser can't connect to WebSocket for auto-reload
- **Environment**: Development with network configuration
- **Fix**: Explicit HMR configuration in Vite

---

## ✅ SOLUTIONS APPLIED

### 1. Updated Vite Configuration
**File**: `vite.config.js`

**Changes Made**:
```javascript
// ✅ React Fast Refresh settings
react({
  fastRefresh: true,
  babel: {
    parserOpts: {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
    },
  },
})

// ✅ HMR Configuration
server: {
  hmr: {
    host: 'localhost',
    port: 5173,
    protocol: 'ws',
  },
}
```

---

## 🔧 TROUBLESHOOTING STEPS

### Step 1: Clear Browser Cache & Restart Dev Server

**Option A: Complete Clean (Recommended)**
```bash
# 1. Stop dev server (Ctrl+C)
# 2. Delete node_modules and reinstall
rm -r node_modules
npm install

# 3. Clear browser cache
# Chrome DevTools → Application → Clear storage → Clear all

# 4. Restart dev server
npm run dev
```

**Option B: Quick Clean
```bash
# 1. Stop dev server (Ctrl+C)
# 2. Clear browser cache (Ctrl+Shift+Delete in Chrome)
# 3. Restart dev server
npm run dev
```

### Step 2: Disable Browser Extensions During Development

**Chrome**:
1. Open Chrome menu → Extensions
2. Disable all extensions (or specific ones like cache cleaners, ad blockers)
3. Reload the page

**Firefox**:
1. Type `about:addons` in address bar
2. Disable problematic extensions
3. Reload the page

### Step 3: Check Vite Dev Server Status

```bash
# 1. Verify dev server is running
# You should see:
#   VITE v7.x.x  ready in xxx ms
#   
#   ➜  Local:   http://localhost:5173/
#   ➜  press h + enter to show help

# 2. Check network connectivity
# Visit http://localhost:5173 in browser

# 3. Check WebSocket connection
# Open DevTools Console (F12)
# Should NOT see WebSocket error after full page load
```

### Step 4: Hard Refresh Browser

```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
Firefox: Ctrl + F5 (Win) or Cmd + Shift + R (Mac)
```

### Step 5: Check if Port 5173 is in Use

```bash
# Windows PowerShell
Get-NetTcpConnection -LocalPort 5173 -ErrorAction SilentlyContinue

# If port is in use, either:
# 1. Kill the process
# 2. Or run on different port
npm run dev -- --port 5174
```

---

## 📋 VERIFICATION CHECKLIST

After applying fixes, verify:

- [ ] Vite dev server starts without errors
- [ ] http://localhost:5173 loads in browser
- [ ] No "RefreshRuntime" errors in console
- [ ] No WebSocket errors in console
- [ ] No "chrome-extension" cache errors
- [ ] Hot reload works (edit a file, saves without full reload)
- [ ] Login page loads
- [ ] Can add a book without errors
- [ ] Admin panel accessible
- [ ] No console warnings related to Fast Refresh

---

## 🧪 MANUAL TESTING

### Test 1: Hot Module Replacement

```
1. Keep DevTools open (F12)
2. Edit src/App.jsx (just add/remove a space in JSX)
3. Save file (Ctrl+S)
4. Expected: Page updates WITHOUT full reload
5. Verify: No errors in console
```

### Test 2: React Fast Refresh

```
1. Edit src/pages/Login.jsx (change a button label)
2. Save file
3. Expected: Component re-renders, but state preserved
4. Verify: No errors about RefreshRuntime
```

### Test 3: WebSocket Connection

```
1. Open DevTools (F12)
2. Go to Network tab
3. Check for WS (WebSocket) connections
4. Should see: ws://localhost:5173 - 101 Switching Protocols
5. Not: WebSocket connection failed
```

### Test 4: Service Worker Cache

```
1. Open DevTools (F12)
2. Go to Application → Service Workers
3. Should see: No service worker or service worker for: localhost:5173
4. Go to Cache → Cache Storage
5. Should NOT see: chrome-extension URLs
```

---

## 🔍 DEBUGGING COMMANDS

### Check Vite Config
```bash
# Verify config is valid
npm run dev -- --force

# This forces a fresh start without cache
```

### Check React Version
```javascript
// Open console and run:
import React from 'react';
console.log('React version:', React.version);
```

### Monitor WebSocket
```javascript
// Paste in browser console to monitor WS connections:
(() => {
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, ...args) {
    console.log('WebSocket connecting to:', url);
    const ws = new originalWebSocket(url, ...args);
    ws.addEventListener('open', () => console.log('WS connected ✅'));
    ws.addEventListener('error', (e) => console.log('WS error ❌', e));
    ws.addEventListener('close', () => console.log('WS closed'));
    return ws;
  };
})();
```

### Clear Service Workers
```javascript
// Paste in browser console to clear all service workers:
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
  console.log('All service workers unregistered');
});
```

---

## 🚀 QUICK FIX SEQUENCE

**If you're stuck, try this in order:**

1. **Stop dev server** (Ctrl+C)
2. **Clear browser cache** (Ctrl+Shift+Delete in Chrome)
3. **Delete vite cache** (`rm -r node_modules/.vite`)
4. **Restart dev server** (`npm run dev`)
5. **Hard refresh browser** (Ctrl+Shift+R)
6. **Check console** (F12) for any remaining errors

**If still broken:**

7. **Disable browser extensions** (Chrome → Extensions)
8. **Clear all service workers** (use console command above)
9. **Restart dev server with force flag** (`npm run dev -- --force`)
10. **Fresh install** (rm -r node_modules && npm install && npm run dev)

---

## 💡 PREVENTION TIPS

### 1. Keep Dependencies Updated
```bash
npm update
npm outdated  # Check for outdated packages
```

### 2. Use .env Properly
Create `.env` file:
```
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_GOOGLE_CLIENT_ID=your_id_here
```

### 3. Avoid HMR in Production
These dev errors only happen during development.
No issues in production build.

### 4. Use Consistent Node Version
```bash
# Check node version
node --version

# Use nvm to manage versions
nvm use 18  # or your preferred version
```

### 5. Monitor Browser Extensions
Disable extensions during development:
- Cache cleaners
- Ad blockers
- Service worker interceptors
- Debuggers

---

## 📊 ERROR REFERENCE

| Error | Cause | Solution |
|-------|-------|----------|
| RefreshRuntime.getRefreshReg | React Fast Refresh misconfigured | Updated vite.config.js |
| WebSocket connection failed | HMR not configured | Added HMR settings to vite.config.js |
| Failed to cache chrome-extension | Browser cache issue | Clear cache + restart |
| VITE does not work as advertised | Network issues | Check firewall, disable VPN |
| Module not found | Dependencies issue | npm install |

---

## ✅ FINAL CHECKLIST

After applying all fixes:

- [ ] vite.config.js updated with HMR settings
- [ ] Browser cache cleared
- [ ] Dev server restarted
- [ ] No console errors on page load
- [ ] Hot reload working (edit file, see updates)
- [ ] WebSocket connected (check Network tab)
- [ ] No "RefreshRuntime" errors
- [ ] Can navigate between pages
- [ ] Form submissions work
- [ ] API calls successful

---

## 🆘 STILL HAVING ISSUES?

### Check These:

1. **Firewall/VPN**
   - Check if localhost:5173 is blocked
   - Try disabling VPN
   - Check Windows Firewall

2. **Antivirus**
   - Temporarily disable antivirus
   - Add project folder to whitelist

3. **Node/npm**
   - Update Node: `nvm install node`
   - Clear npm cache: `npm cache clean --force`

4. **Browser**
   - Try different browser (Chrome, Firefox, Safari)
   - Clear all browser data (Ctrl+Shift+Delete)
   - Try private/incognito mode

5. **Project**
   - Delete node_modules: `rm -r node_modules`
   - Fresh install: `npm install`
   - Delete package-lock.json: `rm package-lock.json`

---

## 📞 SUPPORT

**If you still have issues after following all steps:**

1. Check terminal output for errors
2. Take screenshot of console errors
3. Note your Node version: `node --version`
4. Note your npm version: `npm --version`
5. Try on different machine if available

**Error Logs Location:**
- Terminal output
- Browser Console (F12)
- Browser Network tab (F12)

---

## 🎉 SUCCESS INDICATORS

You'll know everything is fixed when:

✅ Dev server shows: `ready in xxx ms`
✅ Browser shows: http://localhost:5173 loads
✅ Console shows: No errors or warnings
✅ Network tab shows: WS connection to localhost:5173
✅ Editing files: Page updates without full reload
✅ No "RefreshRuntime" messages
✅ All features work: Login, Add Book, Admin Panel

---

**Version**: 1.0
**Last Updated**: 2024
**Status**: Ready to use ✅

---

## 📝 NOTES

- These are **development-only** errors
- **Production build** (`npm run build`) will work fine
- **Regular users** won't see these errors
- Keep vite.config.js updated for smooth development
