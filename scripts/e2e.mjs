import { createClient } from '@supabase/supabase-js';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SUPA_URL = process.env.SUPABASE_URL;
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;

if (!SUPA_URL || !PUBLISHABLE || !SECRET) {
  console.log('FALTAN variables de entorno');
  process.exit(1);
}

const admin = createClient(SUPA_URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(SUPA_URL, PUBLISHABLE, { auth: { persistSession: false, autoRefreshToken: false } });

const stamp = Date.now();
const password = `E2e!Pass${stamp}`;
const adminEmail = `e2e-admin-${stamp}@example.com`;
const editorEmail = `e2e-editor-${stamp}@example.com`;
const viewerEmail = `e2e-consulta-${stamp}@example.com`;

const track = { userIds: [], categoryIds: [], productIds: [], storageRefs: [] };
const results = [];
let seq = 0;

function expect(cond, message) {
  if (!cond) throw new Error(message);
}

async function t(name, fn) {
  seq += 1;
  try {
    const info = await fn();
    results.push({ n: seq, name, ok: true, info: info || '' });
  } catch (e) {
    results.push({ n: seq, name, ok: false, info: e.message || String(e) });
  }
}

async function api(method, path, opts = {}) {
  const { token, body } = opts;
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data, headers: res.headers };
}

async function login(email, pass) {
  return api('POST', '/api/auth/login', { body: { email, password: pass } });
}

async function createTempUser(email, role) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Usuario E2E' },
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  track.userIds.push(data.user.id);
  if (role) {
    const { error: roleError } = await admin.from('profiles').upsert({ id: data.user.id, role }, { onConflict: 'id' });
    if (roleError) throw new Error(`setRole: ${roleError.message}`);
  }
  return data.user;
}

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
const FAKE_MP4 = Buffer.from('00000018667479706d70343269736f6d', 'hex');

async function uploadFile(path, bytes, filename, contentType) {
  const file = new File([bytes], filename, { type: contentType });
  const { error } = await anon.storage.from(contentType.startsWith('video') ? 'product-videos' : 'product-images')
    .uploadToSignedUrl(path, currentUploadToken, file, { contentType, upsert: false });
  if (error) throw new Error(`upload: ${error.message}`);
}

let currentUploadToken = null;

async function storageHas(bucket, folder, filename) {
  const { data, error } = await admin.storage.from(bucket).list(folder, { search: filename, limit: 50 });
  if (error) throw new Error(`storage list: ${error.message}`);
  return (data || []).some((row) => row.name === filename);
}

async function cleanup() {
  for (const pid of track.productIds) {
    try {
      const { data: rows } = await admin.from('product_media').select('media_type, storage_path').eq('product_id', pid);
      for (const row of rows || []) {
        const bucket = row.media_type === 'video' ? 'product-videos' : 'product-images';
        try { await admin.storage.from(bucket).remove([row.storage_path]); } catch {}
      }
      await admin.from('products').delete().eq('id', pid);
    } catch {}
  }
  for (const ref of track.storageRefs) {
    try { await admin.storage.from(ref.bucket).remove([ref.path]); } catch {}
  }
  for (const cid of track.categoryIds) {
    try { await admin.from('categories').delete().eq('id', cid); } catch {}
  }
  for (const uid of track.userIds) {
    try { await admin.auth.admin.deleteUser(uid); } catch {}
  }
}

let adminToken = null;
let editorToken = null;
let viewerToken = null;
let editorId = null;
let viewerId = null;
let categoryId = null;
let productId = null;
let productSlug = null;
let image1 = null;
let image2 = null;
let video = null;
let videoPath = null;
let folder = null;
let originalHero = null;
let heroUploadPath = null;
let heroUploadToken = null;

try {
  console.log(`Base: ${BASE}\n`);

  await t('Vercel responde en /api', async () => {
    const r = await api('GET', '/api/catalog/categories');
    expect([200, 503].includes(r.status), `status ${r.status}`);
    return `status ${r.status}`;
  });

  await t('login con body vacuo -> 400', async () => {
    const r = await api('POST', '/api/auth/login', { body: {} });
    expect(r.status === 400, `status ${r.status}`);
  });

  await t('login correo invalido -> 400', async () => {
    const r = await api('POST', '/api/auth/login', { body: { email: 'no-es-correo', password: 'x' } });
    expect(r.status === 400, `status ${r.status}`);
  });

  await t('/api/auth/me sin token -> 401', async () => {
    const r = await api('GET', '/api/auth/me');
    expect(r.status === 401, `status ${r.status}`);
  });

  await t('metodo no permitido -> 405', async () => {
    const r = await api('DELETE', '/api/auth/login');
    expect(r.status === 405, `status ${r.status}`);
  });

  await t('crear administrador temporal (directo en Supabase)', async () => {
    const user = await createTempUser(adminEmail, 'administrador');
    return `id ${user.id.slice(0, 8)}`;
  });

  await t('login administrador -> 200 con rol', async () => {
    const r = await login(adminEmail, password);
    expect(r.status === 200, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.profile?.role === 'administrador', `rol ${r.data.profile?.role}`);
    adminToken = r.data.session.access_token;
    return 'rol administrador';
  });

  await t('login password incorrecta -> 400', async () => {
    const r = await login(adminEmail, 'PasswordIncorrecta1');
    expect(r.status === 400, `status ${r.status}`);
    return r.data?.error || '';
  });

  await t('login de cuenta sin acceso al panel -> 403', async () => {
    const email = `e2e-noaccess-${stamp}@example.com`;
    await createTempUser(email);
    const r = await login(email, password);
    expect(r.status === 403, `status ${r.status}: ${r.data?.error || ''}`);
    return r.data?.error || '';
  });

  await t('/api/auth/me con token -> 200 rol correcto', async () => {
    const r = await api('GET', '/api/auth/me', { token: adminToken });
    expect(r.status === 200, `status ${r.status}`);
    expect(r.data.profile.role === 'administrador', `rol ${r.data.profile.role}`);
  });

  let session = null;
  await t('refresh de sesion -> 200 token nuevo', async () => {
    const fresh = await login(adminEmail, password);
    expect(fresh.status === 200, `login status ${fresh.status}`);
    session = fresh.data.session;
    const r = await api('POST', '/api/auth/refresh', { body: { refresh_token: session.refresh_token } });
    expect(r.status === 200, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.session.access_token && r.data.session.access_token !== session.access_token, 'token no rotado');
    session = r.data.session;
    return 'token rotado';
  });

  await t('logout revoca la sesion (refresh posterior -> 401)', async () => {
    const out = await api('POST', '/api/auth/logout', { token: session.access_token });
    expect(out.status === 200, `logout status ${out.status}`);
    const r = await api('POST', '/api/auth/refresh', { body: { refresh_token: session.refresh_token } });
    expect(r.status === 401, `refresh tras logout status ${r.status}: ${r.data?.error || ''}`);
  });

  const reLogin = await login(adminEmail, password);
  adminToken = reLogin.status === 200 ? reLogin.data.session.access_token : null;
  expect(adminToken, 're-login fallido');

  await t('GET /api/users sin token -> 401', async () => {
    const r = await api('GET', '/api/users');
    expect(r.status === 401, `status ${r.status}`);
  });

  await t('GET /api/users (admin) -> 200 lista', async () => {
    const r = await api('GET', '/api/users', { token: adminToken });
    expect(r.status === 200, `status ${r.status}`);
    expect(Array.isArray(r.data.users) && r.data.users.length >= 1, 'lista vacia');
    return `${r.data.users.length} usuarios`;
  });

  await t('GET /api/catalog/hero publico -> 200 con clave hero', async () => {
    const r = await api('GET', '/api/catalog/hero');
    expect(r.status === 200, `status ${r.status}: ${r.data?.error || ''}`);
    expect('hero' in r.data, 'sin clave hero');
  });

  await t('GET /api/hero sin token -> 401', async () => {
    const r = await api('GET', '/api/hero');
    expect(r.status === 401, `status ${r.status}`);
  });

  await t('GET /api/hero (admin) -> 200 y captura el estado original', async () => {
    const r = await api('GET', '/api/hero', { token: adminToken });
    expect(r.status === 200, `status ${r.status}: ${r.data?.error || ''}`);
    originalHero = r.data.hero;
    return `publicada ${originalHero.is_published}`;
  });

  await t('POST /api/users crea administrador -> 201', async () => {
    const r = await api('POST', '/api/users', { token: adminToken, body: { email: editorEmail, password, full_name: 'Administrador E2E' } });
    expect(r.status === 201, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.user.role === 'administrador', `rol ${r.data.user.role}`);
    editorId = r.data.user.id;
    track.userIds.push(editorId);
    return 'rol administrador';
  });

  await t('POST /api/users crea segundo administrador -> 201', async () => {
    const r = await api('POST', '/api/users', { token: adminToken, body: { email: viewerEmail, password } });
    expect(r.status === 201, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.user.role === 'administrador', `rol ${r.data.user.role}`);
    viewerId = r.data.user.id;
    track.userIds.push(viewerId);
    return 'rol administrador';
  });

  await t('POST /api/users rol heredado rechazado -> 400', async () => {
    const r = await api('POST', '/api/users', { token: adminToken, body: { email: `e2e-legacy-role-${stamp}@example.com`, password, role: 'editor' } });
    expect(r.status === 400, `status ${r.status}`);
    expect(JSON.stringify(r.data.details || r.data).includes('administrador'), r.data?.error || '');
  });

  await t('POST /api/users password corta -> 400', async () => {
    const r = await api('POST', '/api/users', { token: adminToken, body: { email: `e2e-short-${stamp}@example.com`, password: '123', role: 'editor' } });
    expect(r.status === 400, `status ${r.status}`);
  });

  await t('POST /api/users email duplicado -> 409', async () => {
    const r = await api('POST', '/api/users', { token: adminToken, body: { email: editorEmail, password } });
    expect(r.status === 409, `status ${r.status}`);
  });

  await t('PATCH usuario rechaza roles heredados -> 400', async () => {
    const a = await api('PATCH', `/api/users/${editorId}`, { token: adminToken, body: { role: 'consulta' } });
    expect(a.status === 400, `status ${a.status}`);
  });

  await t('PATCH desactivar usuario -> 200 active false', async () => {
    const r = await api('PATCH', `/api/users/${editorId}`, { token: adminToken, body: { active: false } });
    expect(r.status === 200, `status ${r.status}`);
    expect(r.data.user.active === false, `active ${r.data.user.active}`);
  });

  await t('login de usuario desactivado bloqueado', async () => {
    const r = await login(editorEmail, password);
    expect([400, 403].includes(r.status), `status ${r.status}`);
    return `${r.status} ${r.data?.error || ''}`;
  });

  await t('PATCH reactivar usuario + login -> 200', async () => {
    const r = await api('PATCH', `/api/users/${editorId}`, { token: adminToken, body: { active: true } });
    expect(r.status === 200 && r.data.user.active === true, `status ${r.status}`);
    const loginR = await login(editorEmail, password);
    expect(loginR.status === 200, `login status ${loginR.status}: ${loginR.data?.error || ''}`);
    editorToken = loginR.data.session.access_token;
    const viewerLogin = await login(viewerEmail, password);
    expect(viewerLogin.status === 200, `login consulta status ${viewerLogin.status}`);
    viewerToken = viewerLogin.data.session.access_token;
  });

  await t('cualquier administrador puede consultar usuarios -> 200', async () => {
    const r = await api('GET', '/api/users', { token: editorToken });
    expect(r.status === 200, `status ${r.status}`);
  });

  await t('actualización rechaza roles heredados -> 400', async () => {
    const r = await api('PATCH', `/api/users/${viewerId}`, { token: editorToken, body: { role: 'editor' } });
    expect(r.status === 400, `status ${r.status}`);
  });

  await t('PATCH conserva el único rol administrador -> 200', async () => {
    const r = await api('PATCH', `/api/users/${viewerId}`, { token: adminToken, body: { role: 'administrador' } });
    expect(r.status === 200 && r.data.user.role === 'administrador', `status ${r.status}`);
  });

  await t('GET /api/categories sin token -> 401', async () => {
    const r = await api('GET', '/api/categories');
    expect(r.status === 401, `status ${r.status}`);
  });

  await t('GET /api/categories (admin) incluye las existentes -> 200', async () => {
    const r = await api('GET', '/api/categories', { token: adminToken });
    expect(r.status === 200, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.categories.length >= 11, `total ${r.data.categories.length}`);
    return `${r.data.categories.length} categorias`;
  });

  await t('POST /api/categories crea categoria -> 201 slug automatico', async () => {
    const r = await api('POST', '/api/categories', { token: adminToken, body: { name: 'Categoria Prueba E2E' } });
    expect(r.status === 201, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.category.slug === 'categoria-prueba-e2e', `slug ${r.data.category.slug}`);
    categoryId = r.data.category.id;
    track.categoryIds.push(categoryId);
    return `slug ${r.data.category.slug}`;
  });

  await t('POST /api/categories sin nombre -> 400', async () => {
    const r = await api('POST', '/api/categories', { token: adminToken, body: {} });
    expect(r.status === 400, `status ${r.status}`);
  });

  await t('crear categorias sin token -> 401', async () => {
    const r = await api('POST', '/api/categories', { body: { name: 'Otra' } });
    expect(r.status === 401, `status ${r.status}`);
  });

  await t('editor puede editar categorias -> 200', async () => {
    const r = await api('PATCH', `/api/categories/${categoryId}`, { token: editorToken, body: { description: 'editada por editor' } });
    expect(r.status === 200, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.category.description === 'editada por editor', 'descripcion no guardada');
  });

  await t('desactivar categoria la oculta del catalogo publico', async () => {
    const off = await api('PATCH', `/api/categories/${categoryId}`, { token: adminToken, body: { is_active: false } });
    expect(off.status === 200, `patch status ${off.status}`);
    const pub = await api('GET', '/api/catalog/categories');
    expect(pub.status === 200, `catalogo status ${pub.status}`);
    expect(!pub.data.categories.some((c) => c.slug === 'categoria-prueba-e2e'), 'sigue visible');
    const on = await api('PATCH', `/api/categories/${categoryId}`, { token: adminToken, body: { is_active: true } });
    expect(on.status === 200, `reactivar status ${on.status}`);
    const pub2 = await api('GET', '/api/catalog/categories');
    expect(pub2.data.categories.some((c) => c.slug === 'categoria-prueba-e2e'), 'no reaparece');
  });

  await t('POST /api/products (editor) crea producto -> 201 slug automatico', async () => {
    const r = await api('POST', '/api/products', { token: editorToken, body: { name: 'Producto Prueba E2E', category_id: categoryId } });
    expect(r.status === 201, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.product.slug === 'producto-prueba-e2e', `slug ${r.data.product.slug}`);
    expect(r.data.product.is_published === false, 'is_published deberia ser false');
    productId = r.data.product.id;
    productSlug = r.data.product.slug;
    track.productIds.push(productId);
    folder = `products/${productId}`;
    return `slug ${productSlug}`;
  });

  await t('POST /api/products sin categoria -> 400', async () => {
    const r = await api('POST', '/api/products', { token: editorToken, body: { name: 'Sin categoria' } });
    expect(r.status === 400, `status ${r.status}`);
  });

  await t('POST /api/products slug duplicado -> 409', async () => {
    const r = await api('POST', '/api/products', { token: editorToken, body: { name: 'Producto Prueba E2E', category_id: categoryId } });
    expect(r.status === 409, `status ${r.status}`);
  });

  await t('POST /api/products precio negativo -> 400', async () => {
    const r = await api('POST', '/api/products', { token: editorToken, body: { name: 'Precio malo', category_id: categoryId, price: -10 } });
    expect(r.status === 400, `status ${r.status}`);
  });

  await t('GET /api/products (editor) lista productos -> 200', async () => {
    const r = await api('GET', '/api/products', { token: editorToken });
    expect(r.status === 200, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.products.some((p) => p.slug === productSlug), 'no incluye el creado');
    return `${r.data.products.length} productos`;
  });

  await t('GET /api/products por slug -> 200', async () => {
    const r = await api('GET', `/api/products/${productSlug}`, { token: editorToken });
    expect(r.status === 200, `status ${r.status}`);
    expect(r.data.product.id === productId, 'id distinto');
  });

  await t('listar productos del panel sin token -> 401', async () => {
    const r = await api('GET', '/api/products');
    expect(r.status === 401, `status ${r.status}`);
  });

  await t('editar productos sin token -> 401', async () => {
    const r = await api('PATCH', `/api/products/${productSlug}`, { body: { name: 'Hack' } });
    expect(r.status === 401, `status ${r.status}`);
  });

  await t('PATCH precios (editor) -> 200 valores numericos', async () => {
    const r = await api('PATCH', `/api/products/${productSlug}`, { token: editorToken, body: { price: 15000, old_price: 19000 } });
    expect(r.status === 200, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.product.price === 15000, `price ${r.data.product.price}`);
    expect(r.data.product.old_price === 19000, `old_price ${r.data.product.old_price}`);
  });

  await t('catalogo no muestra producto sin publicar', async () => {
    const r = await api('GET', '/api/catalog/products');
    expect(r.status === 200, `status ${r.status}: ${r.data?.error || ''}`);
    expect(!r.data.products.some((p) => p.slug === productSlug), 'aparece sin publicar');
  });

  await t('admin publica y destaca producto -> 200', async () => {
    const r = await api('PATCH', `/api/products/${productSlug}`, { token: adminToken, body: { is_published: true, is_featured: true, short_description: 'descripcion corta e2e' } });
    expect(r.status === 200, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.product.is_published === true && r.data.product.is_featured === true, 'flags incorrectos');
  });

  await t('catalogo publico muestra el producto publicado', async () => {
    const r = await api('GET', '/api/catalog/products');
    expect(r.status === 200, `status ${r.status}`);
    const found = r.data.products.find((p) => p.slug === productSlug);
    expect(found, 'no aparece');
    expect(found.image === null, 'image deberia ser null sin medios');
    expect(found.category?.slug === 'categoria-prueba-e2e', 'categoria incorrecta');
    expect(found.price === 15000, `price ${found.price}`);
  });

  await t('GET /api/catalog/products/{slug} -> 200', async () => {
    const r = await api('GET', `/api/catalog/products/${productSlug}`);
    expect(r.status === 200, `status ${r.status}`);
    expect(r.data.product.slug === productSlug, 'slug distinto');
  });

  await t('GET /api/catalog/products/desconocido -> 404', async () => {
    const r = await api('GET', '/api/catalog/products/no-existe-ninguno');
    expect(r.status === 404, `status ${r.status}`);
  });

  await t('eliminar productos sin autenticación -> 401', async () => {
    const r = await api('DELETE', `/api/products/${productSlug}`);
    expect(r.status === 401, `status ${r.status}`);
  });

  await t('upload-url sin token -> 401', async () => {
    const r = await api('POST', `/api/products/${productId}/upload-url`, { body: { filename: 'a.png', media_type: 'image' } });
    expect(r.status === 401, `status ${r.status}`);
  });

  await t('upload-url extension no permitida -> 400', async () => {
    const r = await api('POST', `/api/products/${productId}/upload-url`, { token: editorToken, body: { filename: 'virus.exe', media_type: 'image' } });
    expect(r.status === 400, `status ${r.status}`);
  });

  await t('upload-url imagen valida -> 201 con token de subida', async () => {
    const r = await api('POST', `/api/products/${productId}/upload-url`, { token: editorToken, body: { filename: 'prueba-e2e.png', media_type: 'image', size: PNG.length } });
    expect(r.status === 201, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.bucket === 'product-images', `bucket ${r.data.bucket}`);
    expect(r.data.path.startsWith(folder + '/'), `path ${r.data.path}`);
    image1 = r.data;
    track.storageRefs.push({ bucket: r.data.bucket, path: r.data.path });
    return 'path y token listos';
  });

  await t('subida real del archivo a Storage privado', async () => {
    currentUploadToken = image1.token;
    await uploadFile(image1.path, PNG, 'prueba-e2e.png', 'image/png');
    expect(await storageHas('product-images', folder, image1.path.split('/').pop()), 'archivo no esta en el bucket');
  });

  await t('POST media registra imagen principal -> 201 con URL firmada', async () => {
    const r = await api('POST', `/api/products/${productId}/media`, { token: editorToken, body: { storage_path: image1.path, media_type: 'image', alt_text: 'Imagen e2e', is_primary: true } });
    expect(r.status === 201, `status ${r.status}: ${r.data?.error || ''}`);
    expect(typeof r.data.media.signed_url === 'string' && r.data.media.signed_url.includes('token='), 'sin URL firmada');
    image1.id = r.data.media.id;
    return 'signed_url generada';
  });

  await t('POST media ruta duplicada -> 409', async () => {
    const r = await api('POST', `/api/products/${productId}/media`, { token: editorToken, body: { storage_path: image1.path, media_type: 'image' } });
    expect(r.status === 409, `status ${r.status}`);
  });

  await t('POST media ruta de otro producto -> 400', async () => {
    const r = await api('POST', `/api/products/${productId}/media`, { token: editorToken, body: { storage_path: 'products/00000000-0000-0000-0000-000000000000/x.png', media_type: 'image' } });
    expect(r.status === 400, `status ${r.status}`);
  });

  await t('GET media del producto -> 200 un elemento', async () => {
    const r = await api('GET', `/api/products/${productId}/media`, { token: editorToken });
    expect(r.status === 200, `status ${r.status}`);
    expect(r.data.media.length === 1, `total ${r.data.media.length}`);
    expect(r.data.media[0].is_primary === true, 'no es principal');
  });

  await t('upload + registro de VIDEO -> 201', async () => {
    const up = await api('POST', `/api/products/${productId}/upload-url`, { token: editorToken, body: { filename: 'video-e2e.mp4', media_type: 'video', size: FAKE_MP4.length } });
    expect(up.status === 201, `upload-url status ${up.status}: ${up.data?.error || ''}`);
    expect(up.data.bucket === 'product-videos', `bucket ${up.data.bucket}`);
    currentUploadToken = up.data.token;
    await uploadFile(up.data.path, FAKE_MP4, 'video-e2e.mp4', 'video/mp4');
    track.storageRefs.push({ bucket: up.data.bucket, path: up.data.path });
    videoPath = up.data.path;
    const reg = await api('POST', `/api/products/${productId}/media`, { token: editorToken, body: { storage_path: up.data.path, media_type: 'video', alt_text: 'Video e2e' } });
    expect(reg.status === 201, `registro status ${reg.status}: ${reg.data?.error || ''}`);
    expect(typeof reg.data.media.signed_url === 'string' && reg.data.media.signed_url.length > 0, 'video sin URL firmada');
    video = reg.data.media;
    return 'video con signed_url';
  });

  await t('subida y registro de SEGUNDA imagen', async () => {
    const up = await api('POST', `/api/products/${productId}/upload-url`, { token: editorToken, body: { filename: 'prueba-e2e-2.png', media_type: 'image', size: PNG.length } });
    expect(up.status === 201, `upload-url status ${up.status}`);
    currentUploadToken = up.data.token;
    await uploadFile(up.data.path, PNG, 'prueba-e2e-2.png', 'image/png');
    track.storageRefs.push({ bucket: up.data.bucket, path: up.data.path });
    const reg = await api('POST', `/api/products/${productId}/media`, { token: editorToken, body: { storage_path: up.data.path, media_type: 'image', alt_text: 'Imagen 2' } });
    expect(reg.status === 201, `registro status ${reg.status}: ${reg.data?.error || ''}`);
    image2 = reg.data.media;
    return `display_order ${image2.display_order}`;
  });

  await t('GET media -> 200 tres elementos y una sola principal', async () => {
    const r = await api('GET', `/api/products/${productId}/media`, { token: editorToken });
    expect(r.status === 200, `status ${r.status}`);
    expect(r.data.media.length === 3, `total ${r.data.media.length}`);
    expect(r.data.media.filter((m) => m.is_primary).length === 1, 'principales != 1');
  });

  await t('URL firmada de imagen accesible (200 image/*)', async () => {
    const list = await api('GET', `/api/products/${productId}/media`, { token: editorToken });
    const img = list.data.media.find((m) => m.media_type === 'image' && m.is_primary);
    const res = await fetch(img.signed_url);
    expect(res.status === 200, `status ${res.status}`);
    expect((res.headers.get('content-type') || '').startsWith('image/'), `content-type ${res.headers.get('content-type')}`);
    return '200 image';
  });

  await t('archivo privado NO accesible sin URL firmada', async () => {
    const direct = `${SUPA_URL}/storage/v1/object/product-images/${image1.path}`;
    const res = await fetch(direct);
    expect(res.status !== 200, `status ${res.status}`);
    return `status ${res.status}`;
  });

  await t('cambiar imagen principal -> 200 y unica', async () => {
    const r = await api('PATCH', `/api/media/${image2.id}`, { token: editorToken, body: { is_primary: true } });
    expect(r.status === 200 && r.data.media.is_primary === true, `status ${r.status}`);
    const list = await api('GET', `/api/products/${productId}/media`, { token: editorToken });
    const primaries = list.data.media.filter((m) => m.is_primary);
    expect(primaries.length === 1 && primaries[0].id === image2.id, 'principal no cambiada');
  });

  await t('video no puede ser principal -> 400', async () => {
    const r = await api('PATCH', `/api/media/${video.id}`, { token: editorToken, body: { is_primary: true } });
    expect(r.status === 400, `status ${r.status}`);
  });

  await t('PATCH orden y alt_text -> 200', async () => {
    const r = await api('PATCH', `/api/media/${image1.id}`, { token: editorToken, body: { display_order: 9, alt_text: 'editada' } });
    expect(r.status === 200, `status ${r.status}`);
    expect(r.data.media.display_order === 9 && r.data.media.alt_text === 'editada', 'campos no guardados');
  });

  await t('DELETE media (video) elimina archivo y fila -> 200', async () => {
    const filename = videoPath.split('/').pop();
    const r = await api('DELETE', `/api/media/${video.id}`, { token: editorToken });
    expect(r.status === 200, `status ${r.status}`);
    expect(!(await storageHas('product-videos', folder, filename)), 'archivo sigue en Storage');
  });

  await t('catalogo publico entrega galeria con URLs firmadas', async () => {
    const r = await api('GET', `/api/catalog/products/${productSlug}`);
    expect(r.status === 200, `status ${r.status}`);
    const p = r.data.product;
    expect(typeof p.image === 'string' && p.image.includes('token='), 'sin imagen principal');
    expect(p.images.length === 2, `images ${p.images.length}`);
    expect(p.media.every((m) => typeof m.signed_url === 'string'), 'media sin signed_url');
    expect(!p.media.some((m) => 'storage_path' in m), 'filtra storage_path');
    const res = await fetch(p.image);
    expect(res.status === 200, `fetch imagen ${res.status}`);
    return `${p.images.length} imagenes firmadas`;
  });

  await t('PATCH hero publica la portada -> 200', async () => {
    const r = await api('PATCH', '/api/hero', {
      token: adminToken,
      body: {
        title: 'Portada E2E',
        description: 'Descripcion de prueba e2e',
        button_label: 'Ver catálogo',
        button_href: '#catalogo',
        media_type: 'image',
        is_published: true,
        starts_at: null,
        ends_at: null,
      },
    });
    expect(r.status === 200, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.hero.is_published === true, 'no publicada');
    expect(r.data.hero.title === 'Portada E2E', `titulo ${r.data.hero.title}`);
  });

  await t('catalogo publico entrega la portada publicada', async () => {
    const r = await api('GET', '/api/catalog/hero');
    expect(r.status === 200, `status ${r.status}`);
    expect(r.data.hero && r.data.hero.title === 'Portada E2E', 'portada no visible');
  });

  await t('PATCH hero rechaza enlace inseguro -> 400', async () => {
    const r = await api('PATCH', '/api/hero', { token: adminToken, body: { button_href: 'javascript:alert(1)' } });
    expect(r.status === 400, `status ${r.status}`);
  });

  await t('PATCH hero rechaza fechas invertidas -> 400', async () => {
    const r = await api('PATCH', '/api/hero', {
      token: adminToken,
      body: { starts_at: '2027-01-02T00:00:00.000Z', ends_at: '2027-01-01T00:00:00.000Z' },
    });
    expect(r.status === 400, `status ${r.status}`);
  });

  await t('upload-url hero sin token -> 401', async () => {
    const r = await api('POST', '/api/hero/upload-url', { body: { filename: 'portada.png', media_type: 'image' } });
    expect(r.status === 401, `status ${r.status}`);
  });

  await t('upload-url hero con imagen valida -> 201', async () => {
    const r = await api('POST', '/api/hero/upload-url', { token: adminToken, body: { filename: 'portada-e2e.png', media_type: 'image', size: PNG.length } });
    expect(r.status === 201, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.path.startsWith('hero/'), r.data.path);
    heroUploadPath = r.data.path;
    heroUploadToken = r.data.token;
    track.storageRefs.push({ bucket: r.data.bucket, path: r.data.path });
    return r.data.path;
  });

  await t('PATCH hero guarda la imagen subida -> 200 con URL firmada', async () => {
    currentUploadToken = heroUploadToken;
    await uploadFile(heroUploadPath, PNG, 'portada-e2e.png', 'image/png');
    expect(await storageHas('product-images', 'hero', heroUploadPath.split('/').pop()), 'archivo no esta en el bucket');
    const r = await api('PATCH', '/api/hero', { token: adminToken, body: { image_path: heroUploadPath } });
    expect(r.status === 200, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.hero.image_path === heroUploadPath, `path ${r.data.hero.image_path}`);
    expect(typeof r.data.hero.image_url === 'string' && r.data.hero.image_url.includes('token='), 'sin image_url');
  });

  await t('PATCH hero rechaza ruta no subida -> 400', async () => {
    const r = await api('PATCH', '/api/hero', { token: adminToken, body: { image_path: 'hero/no-existe-archivo.png' } });
    expect(r.status === 400, `status ${r.status}`);
  });

  await t('PATCH hero despublica -> 200 y el catalogo vuelve a null', async () => {
    const r = await api('PATCH', '/api/hero', { token: adminToken, body: { is_published: false } });
    expect(r.status === 200 && r.data.hero.is_published === false, `status ${r.status}`);
    const pub = await api('GET', '/api/catalog/hero');
    expect(pub.status === 200 && pub.data.hero === null, 'sigue visible en el catalogo');
  });

  await t('administrador adicional cierra sesion y consulta su perfil -> 200', async () => {
    const me = await api('GET', '/api/auth/me', { token: viewerToken });
    expect(me.status === 200 && me.data.profile.role === 'administrador', `status ${me.status}`);
    const out = await api('POST', '/api/auth/logout', { token: viewerToken });
    expect(out.status === 200, `logout ${out.status}`);
  });

  await t('admin elimina producto (protocolo Storage+BD) -> 200', async () => {
    const r = await api('DELETE', `/api/products/${productSlug}`, { token: adminToken });
    expect(r.status === 200, `status ${r.status}: ${r.data?.error || ''}`);
    expect(r.data.deleted_media === 2, `deleted_media ${r.data.deleted_media}`);
    return '2 archivos borrados';
  });

  await t('producto eliminado desaparece de panel y catalogo', async () => {
    const panel = await api('GET', `/api/products/${productSlug}`, { token: adminToken });
    expect(panel.status === 404, `panel ${panel.status}`);
    const cat = await api('GET', `/api/catalog/products/${productSlug}`);
    expect(cat.status === 404, `catalogo ${cat.status}`);
  });

  await t('Storage sin archivos huérfanos tras el borrado', async () => {
    const { data, error } = await admin.storage.from('product-images').list(folder, { limit: 100 });
    expect(!error, `list error ${error?.message}`);
    expect((data || []).length === 0, `quedan ${data.length} archivos`);
    const videos = await admin.storage.from('product-videos').list(folder, { limit: 100 });
    expect(!videos.error, `list videos error ${videos.error?.message}`);
    expect((videos.data || []).length === 0, `quedan ${videos.data.length} videos`);
  });
} catch (e) {
  results.push({ n: ++seq, name: 'FALLO CRITICO DE LA SUITE', ok: false, info: e.message || String(e) });
}

for (const r of results) {
  const tag = r.ok ? 'PASS' : 'FAIL';
  console.log(`[${String(r.n).padStart(2)}] ${tag}  ${r.name}${r.info ? ' — ' + r.info : ''}`);
}

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
console.log(`\nTOTAL: ${passed} PASS / ${failed} FAIL`);

if (originalHero && adminToken) {
  try {
    const restored = await api('PATCH', '/api/hero', {
      token: adminToken,
      body: {
        title: originalHero.title,
        description: originalHero.description,
        button_label: originalHero.button_label,
        button_href: originalHero.button_href,
        media_type: originalHero.media_type,
        image_path: originalHero.image_path,
        video_path: originalHero.video_path,
        is_published: originalHero.is_published,
        starts_at: originalHero.starts_at,
        ends_at: originalHero.ends_at,
      },
    });
    console.log(restored.status === 200 ? 'Portada original restaurada.' : `No se pudo restaurar la portada: status ${restored.status}`);
  } catch (e) {
    console.log(`No se pudo restaurar la portada original: ${e.message}`);
  }
}

await cleanup();
console.log('Limpieza completada: usuarios, categorias, productos y archivos temporales eliminados.');

process.exit(failed > 0 ? 1 : 0);
