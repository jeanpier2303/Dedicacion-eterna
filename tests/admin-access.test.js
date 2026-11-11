import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertRole, bearer } from '../server/auth/guard.js';
import { validateUserCreate, validateUserPatch } from '../server/validations/users.js';
import { validateHeroPatch } from '../server/validations/hero.js';
import authRoute from '../server/routes/auth.js';
import catalogRoute from '../server/routes/catalog.js';
import categoriesRoute from '../server/routes/categories.js';
import productsRoute from '../server/routes/products.js';
import mediaRoute from '../server/routes/media.js';
import usersRoute from '../server/routes/users.js';

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    setHeader() {},
    json(body) { this.body = body; return this; },
  };
}

test('solo administrador supera la autorización del panel', () => {
  assert.doesNotThrow(() => assertRole({ role: 'administrador' }));
  for (const role of ['editor', 'consulta', null, undefined]) {
    assert.throws(() => assertRole({ role }), { status: 403 });
  }
});

test('crear usuarios desde el panel no permite asignar roles heredados', () => {
  assert.equal(validateUserCreate({ email: 'admin@example.com', password: 'password123' }).errors, undefined);
  assert.equal(validateUserCreate({ email: 'admin@example.com', password: 'password123', role: 'editor' }).errors.length, 1);
  assert.equal(validateUserCreate({ email: 'admin@example.com', password: 'password123', role: 'consulta' }).errors.length, 1);
});

test('el único rol permitido en actualizaciones es administrador', () => {
  assert.equal(validateUserPatch({ role: 'editor' }).errors.length, 1);
  assert.equal(validateUserPatch({ role: 'consulta' }).errors.length, 1);
  assert.deepEqual(validateUserPatch({ role: 'administrador' }).data, { role: 'administrador' });
});

test('las rutas API conservan las 19 rutas públicas en seis funciones', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const apiFiles = (await (await import('node:fs/promises')).readdir(new URL('../api/handlers', import.meta.url))).filter((file) => file.endsWith('.js'));
  assert.equal(apiFiles.length, 6);
  assert.equal(config.rewrites.length, 19);
  const sources = new Set(config.rewrites.map(({ source }) => source));
  for (const route of [
    '/api/auth/login', '/api/auth/logout', '/api/auth/refresh', '/api/auth/me',
    '/api/catalog/categories', '/api/catalog/products', '/api/catalog/products/:slug',
    '/api/catalog/hero',
    '/api/categories', '/api/categories/:id', '/api/products', '/api/products/:id',
    '/api/products/:id/media', '/api/products/:id/upload-url', '/api/media/:id',
    '/api/users', '/api/users/:id',
    '/api/hero', '/api/hero/upload-url',
  ]) assert.ok(sources.has(route), `Falta rewrite ${route}`);
});

test('las rutas agrupadas despachan métodos y recursos a sus controladores', async () => {
  const cases = [
    [authRoute, { method: 'GET', query: { resource: 'login' } }],
    [categoriesRoute, { method: 'DELETE', query: { resource: 'collection' } }],
    [productsRoute, { method: 'PATCH', query: { resource: 'collection' } }],
    [mediaRoute, { method: 'POST', query: { resource: 'item', id: 'media-id' } }],
    [usersRoute, { method: 'DELETE', query: { resource: 'collection' } }],
  ];
  for (const [route, req] of cases) {
    const res = response();
    await route(req, res);
    assert.equal(res.statusCode, 405);
  }
});

test('cada rewrite apunta a uno de los seis handlers', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const files = new Set((await (await import('node:fs/promises')).readdir(new URL('../api/handlers', import.meta.url))).map((file) => file.replace(/\.js$/, '')));
  for (const { destination } of config.rewrites) {
    const match = destination.match(/^\/api\/handlers\/([a-z]+)\?/);
    assert.ok(match && files.has(match[1]), `Destino inválido ${destination}`);
  }
});

test('recursos y acciones desconocidos responden 404', async () => {
  const cases = [
    [authRoute, { method: 'POST', query: { resource: 'desconocido' } }],
    [catalogRoute, { method: 'GET', query: { resource: 'desconocido' } }],
    [categoriesRoute, { method: 'GET', query: { resource: 'desconocido' } }],
    [productsRoute, { method: 'GET', query: { resource: 'desconocido' } }],
    [mediaRoute, { method: 'GET', query: { resource: 'desconocido' } }],
    [usersRoute, { method: 'GET', query: { resource: 'desconocido' } }],
  ];
  for (const [route, req] of cases) {
    const res = response();
    await route(req, res);
    assert.equal(res.statusCode, 404);
  }
});

test('las rutas agrupadas rechazan metodos no soportados del catalogo', async () => {
  const res = response();
  await catalogRoute({ method: 'POST', query: { resource: 'categories' } }, res);
  assert.equal(res.statusCode, 405);
  const res2 = response();
  await catalogRoute({ method: 'POST', query: { resource: 'products' } }, res2);
  assert.equal(res2.statusCode, 405);
});

test('las rutas protegidas exigen token antes de tocar la base de datos', async () => {
  const cases = [
    [categoriesRoute, { method: 'GET', query: { resource: 'collection' } }],
    [productsRoute, { method: 'GET', query: { resource: 'collection' } }],
    [productsRoute, { method: 'GET', query: { resource: 'item', id: 'abc' } }],
    [mediaRoute, { method: 'PATCH', query: { resource: 'item', id: 'media-id' } }],
    [usersRoute, { method: 'GET', query: { resource: 'collection' } }],
    [authRoute, { method: 'GET', query: { resource: 'me' } }],
    [mediaRoute, { method: 'GET', query: { resource: 'hero' } }],
    [mediaRoute, { method: 'PATCH', query: { resource: 'hero' } }],
    [mediaRoute, { method: 'POST', query: { resource: 'hero-upload' } }],
  ];
  for (const [route, req] of cases) {
    await assert.rejects(() => route(req, response()), { status: 401 });
  }
});

test('bearer extrae el token del encabezado de autorizacion', () => {
  assert.equal(bearer({ headers: { authorization: 'Bearer token123' } }), 'token123');
  assert.equal(bearer({ headers: { authorization: 'Basic abc' } }), null);
  assert.equal(bearer({ headers: {} }), null);
  assert.equal(bearer({}), null);
});

test('crear usuarios admite el rol administrador explicito', () => {
  assert.equal(validateUserCreate({ email: 'admin@example.com', password: 'password123', role: 'administrador' }).errors, undefined);
  assert.equal(validateUserCreate({ email: 'admin@example.com', password: 'password123', role: 'editor' }).errors.length, 1);
  assert.equal(validateUserPatch({ role: 'administrador', active: true }).data.role, 'administrador');
});

test('las rutas de la portada rechazan metodos no soportados', async () => {
  const cases = [
    [catalogRoute, { method: 'POST', query: { resource: 'hero' } }],
    [catalogRoute, { method: 'PATCH', query: { resource: 'hero' } }],
    [mediaRoute, { method: 'DELETE', query: { resource: 'hero' } }],
    [mediaRoute, { method: 'GET', query: { resource: 'hero-upload' } }],
    [mediaRoute, { method: 'PATCH', query: { resource: 'hero-upload' } }],
  ];
  for (const [route, req] of cases) {
    const res = response();
    await route(req, res);
    assert.equal(res.statusCode, 405);
  }
});

test('la validacion de la portada acepta solo campos seguros', () => {
  const valid = validateHeroPatch({
    title: 'Nueva portada',
    description: 'Descripción',
    button_label: 'Ver catálogo',
    button_href: '#catalogo',
    media_type: 'video',
    image_path: 'hero/123-foto.png',
    video_path: null,
    is_published: true,
    starts_at: '2027-01-01T00:00:00.000Z',
    ends_at: null,
  });
  assert.equal(valid.errors, undefined);
  assert.equal(valid.data.is_published, true);
  assert.equal(valid.data.image_path, 'hero/123-foto.png');
  assert.equal(validateHeroPatch({ media_type: 'audio' }).errors.length, 1);
  assert.equal(validateHeroPatch({ button_href: 'javascript:alert(1)' }).errors.length, 1);
  assert.equal(validateHeroPatch({ button_href: 'https://ejemplo.com' }).errors, undefined);
  assert.equal(validateHeroPatch({ image_path: 'products/otro/archivo.png' }).errors.length, 1);
  assert.equal(validateHeroPatch({ image_path: '../secreto.png' }).errors.length, 1);
  assert.equal(validateHeroPatch({ starts_at: 'no-es-fecha' }).errors.length, 1);
  assert.equal(validateHeroPatch({ title: 'x'.repeat(121) }).errors.length, 1);
  assert.equal(validateHeroPatch({}).errors.length, 1);
});
