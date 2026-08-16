# Coffee Maker WebAR (Needle Engine)

Browser product viewer with **WebXR AR**: orbit the espresso machine on desktop, then place it on a real table from a phone.

Needle Engine handles AR on Android (WebXR / ARCore) and iOS (Quick Look USDZ from the AR button).

## Local preview

Needs [Node.js 22+](https://nodejs.org/).

```bash
cd WebAR
npm install
npm run dev
```

Open the HTTPS URL Vite prints (usually `https://localhost:3000`). Accept the local certificate. **WebAR requires HTTPS**, including on your phone:

1. Find your PC’s LAN IP.
2. On the phone, open `https://YOUR-IP:3000`.
3. Tap **AR**, point at a table, tap the ring to place.
4. Pinch or use **+ / −** to scale. **Size %** shows the current scale.

## GitHub Pages

This folder is a standalone site. Create a **new GitHub repo from `WebAR` only** (not the whole Unity project):

```bash
cd WebAR
git init
git add .
git commit -m "Add Needle Engine WebAR coffee maker"
gh repo create coffee-maker-webar --public --source=. --remote=origin --push
```

Then:

1. GitHub repo → **Settings → Pages**
2. Build and deployment source: **GitHub Actions**
3. Push to `main` (or run the **Deploy WebAR to GitHub Pages** workflow)

The site URL will be:

`https://<user>.github.io/<repo>/`

`vite.config.js` uses `base: "./"` so assets work on project Pages.

If `npm ci` fails on GitHub because there is no lockfile yet, run `npm install` locally, commit `package-lock.json`, and push again.

## Controls

| Control | Action |
| --- | --- |
| Drag | Orbit (studio) / rotate after place (AR) |
| AR | Enter WebAR, tap a surface to place |
| Spin | Slow turntable |
| Labels | Part callouts |
| Water Replace | Slide the tank |
| One Shot / Two Shot | Short coffee pour |
| + / − | Scale, with percentage |

## Unity app

The native Android/iOS app stays in the parent Unity project. This web build is a separate Needle Engine viewer for GitHub hosting.
