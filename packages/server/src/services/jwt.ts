import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import type { UserPublic } from '@vr-sp/shared';

export function signToken(payload: UserPublic): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): UserPublic {
  return jwt.verify(token, config.jwt.secret) as UserPublic;
}
