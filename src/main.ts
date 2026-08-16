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
  const renderer = context.renderer as THREE.WebGLRenderer;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  if (camera?.isPerspectiveCamera) {
    camera.fov = 38;
    camera.position.set(0.62, 0.42, 0.98);
    camera.lookAt(0, 0.16, 0);
    camera.updateProjectionMatrix();
  }
  context.menu.showFullscreenOption(false);
  context.menu.showQRCodeButton(false);

  const hint = document.getElementById("hint");
  if (hint) hint.textContent = "Loading Unity product…";

  const hemi = new THREE.HemisphereLight(0xfff4e8, 0x16181c, 0.28);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff5ea, 1.05);
  key.position.set(1.15, 1.85, 1.35);
  key.castShadow = true;
  const shadowSize = window.innerWidth < 700 ? 1024 : 2048;
  key.shadow.mapSize.set(shadowSize, shadowSize);
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.018;
  key.shadow.radius = 2.4;
  key.shadow.camera.near = 0.15;
  key.shadow.camera.far = 6;
  key.shadow.camera.left = -1.4;
  key.shadow.camera.right = 1.4;
  key.shadow.camera.top = 1.4;
  key.shadow.camera.bottom = -1.4;
  scene.add(key);

  try {
    const product = await loadUnityProduct();
    scene.add(product.root);
    scene.add(product.studio);

    void loadPMREM("https://cloud.needle.tools/hdris/studio.ktx2", renderer)
      .then((envTex) => {
        if (envTex) scene.environment = envTex;
      })
      .catch(() => undefined);

    const orbit = addComponent(scene, OrbitControls);
    orbit.enablePan = true;
    orbit.fitCamera({
      objects: product.machine,
      immediate: true,
      fitOffset: 2.25,
      fitDirection: { x: -0.55, y: -0.38, z: -1 },
      fov: 38,
    });
    if (camera?.isPerspectiveCamera) {
      camera.fov = 38;
      camera.position.set(0.62, 0.42, 0.98);
      camera.lookAt(0, 0.16, 0);
      camera.updateProjectionMatrix();
      orbit.setCameraAndLookTarget(camera, true);
    }

    const webxr = addComponent(scene, WebXR, {
      createARButton: false,
      createVRButton: false,
      createQRCode: false,
      createSendToQuestButton: false,
      useQuicklookExport: false,
      autoPlace: false,
      usePlacementReticle: true,
      usePlacementAdjustment: true,
      arScale: 1,
    });

    const app = addComponent(scene, ProductApp);
    app.webxr = webxr;
    app.orbit = orbit;
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
