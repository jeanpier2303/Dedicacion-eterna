import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const BUCKET = 'product-images';
const APPLY = process.argv.includes('--apply');
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'scripts/original-products-migration.json'), 'utf8'));

function readEnv(file) {
  const result = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

function assertNoError(error, operation) {
  if (error) {
    const code = error.code || error.statusCode || error.status || 'unknown';
    throw new Error(`${operation} falló (código ${code})`);
  }
}

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function validateManifest() {
  if (manifest.length !== 4) throw new Error('El manifiesto debe contener los cuatro productos originales');
  let photoCount = 0;
  for (const product of manifest) {
    if (!product.id || !product.name || !product.category || !Array.isArray(product.images) || !product.images.length) {
      throw new Error('El manifiesto contiene datos de producto incompletos');
    }
    if (product.image !== product.images[0]) throw new Error(`La imagen principal de ${product.id} no coincide con el primer elemento de su galería`);
    const sourceFolder = product.images[0].split('/').at(-2);
    for (const image of product.images) {
      if (!image.startsWith('assets/images/products/profuctos nuevos-one/') || image.split('/').at(-2) !== sourceFolder) {
        throw new Error(`Ruta local fuera de su subcarpeta para ${product.id}`);
      }
      if (path.extname(image).toLowerCase() !== '.jpeg') throw new Error(`Formato inesperado en ${product.id}`);
      readFileSync(path.join(ROOT, image));
      photoCount += 1;
    }
  }
  if (photoCount !== 9) throw new Error(`Se esperaban nueve fotografías; se encontraron ${photoCount}`);
}

const config = readEnv(path.join(ROOT, 'backend/.env'));
if (!config.SUPABASE_URL || !config.SUPABASE_SECRET_KEY || !config.SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Faltan variables de Supabase en backend/.env');
}

validateManifest();
const admin = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const categorySlugs = [...new Set(manifest.map((product) => product.category))];
const { data: categories, error: categoryError } = await admin
  .from('categories')
  .select('id, slug')
  .in('slug', categorySlugs);
assertNoError(categoryError, 'Consulta de categorías');
const categoryBySlug = new Map((categories || []).map((category) => [category.slug, category.id]));
for (const slug of categorySlugs) {
  if (!categoryBySlug.has(slug)) throw new Error(`No existe la categoría requerida: ${slug}`);
}

const slugs = manifest.map((product) => product.id);
const { data: existingProducts, error: productQueryError } = await admin
  .from('products')
  .select('id, slug, is_published')
  .in('slug', slugs);
assertNoError(productQueryError, 'Consulta de productos');
const existingBySlug = new Map((existingProducts || []).map((product) => [product.slug, product]));

const plan = manifest.map((product) => ({
  slug: product.id,
  action: existingBySlug.has(product.id) ? 'reutilizar' : 'crear',
  photographs: product.images.length,
  storage_paths: existingBySlug.has(product.id)
    ? product.images.map((image, index) => `products/${existingBySlug.get(product.id).id}/originales/${index + 1}-${path.basename(image)}`)
    : [],
}));

if (!APPLY) {
  console.log(JSON.stringify({ mode: 'dry-run', products: plan }, null, 2));
  console.log('Sin cambios. Ejecuta con --apply para migrar.');
} else {
  const productRecords = new Map();
  for (const product of manifest) {
    let record = existingBySlug.get(product.id);
    if (!record) {
      const payload = {
        name: product.name,
        slug: product.id,
        short_description: product.shortDescription || null,
        description: product.description || null,
        category_id: categoryBySlug.get(product.category),
        price: product.price,
        old_price: product.oldPrice,
        is_published: true,
        is_featured: product.featured,
        display_order: product.displayOrder,
      };
      const { data, error } = await admin.from('products').insert(payload).select('id, slug, is_published').single();
      if (error?.code === '23505') {
        const { data: raced, error: raceError } = await admin.from('products').select('id, slug, is_published').eq('slug', product.id).maybeSingle();
        assertNoError(raceError, `Reconsulta de ${product.id}`);
        record = raced;
      } else {
        assertNoError(error, `Creación de ${product.id}`);
        record = data;
      }
    }
    if (!record?.id) throw new Error(`No se pudo resolver el producto ${product.id}`);
    if (!record.is_published) {
      const { error } = await admin.from('products').update({ is_published: true }).eq('id', record.id);
      assertNoError(error, `Publicación de ${product.id}`);
      record.is_published = true;
    }
    productRecords.set(product.id, record);
  }

  const migrated = [];
  for (const product of manifest) {
    const record = productRecords.get(product.id);
    const folder = `products/${record.id}/originales`;
    const storage = admin.storage.from(BUCKET);
    const targets = [];

    for (let index = 0; index < product.images.length; index += 1) {
      const sourcePath = product.images[index];
      const bytes = readFileSync(path.join(ROOT, sourcePath));
      const sourceHash = digest(bytes);
      const filename = `${index + 1}-${path.basename(sourcePath)}`;
      const storagePath = `${folder}/${filename}`;
      const { data: listed, error: listError } = await storage.list(folder, { limit: 100, search: filename });
      assertNoError(listError, `Consulta de Storage para ${product.id}`);
      const found = (listed || []).some((file) => file.name === filename);

      if (found) {
        const { data: existingFile, error: downloadError } = await storage.download(storagePath);
        assertNoError(downloadError, `Lectura de archivo existente para ${product.id}`);
        if (digest(Buffer.from(await existingFile.arrayBuffer())) !== sourceHash) {
          throw new Error(`El objeto existente no coincide con el original: ${storagePath}`);
        }
      } else {
        const { error: uploadError } = await storage.upload(storagePath, bytes, {
          contentType: 'image/jpeg',
          upsert: false,
        });
        if (uploadError) {
          const { data: retryList, error: retryListError } = await storage.list(folder, { limit: 100, search: filename });
          assertNoError(retryListError, `Verificación de subida para ${product.id}`);
          if (!(retryList || []).some((file) => file.name === filename)) {
            assertNoError(uploadError, `Subida de imagen para ${product.id}`);
          }
          const { data: racedFile, error: racedDownloadError } = await storage.download(storagePath);
          assertNoError(racedDownloadError, `Verificación de objeto concurrente para ${product.id}`);
          if (digest(Buffer.from(await racedFile.arrayBuffer())) !== sourceHash) {
            throw new Error(`El objeto creado por otra ejecución no coincide: ${storagePath}`);
          }
        }
      }
      targets.push({ storagePath, sourceHash, sourcePath, index });
    }

    const { data: mediaRows, error: mediaQueryError } = await admin
      .from('product_media')
      .select('id, storage_path, media_type, display_order, is_primary')
      .eq('product_id', record.id);
    assertNoError(mediaQueryError, `Consulta de galería para ${product.id}`);
    const targetPaths = new Set(targets.map((target) => target.storagePath));
    const desiredPrimary = targets[0].storagePath;
    if ((mediaRows || []).some((row) => row.is_primary && row.storage_path !== desiredPrimary)) {
      const { error } = await admin.from('product_media').update({ is_primary: false }).eq('product_id', record.id).eq('is_primary', true);
      assertNoError(error, `Actualización de imagen principal para ${product.id}`);
    }

    const finalMedia = [];
    for (const target of targets) {
      const { storagePath, index } = target;
      const current = (mediaRows || []).find((row) => row.storage_path === storagePath);
      const payload = {
        media_type: 'image',
        storage_path: storagePath,
        alt_text: null,
        display_order: index,
        is_primary: index === 0,
      };
      let row;
      if (current) {
        const { data, error } = await admin.from('product_media').update(payload).eq('id', current.id).select('id, storage_path, display_order, is_primary').single();
        assertNoError(error, `Actualización de referencia de ${product.id}`);
        row = data;
      } else {
        const { data, error } = await admin.from('product_media').insert({ ...payload, product_id: record.id }).select('id, storage_path, display_order, is_primary').single();
        assertNoError(error, `Registro de referencia de ${product.id}`);
        row = data;
      }
      finalMedia.push(row);
    }

    for (const row of mediaRows || []) {
      if (targetPaths.has(row.storage_path)) continue;
      const desiredOrder = targets.length + row.display_order;
      if (row.display_order < targets.length || row.is_primary) {
        const { error } = await admin.from('product_media').update({ display_order: desiredOrder, is_primary: false }).eq('id', row.id);
        assertNoError(error, `Ordenamiento de medios existentes para ${product.id}`);
      }
    }

    migrated.push({
      slug: product.id,
      id: record.id,
      action: existingBySlug.has(product.id) ? 'reutilizado' : 'creado',
      paths: finalMedia.map((row) => row.storage_path),
    });
  }

  process.env.SUPABASE_URL = config.SUPABASE_URL;
  process.env.SUPABASE_PUBLISHABLE_KEY = config.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_SECRET_KEY = config.SUPABASE_SECRET_KEY;
  const { productBySlug, products: listPublicProducts } = await import('../server/services/catalogService.js');
  const publicProducts = await listPublicProducts();
  const verified = [];

  for (const product of manifest) {
    const cardProduct = publicProducts.find((item) => item.slug === product.id);
    if (!cardProduct || cardProduct.images.length < product.images.length || !cardProduct.image) {
      throw new Error(`El catálogo público no incluye la tarjeta completa de ${product.id}`);
    }
    const apiProduct = await productBySlug(product.id);
    if (apiProduct.name !== product.name || apiProduct.short_description !== product.shortDescription ||
        apiProduct.description !== product.description || apiProduct.price !== product.price ||
        apiProduct.old_price !== product.oldPrice || apiProduct.category?.slug !== product.category ||
        apiProduct.is_featured !== product.featured) {
      throw new Error(`Los datos públicos no coinciden con los datos originales de ${product.id}`);
    }
    const expectedPaths = migrated.find((item) => item.slug === product.id).paths;
    const imageMedia = (apiProduct.media || []).filter((media) => media.media_type === 'image').sort((a, b) => a.display_order - b.display_order);
    if (apiProduct.images.length < product.images.length || imageMedia.length < product.images.length) {
      throw new Error(`La API no devuelve las fotografías originales esperadas para ${product.id}`);
    }
    if (!apiProduct.image || apiProduct.image !== apiProduct.images[0]) {
      throw new Error(`La imagen principal no coincide con la primera imagen de la API para ${product.id}`);
    }
    const { data: storedMedia, error: storedMediaError } = await admin
      .from('product_media')
      .select('storage_path, media_type, display_order, is_primary')
      .eq('product_id', productRecords.get(product.id).id)
      .order('display_order', { ascending: true });
    assertNoError(storedMediaError, `Verificación de orden de ${product.id}`);
    const orderedImages = (storedMedia || []).filter((media) => media.media_type === 'image');
    if (orderedImages.length < expectedPaths.length || orderedImages[0]?.storage_path !== expectedPaths[0] || !orderedImages[0]?.is_primary) {
      throw new Error(`La imagen principal o la ruta inicial es inválida para ${product.id}`);
    }
    for (let index = 0; index < expectedPaths.length; index += 1) {
      if (orderedImages[index]?.storage_path !== expectedPaths[index] || orderedImages[index]?.display_order !== index) {
        throw new Error(`El orden de las imágenes originales no coincide para ${product.id}`);
      }
      if (imageMedia.find((media) => media.display_order === index)?.signed_url !== apiProduct.images[index]) {
        throw new Error(`La API no entrega la galería en el orden esperado para ${product.id}`);
      }
      const response = await fetch(apiProduct.images[index]);
      if (!response.ok) throw new Error(`URL firmada no disponible para ${product.id}, imagen ${index + 1} (HTTP ${response.status})`);
      const downloaded = Buffer.from(await response.arrayBuffer());
      const expected = readFileSync(path.join(ROOT, product.images[index]));
      if (digest(downloaded) !== digest(expected)) throw new Error(`El contenido firmado no coincide con el original de ${product.id}`);
    }
    verified.push({ slug: product.id, public_card_image_count: cardProduct.images.length, detail_gallery_original_count: expectedPaths.length, primary_verified: true, signed_urls_verified: expectedPaths.length });
  }

  const listedIcon = publicProducts.find((item) => item.slug === 'icono-de-prueba');
  if (!listedIcon?.image || !listedIcon.images?.length) throw new Error('icono-de-prueba no aparece con imagen en el catálogo público');
  const icon = await productBySlug('icono-de-prueba');
  if (!icon.image || !icon.images?.length) throw new Error('icono-de-prueba no conserva imágenes en el catálogo público');
  const iconResponse = await fetch(icon.image);
  if (!iconResponse.ok) throw new Error(`La imagen de icono-de-prueba no está disponible (HTTP ${iconResponse.status})`);

  console.log(JSON.stringify({ mode: 'applied', products: migrated, verified, icono_de_prueba: { image_available: true } }, null, 2));
}
