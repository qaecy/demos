import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
      build: {
        rollupOptions: {
          input: {
            main: "./index.html",
            trans: "./issue-transparency.html"
          },
        }
      },
  };
});
