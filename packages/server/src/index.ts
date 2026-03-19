import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { authRouter } from './routes/auth.js';
import { scenariosRouter } from './routes/scenarios.js';
import { sessionsRouter } from './routes/sessions.js';

// ─── App ──────────────────────────────────────────────────────────────────────

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: config.cors.origin,
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API routes
app.route('/api/auth', authRouter);
app.route('/api/scenarios', scenariosRouter);
app.route('/api/sessions', sessionsRouter);

// 404 catch-all
app.notFound((c) => c.json({ error: 'Not Found', message: 'Route not found', statusCode: 404 }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    { error: 'Internal Server Error', message: err.message, statusCode: 500 },
    500,
  );
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function main() {
  await connectDatabase();

  serve({ fetch: app.fetch, port: config.port }, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
  });
}

main().catch(console.error);
