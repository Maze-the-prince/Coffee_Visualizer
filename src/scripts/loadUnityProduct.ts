import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

export type CoffeeMakerParts = {
  root: THREE.Group;
  machine: THREE.Object3D;
  mug: THREE.Object3D;
  waterTank: THREE.Object3D;
  portafilter: THREE.Object3D;
  tray: THREE.Object3D;
  labels: THREE.Group;
};

function findNamed(root: THREE.Object3D, name: string): THREE.Object3D | undefined {
  const target = name.toLowerCase();
  let found: THREE.Object3D | undefined;
  root.traverse((child) => {
    if (found) return;
    const n = child.name.toLowerCase();
    if (n === target || n.endsWith(target) || n.includes(target)) found = child;
  });
  return found;
}

function makeLabel(title: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 240, 48);
  ctx.fillStyle = "white";
  ctx.font = "700 28px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, 128, 32);
  const map = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthTest: false }));
  sprite.scale.set(0.22, 0.055, 1);
  return sprite;
}

function attachLabel(parent: THREE.Object3D | undefined, title: string, fallback: THREE.Object3D, local: THREE.Vector3) {
  const sprite = makeLabel(title);
  const host = parent ?? fallback;
  const box = new THREE.Box3().setFromObject(host);
  const size = new THREE.Vector3();
  box.getSize(size);
  sprite.position.copy(local);
  if (size.length() > 0.01) {
    sprite.scale.set(Math.max(size.x, 0.12) * 1.6, Math.max(size.x, 0.12) * 0.4, 1);
  }
  host.add(sprite);
  return sprite;
}

function styleUnityMaterials(root: THREE.Object3D) {
  const body = new THREE.MeshStandardMaterial({ color: 0xc4162e, metalness: 0.22, roughness: 0.32, envMapIntensity: 1.2 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, metalness: 0.18, roughness: 0.22, envMapIntensity: 1 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd1d5d8, metalness: 1, roughness: 0.08, envMapIntensity: 1.4 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xb8dbea,
    metalness: 0.05,
    roughness: 0.08,
    transparent: true,
    opacity: 0.28,
    envMapIntensity: 1.2,
  });
  const ceramic = new THREE.MeshStandardMaterial({ color: 0xf3f1ea, metalness: 0.04, roughness: 0.55 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x8a8680, metalness: 0.08, roughness: 0.62 });
  const wood = new THREE.MeshStandardMaterial({ color: 0xbc9f8e, metalness: 0.04, roughness: 0.7 });

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const name = mesh.name;
    const lower = name.toLowerCase();
    if (lower.includes("handlegrinder") || lower.includes("traytop") || lower === "dial" || lower.includes("pointer")) mesh.material = black;
    else if (lower.includes("trayhandle") || lower === "rim" || lower.includes("switch_")) mesh.material = chrome;
    else if (lower.includes("glass") || lower.includes("watertray") || lower.includes("water")) mesh.material = glass;
    else if (lower === "cup" || lower.includes("mug")) mesh.material = ceramic;
    else if (lower.includes("tabletop")) mesh.material = stone;
    else if (lower === "table") mesh.material = wood;
    else if (lower.includes("coffeemachine") || lower.includes("trayfront") || lower.includes("body")) mesh.material = body;
  });
}

function fitRoot(root: THREE.Group) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  root.position.sub(center);
  root.position.y += size.y * 0.5;
  const tallest = Math.max(size.y, 0.001);
  root.scale.multiplyScalar(0.42 / tallest);
}

async function loadGltf(url: string): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  return gltf.scene;
}

async function loadFbx(url: string): Promise<THREE.Group> {
  const loader = new FBXLoader();
  return loader.loadAsync(url);
}

export async function loadUnityProduct(): Promise<CoffeeMakerParts> {
  const root = new THREE.Group();
  root.name = "CoffeeMaker";

  let source: THREE.Object3D | undefined;
  try {
    source = await loadGltf("./models/product.glb");
  } catch {
    source = undefined;
  }

  if (!source) {
    try {
      source = await loadFbx("./models/CoffeeMaker.fbx");
    } catch {
      source = undefined;
    }
  }

  if (!source) {
    throw new Error(
      "Unity product model is missing. In Unity use ProductViz > Export WebAR Model after CoffeeMaker.fbx is in Assets/ProductViz_Model/FBX/."
    );
  }

  source.name = source.name || "UnityProduct";
  root.add(source);
  styleUnityMaterials(root);
  fitRoot(root);

  const machine = findNamed(root, "MainUnit") ?? findNamed(root, "CoffeeMachine") ?? source;
  const mug = findNamed(root, "Cup") ?? machine;
  const waterTank = findNamed(root, "WaterTray") ?? findNamed(root, "Glass") ?? machine;
  const portafilter = findNamed(root, "HandleGrinder") ?? machine;
  const tray = findNamed(root, "TrayTop") ?? findNamed(root, "TrayFront") ?? machine;

  const labels = new THREE.Group();
  labels.name = "Labels";
  labels.visible = false;
  attachLabel(findNamed(root, "Switch_OneShot"), "One Shot", machine, new THREE.Vector3(0, 0.08, 0.05));
  attachLabel(findNamed(root, "Switch_TwoShot"), "Two Shot", machine, new THREE.Vector3(0, 0.08, 0.05));
  attachLabel(findNamed(root, "Switch_Power"), "Power", machine, new THREE.Vector3(0.05, 0.08, 0));
  attachLabel(portafilter, "Portafilter", machine, new THREE.Vector3(0, 0.05, 0.08));
  attachLabel(mug, "Coffee Mug", machine, new THREE.Vector3(0, 0.08, 0));
  attachLabel(tray, "Tray", machine, new THREE.Vector3(0, 0.04, 0.06));
  root.add(labels);

  return { root, machine, mug, waterTank, portafilter, tray, labels };
}
