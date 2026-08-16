import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(async ({ command }) => {
  const { needlePlugins, loadConfig } = await import("@needle-tools/engine/vite");
  const needleConfig = await loadConfig();

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
    build: {
      outDir: "./dist",
      emptyOutDir: true,
    },
  };
});
