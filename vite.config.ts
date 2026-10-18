import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // BASE_PATH is set by the GitHub Pages workflow to /<repository-name>/.
  // The local dev server and other hosts continue to use the domain root.
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
});
