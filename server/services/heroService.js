import { HttpError } from '../http.js';
import { publicClient } from '../supabase/public.js';
import { adminClient } from '../supabase/admin.js';
import { isUuid } from '../validations/common.js';
import { mediaBucket } from '../validations/media.js';
import { signPath, signMediaRows } from './signedUrls.js';

const HERO_ID = 1;
const MAX_SIZE = { image: 10485760, video: 104857600 };

// Supabase expone la columna inexistente como 42703 (Postgres) o
// PGRST204 (PostgREST, schema cache); ambas indican la migración pendiente.
function isMissingProductSlugColumn(error) {
  return error?.code === '42703' || (error?.code === 'PGRST204' && /product_slug/.test(error.message || ''));
}

// Tabla nueva home_hero_media: 42P01 (Postgres) o PGRST205
// (PostgREST, tabla fuera del schema cache) mientras no se aplique
// la migración 20261110_home_hero_media.sql.
function isMissingHeroMediaTable(error) {
  const code = error?.code || '';
  return code === '42P01' || code === 'PGRST205' || (code === 'PGRST204' && /home_hero_media/.test(error.message || ''));
}

function mapDbError(error) {
  if (error?.code === '42P01') {
    return new HttpError(503, 'La portada aún no está disponible: falta aplicar la migración en Supabase');
  }
  if (isMissingProductSlugColumn(error)) {
    return new HttpError(503, 'Falta aplicar la migración de la columna product_slug en Supabase');
  }
  return error;
}

function isLive(row) {
  if (!row || !row.is_published) return false;
  const now = Date.now();
  if (row.starts_at && Date.parse(row.starts_at) > now) return false;
  if (row.ends_at && Date.parse(row.ends_at) <= now) return false;
  return true;
}

async function signHero(row) {
  if (!row) return null;
  const [imageUrl, videoUrl] = await Promise.all([
    row.image_path ? signPath('product-images', row.image_path).catch(() => null) : Promise.resolve(null),
    row.video_path ? signPath('product-videos', row.video_path).catch(() => null) : Promise.resolve(null),
  ]);
  const { image_path, video_path, ...rest } = row;
  return {
    ...rest,
    product_slug: row.product_slug ?? null,
    image_path,
    video_path,
    image_url: imageUrl,
    video_url: videoUrl,
    // Galería propia de la portada (home_hero_media). Mejor esfuerzo:
    // si la migración aún no se aplicó la portada sigue funcionando
    // con el contenido anterior (image_path / video_path).
    media: await listSignedMedia().catch(() => []),
  };
}

// ---------- Galería propia de la portada (home_hero_media) ----------

async function fetchMediaRows(strict) {
  const { data, error } = await adminClient()
    .from('home_hero_media')
    .select('*')
    .eq('hero_id', HERO_ID)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    if (isMissingHeroMediaTable(error)) {
      if (strict) throw new HttpError(503, 'Falta aplicar la migración de la tabla home_hero_media en Supabase');
      return [];
    }
    throw error;
  }
  return data || [];
}

async function listSignedMedia() {
  return signMediaRows(await fetchMediaRows(false));
}

export async function getMedia() {
  const rows = await fetchMediaRows(true);
  const signed = await signMediaRows(rows);
  // signMediaRows elimina storage_path (solo interesa la URL
  // firmada): aquí se vuelve a adjuntar porque el panel compara
  // esas rutas con image_path / video_path para ofrecer añadir el
  // contenido anterior a la galería.
  return signed.map((item, index) => ({ ...item, storage_path: rows[index]?.storage_path ?? null }));
}

export async function registerMedia({ storage_path, media_type, alt_text }) {
  const bucket = mediaBucket(media_type);
  await assertStored(bucket, storage_path);
  const { data: rows, error: orderError } = await adminClient()
    .from('home_hero_media')
    .select('display_order')
    .eq('hero_id', HERO_ID);
  if (orderError) throw orderError;
  const displayOrder = (rows || []).reduce((max, row) => Math.max(max, row.display_order), 0) + 1;
  const { data, error } = await adminClient()
    .from('home_hero_media')
    .insert({
      hero_id: HERO_ID,
      media_type,
      storage_path,
      alt_text: alt_text || null,
      display_order: displayOrder,
    })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') throw new HttpError(409, 'El archivo ya está en la galería de la portada');
    throw error;
  }
  const [signed] = await signMediaRows([data]);
  return { ...signed, storage_path };
}

export async function reorderMedia({ ordered_ids }) {
  const { data: rows, error } = await adminClient()
    .from('home_hero_media')
    .select('id')
    .eq('hero_id', HERO_ID);
  if (error) throw error;
  const current = (rows || []).map((row) => row.id);
  const sameSet = current.length === ordered_ids.length && ordered_ids.every((id) => current.includes(id));
  if (!sameSet) throw new HttpError(409, 'La galería de la portada cambió; recarga la página y vuelve a ordenar');
  for (let i = 0; i < ordered_ids.length; i += 1) {
    const { error: updateError } = await adminClient()
      .from('home_hero_media')
      .update({ display_order: i + 1 })
      .eq('id', ordered_ids[i]);
    if (updateError) throw updateError;
  }
  return getMedia();
}

export async function removeMedia(mediaId) {
  if (!isUuid(mediaId)) throw new HttpError(400, 'El ID de archivo no es válido');
  const { data: existing, error } = await adminClient()
    .from('home_hero_media')
    .select('*')
    .eq('id', mediaId)
    .maybeSingle();
  if (error) throw error;
  if (!existing) throw new HttpError(404, 'Archivo no encontrado');
  // El contenido anterior (image_path / video_path) sigue siendo el
  // respaldo de la portada: si el archivo es ese, solo se retira de
  // la galería y el archivo NO se borra de Storage.
  const { data: heroRow } = await adminClient().from('home_hero').select('image_path, video_path').eq('id', HERO_ID).maybeSingle();
  const isLegacyFallback = heroRow && (heroRow.image_path === existing.storage_path || heroRow.video_path === existing.storage_path);
  if (!isLegacyFallback) {
    const { error: removeError } = await adminClient().storage.from(mediaBucket(existing.media_type)).remove([existing.storage_path]);
    if (removeError) {
      throw new HttpError(502, 'No se pudo eliminar el archivo de Storage; el registro no fue eliminado', removeError.message);
    }
  }
  const { error: deleteError } = await adminClient().from('home_hero_media').delete().eq('id', mediaId);
  if (deleteError) throw deleteError;
  return { ok: true };
}

async function ensureRow() {
  const { data, error } = await adminClient().from('home_hero').select('*').eq('id', HERO_ID).maybeSingle();
  if (error) throw mapDbError(error);
  if (data) return data;
  const { data: created, error: insertError } = await adminClient()
    .from('home_hero')
    .insert({ id: HERO_ID })
    .select('*')
    .single();
  if (insertError) throw mapDbError(insertError);
  return created;
}

async function assertStored(bucket, path) {
  const folder = path.slice(0, path.lastIndexOf('/'));
  const filename = path.slice(folder.length + 1);
  const { data, error } = await adminClient().storage.from(bucket).list(folder, { search: filename, limit: 50 });
  if (error) throw new HttpError(502, 'No se pudo verificar el archivo en Storage', error.message);
  if (!(data || []).some((file) => file.name === filename)) {
    throw new HttpError(400, 'El archivo no está en Storage; primero sube el archivo');
  }
}

export async function getAdmin() {
  return signHero(await ensureRow());
}

export async function getLive() {
  try {
    const { data, error } = await publicClient().from('home_hero').select('*').eq('id', HERO_ID).maybeSingle();
    if (error) throw mapDbError(error);
    if (!isLive(data)) return null;
    return await signHero(data);
  } catch (err) {
    if (err instanceof HttpError && err.status === 503) return null;
    throw err;
  }
}

export async function update(changes) {
  const row = await ensureRow();
  const merged = { ...row, ...changes };
  if (merged.is_published && !String(merged.title || '').trim()) {
    throw new HttpError(400, 'El título es obligatorio para publicar la portada');
  }
  if (merged.starts_at && merged.ends_at && Date.parse(merged.ends_at) <= Date.parse(merged.starts_at)) {
    throw new HttpError(400, 'La fecha de finalización debe ser posterior a la de inicio');
  }
  if (typeof changes.product_slug === 'string') {
    const { data: product, error: productError } = await adminClient()
      .from('products')
      .select('slug')
      .eq('slug', changes.product_slug)
      .eq('is_published', true)
      .maybeSingle();
    if (productError) throw mapDbError(productError);
    if (!product) throw new HttpError(400, 'El producto indicado no existe o no está publicado');
  }
  if (typeof changes.image_path === 'string') await assertStored('product-images', changes.image_path);
  if (typeof changes.video_path === 'string') await assertStored('product-videos', changes.video_path);
  let { data, error } = await adminClient().from('home_hero').update(changes).eq('id', HERO_ID).select('*').single();
  // Sin la columna aplicada aún: si el valor es null se reintenta sin la
  // clave para que las guardadas de campaña sigan funcionando.
  if (isMissingProductSlugColumn(error) && 'product_slug' in changes && changes.product_slug === null) {
    const rest = { ...changes };
    delete rest.product_slug;
    ({ data, error } = await adminClient().from('home_hero').update(rest).eq('id', HERO_ID).select('*').single());
  }
  if (error) throw mapDbError(error);
  return signHero(data);
}

export async function createUploadUrl({ filename, media_type }) {
  const bucket = mediaBucket(media_type);
  const safeName = filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  const path = `hero/${Date.now()}-${safeName}`;
  const { data, error } = await adminClient().storage.from(bucket).createSignedUploadUrl(path);
  if (error) throw new HttpError(502, 'No se pudo preparar la subida', error.message);
  return {
    bucket,
    path,
    token: data.token,
    signed_url: data.signedUrl,
    media_type,
    max_size: MAX_SIZE[media_type],
  };
}
