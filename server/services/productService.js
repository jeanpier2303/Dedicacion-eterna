import { HttpError } from '../http.js';
import { adminClient } from '../supabase/admin.js';
import { isUuid, cleanSearch } from '../validations/common.js';
import { bucketFor, signPath, signMediaRows } from './signedUrls.js';

const PRODUCT_SELECT = '*, category:categories(id, name, slug), media:product_media(id, media_type, storage_path, alt_text, display_order, is_primary, created_at)';

function stripMedia(media) {
  return (media || []).map(({ storage_path, ...rest }) => rest);
}

function mapWriteError(error) {
  if (error.code === '23505') return new HttpError(409, 'Ya existe un producto con ese slug');
  if (error.code === '23503') return new HttpError(400, 'La categoría indicada no existe');
  return error;
}

async function shapeListItem(product) {
  const images = (product.media || []).filter((row) => row.media_type === 'image');
  const image = images.find((row) => row.is_primary) || images[0] || null;
  let primaryImage = null;
  if (image) {
    primaryImage = await signPath('product-images', image.storage_path).catch(() => null);
  }
  const { media, ...rest } = product;
  return { ...rest, media: stripMedia(media), primary_image_url: primaryImage };
}

function targetField(idOrSlug) {
  return isUuid(idOrSlug) ? 'id' : 'slug';
}

async function findByIdOrSlug(idOrSlug) {
  const { data, error } = await adminClient()
    .from('products')
    .select('id')
    .eq(targetField(idOrSlug), idOrSlug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function list(filters = {}) {
  let query = adminClient()
    .from('products')
    .select(PRODUCT_SELECT)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (filters.slug) query = query.eq('slug', filters.slug);
  if (filters.category_id) query = query.eq('category_id', filters.category_id);
  if (filters.is_published !== undefined) query = query.eq('is_published', filters.is_published);
  if (filters.is_featured !== undefined) query = query.eq('is_featured', filters.is_featured);
  if (filters.q) query = query.ilike('name', `%${cleanSearch(filters.q)}%`);
  const { data, error } = await query;
  if (error) throw error;
  return Promise.all((data || []).map(shapeListItem));
}

export async function get(idOrSlug) {
  const { data, error } = await adminClient()
    .from('products')
    .select(PRODUCT_SELECT)
    .eq(targetField(idOrSlug), idOrSlug)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Producto no encontrado');
  const media = await signMediaRows(data.media || []);
  const { media: rawMedia, ...rest } = data;
  return { ...rest, media };
}

export async function create(payload) {
  const { data, error } = await adminClient().from('products').insert(payload).select(PRODUCT_SELECT).single();
  if (error) throw mapWriteError(error);
  const { media, ...rest } = data;
  return { ...rest, media: stripMedia(media) };
}

export async function update(idOrSlug, patch) {
  const existing = await findByIdOrSlug(idOrSlug);
  if (!existing) throw new HttpError(404, 'Producto no encontrado');
  const { data, error } = await adminClient()
    .from('products')
    .update(patch)
    .eq('id', existing.id)
    .select(PRODUCT_SELECT)
    .single();
  if (error) throw mapWriteError(error);
  const { media, ...rest } = data;
  return { ...rest, media: stripMedia(media) };
}

export async function remove(idOrSlug) {
  const { data: product, error } = await adminClient()
    .from('products')
    .select('id, slug, media:product_media(id, media_type, storage_path)')
    .eq(targetField(idOrSlug), idOrSlug)
    .maybeSingle();
  if (error) throw error;
  if (!product) throw new HttpError(404, 'Producto no encontrado');
  const rows = product.media || [];
  const byBucket = new Map();
  for (const row of rows) {
    const bucket = bucketFor(row.media_type);
    if (!bucket) continue;
    if (!byBucket.has(bucket)) byBucket.set(bucket, []);
    byBucket.get(bucket).push(row.storage_path);
  }
  for (const [bucket, paths] of byBucket) {
    const { error: removeError } = await adminClient().storage.from(bucket).remove(paths);
    if (removeError) {
      throw new HttpError(502, 'No se pudieron eliminar los archivos de Storage; el producto no fue eliminado', removeError.message);
    }
  }
  const { error: deleteError } = await adminClient().from('products').delete().eq('id', product.id);
  if (deleteError) throw deleteError;
  return { ok: true, deleted_media: rows.length };
}
