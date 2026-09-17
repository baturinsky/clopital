import { defineConfig, UserConfig } from 'vite';
import { roadrollerPlugin } from "js13k-vite-plugins";
import { viteSingleFile } from "vite-plugin-singlefile"
import plainText from 'vite-plugin-plain-text';

export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => {

  return {
    plugins: [
      plainText([/\.md$/]),
      ...mode == "min"?[roadrollerPlugin()]:[viteSingleFile()]
    ],
    base: '',
    define: {
      DEBUG: mode == 'development'
    },

    build: {
      minify: mode == "min" ? 'terser' : false,
      terserOptions: mode == "min" ? hardTerse: {},
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

const hardTerse = {

  compress: {
    // Enforce maximum compression iterations
    passes: 3,

    // General dangerous compressions
    unsafe_arrows: true,
    //unsafe_comps: true,
    unsafe_Function: true,
    unsafe_math: true,
    unsafe_symbols: true,
    unsafe_methods: true,
    unsafe_proto: true,
    unsafe_regexp: true,

    // Clean up code for size
    drop_console: true,
    drop_debugger: true,
    dead_code: true,
  },
  mangle: {
    // Mangle variables at the highest scope level
    toplevel: true,

    // Force-mangle property names on objects/classes
    properties: false && {
      // If you use standard DOM APIs (like Canvas ctx.fillStyle), 
      // set builtins: false to prevent Terser from mangling native browser traits.
      builtins: false,

      // Mangle everything except strings enclosed in quotes (helps prevent breaking keys)
      keep_quoted: 'strict',

      undeclared: true,

      reserved: ["C", "DEFS", "TIP", "biomesByNames", "races", "biomes"]
    }
  },
  format: {
    // Remove all comments from final output
    comments: false,
  },
  // Target modern JS to avoid ES5 bloat wrapper code
  ecma: 2024,
}
