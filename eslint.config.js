import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';

export default ts.config(
  { ignores: ['dist/**', 'node_modules/**', 'src-tauri/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  { files: ['**/*.ts'], languageOptions: { globals: { ...globals.browser, ...globals.es2022 } } },
  { files: ['**/*.mjs', '*.js'], languageOptions: { globals: globals.node } },
  { files: ['scripts/test-ui.mjs', 'scripts/test-desktop.mjs', 'scripts/verify-desktop-startup.mjs'], languageOptions: { globals: globals.browser } },
);
