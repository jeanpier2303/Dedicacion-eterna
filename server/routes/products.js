import * as products from '../controllers/productsController.js';
import * as media from '../controllers/mediaController.js';
import { notFound, methodNotAllowed } from '../http.js';

export default function route(req, res) {
  const resource = String(req.query?.resource || 'collection');
  if (resource === 'collection') {
    if (req.method === 'GET') return products.list(req, res);
    if (req.method === 'POST') return products.create(req, res);
    return methodNotAllowed(res, ['GET', 'POST']);
  }
  if (resource === 'item') {
    if (req.method === 'GET') return products.get(req, res);
    if (req.method === 'PATCH') return products.update(req, res);
    if (req.method === 'DELETE') return products.remove(req, res);
    return methodNotAllowed(res, ['GET', 'PATCH', 'DELETE']);
  }
  if (resource === 'media') return req.method === 'GET' ? media.list(req, res) : media.register(req, res);
  if (resource === 'upload-url') return media.createUploadUrl(req, res);
  return notFound(res);
}
