import {
  addComponent,
  loadPMREM,
  OrbitControls,
  WebXR,
} from "@needle-tools/engine";
import * as THREE from "three";
import { loadUnityProduct } from "./scripts/loadUnityProduct.js";
import { ProductApp } from "./scripts/ProductApp.js";

async function startApp() {
  const element = document.querySelector("needle-engine") as HTMLElement & {
    getContext: () => Promise<any>;
  };
  if (!element?.getContext) return;
  const context = await element.getContext();
  const scene = context.scene as THREE.Scene;
  const camera = context.mainCamera as THREE.PerspectiveCamera | undefined;
  if (camera?.isPerspectiveCamera) {
    camera.fov = 38;
    camera.position.set(0.48, 0.32, 0.82);
    camera.updateProjectionMatrix();
  }
  context.menu.showFullscreenOption(false);
  context.menu.showQRCodeButton(false);

  const hint = document.getElementById("hint");
  if (hint) hint.textContent = "Loading Unity product…";

  const hemi = new THREE.HemisphereLight(0xfff4e8, 0x1a1c20, 0.7);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff2e0, 1.15);
  key.position.set(1.4, 2.2, 1.1);
  key.castShadow = true;
  scene.add(key);

  try {
      const product = await loadUnityProduct();
      scene.add(product.root);
      scene.add(product.studio);

      void loadPMREM("https://cloud.needle.tools/hdris/studio.ktx2", context.renderer)
        .then((envTex) => {
          if (envTex) scene.environment = envTex;
        })
        .catch(() => undefined);

      const orbit = addComponent(scene, OrbitControls);
      orbit.enablePan = true;
      orbit.fitCamera({
        objects: product.root,
        immediate: true,
        fitOffset: 2.15,
        fitDirection: { x: -0.55, y: -0.38, z: -1 },
        fov: 38,
      });
      if (camera?.isPerspectiveCamera) {
        camera.fov = 38;
        camera.position.set(0.58, 0.38, 0.92);
        camera.updateProjectionMatrix();
      }

    const webxr = addComponent(scene, WebXR, {
      createARButton: false,
      createVRButton: false,
      createQRCode: false,
      createSendToQuestButton: false,
      autoPlace: false,
      usePlacementReticle: true,
      usePlacementAdjustment: true,
      arScale: 1,
    });

    const app = addComponent(scene, ProductApp);
    app.webxr = webxr;
    app.parts = product;
    app.bindProduct();
    if (hint) hint.textContent = "Orbit to inspect · tap AR to place on a table";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (hint) hint.textContent = message;
    console.error(message);
  }
}

void startApp();
