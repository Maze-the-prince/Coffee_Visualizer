import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyUnityFbx() {
  const src = path.resolve(__dirname, "../Assets/ProductViz_Model/FBX/CoffeeMaker.fbx");
  const destDir = path.resolve(__dirname, "public/models");
  const dest = path.join(destDir, "CoffeeMaker.fbx");
  if (!fs.existsSync(src)) {
    console.warn("Unity FBX not found at", src);
    return;
  }
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log("Copied Unity CoffeeMaker.fbx to", dest);
}

export default defineConfig(async ({ command }) => {
  const { needlePlugins, loadConfig } = await import("@needle-tools/engine/vite");
  const needleConfig = await loadConfig();
  copyUnityFbx();

  return {
    base: "./",
    plugins: [
      basicSsl(),
      needlePlugins(command, needleConfig, { noPoster: true, allowHotReload: false }),
    ],
    server: {
      https: true,
      host: true,
      port: 3000,
    },
    preview: {
      https: true,
      host: true,
      port: 4173,
    },
    assetsInclude: ["**/*.fbx"],
    build: {
      outDir: "./dist",
      emptyOutDir: true,
    },
  };
});
