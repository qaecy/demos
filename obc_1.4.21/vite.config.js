import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
    rollupOptions: {
      input: {
        main: "./index.html",
        trans: "./issue-transparency.html"
      },
    }
  },
);
