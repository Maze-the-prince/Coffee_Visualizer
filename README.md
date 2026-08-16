# Coffee Maker WebAR (Needle Engine)

Browser viewer for the **Unity** espresso machine, with WebXR AR on a phone.

The 3D product is exported from the Unity scene (`CoffeeMaker`, table, mug, studio materials). It is not a placeholder mesh.

## 1. Export the Unity model

In Unity (scene `ProductViz_Working`):

**ProductViz → Export WebAR Model**

That writes `WebAR/public/models/product.glb` from the live CoffeeMaker meshes.

`Assets/ProductViz_Model/FBX/CoffeeMaker.fbx` must be present. If only `CoffeeMaker.fbx.meta` exists, Unity has no mesh to export — restore the FBX from the original course files, then export again.

## 2. Local preview

Needs [Node.js 22+](https://nodejs.org/).

```bash
cd WebAR
npm install
npm run dev
```

Open the HTTPS URL Vite prints (usually `https://localhost:3000`). Accept the local certificate. **WebAR requires HTTPS**.

## GitHub Pages

Commit `public/models/product.glb` with the rest of this folder, then push. Settings → Pages → Source: **GitHub Actions**.

Live URL:

`https://maze-the-prince.github.io/Coffee_Visualizer/`

## Controls

| Control | Action |
| --- | --- |
| Drag | Orbit (studio) / rotate after place (AR) |
| AR | Enter WebAR, tap a surface to place |
| Spin | Slow turntable |
| Labels | Part callouts |
| Water Replace | Slide the tank / handle / tray |
| One Shot / Two Shot | Short coffee pour |
| + / − | Scale, with percentage |

## Unity app

The native Android/iOS app stays in the parent Unity project. This site is the same product, exported for the browser.
