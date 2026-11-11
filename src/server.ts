import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import Fastify from 'fastify';
import FastifyVite from '@fastify/vite';
import { Type } from '@fastify/type-provider-typebox'
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

const fastify = Fastify().withTypeProvider<TypeBoxTypeProvider>();
const sqlite = new DatabaseSync('diversesnp.db', { readOnly: true });

await fastify.register(FastifyVite, {
  root: resolve(import.meta.dirname, '..'), // where to look for vite.config.js
  dev: process.argv.includes('--dev'),
  spa: true,
});

fastify.get('/', (req, reply) => {
  return reply.html()
});

fastify.post('/api/data', {
  schema: {
    body: Type.Object({
      sample_ids: Type.Array(Type.String()),
      dims: Type.Array(Type.Number()),
    }),
  }
}, async (req, reply) => {
  // check if the req body is json
  if (req.headers['content-type'] !== 'application/json') {
    return reply.status(415).send({ error: 'Unsupported media type' });
  }
  
  var sample_ids: string[] = req.body.sample_ids;
  const dims: number[] = req.body.dims;

  const result: Record<string, {
    pop_id: unknown;
    // super_pop_id: unknown;
    values: Record<string, unknown>;
  }> = {};

  const sampleToPop = sqlite.prepare(
    'SELECT pop_id FROM sample2pop WHERE sample_id = ?'
  );
  const popToSuperPop = sqlite.prepare(
    'SELECT super_pop_id FROM pop_desc WHERE pop_id = ?'
  );
  const pcaValue = sqlite.prepare(
    'SELECT value FROM pca WHERE sample_id = ? AND dim = ?'
  );

  if (sample_ids.length === 0) {
    return reply.status(400).send({ error: 'No sample IDs provided' });
  }

  // if sample_ids contains "*", get all sample IDs from the database
  if (sample_ids.includes("*")) {
    const samples = sqlite.prepare(
      'SELECT sample_id FROM pca'
    ).all() as { sample_id: string }[];
    sample_ids = samples.map(sample => sample.sample_id);
  }

  for (const sample_id of sample_ids) {
    const samplePop = sampleToPop.get(sample_id) as
      | { pop_id: unknown }
      | undefined;
    if (!samplePop) continue;

    // const popDescription = popToSuperPop.get(samplePop.pop_id) as
    //   | { super_pop_id: unknown }
    //   | undefined;
    // if (!popDescription) continue;

    const values: Record<string, unknown> = {};
    for (const dim of dims) {
      const row = pcaValue.get(sample_id, dim) as
        | { value: unknown }
        | undefined;
      if (row) values[String(dim)] = row.value;
    }

    result[sample_id] = {
      pop_id: samplePop.pop_id,
      // super_pop_id: popDescription.super_pop_id,
      values,
    };
  }

  return reply.type('application/json').send(result);
});

await fastify.vite.ready();
await fastify.listen({ port: 3000 });