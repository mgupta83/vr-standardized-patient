import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { Session } from '../models/Session.js';
import { authMiddleware, type AuthVariables } from '../middleware/auth.js';

const sessions = new Hono<{ Variables: AuthVariables }>();

sessions.use('*', authMiddleware);

const startSessionSchema = z.object({
  scenarioId: z.string().min(1),
});

const completeSessionSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  feedback: z.string().optional(),
});

// GET /api/sessions  (my sessions)
sessions.get('/', async (c) => {
  const user = c.get('user');
  const data = await Session.find({ userId: user.id })
    .populate('scenarioId', 'title difficulty')
    .sort({ startedAt: -1 });
  return c.json(data.map((s) => s.toJSON()));
});

// POST /api/sessions/start
sessions.post('/start', zValidator('json', startSessionSchema), async (c) => {
  const user = c.get('user');
  const { scenarioId } = c.req.valid('json');
  const session = await Session.create({ scenarioId, userId: user.id, startedAt: new Date() });
  return c.json(session.toJSON(), 201);
});

// PATCH /api/sessions/:id/complete
sessions.patch('/:id/complete', zValidator('json', completeSessionSchema), async (c) => {
  const user = c.get('user');
  const session = await Session.findOneAndUpdate(
    { _id: c.req.param('id'), userId: user.id },
    { ...c.req.valid('json'), completedAt: new Date() },
    { new: true },
  );
  if (!session) {
    return c.json({ error: 'Not Found', message: 'Session not found', statusCode: 404 }, 404);
  }
  return c.json(session.toJSON());
});

export { sessions as sessionsRouter };
