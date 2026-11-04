import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config.js';
import { checkDatabase, pool } from './db.js';
import { checkRedis, redis } from './redis.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: config.frontendOrigin,
  methods: ['GET', 'POST', 'OPTIONS']
});

const io = new SocketIOServer(app.server, {
  cors: { origin: config.frontendOrigin, methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  app.log.info({ socketId: socket.id }, 'Client connected');
});

app.get('/api/health', async (_request, reply) => {
  const checks = {
    database: 'unavailable',
    cache: 'unavailable'
  };

  try {
    await checkDatabase();
    checks.database = 'ok';
  } catch (error) {
    app.log.warn({ err: error }, 'Database health check failed');
  }

  try {
    await checkRedis();
    checks.cache = 'ok';
  } catch (error) {
    app.log.warn({ err: error }, 'Cache health check failed');
  }

  const healthy = checks.database === 'ok' && checks.cache === 'ok';
  return reply.code(healthy ? 200 : 503).send({
    status: healthy ? 'ok' : 'degraded',
    service: 'campus-quest-api',
    checks,
    timestamp: new Date().toISOString()
  });
});

app.get('/api', async () => ({
  name: 'Campus Quest API',
  message: 'API is running. See /api/health for dependency status.'
}));

const shutdown = async () => {
  app.log.info('Shutting down Campus Quest API');
  io.close();
  await app.close();
  await pool.end();
  redis.disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
