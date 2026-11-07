const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function isSlug(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 80 && SLUG_RE.test(value);
}

export function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value);
}

export function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

export function qp(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function cleanSearch(value) {
  return String(value || '').replace(/[%_\\]/g, '').slice(0, 80);
}
