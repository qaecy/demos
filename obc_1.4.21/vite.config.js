import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
      build: {
        rollupOptions: {
          input: {
            trans: "./issue-transparency.html"
          },
        }
      },
  };
});
