import * as controller from '../controllers/mediaController.js';
import { notFound } from '../http.js';

export default function route(req, res) {
  if (String(req.query?.resource || '') !== 'item') return notFound(res);
  if (req.method === 'PATCH') return controller.patch(req, res);
  return controller.remove(req, res);
}
