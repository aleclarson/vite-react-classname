import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    isolate: false,
    exclude: ['**/vendor/**', 'node_modules'],
    env: {
      TEST: 'vite-react-classname',
    },
  },
})
