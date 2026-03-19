import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { Scenario } from '../models/Scenario.js';
import { authMiddleware, requireRole, type AuthVariables } from '../middleware/auth.js';

const scenarios = new Hono<{ Variables: AuthVariables }>();

// All scenario routes require authentication
scenarios.use('*', authMiddleware);

const createScenarioSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  durationMinutes: z.number().int().positive(),
  tags: z.array(z.string()).optional().default([]),
  patientProfile: z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
    gender: z.string().min(1),
    chiefComplaint: z.string().min(1),
    history: z.string().min(1),
    vitalSigns: z.object({
      heartRate: z.number().positive(),
      bloodPressure: z.object({ systolic: z.number(), diastolic: z.number() }),
      respiratoryRate: z.number().positive(),
      temperature: z.number(),
      oxygenSaturation: z.number().min(0).max(100),
    }),
  }),
});

// GET /api/scenarios
scenarios.get('/', async (c) => {
  const page = Number(c.req.query('page') ?? '1');
  const pageSize = Number(c.req.query('pageSize') ?? '10');
  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    Scenario.find().skip(skip).limit(pageSize).sort({ createdAt: -1 }),
    Scenario.countDocuments(),
  ]);

  return c.json({ data: data.map((s) => s.toJSON()), total, page, pageSize });
});

// GET /api/scenarios/:id
scenarios.get('/:id', async (c) => {
  const scenario = await Scenario.findById(c.req.param('id'));
  if (!scenario) {
    return c.json({ error: 'Not Found', message: 'Scenario not found', statusCode: 404 }, 404);
  }
  return c.json(scenario.toJSON());
});

// POST /api/scenarios  (instructor/admin only)
scenarios.post(
  '/',
  requireRole('instructor', 'admin'),
  zValidator('json', createScenarioSchema),
  async (c) => {
    const body = c.req.valid('json');
    const scenario = await Scenario.create(body);
    return c.json(scenario.toJSON(), 201);
  },
);

// DELETE /api/scenarios/:id  (admin only)
scenarios.delete('/:id', requireRole('admin'), async (c) => {
  const scenario = await Scenario.findByIdAndDelete(c.req.param('id'));
  if (!scenario) {
    return c.json({ error: 'Not Found', message: 'Scenario not found', statusCode: 404 }, 404);
  }
  return c.json({ message: 'Scenario deleted' });
});

export { scenarios as scenariosRouter };
