import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

// IMPORTANTE: troque "gafin" pelo nome real do seu repositório no GitHub,
// caso seja diferente. Em dev o base continua "/" para não atrapalhar o
// servidor local.
const REPO_NAME = "Gafin";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? `/${REPO_NAME}/` : "/",
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        id: "/gafin/",
        name: "Gafin",
        short_name: "Gafin",
        description: "Seu dinheiro, sob controle.",
        theme_color: "#0D945C",
        background_color: "#0B0F0D",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        scope: ".",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Cacheia os assets de build (JS/CSS/HTML/ícones) para funcionamento
        // 100% offline após a primeira visita.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
}));
