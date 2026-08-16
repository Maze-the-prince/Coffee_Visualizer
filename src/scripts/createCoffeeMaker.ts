import * as THREE from "three";

const RED = new THREE.Color("#c4162e");
const BLACK = new THREE.Color("#121214");
const CHROME = new THREE.Color("#c8ccd0");
const GRANITE = new THREE.Color("#c9c6bf");
const TEAL = new THREE.Color("#2aa7a1");

function lit(color: THREE.Color, extras: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: extras.metalness ?? 0.18,
    roughness: extras.roughness ?? 0.42,
    transparent: extras.transparent ?? false,
    opacity: extras.opacity ?? 1,
    envMapIntensity: 1,
    ...extras,
  });
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

export type CoffeeMakerParts = {
  root: THREE.Group;
  machine: THREE.Group;
  mug: THREE.Mesh;
  waterTank: THREE.Mesh;
  portafilter: THREE.Group;
  tray: THREE.Group;
  labels: THREE.Group;
};

export function createCoffeeMaker(): CoffeeMakerParts {
  const red = lit(RED, { metalness: 0.22, roughness: 0.38 });
  const black = lit(BLACK, { metalness: 0.2, roughness: 0.28 });
  const chrome = lit(CHROME, { metalness: 1, roughness: 0.12 });
  const glass = lit(new THREE.Color("#7ec8d4"), { metalness: 0.05, roughness: 0.08, transparent: true, opacity: 0.28 });
  const ceramic = lit(new THREE.Color("#f3f1ea"), { metalness: 0.04, roughness: 0.55 });
  const stone = lit(GRANITE, { metalness: 0.08, roughness: 0.72 });

  const root = new THREE.Group();
  root.name = "CoffeeMaker";

  const counter = mesh(new THREE.BoxGeometry(1.15, 0.08, 0.62), stone, 0, 0.04, 0);
  root.add(counter);

  const wall = mesh(new THREE.BoxGeometry(0.02, 0.7, 0.62), lit(new THREE.Color("#3a3a3d"), { roughness: 0.9 }), 0.42, 0.43, 0);
  root.add(wall);
  const accent = mesh(new THREE.BoxGeometry(0.02, 0.7, 0.28), lit(TEAL, { roughness: 0.55 }), 0.43, 0.43, 0.17);
  root.add(accent);

  const machine = new THREE.Group();
  machine.name = "MainUnit";
  machine.position.set(-0.08, 0.08, 0);
  root.add(machine);

  machine.add(mesh(new THREE.BoxGeometry(0.34, 0.28, 0.28), red, 0, 0.2, 0));
  machine.add(mesh(new THREE.BoxGeometry(0.3, 0.08, 0.26), red, 0, 0.38, 0));
  machine.add(mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.1, 32), red, 0, 0.47, 0.01));
  machine.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 24), chrome, 0, 0.34, 0.15));

  const gauge = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 24), chrome, -0.08, 0.24, 0.145);
  gauge.rotation.x = Math.PI / 2;
  machine.add(gauge);
  const gaugeFace = mesh(new THREE.CircleGeometry(0.038, 24), lit(new THREE.Color("#f2f2f0"), { roughness: 0.35 }), -0.08, 0.24, 0.156);
  machine.add(gaugeFace);

  const switchGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12);
  const one = mesh(switchGeo, chrome, 0.05, 0.22, 0.145);
  one.rotation.x = Math.PI / 2;
  one.name = "Switch_OneShot";
  machine.add(one);
  const two = mesh(switchGeo, chrome, 0.09, 0.22, 0.145);
  two.rotation.x = Math.PI / 2;
  two.name = "Switch_TwoShot";
  machine.add(two);
  const power = mesh(switchGeo, chrome, 0.14, 0.3, 0.02);
  power.name = "Switch_Power";
  machine.add(power);

  const dial = mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.03, 20), black, 0.14, 0.22, 0.04);
  dial.name = "Dial";
  machine.add(dial);

  const waterTank = mesh(new THREE.BoxGeometry(0.22, 0.16, 0.08), glass, 0, 0.5, -0.1);
  waterTank.name = "WaterTray";
  machine.add(waterTank);

  const portafilter = new THREE.Group();
  portafilter.name = "HandleGrinder";
  portafilter.position.set(0, 0.29, 0.16);
  portafilter.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 16), black, 0, 0, 0.07));
  const grip = mesh(new THREE.SphereGeometry(0.028, 16, 12), black, 0, 0, 0.14);
  portafilter.add(grip);
  machine.add(portafilter);

  const tray = new THREE.Group();
  tray.name = "Tray";
  tray.position.set(0, 0.085, 0.07);
  tray.add(mesh(new THREE.BoxGeometry(0.26, 0.03, 0.16), black, 0, 0, 0));
  tray.add(mesh(new THREE.BoxGeometry(0.26, 0.05, 0.02), red, 0, -0.01, 0.08));
  const knob = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12), chrome, 0, 0, 0.1);
  knob.rotation.x = Math.PI / 2;
  tray.add(knob);
  machine.add(tray);

  const mug = mesh(new THREE.CylinderGeometry(0.035, 0.032, 0.055, 24), ceramic, 0.28, 0.115, 0.08);
  mug.name = "Cup";
  const handle = mesh(new THREE.TorusGeometry(0.022, 0.006, 8, 16, Math.PI), ceramic, 0.318, 0.12, 0.08);
  handle.rotation.y = Math.PI / 2;
  root.add(mug);
  root.add(handle);

  const labels = new THREE.Group();
  labels.name = "Labels";
  labels.visible = false;
  const makeLabel = (title: string, x: number, y: number, z: number) => {
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
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true }));
    sprite.scale.set(0.22, 0.055, 1);
    sprite.position.set(x, y, z);
    labels.add(sprite);
  };
  makeLabel("One Shot", 0.02, 0.36, 0.22);
  makeLabel("Two Shot", 0.12, 0.36, 0.22);
  makeLabel("Power", 0.22, 0.42, 0.08);
  makeLabel("Portafilter", -0.16, 0.32, 0.22);
  makeLabel("Coffee Mug", 0.28, 0.2, 0.16);
  makeLabel("Tray", 0.0, 0.16, 0.24);
  machine.add(labels);

  root.scale.setScalar(1);
  return { root, machine, mug, waterTank, portafilter, tray, labels };
}
