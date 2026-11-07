import { methodNotAllowed, badRequest, notFound } from '../http.js';
import { requireAuth } from '../auth/guard.js';
import * as mediaService from '../services/mediaService.js';
import { validateUploadRequest, validateMediaRegister, validateMediaPatch } from '../validations/media.js';
import { qp } from '../validations/common.js';

export async function list(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  await requireAuth(req, 'editor');
  const media = await mediaService.listForProduct(qp(req.query?.id));
  res.status(200).json({ media });
}

export async function createUploadUrl(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAuth(req, 'editor');
  const result = validateUploadRequest(req.body);
  if (result.errors) return badRequest(res, result.errors);
  const upload = await mediaService.createUploadUrl(qp(req.query?.id), result.data);
  res.status(201).json(upload);
}

export async function register(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAuth(req, 'editor');
  const result = validateMediaRegister(req.body);
  if (result.errors) return badRequest(res, result.errors);
  const media = await mediaService.register(qp(req.query?.id), result.data);
  res.status(201).json({ media });
}

export async function patch(req, res) {
  if (req.method !== 'PATCH') return methodNotAllowed(res, ['PATCH']);
  await requireAuth(req, 'editor');
  const id = qp(req.query?.id);
  if (!id) return notFound(res, 'Archivo no encontrado');
  const result = validateMediaPatch(req.body);
  if (result.errors) return badRequest(res, result.errors);
  const media = await mediaService.patch(id, result.data);
  res.status(200).json({ media });
}

export async function remove(req, res) {
  if (req.method !== 'DELETE') return methodNotAllowed(res, ['DELETE']);
  await requireAuth(req, 'editor');
  const id = qp(req.query?.id);
  if (!id) return notFound(res, 'Archivo no encontrado');
  const result = await mediaService.remove(id);
  res.status(200).json(result);
}
