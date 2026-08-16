import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

const TARGET_HEIGHT = 0.36;
const LABEL_WORLD_WIDTH = 0.13;

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

function isStudioProp(name: string) {
  const lower = name.toLowerCase();
  return lower === "table" || lower === "tabletop" || lower.startsWith("table");
}

function hideStudioProps(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!isStudioProp(child.name)) return;
    child.visible = false;
    child.traverse((nested) => {
      nested.visible = false;
    });
  });
}

function hasHiddenAncestor(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (!current.visible || isStudioProp(current.name)) return true;
    current = current.parent;
  }
  return false;
}

function makeLabel(title: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = "rgba(12, 13, 16, 0.82)";
  ctx.fillRect(8, 8, 240, 48);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 240, 48);
  ctx.fillStyle = "white";
  ctx.font = "700 26px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, 128, 32);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map, transparent: true, depthTest: false, sizeAttenuation: true })
  );
  sprite.name = `Label_${title}`;
  sprite.scale.set(LABEL_WORLD_WIDTH, LABEL_WORLD_WIDTH * 0.25, 1);
  return sprite;
}

function attachLabel(labels: THREE.Group, host: THREE.Object3D | undefined, title: string, fallback: THREE.Object3D, root: THREE.Group) {
  const sprite = makeLabel(title);
  const target = host ?? fallback;
  target.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(target);
  const world = new THREE.Vector3();
  if (box.isEmpty()) {
    target.getWorldPosition(world);
    world.y += 0.05;
  } else {
    box.getCenter(world);
    world.y = box.max.y + 0.03;
  }
  root.worldToLocal(world);
  sprite.position.copy(world);

  const rootScale = new THREE.Vector3();
  root.getWorldScale(rootScale);
  const width = LABEL_WORLD_WIDTH / Math.max(rootScale.x, 1e-8);
  sprite.scale.set(width, width * 0.25, 1);
  labels.add(sprite);
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

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const lower = mesh.name.toLowerCase();
    if (hasHiddenAncestor(mesh) || isStudioProp(mesh.name)) {
      mesh.visible = false;
      return;
    }
    if (lower.includes("handlegrinder") || lower.includes("traytop") || lower === "dial" || lower.includes("pointer")) mesh.material = black;
    else if (lower.includes("trayhandle") || lower === "rim" || lower.includes("switch")) mesh.material = chrome;
    else if (lower.includes("glass") || lower.includes("watertray")) mesh.material = glass;
    else if (lower === "cup" || lower.includes("mug")) mesh.material = ceramic;
    else mesh.material = body;
  });
}

function productWorldBox(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || hasHiddenAncestor(mesh) || isStudioProp(mesh.name)) return;
    const geometry = mesh.geometry;
    if (!geometry) return;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const local = geometry.boundingBox;
    if (!local || local.isEmpty()) return;
    box.union(local.clone().applyMatrix4(mesh.matrixWorld));
  });
  return box;
}

function fitRoot(root: THREE.Group) {
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);

  const box = productWorldBox(root);
  if (box.isEmpty()) return;

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;

  const tallest = Math.max(size.y, 1e-6);
  root.scale.setScalar(TARGET_HEIGHT / tallest);
  root.updateMatrixWorld(true);
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
  hideStudioProps(root);
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
  root.add(labels);
  attachLabel(labels, findNamed(root, "Switch_OneShot") ?? findNamed(root, "SwitchB"), "One Shot", machine, root);
  attachLabel(labels, findNamed(root, "Switch_TwoShot") ?? findNamed(root, "SwitchC"), "Two Shot", machine, root);
  attachLabel(labels, findNamed(root, "Switch_Power"), "Power", machine, root);
  attachLabel(labels, portafilter, "Portafilter", machine, root);
  attachLabel(labels, mug, "Coffee Mug", machine, root);
  attachLabel(labels, tray, "Tray", machine, root);

  return { root, machine, mug, waterTank, portafilter, tray, labels };
}
