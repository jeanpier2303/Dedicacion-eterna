import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !publishable || !secret) {
  const missing = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY'].filter((name) => !process.env[name]);
  console.log('FALTAN variables: ' + missing.join(', '));
  process.exit(1);
}

console.log('Variables presentes: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY');

const health = await fetch(`${url}/auth/v1/health`, { headers: { apikey: publishable } });
console.log('Auth health:', health.status);

const anon = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: cats, error: catError } = await anon.from('categories').select('id, slug, is_active');
if (catError) {
  console.log('Categorias (publishable): ERROR', catError.message);
} else {
  console.log(`Categorias (publishable): ${cats.length} total, ${cats.filter((c) => c.is_active).length} activas`);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 5 });
if (usersError) {
  console.log('Usuarios (secret): ERROR', usersError.message);
  process.exit(1);
}
console.log(`Usuarios (secret): ${users.total} en el proyecto`);

const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
if (bucketError) {
  console.log('Storage (secret): ERROR', bucketError.message);
} else {
  const wanted = buckets.filter((b) => b.name === 'product-images' || b.name === 'product-videos');
  console.log('Storage buckets:', wanted.map((b) => `${b.name}${b.public ? '(publico)' : '(privado)'}`).join(', ') || 'no encontrados');
}
