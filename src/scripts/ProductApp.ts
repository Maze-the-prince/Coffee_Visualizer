import { Behaviour, OrbitControls, registerType, serializable, WebXR } from "@needle-tools/engine";
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

function partKey(object: THREE.Object3D | null): string {
  while (object) {
    const name = object.name.toLowerCase();
    if (
      name === "switchb" ||
      name === "switchc" ||
      name === "switch_oneshot" ||
      name === "switch_twoshot" ||
      name === "switch_power" ||
      name === "handlegrinder" ||
      name === "traytop" ||
      name === "trayfront" ||
      name === "trayfront001" ||
      name === "trayhandle" ||
      name === "cup" ||
      name === "dial" ||
      name === "watertray"
    ) {
      return name;
    }
    object = object.parent;
  }
  return "";
}

function addTapProxy(target: THREE.Object3D, worldRadius: number) {
  const scale = new THREE.Vector3();
  target.getWorldScale(scale);
  const radius = worldRadius / Math.max(Math.abs(scale.x), 1e-8);
  const proxy = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 10, 10),
    new THREE.MeshBasicMaterial({ visible: false, depthWrite: false })
  );
  proxy.name = `${target.name}_hit`;
  target.add(proxy);
}

function setPressed(id: string, pressed: boolean) {
  document.getElementById(id)?.setAttribute("aria-pressed", pressed ? "true" : "false");
}

@registerType
export class ProductApp extends Behaviour {
  @serializable(WebXR)
  webxr?: WebXR;

  @serializable(OrbitControls)
  orbit?: OrbitControls;

  parts!: CoffeeMakerParts;

  private spinning = false;
  private labelsOn = false;
  private waterOut = false;
  private handleOut = false;
  private trayOut = false;
  private mugOut = false;
  private dialTurned = false;
  private pourTime = 0;
  private pourMesh?: THREE.Mesh;
  private userScale = 1;
  private fittedScale = new THREE.Vector3(1, 1, 1);
  private waterHome = new THREE.Vector3();
  private waterOutPos = new THREE.Vector3();
  private handleHome = new THREE.Euler();
  private trayHome = new THREE.Vector3();
  private trayOutPos = new THREE.Vector3();
  private mugHome = new THREE.Vector3();
  private mugOutPos = new THREE.Vector3();
  private dialHome = 0;
  private hint?: HTMLElement;
  private scaleLabel?: HTMLElement;
  private arButton?: HTMLButtonElement;
  private labelsLayer?: HTMLElement;
  private projected = new THREE.Vector3();
  private ndc = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private pointerDown = new THREE.Vector2();
  private clickBound = false;
  private leftView = false;

  awake() {
    this.hint = document.getElementById("hint") ?? undefined;
    this.scaleLabel = document.getElementById("scale-label") ?? undefined;
    this.arButton = document.getElementById("btn-ar") as HTMLButtonElement | undefined;
    this.labelsLayer = document.getElementById("labels-layer") ?? undefined;
    this.bindUi();
  }

  start() {
    this.bindProduct();
  }

  bindProduct() {
    if (!this.parts || this.pourMesh) return;
    this.fittedScale.copy(this.parts.root.scale);
    this.waterHome.copy(this.parts.waterTank.position);
    this.waterOutPos.copy(localPositionAlongAxis(this.parts.waterTank, new THREE.Vector3(0, 0, -1), 0.16));
    this.handleHome.copy(this.parts.portafilter.rotation);
    this.trayHome.copy(this.parts.tray.position);
    this.trayOutPos.copy(localPositionAlongAxis(this.parts.tray, new THREE.Vector3(0, 0, 1), 0.09));
    this.mugHome.copy(this.parts.mug.position);
    this.mugOutPos.copy(localPositionAlongAxis(this.parts.mug, new THREE.Vector3(0, 1, 0), 0.04));
    this.dialHome = this.parts.dial.rotation.x;
    if (this.parts.oneShot !== this.parts.machine) addTapProxy(this.parts.oneShot, 0.028);
    if (this.parts.twoShot !== this.parts.machine) addTapProxy(this.parts.twoShot, 0.028);
    if (this.parts.power !== this.parts.machine) addTapProxy(this.parts.power, 0.028);
    if (this.parts.dial !== this.parts.machine) addTapProxy(this.parts.dial, 0.03);
    this.createPour();
    this.bindModelClicks();
  }

  update() {
    if (!this.parts) return;

    if (this.spinning) {
      this.parts.root.rotateY(this.context.time.deltaTime * 0.35);
    }

    const dt = Math.min(this.context.time.deltaTime * 2.4, 1);
    this.parts.waterTank.position.lerp(this.waterOut ? this.waterOutPos : this.waterHome, dt);

    const handleTarget = this.handleHome.y + (this.handleOut ? THREE.MathUtils.degToRad(25) : 0);
    this.parts.portafilter.rotation.y = THREE.MathUtils.lerp(this.parts.portafilter.rotation.y, handleTarget, dt);

    this.parts.tray.position.lerp(this.trayOut ? this.trayOutPos : this.trayHome, dt);
    this.parts.mug.position.lerp(this.mugOut ? this.mugOutPos : this.mugHome, dt);

    const dialTarget = this.dialHome + (this.dialTurned ? Math.PI * 0.5 : 0);
    this.parts.dial.rotation.x = THREE.MathUtils.lerp(this.parts.dial.rotation.x, dialTarget, dt);

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

    this.projectLabels();
  }

  private projectLabels() {
    if (!this.labelsLayer || !this.parts) return;
    const show = this.labelsOn && this.parts.labels.visible && !this.context.isInXR;
    this.labelsLayer.hidden = !show;
    if (!show) return;

    const camera = this.context.mainCamera as THREE.Camera;
    camera.updateMatrixWorld();
    const canvas = this.context.renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    for (const node of this.labelsLayer.querySelectorAll<HTMLElement>(".callout")) {
      const anchor = this.parts.labels.getObjectByName(node.dataset.anchor ?? "");
      if (!anchor) {
        node.style.display = "none";
        continue;
      }
      anchor.getWorldPosition(this.projected);
      this.projected.project(camera);
      const visible = this.projected.z >= -1 && this.projected.z <= 1;
      node.style.display = visible ? "block" : "none";
      if (!visible) continue;
      node.style.left = `${rect.left + (this.projected.x * 0.5 + 0.5) * rect.width}px`;
      node.style.top = `${rect.top + (-this.projected.y * 0.5 + 0.5) * rect.height}px`;
    }
  }

  private bindUi() {
    document.getElementById("btn-spin")?.addEventListener("click", () => {
      this.spinning = !this.spinning;
      setPressed("btn-spin", this.spinning);
    });
    document.getElementById("btn-labels")?.addEventListener("click", () => {
      this.labelsOn = !this.labelsOn;
      if (this.parts) this.parts.labels.visible = this.labelsOn;
      setPressed("btn-labels", this.labelsOn);
    });
    document.getElementById("btn-water")?.addEventListener("click", () => {
      this.waterOut = !this.waterOut;
      setPressed("btn-water", this.waterOut);
    });
    document.getElementById("btn-view-left")?.addEventListener("click", () => this.setView(true));
    document.getElementById("btn-view-right")?.addEventListener("click", () => this.setView(false));
    document.getElementById("btn-smaller")?.addEventListener("click", () => this.nudgeScale(0.9));
    document.getElementById("btn-bigger")?.addEventListener("click", () => this.nudgeScale(1.1));
    this.labelsLayer?.addEventListener("click", (event) => this.onLabelClick(event));
    this.arButton?.addEventListener("click", () => this.toggleAr());
  }

  private bindModelClicks() {
    if (this.clickBound) return;
    const canvas = this.context.renderer.domElement;
    const onDown = (event: PointerEvent) => this.pointerDown.set(event.clientX, event.clientY);
    const onUp = (event: PointerEvent) => this.onCanvasPointer(event);
    canvas.addEventListener("pointerdown", onDown, { capture: true });
    canvas.addEventListener("pointerup", onUp, { capture: true });
    this.clickBound = true;
  }

  private onLabelClick(event: Event) {
    const target = event.target as HTMLElement | null;
    const action = target?.dataset.action;
    if (action === "one") this.startPour(2);
    else if (action === "two") this.startPour(4);
  }

  private onCanvasPointer(event: PointerEvent) {
    if (!this.parts) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const dx = event.clientX - this.pointerDown.x;
    const dy = event.clientY - this.pointerDown.y;
    if (dx * dx + dy * dy > 484) return;

    const canvas = this.context.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    this.ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.ndc, this.context.mainCamera as THREE.Camera);
    const hits = this.raycaster.intersectObject(this.parts.root, true);
    for (const hit of hits) {
      const key = partKey(hit.object);
      if (!key) continue;
      this.tapPart(key);
      return;
    }
  }

  private tapPart(key: string) {
    if (key === "switchb" || key === "switch_oneshot") this.startPour(2);
    else if (key === "switchc" || key === "switch_twoshot") this.startPour(4);
    else if (key === "handlegrinder") this.handleOut = !this.handleOut;
    else if (key === "traytop" || key === "trayfront" || key === "trayfront001" || key === "trayhandle") this.trayOut = !this.trayOut;
    else if (key === "cup") this.mugOut = !this.mugOut;
    else if (key === "dial") this.dialTurned = !this.dialTurned;
    else if (key === "watertray") {
      this.waterOut = !this.waterOut;
      setPressed("btn-water", this.waterOut);
    }
  }

  private setView(left: boolean) {
    const camera = this.context.mainCamera as THREE.PerspectiveCamera | undefined;
    if (!camera || !this.orbit) return;
    this.leftView = left;
    if (left) camera.position.set(-0.45, 0.45, 0.98);
    else camera.position.set(0.55, 0.48, 0.92);
    camera.lookAt(0, 0.16, 0);
    camera.updateProjectionMatrix();
    this.orbit.setCameraAndLookTarget(camera, true);

    const leftBtn = document.getElementById("btn-view-left");
    const rightBtn = document.getElementById("btn-view-right");
    if (leftBtn) leftBtn.hidden = left;
    if (rightBtn) rightBtn.hidden = !left;
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
      document.body.classList.remove("in-ar");
      if (this.parts.studio) this.parts.studio.visible = true;
      if (this.arButton) this.arButton.textContent = "AR";
      if (this.hint) this.hint.textContent = "Orbit to inspect · tap AR to place on a table";
      return;
    }

    if (this.parts.studio) this.parts.studio.visible = false;
    if (this.labelsLayer) this.labelsLayer.hidden = true;
    document.body.classList.add("in-ar");
    if (this.hint) this.hint.textContent = "Point at a table until the ring appears, then tap to place.";
    if (this.arButton) this.arButton.textContent = "Studio";
    void Promise.resolve(this.webxr.enterAR()).catch(() => {
      document.body.classList.remove("in-ar");
      if (this.parts.studio) this.parts.studio.visible = true;
      if (this.arButton) this.arButton.textContent = "AR";
      if (this.hint) this.hint.textContent = "WebAR needs Chrome on Android (HTTPS). iPhone AR is limited in the browser.";
    });
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
