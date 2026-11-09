import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config.js';
import { checkDatabase, pool } from './db.js';
import { checkRedis, redis } from './redis.js';
import { teamRoutes } from './routes/teams.js';
import { roundRoutes } from './routes/rounds.js';
import { challengeRoutes } from './routes/challenges.js';
import { qrRoutes } from './routes/qr.js';
import { submissionRoutes } from './routes/submissions.js';
import { leaderboardRoutes } from './routes/leaderboard.js';

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: config.frontendOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
});
await app.register(teamRoutes, { prefix: '/api/teams' });
await app.register(roundRoutes, { prefix: '/api/rounds' });
await app.register(challengeRoutes, {
  prefix: '/api/challenges'
});
await app.register(qrRoutes, {
  prefix: '/api/qr'
});
await app.register(submissionRoutes, {
  prefix: '/api/submissions'
});

await app.register(leaderboardRoutes, {
  prefix: '/api/leaderboard'
});

const io = new SocketIOServer(app.server, {
  cors: {
    origin: config.frontendOrigin,
    methods: ['GET', 'POST']
  }
});

app.decorate('io', io);

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
