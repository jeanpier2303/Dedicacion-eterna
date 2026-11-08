import * as controller from '../controllers/catalogController.js';
import { notFound } from '../http.js';

export default function route(req, res) {
  const resource = String(req.query?.resource || '');
  if (resource === 'categories') return controller.categories(req, res);
  if (resource === 'products') return controller.products(req, res);
  if (resource === 'product') return controller.productBySlug(req, res);
  return notFound(res);
}
