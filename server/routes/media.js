import * as controller from '../controllers/mediaController.js';
import * as hero from '../controllers/heroController.js';
import { notFound, methodNotAllowed } from '../http.js';

export default function route(req, res) {
  const resource = String(req.query?.resource || '');
  if (resource === 'hero') {
    if (req.method === 'GET') return hero.adminGet(req, res);
    if (req.method === 'PATCH') return hero.adminUpdate(req, res);
    return methodNotAllowed(res, ['GET', 'PATCH']);
  }
  if (resource === 'hero-upload') {
    if (req.method === 'POST') return hero.createUploadUrl(req, res);
    return methodNotAllowed(res, ['POST']);
  }
  // Galería propia de la portada (home_hero_media).
  if (resource === 'hero-media') {
    if (req.method === 'GET') return hero.listMedia(req, res);
    if (req.method === 'POST') return hero.registerMedia(req, res);
    if (req.method === 'PATCH') return hero.reorderMedia(req, res);
    return methodNotAllowed(res, ['GET', 'POST', 'PATCH']);
  }
  if (resource === 'hero-media-item') {
    if (req.method === 'DELETE') return hero.removeMedia(req, res);
    return methodNotAllowed(res, ['DELETE']);
  }
  if (resource !== 'item') return notFound(res);
  if (req.method === 'PATCH') return controller.patch(req, res);
  return controller.remove(req, res);
}
