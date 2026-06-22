// @license
// Copyright (c) 2025 Rljson
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';


export default defineConfig({
  // Emit .d.ts type declarations alongside the bundle so the published package
  // ships types (package.json "types" -> dist/index.d.ts). The `tsc` build step
  // cannot emit them because tsconfig sets "noEmit": true.
  plugins: [dts({ include: ['src/**/*'] })],
  build: {
    copyPublicDir: false,
    minify: false,
    // sourcemap: 'inline',

    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        '@rljson/rljson',
        '@rljson/json',
        '@rljson/hash',
        // Add all peer depencies from package.json here
      ],
      output: {
        globals: {},
      },
    },
  },
});
