import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function chrome55FixPlugin(): Plugin {
  return {
    name: 'chrome55-fix-plugin',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const fileName in bundle) {
        const item = bundle[fileName];
        if (item.type === 'chunk' && typeof item.code === 'string') {
          if (/\b[0-9]+n\b/.test(item.code)) {
            item.code = item.code.replace(/\b([0-9]+)n\b/g, '$1');
          }
        }
      }
    },
    closeBundle() {
      try {
        const assetsDir = path.resolve(__dirname, 'dist/assets');
        if (fs.existsSync(assetsDir)) {
          const files = fs.readdirSync(assetsDir);
          for (const f of files) {
            if (f.endsWith('.js')) {
              const fullPath = path.join(assetsDir, f);
              let content = fs.readFileSync(fullPath, 'utf8');
              if (/\b[0-9]+n\b/.test(content)) {
                content = content.replace(/\b([0-9]+)n\b/g, '$1');
                fs.writeFileSync(fullPath, content);
              }
            }
          }
        }
      } catch (e) {
        console.warn('[Chrome 55 plugin] closeBundle check error:', e);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      legacy({
        targets: ['chrome >= 55', 'defaults'],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      }),
      chrome55FixPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
