import { isSlug, isUuid, slugify } from './common.js';

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validatePrice(value, field, errors, target) {
  if (value === null || value === '' || value === undefined) {
    target[field] = null;
    return;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    errors.push(`${field} debe ser un número mayor o igual a 0`);
    return;
  }
  target[field] = number;
}

function validateBoolean(value, field, errors, target) {
  if (value === undefined) return;
  if (typeof value !== 'boolean') {
    errors.push(`${field} debe ser true o false`);
    return;
  }
  target[field] = value;
}

function validateInteger(value, field, errors, target) {
  if (value === undefined || value === null || value === '') return;
  const number = Number(value);
  if (!Number.isInteger(number)) {
    errors.push(`${field} debe ser un número entero`);
    return;
  }
  target[field] = number;
}

export function validateProduct(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const source = body || {};

  if (!partial || source.name !== undefined) {
    const name = readString(source.name);
    if (!name) errors.push('El nombre es obligatorio');
    else if (name.length > 200) errors.push('El nombre no puede superar 200 caracteres');
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

  if (!partial || source.category_id !== undefined) {
    if (!isUuid(source.category_id)) errors.push('La categoría es obligatoria y debe ser un ID válido');
    else data.category_id = source.category_id;
  }

  if (!partial || source.short_description !== undefined) {
    const shortDescription = source.short_description === null ? '' : readString(source.short_description);
    if (shortDescription.length > 300) errors.push('La descripción corta no puede superar 300 caracteres');
    else data.short_description = shortDescription || null;
  }

  if (!partial || source.description !== undefined) {
    const description = typeof source.description === 'string' ? source.description : '';
    if (description.length > 10000) errors.push('La descripción no puede superar 10000 caracteres');
    else data.description = description || null;
  }

  if (!partial || source.price !== undefined) validatePrice(source.price, 'price', errors, data);
  if (!partial || source.old_price !== undefined) validatePrice(source.old_price, 'old_price', errors, data);

  validateBoolean(source.is_published, 'is_published', errors, data);
  validateBoolean(source.is_featured, 'is_featured', errors, data);
  validateInteger(source.display_order, 'display_order', errors, data);

  if (partial && !errors.length && !Object.keys(data).length) errors.push('No hay cambios para aplicar');
  if (errors.length) return { errors };
  return { data };
}
