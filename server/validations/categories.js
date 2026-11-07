import { isSlug, slugify } from './common.js';

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateCategory(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const source = body || {};

  if (!partial || source.name !== undefined) {
    const name = readString(source.name);
    if (!name) errors.push('El nombre es obligatorio');
    else if (name.length > 80) errors.push('El nombre no puede superar 80 caracteres');
    else data.name = name;
  }

  if (source.slug !== undefined && source.slug !== null && readString(source.slug) !== '') {
    const slug = slugify(readString(source.slug));
    if (!isSlug(slug)) errors.push('El slug no es válido');
    else data.slug = slug;
  } else if (!partial) {
    const auto = slugify(data.name || '');
    if (auto) data.slug = auto;
    else errors.push('No se pudo generar un slug a partir del nombre');
  }

  if (!partial || source.description !== undefined) {
    const description = source.description === null ? '' : readString(source.description);
    if (description.length > 300) errors.push('La descripción no puede superar 300 caracteres');
    else data.description = description || null;
  }

  if (source.is_active !== undefined) {
    if (typeof source.is_active !== 'boolean') errors.push('is_active debe ser true o false');
    else data.is_active = source.is_active;
  }

  if (partial && !errors.length && !Object.keys(data).length) errors.push('No hay cambios para aplicar');
  if (errors.length) return { errors };
  return { data };
}
