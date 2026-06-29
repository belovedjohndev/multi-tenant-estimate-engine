import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    build: {
        emptyOutDir: false,
        lib: {
            entry: path.resolve(projectDirectory, 'src/index.ts'),
            name: 'EstimateEngineWidget',
            formats: ['es', 'iife'],
            fileName: (format) => `estimate-engine-widget.${format === 'es' ? 'es.js' : 'iife.js'}`
        },
        outDir: path.resolve(projectDirectory, 'dist'),
        sourcemap: true,
        target: 'es2020'
    }
});
