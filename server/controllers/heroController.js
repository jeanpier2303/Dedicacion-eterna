import { methodNotAllowed, badRequest, notFound } from '../http.js';
import { requireAuth } from '../auth/guard.js';
import * as heroService from '../services/heroService.js';
import { validateHeroPatch, validateHeroMediaRegister, validateHeroReorder } from '../validations/hero.js';
import { validateUploadRequest } from '../validations/media.js';
import { qp } from '../validations/common.js';

export async function publicHero(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const hero = await heroService.getLive();
  res.status(200).json({ hero });
}

export async function adminGet(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  await requireAuth(req);
  const hero = await heroService.getAdmin();
  res.status(200).json({ hero });
}

export async function adminUpdate(req, res) {
  if (req.method !== 'PATCH') return methodNotAllowed(res, ['PATCH']);
  await requireAuth(req);
  const result = validateHeroPatch(req.body);
  if (result.errors) return badRequest(res, result.errors);
  const hero = await heroService.update(result.data);
  res.status(200).json({ hero });
}

export async function createUploadUrl(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAuth(req);
  const result = validateUploadRequest(req.body);
  if (result.errors) return badRequest(res, result.errors);
  const upload = await heroService.createUploadUrl(result.data);
  res.status(201).json(upload);
}

// ---------- Galería propia de la portada (home_hero_media) ----------

export async function listMedia(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  await requireAuth(req);
  const media = await heroService.getMedia();
  res.status(200).json({ media });
}

export async function registerMedia(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAuth(req);
  const result = validateHeroMediaRegister(req.body);
  if (result.errors) return badRequest(res, result.errors);
  const media = await heroService.registerMedia(result.data);
  res.status(201).json({ media });
}

export async function reorderMedia(req, res) {
  if (req.method !== 'PATCH') return methodNotAllowed(res, ['PATCH']);
  await requireAuth(req);
  const result = validateHeroReorder(req.body);
  if (result.errors) return badRequest(res, result.errors);
  const media = await heroService.reorderMedia(result.data);
  res.status(200).json({ media });
}

export async function removeMedia(req, res) {
  if (req.method !== 'DELETE') return methodNotAllowed(res, ['DELETE']);
  await requireAuth(req);
  const id = qp(req.query?.id);
  if (!id) return notFound(res, 'Archivo no encontrado');
  const result = await heroService.removeMedia(id);
  res.status(200).json(result);
}
