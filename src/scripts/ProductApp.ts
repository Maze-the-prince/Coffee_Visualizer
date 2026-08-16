import { Behaviour, serializable, WebXR } from "@needle-tools/engine";
import * as THREE from "three";
import { CoffeeMakerParts } from "./loadUnityProduct.js";

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
  private scale = 1;
  private waterHome = new THREE.Vector3();
  private handleHome = new THREE.Euler();
  private trayHome = new THREE.Vector3();
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
    this.waterHome.copy(this.parts.waterTank.position);
    this.handleHome.copy(this.parts.portafilter.rotation);
    this.trayHome.copy(this.parts.tray.position);
    this.createPour();
  }

  update() {
    if (!this.parts) return;

    if (this.spinning) {
      this.parts.machine.rotateY(this.context.time.deltaTime * 0.35);
    }

    const dt = Math.min(this.context.time.deltaTime * 2.4, 1);
    const waterTarget = this.waterHome.clone();
    if (this.waterOut) waterTarget.z -= 0.12;
    this.parts.waterTank.position.lerp(waterTarget, dt);

    const handleTarget = this.handleHome.y + (this.handleOut ? -0.55 : 0);
    this.parts.portafilter.rotation.y = THREE.MathUtils.lerp(this.parts.portafilter.rotation.y, handleTarget, dt);

    const trayTarget = this.trayHome.clone();
    if (this.trayOut) trayTarget.z += 0.08;
    this.parts.tray.position.lerp(trayTarget, dt);

    if (this.pourTime > 0) {
      this.pourTime -= this.context.time.deltaTime;
      if (this.pourMesh) {
        this.pourMesh.visible = true;
        this.pourMesh.scale.y = 0.6 + Math.sin(this.context.time.time * 12) * 0.08;
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
    this.scale = THREE.MathUtils.clamp(this.scale * factor, 0.4, 2.5);
    this.parts.root.scale.setScalar(this.scale);
    this.showScale();
  }

  private showScale() {
    if (!this.scaleLabel) return;
    this.scaleLabel.textContent = `Size ${Math.round(this.scale * 100)}%`;
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
      if (this.arButton) this.arButton.textContent = "AR";
      if (this.hint) this.hint.textContent = "Orbit to inspect · tap AR to place on a table";
      return;
    }

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
    this.pourMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.08, 10), material);
    this.pourMesh.visible = false;
    const box = new THREE.Box3().setFromObject(this.parts.portafilter);
    const size = new THREE.Vector3();
    box.getSize(size);
    this.pourMesh.position.set(0, -Math.max(size.y * 0.35, 0.04), Math.max(size.z * 0.2, 0.02));
    this.parts.portafilter.add(this.pourMesh);
  }
}
