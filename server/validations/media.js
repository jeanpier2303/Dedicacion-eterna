const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const VIDEO_EXT = ['.mp4', '.webm', '.mov'];
const MAX_SIZE = { image: 10485760, video: 104857600 };
const EXTENSIONS = { image: IMAGE_EXT, video: VIDEO_EXT };

function extensionOf(filename) {
  const index = filename.lastIndexOf('.');
  return index >= 0 ? filename.slice(index).toLowerCase() : '';
}

export function mediaBucket(mediaType) {
  return mediaType === 'video' ? 'product-videos' : 'product-images';
}

export function maxFileSize(mediaType) {
  return MAX_SIZE[mediaType] || 0;
}

export function validateUploadRequest(body) {
  const errors = [];
  const source = body || {};
  const filename = typeof source.filename === 'string' ? source.filename.trim() : '';
  const mediaType = typeof source.media_type === 'string' ? source.media_type.trim() : '';
  if (!filename) errors.push('El nombre del archivo es obligatorio');
  else if (filename.length > 200) errors.push('El nombre del archivo no puede superar 200 caracteres');
  else if (/[/\\]/.test(filename) || filename.includes('..')) errors.push('El nombre del archivo no puede contener rutas');
  if (mediaType !== 'image' && mediaType !== 'video') errors.push('media_type debe ser image o video');
  if (!errors.length) {
    const ext = extensionOf(filename);
    if (!EXTENSIONS[mediaType].includes(ext)) {
      errors.push(`Formato no permitido para ${mediaType}: ${ext || 'sin extensión'}`);
    }
  }
  if (source.size !== undefined && source.size !== null && source.size !== '') {
    const size = Number(source.size);
    if (!Number.isInteger(size) || size <= 0) errors.push('size debe ser un número entero positivo');
    else if (size > MAX_SIZE[mediaType]) errors.push(`El archivo supera el límite de ${Math.floor(MAX_SIZE[mediaType] / 1048576)} MB`);
  }
  if (errors.length) return { errors };
  return { data: { filename, media_type: mediaType, size: source.size !== undefined && source.size !== null && source.size !== '' ? Number(source.size) : null } };
}

export function validateMediaRegister(body) {
  const errors = [];
  const source = body || {};
  const storagePath = typeof source.storage_path === 'string' ? source.storage_path.trim() : '';
  const mediaType = typeof source.media_type === 'string' ? source.media_type.trim() : '';
  const altText = typeof source.alt_text === 'string' ? source.alt_text.trim() : '';
  if (!storagePath) errors.push('La ruta del archivo es obligatoria');
  else if (storagePath.length > 500) errors.push('La ruta del archivo es demasiado larga');
  else if (storagePath.includes('..')) errors.push('La ruta del archivo no es válida');
  if (mediaType !== 'image' && mediaType !== 'video') errors.push('media_type debe ser image o video');
  if (altText.length > 200) errors.push('El texto alternativo no puede superar 200 caracteres');
  const data = { storage_path: storagePath, media_type: mediaType, alt_text: altText || null };
  if (Object.prototype.hasOwnProperty.call(source, 'display_order')) {
    const order = Number(source.display_order);
    if (!Number.isInteger(order)) errors.push('display_order debe ser un número entero');
    else data.display_order = order;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'is_primary')) {
    if (typeof source.is_primary !== 'boolean') errors.push('is_primary debe ser true o false');
    else data.is_primary = source.is_primary;
  }
  if (errors.length) return { errors };
  return { data };
}

export function validateMediaPatch(body) {
  const errors = [];
  const source = body || {};
  const data = {};
  if (Object.prototype.hasOwnProperty.call(source, 'alt_text')) {
    if (source.alt_text !== null && typeof source.alt_text !== 'string') errors.push('alt_text debe ser texto');
    else if (typeof source.alt_text === 'string' && source.alt_text.trim().length > 200) errors.push('El texto alternativo no puede superar 200 caracteres');
    else data.alt_text = source.alt_text ? source.alt_text.trim() : null;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'display_order')) {
    const order = Number(source.display_order);
    if (!Number.isInteger(order)) errors.push('display_order debe ser un número entero');
    else data.display_order = order;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'is_primary')) {
    if (typeof source.is_primary !== 'boolean') errors.push('is_primary debe ser true o false');
    else data.is_primary = source.is_primary;
  }
  if (!errors.length && !Object.keys(data).length) errors.push('No hay cambios para aplicar');
  if (errors.length) return { errors };
  return { data };
}
