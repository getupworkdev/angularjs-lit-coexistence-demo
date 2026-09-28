import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2022",
    // Keep the default [name]-[hash].js naming: each form chunk is named after
    // its file (intake.form-XXXX.js), which the lazy-loading test relies on.
  },
});
