import { HttpError } from '../http.js';
import { adminClient } from '../supabase/admin.js';
import { isUuid } from '../validations/common.js';
import { mediaBucket } from '../validations/media.js';
import { signMediaRows } from './signedUrls.js';

function mapWriteError(error) {
  if (error.code === '23505') return new HttpError(409, 'El archivo ya está registrado o ya existe una imagen principal');
  return error;
}

async function requireProduct(productId) {
  const { data, error } = await adminClient().from('products').select('id').eq('id', productId).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Producto no encontrado');
  return data;
}

export async function listForProduct(productId) {
  if (!isUuid(productId)) throw new HttpError(400, 'El ID de producto no es válido');
  await requireProduct(productId);
  const { data, error } = await adminClient()
    .from('product_media')
    .select('*')
    .eq('product_id', productId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return signMediaRows(data || []);
}

export async function createUploadUrl(productId, { filename, media_type, size }) {
  if (!isUuid(productId)) throw new HttpError(400, 'El ID de producto no es válido');
  await requireProduct(productId);
  const bucket = mediaBucket(media_type);
  const safeName = filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  const path = `products/${productId}/${Date.now()}-${safeName}`;
  const { data, error } = await adminClient().storage.from(bucket).createSignedUploadUrl(path);
  if (error) throw new HttpError(502, 'No se pudo preparar la subida', error.message);
  return {
    bucket,
    path,
    token: data.token,
    signed_url: data.signedUrl,
    media_type,
    max_size: media_type === 'video' ? 104857600 : 10485760,
  };
}

export async function register(productId, payload) {
  if (!isUuid(productId)) throw new HttpError(400, 'El ID de producto no es válido');
  await requireProduct(productId);
  const prefix = `products/${productId}/`;
  if (!payload.storage_path.startsWith(prefix)) {
    throw new HttpError(400, 'La ruta del archivo no pertenece a este producto');
  }
  const bucket = mediaBucket(payload.media_type);
  const folder = `products/${productId}`;
  const filename = payload.storage_path.slice(folder.length + 1);
  const { data: files, error: listError } = await adminClient().storage.from(bucket).list(folder, { search: filename, limit: 100 });
  if (listError) throw new HttpError(502, 'No se pudo verificar el archivo en Storage', listError.message);
  if (!(files || []).some((file) => file.name === filename)) {
    throw new HttpError(400, 'El archivo no está en Storage; primero solicita la URL de subida y sube el archivo');
  }
  const insertPayload = { ...payload, product_id: productId };
  if (insertPayload.is_primary === undefined) insertPayload.is_primary = false;
  if (insertPayload.display_order === undefined) {
    const { data: rows, error: orderError } = await adminClient()
      .from('product_media')
      .select('display_order')
      .eq('product_id', productId);
    if (orderError) throw orderError;
    insertPayload.display_order = (rows || []).reduce((max, row) => Math.max(max, row.display_order), 0) + 1;
  }
  if (insertPayload.is_primary) {
    const { error: clearError } = await adminClient()
      .from('product_media')
      .update({ is_primary: false })
      .eq('product_id', productId)
      .eq('is_primary', true);
    if (clearError) throw clearError;
  }
  const { data, error } = await adminClient().from('product_media').insert(insertPayload).select('*').single();
  if (error) throw mapWriteError(error);
  const signed = await signMediaRows([data]);
  return signed[0];
}

export async function patch(mediaId, changes) {
  if (!isUuid(mediaId)) throw new HttpError(400, 'El ID de archivo no es válido');
  const { data: existing, error: findError } = await adminClient()
    .from('product_media')
    .select('*')
    .eq('id', mediaId)
    .maybeSingle();
  if (findError) throw findError;
  if (!existing) throw new HttpError(404, 'Archivo no encontrado');
  if (changes.is_primary === true && existing.media_type !== 'image') {
    throw new HttpError(400, 'Solo las imágenes pueden ser la imagen principal');
  }
  if (changes.is_primary === true) {
    const { error: clearError } = await adminClient()
      .from('product_media')
      .update({ is_primary: false })
      .eq('product_id', existing.product_id)
      .eq('is_primary', true)
      .neq('id', mediaId);
    if (clearError) throw clearError;
  }
  const { data, error } = await adminClient()
    .from('product_media')
    .update(changes)
    .eq('id', mediaId)
    .select('*')
    .single();
  if (error) throw mapWriteError(error);
  const signed = await signMediaRows([data]);
  return signed[0];
}

export async function remove(mediaId) {
  if (!isUuid(mediaId)) throw new HttpError(400, 'El ID de archivo no es válido');
  const { data: existing, error } = await adminClient().from('product_media').select('*').eq('id', mediaId).maybeSingle();
  if (error) throw error;
  if (!existing) throw new HttpError(404, 'Archivo no encontrado');
  const { error: removeError } = await adminClient().storage.from(mediaBucket(existing.media_type)).remove([existing.storage_path]);
  if (removeError) {
    throw new HttpError(502, 'No se pudo eliminar el archivo de Storage; el registro no fue eliminado', removeError.message);
  }
  const { error: deleteError } = await adminClient().from('product_media').delete().eq('id', mediaId);
  if (deleteError) throw deleteError;
  return { ok: true };
}
