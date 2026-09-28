import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/; the Pages workflow sets BASE_PATH.
  base: process.env.BASE_PATH ?? "/",
  build: {
    target: "es2022",
    // Keep the default [name]-[hash].js naming: each form chunk is named after
    // its file (intake.form-XXXX.js), which the lazy-loading test relies on.
  },
});
