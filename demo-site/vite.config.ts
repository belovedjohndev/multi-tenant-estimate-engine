import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: path.resolve(projectDirectory, 'src'),
    server: {
        port: 4173,
        fs: {
            allow: [path.resolve(projectDirectory, '..')]
        }
    },
    build: {
        outDir: path.resolve(projectDirectory, 'dist'),
        emptyOutDir: true
    }
});
