/// <reference types="vitest" />
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    include: ['./test/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['./test/**/util.ts'],
    globals: true,
    coverage: {
      provider: 'istanbul'
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'HAMT-ts',
      formats: ['es', 'cjs', 'umd']
    }
  }
})
