import { defineConfig } from 'vitest/config';

export default defineConfig({
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**', '**/.tools/**', '**/artifacts/**'] } },
  build: { target: 'es2022', sourcemap: false },
  test: { include: ['tests/**/*.test.ts'], maxWorkers: 2 },
});
