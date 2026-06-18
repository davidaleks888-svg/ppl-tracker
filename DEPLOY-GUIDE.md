# Put your tracker online (phone only) — and update it later without losing data

The golden rule: **your logged data is stored in your phone's browser, tied to your app's web address.**
As long as that address stays the same, you can update the code forever and your logs stay safe.

This guide gives you a permanent address using GitHub + Netlify.

---

## One-time setup

### 1. Create the GitHub repository
1. Open **github.com** in your phone browser and log in.
2. Tap **➕** (top-right) → **New repository**.
3. Name: `ppl-tracker`. Visibility: **Public**. Tap **Create repository**.

### 2. Upload the project files
You're uploading the **source** project (the `tracker` folder from `ppl-tracker.zip`).

1. Download `ppl-tracker.zip`, then extract it (Files app → long-press → Extract).
2. On the new repo page, tap **uploading an existing file**.
3. Tap **choose your files**, then select **all** the files and folders inside the
   extracted `tracker` folder.
4. Scroll down, tap **Commit changes**.

> If the upload won't include the `src` and `public` folders, upload the loose files
> first (index.html, package.json, vite.config.js, netlify.toml, README.md), then use
> **Add file → Upload files** again and add the `src` and `public` folders separately.

### 3. Connect Netlify (this creates your permanent URL)
1. Open **netlify.com** in your phone browser → **Sign up** → **Sign up with GitHub**
   (one tap, uses your existing account).
2. Tap **Add new site** → **Import an existing project** → **Deploy with GitHub**.
3. Authorize, then pick your `ppl-tracker` repo.
4. Netlify reads `netlify.toml` automatically — build command and publish folder are
   already filled in. Just tap **Deploy**.
5. After ~1 minute you get a URL like `https://your-name-123.netlify.app`.
   *(Optional: Site settings → Change site name to make it something memorable.)*

### 4. Install it on your phone
Open your Netlify URL in the browser, then:
- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** ⋮ → **Install app**

Done. Start logging — your data saves to this installed app and survives restarts.

---

## How to UPDATE later without losing your logs

Because your data lives in the browser at your fixed Netlify URL, updating the code
never touches it. To ship a change:

1. In your `ppl-tracker` GitHub repo, open the file to change (usually `src/App.jsx`).
2. Tap the **pencil** ✏️ to edit, paste the new version, tap **Commit changes**.
3. Netlify automatically rebuilds and redeploys to the **same URL** within a minute.
4. Reopen the app on your phone — new features, all your logs still there.

> When I give you an updated `App.jsx`, you just replace that one file's contents in
> GitHub. That's the whole update process.

---

## Backups (recommended)

Even though data persists, keep an occasional safety copy:
- In the app: **More → Data → Export JSON backup**.
- If you ever need to restore: **More → Data → Import**, pick that JSON file.

This also lets you move your data to a new phone, or recover if you clear your browser.

---

## Why not just open the HTML file directly?
Opening `index.html` from your Files app uses a `file://` address, which breaks the
YouTube embeds and doesn't install cleanly. The Netlify URL (https) is what makes it a
proper installable app with working videos.
