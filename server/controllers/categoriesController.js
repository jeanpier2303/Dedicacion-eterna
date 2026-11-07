import { methodNotAllowed, badRequest } from '../http.js';
import { requireAuth } from '../auth/guard.js';
import * as categoryService from '../services/categoryService.js';
import { validateCategory } from '../validations/categories.js';

export async function list(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  await requireAuth(req);
  const categories = await categoryService.listAll();
  res.status(200).json({ categories });
}

export async function create(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAuth(req, 'editor');
  const result = validateCategory(req.body);
  if (result.errors) return badRequest(res, result.errors);
  const category = await categoryService.create(result.data);
  res.status(201).json({ category });
}

export async function update(req, res) {
  if (req.method !== 'PATCH') return methodNotAllowed(res, ['PATCH']);
  await requireAuth(req, 'editor');
  const id = req.query?.id;
  const result = validateCategory(req.body, { partial: true });
  if (result.errors) return badRequest(res, result.errors);
  const category = await categoryService.update(id, result.data);
  res.status(200).json({ category });
}
