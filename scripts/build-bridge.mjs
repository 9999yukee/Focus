import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

export async function buildBridge() {
  await build({ entryPoints: ['src/discord/bridge.ts'], outfile: 'src-tauri/bridge.js', bundle: true, format: 'iife', target: 'es2022', minify: true });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await buildBridge();
