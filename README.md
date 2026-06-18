# PPL Strength + Health Tracker

A Push/Pull/Legs workout tracker with bodyweight, sleep, protein, cardio, and body-measurement logging. Your data is saved on your own device (via the browser's localStorage).

---

## Run it on your computer

You need [Node.js](https://nodejs.org) installed (LTS version is fine).

1. Open a terminal in this folder.
2. Install dependencies:
   ```
   npm install
   ```
3. Start it:
   ```
   npm run dev
   ```
4. Open the URL it prints (usually http://localhost:5173).

That's it — the app runs in your browser and saves your data locally.

---

## Install it on your phone (as an app)

The app is a PWA (Progressive Web App), so it can install to your home screen.

**First, put it online** (free options):

- **Netlify Drop** — easiest. Run `npm run build`, then drag the generated `dist` folder onto https://app.netlify.com/drop. You get a public URL instantly.
- **Vercel** — run `npm install -g vercel`, then `vercel` in this folder and follow the prompts.

**Then install on the phone:**

- **iPhone (Safari):** open the URL → tap the Share button → "Add to Home Screen."
- **Android (Chrome):** open the URL → tap the ⋮ menu → "Install app" / "Add to Home Screen."

It then opens full-screen with its own icon, like a native app.

---

## Notes

- **Export & backup:** the **Data** tab exports a JSON backup (re-importable) and CSV files (open in Excel/Sheets). Back up before clearing browser data.
- **Form videos:** each exercise has a "Watch form demo" button that opens a tutorial. A couple are hand-picked; the rest load a focused YouTube search so they always resolve to a working clip.
- **Your data lives in the browser** where you use the app. Using it on your laptop and your phone keeps two separate logs unless you export/import between them.

## What's inside

```
package.json          dependencies + scripts
vite.config.js        build config
index.html            app shell + PWA meta tags
src/main.jsx          entry point + service worker registration
src/App.jsx           the entire app
public/manifest.webmanifest   PWA manifest
public/sw.js          service worker (offline support)
public/icon-192.png   app icons
public/icon-512.png
```
