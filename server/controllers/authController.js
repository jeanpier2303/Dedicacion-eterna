import { methodNotAllowed, badRequest } from '../http.js';
import { requireAuth } from '../auth/guard.js';
import * as authService from '../services/authService.js';
import { validateLogin } from '../validations/auth.js';

export async function login(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const result = validateLogin(req.body);
  if (result.errors) return badRequest(res, result.errors);
  const data = await authService.login(result.data);
  res.status(200).json(data);
}

export async function logout(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const data = await authService.logout(req);
  res.status(200).json(data);
}

export async function refresh(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const token = typeof req.body?.refresh_token === 'string' ? req.body.refresh_token.trim() : '';
  if (!token) return badRequest(res, ['El refresh_token es obligatorio']);
  const data = await authService.refresh(token);
  res.status(200).json(data);
}

export async function me(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const ctx = await requireAuth(req);
  res.status(200).json({ user: authService.userPayload(ctx.user), profile: ctx.profile });
}
