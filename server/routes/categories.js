import * as controller from '../controllers/categoriesController.js';
import { notFound, methodNotAllowed } from '../http.js';

export default function route(req, res) {
  const resource = String(req.query?.resource || 'collection');
  if (resource === 'collection') {
    if (req.method === 'GET') return controller.list(req, res);
    if (req.method === 'POST') return controller.create(req, res);
    return methodNotAllowed(res, ['GET', 'POST']);
  }
  if (resource === 'item') return controller.update(req, res);
  return notFound(res);
}
