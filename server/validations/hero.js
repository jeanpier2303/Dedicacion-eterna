import { isUuid } from './common.js';

const HREF_RE = /^(https?:\/\/|mailto:|tel:|\/|#)/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_LENGTHS = { title: 120, description: 500, button_label: 60, button_href: 500 };

function text(source, key, errors) {
  const value = source[key];
  if (typeof value !== 'string') {
    errors.push(`${key} debe ser texto`);
    return null;
  }
  if (value.trim().length > MAX_LENGTHS[key]) {
    errors.push(`${key} no puede superar ${MAX_LENGTHS[key]} caracteres`);
    return null;
  }
  return value.trim();
}

function mediaPath(source, key, errors) {
  const value = source[key];
  if (value === null) return null;
  if (typeof value !== 'string') {
    errors.push(`${key} debe ser una ruta o null`);
    return null;
  }
  if (value.length > 500 || value.includes('..') || !value.startsWith('hero/')) {
    errors.push(`${key} debe ser una ruta válida dentro de hero/`);
    return null;
  }
  return value;
}

function dateOrNull(value, key, errors) {
  if (value === null) return null;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    errors.push(`${key} debe ser una fecha válida o null`);
    return null;
  }
  return new Date(Date.parse(value)).toISOString();
}

export function validateHeroPatch(body) {
  const errors = [];
  const data = {};
  const source = body || {};

  if (Object.prototype.hasOwnProperty.call(source, 'title')) {
    const value = text(source, 'title', errors);
    if (value !== null) data.title = value;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'description')) {
    const value = text(source, 'description', errors);
    if (value !== null) data.description = value;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'button_label')) {
    const value = text(source, 'button_label', errors);
    if (value !== null) data.button_label = value;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'button_href')) {
    const value = text(source, 'button_href', errors);
    if (value !== null) {
      if (value && !HREF_RE.test(value)) errors.push('button_href debe ser una URL http(s), mailto, tel, ruta o ancla válida');
      else data.button_href = value;
    }
  }
  if (Object.prototype.hasOwnProperty.call(source, 'media_type')) {
    if (source.media_type !== 'image' && source.media_type !== 'video') errors.push('media_type debe ser image o video');
    else data.media_type = source.media_type;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'product_slug')) {
    const value = source.product_slug;
    if (value === null || value === '') data.product_slug = null;
    else if (typeof value !== 'string' || value.length > 80 || !SLUG_RE.test(value)) {
      errors.push('product_slug debe ser un slug válido (minúsculas, números y guiones) o null');
    } else data.product_slug = value;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'image_path')) {
    const value = mediaPath(source, 'image_path', errors);
    if (value !== null || source.image_path === null) data.image_path = value;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'video_path')) {
    const value = mediaPath(source, 'video_path', errors);
    if (value !== null || source.video_path === null) data.video_path = value;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'is_published')) {
    if (typeof source.is_published !== 'boolean') errors.push('is_published debe ser true o false');
    else data.is_published = source.is_published;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'starts_at')) {
    data.starts_at = dateOrNull(source.starts_at, 'starts_at', errors);
  }
  if (Object.prototype.hasOwnProperty.call(source, 'ends_at')) {
    data.ends_at = dateOrNull(source.ends_at, 'ends_at', errors);
  }

  if (!errors.length && !Object.keys(data).length) errors.push('No hay cambios para aplicar');
  if (errors.length) return { errors };
  return { data };
}

// Registro de un archivo en la galería propia de la portada
// (home_hero_media): la ruta siempre es de la carpeta hero/ que
// crea POST /api/hero/upload-url.
export function validateHeroMediaRegister(body) {
  const errors = [];
  const source = body || {};
  const storagePath = typeof source.storage_path === 'string' ? source.storage_path.trim() : '';
  const mediaType = typeof source.media_type === 'string' ? source.media_type.trim() : '';
  const altText = typeof source.alt_text === 'string' ? source.alt_text.trim() : '';
  if (!storagePath) errors.push('La ruta del archivo es obligatoria');
  else if (storagePath.length > 500 || storagePath.includes('..') || !storagePath.startsWith('hero/')) {
    errors.push('storage_path debe ser una ruta válida dentro de hero/');
  }
  if (mediaType !== 'image' && mediaType !== 'video') errors.push('media_type debe ser image o video');
  if (altText.length > 200) errors.push('El texto alternativo no puede superar 200 caracteres');
  if (errors.length) return { errors };
  return { data: { storage_path: storagePath, media_type: mediaType, alt_text: altText || null } };
}

// Reordenamiento completo de la galería de la portada: la lista
// recibida debe ser exactamente el conjunto de archivos actuales
// (si la galería cambió en paralelo se responde 409 y el panel
// recarga).
export function validateHeroReorder(body) {
  const errors = [];
  const ids = body && Array.isArray(body.ordered_ids) ? body.ordered_ids : null;
  if (!ids || !ids.length) {
    errors.push('ordered_ids debe ser una lista con los IDs de los archivos');
  } else {
    if (ids.length > 500) errors.push('ordered_ids no puede superar 500 elementos');
    if (ids.some((id) => !isUuid(id))) errors.push('ordered_ids contiene un ID no válido');
    else if (new Set(ids).size !== ids.length) errors.push('ordered_ids contiene IDs repetidos');
  }
  if (errors.length) return { errors };
  return { data: { ordered_ids: ids } };
}
