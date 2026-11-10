import { resolve } from 'node:path';
import viteFastify from '@fastify/vite/plugin';

export default {
  root: resolve(import.meta.dirname, 'src/client'),
  plugins: [viteFastify({ spa: true })],
  build: {
    emptyOutDir: true, // clear the output directory before building
    outDir: resolve(import.meta.dirname, 'dist'),
  }
};