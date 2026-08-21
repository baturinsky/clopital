import glsl from 'vite-plugin-glsl';
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { viteSingleFile } from "vite-plugin-singlefile"
import { defineConfig, UserConfig } from 'vite';

export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => {

  return {
    plugins: [
      glsl({ minify: true }),
      wasm(),
      topLevelAwait(),
      viteSingleFile({ removeViteModuleLoader: true }),
    ],
    base: '',
    define: {
      DEBUG: mode == 'development'
    },

    build: {
      minify: mode == "min"?'terser':false,
      cssMinify: mode == "min",
      modulePreload: { polyfill: false },
      emptyOutDir: true,
      outDir: "./dist",
      rollupOptions: {
        output: { entryFileNames: "bundle.js" }
      }
    }
  } as UserConfig
});

