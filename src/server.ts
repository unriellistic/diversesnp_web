import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import Fastify from 'fastify';
import FastifyVite from '@fastify/vite';

const server = Fastify();
const db = new DatabaseSync("pca.db");

await server.register(FastifyVite, {
  root: resolve(import.meta.dirname, '..'), // where to look for vite.config.js
  dev: process.argv.includes('--dev'),
  spa: true,
});

server.get('/', (req, reply) => {
  return reply.html()
});

await server.vite.ready();
await server.listen({ port: 3000 });