import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const TARGET_HEIGHT = 0.36;
const TEX = "./models/textures";

export type CoffeeMakerParts = {
  root: THREE.Group;
  machine: THREE.Object3D;
  mug: THREE.Object3D;
  waterTank: THREE.Object3D;
  portafilter: THREE.Object3D;
  tray: THREE.Object3D;
  oneShot: THREE.Object3D;
  twoShot: THREE.Object3D;
  power: THREE.Object3D;
  labels: THREE.Group;
  studio: THREE.Group;
};

function findNamed(root: THREE.Object3D, name: string): THREE.Object3D | undefined {
  const target = name.toLowerCase();
  let exact: THREE.Object3D | undefined;
  let fuzzy: THREE.Object3D | undefined;
  root.traverse((child) => {
    if (exact) return;
    const n = child.name.toLowerCase();
    if (n === target) exact = child;
    else if (!fuzzy && (n.endsWith(target) || n.includes(target))) fuzzy = child;
  });
  return exact ?? fuzzy;
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

function loadTexture(url: string, opts?: { srgb?: boolean; repeat?: number; anisotropy?: number }) {
  const texture = new THREE.TextureLoader().load(url);
  texture.colorSpace = opts?.srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  texture.anisotropy = opts?.anisotropy ?? 8;
  texture.wrapS = texture.wrapT = opts?.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  if (opts?.repeat) texture.repeat.set(opts.repeat, opts.repeat);
  texture.flipY = true;
  return texture;
}

function pbrMaterial(opts: {
  color: number;
  albedo?: string;
  roughnessMap?: string;
  metalnessMap?: string;
  normalMap?: string;
  roughness: number;
  metalness: number;
  env?: number;
  clearcoat?: number;
  srgbTint?: number;
}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: opts.color,
    roughness: opts.roughness,
    metalness: opts.metalness,
    envMapIntensity: opts.env ?? 1.1,
    clearcoat: opts.clearcoat ?? 0,
    clearcoatRoughness: 0.22,
  });
  if (opts.albedo) {
    mat.map = loadTexture(opts.albedo, { srgb: true });
    mat.color.setHex(opts.srgbTint ?? 0xffffff);
  }
  if (opts.roughnessMap) {
    mat.roughnessMap = loadTexture(opts.roughnessMap);
    mat.roughness = 1;
  }
  if (opts.metalnessMap) {
    mat.metalnessMap = loadTexture(opts.metalnessMap);
    mat.metalness = 1;
  }
  if (opts.normalMap) {
    mat.normalMap = loadTexture(opts.normalMap);
    mat.normalScale.set(0.55, 0.55);
  }
  return mat;
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  const list = Array.isArray(material) ? material : [material];
  for (const item of list) item.dispose();
}

function hardenMesh(mesh: THREE.Mesh) {
  try {
    const welded = mergeVertices(mesh.geometry, 1e-4);
    if (welded !== mesh.geometry) {
      mesh.geometry.dispose();
      mesh.geometry = welded;
    }
  } catch {
    // Keep the imported geometry if welding fails.
  }
  mesh.geometry.computeVertexNormals();
  if (mesh.geometry.attributes.uv && mesh.geometry.index) {
    try {
      mesh.geometry.computeTangents();
    } catch {
      // Indexed UVs are enough for most FBX parts.
    }
  }
  mesh.geometry.computeBoundingSphere();
}

function styleUnityMaterials(root: THREE.Object3D) {
  const body = pbrMaterial({
    color: 0xc4162e,
    albedo: `${TEX}/TopBody_MAT__baseColor.png`,
    roughnessMap: `${TEX}/TopBody_MAT__roughness.png`,
    metalnessMap: `${TEX}/TopBody_MAT__metallic.png`,
    roughness: 0.1,
    metalness: 0,
    env: 1.15,
    clearcoat: 0.28,
    srgbTint: 0xdedede,
  });
  const handle = pbrMaterial({
    color: 0x111214,
    albedo: `${TEX}/CoffeeHandle_MAT__baseColor.png`,
    roughnessMap: `${TEX}/CoffeeHandle_MAT__roughness.png`,
    metalnessMap: `${TEX}/CoffeeHandle_MAT__metallic.png`,
    normalMap: `${TEX}/CoffeeHandle_MAT__normal.png`,
    roughness: 0.22,
    metalness: 0.18,
    env: 1.05,
  });
  const dial = pbrMaterial({
    color: 0x101113,
    albedo: `${TEX}/Dials_MAT__baseColor.png`,
    roughnessMap: `${TEX}/Dials_MAT__roughness.png`,
    metalnessMap: `${TEX}/Dials_MAT__metallic.png`,
    roughness: 0.22,
    metalness: 0.18,
    env: 1.05,
  });
  const switches = pbrMaterial({
    color: 0xd1d5d8,
    albedo: `${TEX}/Switch_MAT__baseColor.png`,
    roughnessMap: `${TEX}/Switch_MAT__roughness.png`,
    roughness: 0.08,
    metalness: 1,
    env: 1.45,
  });
  const black = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0b,
    metalness: 0.18,
    roughness: 0.22,
    envMapIntensity: 1.05,
    clearcoat: 0.15,
    clearcoatRoughness: 0.35,
  });
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xd1d6db,
    metalness: 1,
    roughness: 0.06,
    envMapIntensity: 1.55,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xb8dbea,
    metalness: 0.05,
    roughness: 0.08,
    transparent: true,
    opacity: 0.32,
    transmission: 0.35,
    thickness: 0.012,
    ior: 1.45,
    envMapIntensity: 1.2,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ceramic = new THREE.MeshPhysicalMaterial({
    color: 0xf7f4ee,
    metalness: 0.02,
    roughness: 0.48,
    envMapIntensity: 0.85,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
  });
  const table = new THREE.MeshStandardMaterial({
    color: 0xbcab9c,
    map: loadTexture(`${TEX}/Table_Albedo.png`, { srgb: true, repeat: 1 }),
    roughness: 0.52,
    metalness: 0.04,
    envMapIntensity: 0.55,
  });
  const stone = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: loadTexture(`${TEX}/Tabletop_Albedo.png`, { srgb: true, repeat: 0.8 }),
    roughness: 0.38,
    metalness: 0.02,
    envMapIntensity: 0.7,
  });

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    hardenMesh(mesh);
    disposeMaterial(mesh.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const lower = mesh.name.toLowerCase();
    if (lower === "tabletop") mesh.material = stone;
    else if (isStudioProp(mesh.name)) mesh.material = table;
    else if (lower === "handlegrinder") mesh.material = handle;
    else if (lower === "dial") mesh.material = dial;
    else if (lower.includes("switch")) mesh.material = switches;
    else if (lower === "traytop" || lower === "coffeemachine002" || lower.includes("pointer")) mesh.material = black;
    else if (lower === "trayhandle" || lower === "trayfront001" || lower === "rim" || lower === "coffeemachine003") mesh.material = chrome;
    else if (lower.includes("glass") || lower === "watertray") {
      mesh.material = glass;
      mesh.castShadow = false;
    } else if (lower === "cup" || lower.includes("mug")) mesh.material = ceramic;
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
    new THREE.CircleGeometry(4.2, 72),
    new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.94, metalness: 0.02 })
  );
  floor.name = "StudioFloor";
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = floorY - 0.002;
  floor.receiveShadow = true;
  studio.add(floor);

  const catcher = new THREE.Mesh(
    new THREE.CircleGeometry(1.8, 64),
    new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.42 })
  );
  catcher.name = "StudioShadowCatcher";
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = floorY + 0.001;
  catcher.receiveShadow = true;
  studio.add(catcher);

  const cyclorama = new THREE.Mesh(
    new THREE.SphereGeometry(5.2, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.52),
    new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 1, metalness: 0, side: THREE.BackSide })
  );
  cyclorama.name = "StudioCyclorama";
  cyclorama.position.y = floorY;
  studio.add(cyclorama);

  const fill = new THREE.PointLight(0xfff2e4, 0.28, 7, 1.6);
  fill.position.set(-1.05, 1.35, 0.85);
  studio.add(fill);

  const rim = new THREE.DirectionalLight(0xc9d4e4, 0.35);
  rim.position.set(-1.6, 1.4, -0.8);
  studio.add(rim);

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
  const oneShot = findNamed(root, "Switch_OneShot") ?? findNamed(root, "SwitchB") ?? machine;
  const twoShot = findNamed(root, "Switch_TwoShot") ?? findNamed(root, "SwitchC") ?? machine;
  const power = findNamed(root, "Switch_Power") ?? machine;
  const dial = findNamed(root, "Dial") ?? machine;
  const studio = createStudio(root);
  const table = findNamed(root, "Table");
  const tabletop = findNamed(root, "Tabletop");
  if (table) studio.attach(table);
  if (tabletop && tabletop !== table) studio.attach(tabletop);

  const labels = new THREE.Group();
  labels.name = "Labels";
  labels.visible = false;
  root.add(labels);
  attachLabel(labels, oneShot, "One Shot", machine, root);
  attachLabel(labels, twoShot, "Two Shot", machine, root);
  attachLabel(labels, power, "Power", machine, root);
  attachLabel(labels, portafilter, "Grinder", machine, root);
  attachLabel(labels, dial, "Temp Control", machine, root);
  attachLabel(labels, waterTank, "Water Tray", machine, root);
  attachLabel(labels, tray, "Tray", machine, root);
  attachLabel(labels, mug, "Coffee Mug", machine, root);

  return { root, machine, mug, waterTank, portafilter, tray, oneShot, twoShot, power, labels, studio };
}
