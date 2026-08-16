import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

const TARGET_HEIGHT = 0.36;

export type CoffeeMakerParts = {
  root: THREE.Group;
  machine: THREE.Object3D;
  mug: THREE.Object3D;
  waterTank: THREE.Object3D;
  portafilter: THREE.Object3D;
  tray: THREE.Object3D;
  labels: THREE.Group;
  studio: THREE.Group;
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

function attachLabel(labels: THREE.Group, host: THREE.Object3D | undefined, title: string, fallback: THREE.Object3D, root: THREE.Group) {
  const anchor = new THREE.Object3D();
  anchor.name = `Label_${title}`;
  const target = host ?? fallback;
  target.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(target);
  const world = new THREE.Vector3();
  if (box.isEmpty()) {
    target.getWorldPosition(world);
    world.y += 0.05;
  } else {
    box.getCenter(world);
    world.y = box.max.y + 0.025;
  }
  root.worldToLocal(world);
  anchor.position.copy(world);
  labels.add(anchor);
}

function styleUnityMaterials(root: THREE.Object3D) {
  const body = new THREE.MeshStandardMaterial({ color: 0xc4162e, metalness: 0.22, roughness: 0.32, envMapIntensity: 1.2 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, metalness: 0.18, roughness: 0.22, envMapIntensity: 1 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd1d5d8, metalness: 1, roughness: 0.08, envMapIntensity: 1.4 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x8ebfd4,
    metalness: 0,
    roughness: 0.14,
    transmission: 0.55,
    thickness: 0.008,
    ior: 1.4,
    transparent: true,
    opacity: 0.42,
    envMapIntensity: 1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ceramic = new THREE.MeshStandardMaterial({ color: 0xf3f1ea, metalness: 0.04, roughness: 0.55 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.62, metalness: 0.06, envMapIntensity: 0.6 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x6b6560, roughness: 0.48, metalness: 0.12, envMapIntensity: 0.7 });

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const lower = mesh.name.toLowerCase();
    if (lower === "tabletop") {
      mesh.material = stone;
      return;
    }
    if (isStudioProp(mesh.name)) {
      mesh.material = wood;
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
    if (!mesh.isMesh || !mesh.visible || isStudioProp(mesh.name)) return;
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

function seatOnTable(root: THREE.Group) {
  const tabletop = findNamed(root, "Tabletop") ?? findNamed(root, "Table");
  if (!tabletop) return;
  root.updateMatrixWorld(true);
  const top = new THREE.Box3().setFromObject(tabletop);
  if (top.isEmpty()) return;
  root.position.y += -top.max.y + 0.002;
  root.updateMatrixWorld(true);
}

function createStudio(root: THREE.Group) {
  const studio = new THREE.Group();
  studio.name = "Studio";

  const table = findNamed(root, "Table");
  const floorY = table ? new THREE.Box3().setFromObject(table).min.y : -0.02;

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 64),
    new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.92, metalness: 0.04 })
  );
  floor.name = "StudioFloor";
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = floorY;
  floor.receiveShadow = true;
  studio.add(floor);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 2.8),
    new THREE.MeshStandardMaterial({ color: 0x2c2f35, roughness: 0.95, metalness: 0 })
  );
  backdrop.name = "StudioBackdrop";
  backdrop.position.set(0, 1.15 + floorY, -1.65);
  studio.add(backdrop);

  const fill = new THREE.PointLight(0xfff2e4, 0.45, 6, 1.4);
  fill.position.set(-1.1, 1.4, 0.8);
  studio.add(fill);

  return studio;
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
    source = await loadFbx("./models/CoffeeMaker.fbx");
  } catch {
    source = undefined;
  }

  if (!source) {
    try {
      source = await loadGltf("./models/product.glb");
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
  seatOnTable(root);

  const machine = findNamed(root, "MainUnit") ?? findNamed(root, "CoffeeMachine") ?? source;
  const mug = findNamed(root, "Cup") ?? machine;
  const waterTank = findNamed(root, "WaterTray") ?? findNamed(root, "Glass") ?? machine;
  const portafilter = findNamed(root, "HandleGrinder") ?? machine;
  const tray = findNamed(root, "TrayTop") ?? findNamed(root, "TrayFront") ?? machine;
  const studio = createStudio(root);
  const table = findNamed(root, "Table");
  const tabletop = findNamed(root, "Tabletop");
  if (table) studio.attach(table);
  if (tabletop && tabletop !== table) studio.attach(tabletop);

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

  return { root, machine, mug, waterTank, portafilter, tray, labels, studio };
}
