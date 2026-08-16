import { Behaviour, serializable, WebXR } from "@needle-tools/engine";
import * as THREE from "three";
import { CoffeeMakerParts } from "./loadUnityProduct.js";

function localPositionAlongAxis(object: THREE.Object3D, localAxis: THREE.Vector3, distance: number) {
  const origin = object.getWorldPosition(new THREE.Vector3());
  const worldDelta = object
    .localToWorld(localAxis.clone())
    .sub(origin)
    .normalize()
    .multiplyScalar(distance);
  const world = origin.add(worldDelta);
  if (!object.parent) return world;
  return object.parent.worldToLocal(world);
}

export class ProductApp extends Behaviour {
  @serializable(WebXR)
  webxr?: WebXR;

  parts!: CoffeeMakerParts;

  private spinning = false;
  private labelsOn = false;
  private waterOut = false;
  private handleOut = false;
  private trayOut = false;
  private pourTime = 0;
  private pourMesh?: THREE.Mesh;
  private userScale = 1;
  private fittedScale = new THREE.Vector3(1, 1, 1);
  private waterHome = new THREE.Vector3();
  private waterOutPos = new THREE.Vector3();
  private handleHome = new THREE.Euler();
  private trayHome = new THREE.Vector3();
  private trayOutPos = new THREE.Vector3();
  private hint?: HTMLElement;
  private scaleLabel?: HTMLElement;
  private arButton?: HTMLButtonElement;

  awake() {
    this.hint = document.getElementById("hint") ?? undefined;
    this.scaleLabel = document.getElementById("scale-label") ?? undefined;
    this.arButton = document.getElementById("btn-ar") as HTMLButtonElement | undefined;
    this.bindUi();
  }

  start() {
    this.bindProduct();
  }

  bindProduct() {
    if (!this.parts || this.pourMesh) return;
    this.fittedScale.copy(this.parts.root.scale);
    this.waterHome.copy(this.parts.waterTank.position);
    this.waterOutPos.copy(localPositionAlongAxis(this.parts.waterTank, new THREE.Vector3(0, 0, -1), 0.08));
    this.handleHome.copy(this.parts.portafilter.rotation);
    this.trayHome.copy(this.parts.tray.position);
    this.trayOutPos.copy(localPositionAlongAxis(this.parts.tray, new THREE.Vector3(0, 0, 1), 0.06));
    this.createPour();
  }

  update() {
    if (!this.parts) return;

    if (this.spinning) {
      this.parts.root.rotateY(this.context.time.deltaTime * 0.35);
    }

    const dt = Math.min(this.context.time.deltaTime * 2.4, 1);
    this.parts.waterTank.position.lerp(this.waterOut ? this.waterOutPos : this.waterHome, dt);

    const handleTarget = this.handleHome.y + (this.handleOut ? -0.55 : 0);
    this.parts.portafilter.rotation.y = THREE.MathUtils.lerp(this.parts.portafilter.rotation.y, handleTarget, dt);

    this.parts.tray.position.lerp(this.trayOut ? this.trayOutPos : this.trayHome, dt);

    if (this.pourTime > 0) {
      this.pourTime -= this.context.time.deltaTime;
      if (this.pourMesh) {
        this.pourMesh.visible = true;
        this.pourMesh.scale.y = 1 + Math.sin(this.context.time.time * 12) * 0.08;
      }
      if (this.pourTime <= 0 && this.pourMesh) {
        this.pourMesh.visible = false;
      }
    }
  }

  private bindUi() {
    document.getElementById("btn-spin")?.addEventListener("click", () => {
      this.spinning = !this.spinning;
    });
    document.getElementById("btn-labels")?.addEventListener("click", () => {
      this.labelsOn = !this.labelsOn;
      if (this.parts) this.parts.labels.visible = this.labelsOn;
    });
    document.getElementById("btn-water")?.addEventListener("click", () => {
      this.waterOut = !this.waterOut;
      this.handleOut = this.waterOut;
      this.trayOut = this.waterOut;
    });
    document.getElementById("btn-one")?.addEventListener("click", () => this.startPour(2));
    document.getElementById("btn-two")?.addEventListener("click", () => this.startPour(4));
    document.getElementById("btn-smaller")?.addEventListener("click", () => this.nudgeScale(0.9));
    document.getElementById("btn-bigger")?.addEventListener("click", () => this.nudgeScale(1.1));
    this.arButton?.addEventListener("click", () => this.toggleAr());
  }

  private startPour(seconds: number) {
    this.pourTime = seconds;
    if (this.pourMesh) this.pourMesh.visible = true;
  }

  private nudgeScale(factor: number) {
    if (!this.parts) return;
    this.userScale = THREE.MathUtils.clamp(this.userScale * factor, 0.4, 2.5);
    this.parts.root.scale.copy(this.fittedScale).multiplyScalar(this.userScale);
    this.showScale();
  }

  private showScale() {
    if (!this.scaleLabel) return;
    this.scaleLabel.textContent = `Size ${Math.round(this.userScale * 100)}%`;
    window.setTimeout(() => {
      if (this.scaleLabel && this.scaleLabel.textContent?.startsWith("Size")) {
        this.scaleLabel.textContent = "";
      }
    }, 1400);
  }

  private toggleAr() {
    if (!this.webxr) return;
    if (this.context.isInXR) {
      this.webxr.exitXR();
      if (this.parts.studio) this.parts.studio.visible = true;
      if (this.arButton) this.arButton.textContent = "AR";
      if (this.hint) this.hint.textContent = "Orbit to inspect · tap AR to place on a table";
      return;
    }

    if (this.parts.studio) this.parts.studio.visible = false;
    if (this.hint) this.hint.textContent = "Point at a table until the ring appears, then tap to place.";
    if (this.arButton) this.arButton.textContent = "Studio";
    void this.webxr.enterAR();
  }

  private createPour() {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#5c2a0e"),
      roughness: 0.35,
      metalness: 0.05,
    });
    const worldScale = new THREE.Vector3();
    this.parts.portafilter.getWorldScale(worldScale);
    const height = 0.07 / Math.max(worldScale.y, 1e-8);
    const radius = 0.007 / Math.max(worldScale.x, 1e-8);
    this.pourMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.4, height, 10), material);
    this.pourMesh.visible = false;
    this.pourMesh.position.set(0, -height * 0.55, 0);
    this.parts.portafilter.add(this.pourMesh);
  }
}
