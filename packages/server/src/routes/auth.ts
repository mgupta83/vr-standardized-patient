import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { User } from '../models/User.js';
import { signToken } from '../services/jwt.js';

const auth = new Hono();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['student', 'instructor', 'admin']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const body = c.req.valid('json');

  const existing = await User.findOne({ email: body.email });
  if (existing) {
    return c.json({ error: 'Conflict', message: 'Email already in use', statusCode: 409 }, 409);
  }

  // The very first registered user becomes an admin automatically
  const userCount = await User.countDocuments();
  const role = userCount === 0 ? 'admin' : (body.role ?? 'student');

  const user = await User.create({ ...body, role });
  const userPublic = user.toJSON() as {
    id: string;
    email: string;
    name: string;
    role: 'student' | 'instructor' | 'admin';
    createdAt: Date;
  };

  const token = signToken({
    id: userPublic.id,
    email: userPublic.email,
    name: userPublic.name,
    role: userPublic.role,
    createdAt: userPublic.createdAt.toISOString(),
  });

  return c.json({ token, user: userPublic }, 201);
});

// POST /api/auth/login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'Invalid credentials', statusCode: 401 }, 401);
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    return c.json({ error: 'Unauthorized', message: 'Invalid credentials', statusCode: 401 }, 401);
  }

  const userPublic = user.toJSON() as {
    id: string;
    email: string;
    name: string;
    role: 'student' | 'instructor' | 'admin';
    createdAt: Date;
  };

  const token = signToken({
    id: userPublic.id,
    email: userPublic.email,
    name: userPublic.name,
    role: userPublic.role,
    createdAt: userPublic.createdAt.toISOString(),
  });

  return c.json({ token, user: userPublic });
});

export { auth as authRouter };
