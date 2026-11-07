import { HttpError } from '../http.js';
import { publicClient } from '../supabase/public.js';
import { signMediaRows } from './signedUrls.js';

const CATALOG_SELECT = 'id, name, slug, short_description, description, price, old_price, is_featured, display_order, created_at, category:categories(id, name, slug), media:product_media(id, media_type, storage_path, alt_text, display_order, is_primary, created_at)';

function shapeProduct(product, signedMedia) {
  const images = signedMedia
    .filter((row) => row.media_type === 'image')
    .sort((a, b) => a.display_order - b.display_order);
  const primary = images.find((row) => row.is_primary) || images[0] || null;
  const { media, ...rest } = product;
  return {
    ...rest,
    image: primary?.signed_url || null,
    images: images.map((row) => row.signed_url),
    media: signedMedia,
  };
}

export async function categories() {
  const { data, error } = await publicClient()
    .from('categories')
    .select('id, name, slug, description')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data;
}

export async function products() {
  const { data, error } = await publicClient()
    .from('products')
    .select(CATALOG_SELECT)
    .eq('is_published', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return Promise.all(
    (data || []).map(async (product) => {
      const signed = await signMediaRows(product.media || []);
      return shapeProduct(product, signed);
    })
  );
}

export async function productBySlug(slug) {
  if (!slug) throw new HttpError(400, 'El slug es obligatorio');
  const { data, error } = await publicClient()
    .from('products')
    .select(CATALOG_SELECT)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Producto no encontrado');
  const signed = await signMediaRows(data.media || []);
  return shapeProduct(data, signed);
}
