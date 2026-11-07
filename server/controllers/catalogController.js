import { methodNotAllowed, notFound } from '../http.js';
import * as catalogService from '../services/catalogService.js';

export async function categories(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const data = await catalogService.categories();
  res.status(200).json({ categories: data });
}

export async function products(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const data = await catalogService.products();
  res.status(200).json({ products: data });
}

export async function productBySlug(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const slug = req.query?.slug;
  if (!slug) return notFound(res, 'Producto no encontrado');
  const product = await catalogService.productBySlug(slug);
  res.status(200).json({ product });
}
