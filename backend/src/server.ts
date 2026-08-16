import Fastify from 'fastify';
import cors from '@fastify/cors';
import { loadEnv } from './config/env.js';
import { registerAuthRoutes } from './auth/routes.js';
import { closeDatabase } from './db/pool.js';
import { registerArticleRoutes } from './modules/workflow/article-routes.js';
import { registerWorkflowRoutes } from './modules/workflow/routes.js';
import { registerCommentRoutes } from './modules/workflow/comment-routes.js';
import { registerPasswordRoute } from './auth/password-route.js';
import { registerTitleSuggestionRoutes } from './modules/ai/title-routes.js';
import { registerRewriteRoutes } from './modules/ai/rewrite-routes.js';
import { registerQuotaRoutes } from './modules/quota/routes.js';
import { registerUsageReportRoutes } from './modules/admin/usage-report-routes.js';
import { registerAdminUsersRoutes } from './modules/admin/users-routes.js';
import { registerCircuitRoutes } from './modules/admin/circuit-routes.js';
import { registerBillingRoutes } from './modules/billing/routes.js';
import { registerContentRoutes } from './modules/content/routes.js';
import { registerSearchRoutes } from './modules/search/routes.js';
import { registerLiveRoutes } from './modules/live/routes.js';

const env = loadEnv();
const app = Fastify({ logger: true });

app.addHook('onRequest', async (request, reply) => {
  const requestId = request.headers['x-request-id'];
  const resolvedRequestId = typeof requestId === 'string' && requestId.length <= 200 ? requestId : request.id;
  reply.header('x-request-id', resolvedRequestId);
});

await app.register(cors, {
  origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
  credentials: true,
});

await registerAuthRoutes(app);
await registerArticleRoutes(app);
await registerWorkflowRoutes(app);
await registerCommentRoutes(app);
await registerTitleSuggestionRoutes(app, env);
await registerRewriteRoutes(app, env);
await registerQuotaRoutes(app);
await registerUsageReportRoutes(app);
await registerAdminUsersRoutes(app);
await registerCircuitRoutes(app);
await registerBillingRoutes(app, env);
await registerContentRoutes(app, env);
await registerSearchRoutes(app);
await registerLiveRoutes(app, env);
await registerPasswordRoute(app);

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
