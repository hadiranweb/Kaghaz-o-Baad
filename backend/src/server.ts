import Fastify from 'fastify';
import cors from '@fastify/cors';
import { loadEnv } from './config/env.js';
import { registerAuthRoutes } from './auth/routes.js';
import { closeDatabase } from './db/pool.js';
import { registerWorkflowRoutes } from './modules/workflow/routes.js';
import { registerCommentRoutes } from './modules/workflow/comment-routes.js';

const env = loadEnv();
const app = Fastify({ logger: true });

await app.register(cors, {
  origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
  credentials: true,
});

await registerAuthRoutes(app);
await registerWorkflowRoutes(app);
await registerCommentRoutes(app);

app.get('/health', async () => ({
  ok: true,
  service: 'kaghazbaad-backend',
  environment: env.NODE_ENV,
  version: '0.1.0',
}));

app.get('/api/v1/health', async () => ({
  ok: true,
  service: 'kaghazbaad-backend',
  environment: env.NODE_ENV,
  version: '0.1.0',
}));

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  return reply.status(500).send({ error: 'internal_server_error' });
});

const shutdown = async () => {
  await app.close();
  await closeDatabase();
};

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
