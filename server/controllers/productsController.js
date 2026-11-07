import { methodNotAllowed, badRequest, notFound } from '../http.js';
import { requireAuth } from '../auth/guard.js';
import * as productService from '../services/productService.js';
import { validateProduct } from '../validations/products.js';
import { qp } from '../validations/common.js';

function parseBoolean(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export async function list(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  await requireAuth(req, 'editor');
  const query = req.query || {};
  const products = await productService.list({
    slug: qp(query.slug),
    category_id: qp(query.category_id),
    is_published: parseBoolean(qp(query.is_published)),
    is_featured: parseBoolean(qp(query.is_featured)),
    q: qp(query.q),
  });
  res.status(200).json({ products });
}

export async function create(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAuth(req, 'editor');
  const result = validateProduct(req.body);
  if (result.errors) return badRequest(res, result.errors);
  const product = await productService.create(result.data);
  res.status(201).json({ product });
}

export async function get(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  await requireAuth(req, 'editor');
  const id = qp(req.query?.id);
  if (!id) return notFound(res, 'Producto no encontrado');
  const product = await productService.get(id);
  res.status(200).json({ product });
}

export async function update(req, res) {
  if (req.method !== 'PATCH') return methodNotAllowed(res, ['PATCH']);
  await requireAuth(req, 'editor');
  const id = qp(req.query?.id);
  if (!id) return notFound(res, 'Producto no encontrado');
  const result = validateProduct(req.body, { partial: true });
  if (result.errors) return badRequest(res, result.errors);
  const product = await productService.update(id, result.data);
  res.status(200).json({ product });
}

export async function remove(req, res) {
  if (req.method !== 'DELETE') return methodNotAllowed(res, ['DELETE']);
  await requireAuth(req, 'administrador');
  const id = qp(req.query?.id);
  if (!id) return notFound(res, 'Producto no encontrado');
  const result = await productService.remove(id);
  res.status(200).json(result);
}
