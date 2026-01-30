import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: "src/content/bootstrap.ts",
        background: "src/background/serviceWorker.ts",
        popup: "src/popup/popup.html"
      },
      output: {
        entryFileNames: "[name].js"
      }
    }
  }
});
