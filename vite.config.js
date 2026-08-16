import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function copyUnityAssets() {
  const destDir = path.resolve(__dirname, "public/models");
  const texDir = path.join(destDir, "textures");
  const unityRoots = [
    path.resolve(__dirname, "../Assets"),
    path.resolve("C:/Users/Le Condor Engineer/Desktop/Product_Visualization/Assets"),
  ];
  const unityRoot = unityRoots.find((root) => fs.existsSync(path.join(root, "ProductViz_Model/FBX/CoffeeMaker.fbx")));
  if (!unityRoot) return;

  copyIfExists(path.join(unityRoot, "ProductViz_Model/FBX/CoffeeMaker.fbx"), path.join(destDir, "CoffeeMaker.fbx"));

  const texturePairs = [
    ["ProductViz_Model/Textures/TopBody_MAT__baseColor.png", "TopBody_MAT__baseColor.png"],
    ["ProductViz_Model/Textures/TopBody_MAT__roughness.png", "TopBody_MAT__roughness.png"],
    ["ProductViz_Model/Textures/TopBody_MAT__metallic.png", "TopBody_MAT__metallic.png"],
    ["ProductViz_Model/Textures/CoffeeHandle_MAT__baseColor.png", "CoffeeHandle_MAT__baseColor.png"],
    ["ProductViz_Model/Textures/CoffeeHandle_MAT__roughness.png", "CoffeeHandle_MAT__roughness.png"],
    ["ProductViz_Model/Textures/CoffeeHandle_MAT__metallic.png", "CoffeeHandle_MAT__metallic.png"],
    ["ProductViz_Model/Textures/CoffeeHandle_MAT__normal.png", "CoffeeHandle_MAT__normal.png"],
    ["ProductViz_Model/Textures/Switch_MAT__baseColor.png", "Switch_MAT__baseColor.png"],
    ["ProductViz_Model/Textures/Switch_MAT__roughness.png", "Switch_MAT__roughness.png"],
    ["ProductViz_Model/Textures/Switch_MAT__metallic.png", "Switch_MAT__metallic.png"],
    ["ProductViz_Model/Textures/Dials_MAT__baseColor.png", "Dials_MAT__baseColor.png"],
    ["ProductViz_Model/Textures/Dials_MAT__roughness.png", "Dials_MAT__roughness.png"],
    ["ProductViz_Model/Textures/Dials_MAT__metallic.png", "Dials_MAT__metallic.png"],
    ["Art/Textures/General/ConcreteRough_Albedo.png", "Tabletop_Albedo.png"],
    ["Art/Textures/General/ConcreteTaupe_02_Albedo.png", "Table_Albedo.png"],
  ];
  for (const [rel, name] of texturePairs) {
    copyIfExists(path.join(unityRoot, rel), path.join(texDir, name));
  }
}

export default defineConfig(async ({ command }) => {
  const { needlePlugins, loadConfig } = await import("@needle-tools/engine/vite");
  const needleConfig = await loadConfig();
  copyUnityAssets();

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
