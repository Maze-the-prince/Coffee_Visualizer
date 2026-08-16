import { Behaviour, serializable, WebXR } from "@needle-tools/engine";
import * as THREE from "three";
import { CoffeeMakerParts } from "./createCoffeeMaker.js";

export class ProductApp extends Behaviour {
  @serializable(WebXR)
  webxr?: WebXR;

  parts!: CoffeeMakerParts;

  private spinning = false;
  private labelsOn = false;
  private waterOut = false;
  private pourTime = 0;
  private pourMesh?: THREE.Mesh;
  private scale = 1;
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
    this.createPour();
  }

  update() {
    if (this.spinning) {
      this.parts.machine.rotateY(this.context.time.deltaTime * 0.35);
    }

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
      this.parts.labels.visible = this.labelsOn;
    });
    document.getElementById("btn-water")?.addEventListener("click", () => {
      this.waterOut = !this.waterOut;
      this.parts.waterTank.position.z = this.waterOut ? -0.28 : -0.1;
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
    this.pourMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.09, 10), material);
    this.pourMesh.position.set(0, 0.24, 0.18);
    this.pourMesh.visible = false;
    this.parts.machine.add(this.pourMesh);
  }
}
