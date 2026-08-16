import {
  addComponent,
  ContactShadows,
  ObjectUtils,
  onStart,
  OrbitControls,
  WebXR,
  setAutoFitEnabled,
} from "@needle-tools/engine";
import * as THREE from "three";
import { createCoffeeMaker } from "./scripts/createCoffeeMaker.js";
import { ProductApp } from "./scripts/ProductApp.js";

onStart((context) => {
  const scene = context.scene;
  context.mainCamera.position.set(0.55, 0.42, 0.85);
  context.menu.showFullscreenOption(true);

  const hemi = new THREE.HemisphereLight(0xfff4e8, 0x1a1c20, 0.7);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff2e0, 1.15);
  key.position.set(1.4, 2.2, 1.1);
  key.castShadow = true;
  scene.add(key);

  const product = createCoffeeMaker();
  scene.add(product.root);

  const shadows = ContactShadows.auto(context);
  shadows.darkness = 0.75;
  shadows.opacity = 0.85;
  shadows.fitShadows({ object: product.root, positionOffset: { y: 0.01 } });

  const floor = ObjectUtils.createPrimitive("Cylinder", {
    scale: [1.4, 0.01, 1.4],
    position: [0, -0.005, 0],
    material: new THREE.MeshStandardMaterial({ color: 0x1b1c20, metalness: 0.1, roughness: 0.85 }),
  });
  setAutoFitEnabled(floor, false);
  scene.add(floor);

  const orbit = addComponent(scene, OrbitControls);
  orbit.enablePan = true;
  orbit.fitCamera({
    objects: product.root,
    immediate: true,
    fitOffset: 1.15,
    fitDirection: { x: 0.55, y: 0.28, z: 1 },
    fov: 42,
  });

  const webxr = addComponent(scene, WebXR, {
    createARButton: true,
    createVRButton: false,
    createQRCode: true,
    autoPlace: false,
    usePlacementReticle: true,
    usePlacementAdjustment: true,
    arScale: 1.6,
  });

  const app = addComponent(scene, ProductApp);
  app.webxr = webxr;
  app.parts = product;
});
