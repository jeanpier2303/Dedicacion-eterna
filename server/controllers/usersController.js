import { methodNotAllowed, badRequest } from '../http.js';
import { requireAuth } from '../auth/guard.js';
import * as usersService from '../services/usersService.js';
import { validateUserCreate, validateUserPatch } from '../validations/users.js';

export async function list(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  await requireAuth(req, 'administrador');
  const users = await usersService.list();
  res.status(200).json({ users });
}

export async function create(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAuth(req, 'administrador');
  const result = validateUserCreate(req.body);
  if (result.errors) return badRequest(res, result.errors);
  const user = await usersService.create(result.data);
  res.status(201).json({ user });
}

export async function update(req, res) {
  if (req.method !== 'PATCH') return methodNotAllowed(res, ['PATCH']);
  await requireAuth(req, 'administrador');
  const id = req.query?.id;
  const result = validateUserPatch(req.body);
  if (result.errors) return badRequest(res, result.errors);
  const user = await usersService.update(id, result.data);
  res.status(200).json({ user });
}
