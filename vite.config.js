import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/json-viewer.js',
      formats: ['es'],
      fileName: () => 'json-viewer.js'
    },
    rollupOptions: { external: [], output: { globals: {} } }
  },
  server: { open: '/docs/index.html' }
})
