import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  root: "src/frontend",
  base: "/app/",
  publicDir: false,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../../dist/frontend",
    emptyOutDir: true,
    sourcemap: false,
    modulePreload: { polyfill: false },
    target: "es2023",
  },
});
