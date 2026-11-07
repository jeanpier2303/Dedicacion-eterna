import { HttpError } from '../http.js';
import { adminClient } from '../supabase/admin.js';
import { publicClient } from '../supabase/public.js';
import { isUuid } from '../validations/common.js';

function mapWriteError(error) {
  if (error.code === '23505') return new HttpError(409, 'Ya existe una categoría con ese slug');
  return error;
}

export async function listAll() {
  const { data, error } = await adminClient().from('categories').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function listActive() {
  const { data, error } = await publicClient()
    .from('categories')
    .select('id, name, slug, description')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data;
}

export async function create(payload) {
  const { data, error } = await adminClient().from('categories').insert(payload).select('*').single();
  if (error) throw mapWriteError(error);
  return data;
}

export async function update(id, patch) {
  if (!isUuid(id)) throw new HttpError(400, 'El ID de categoría no es válido');
  const { data, error } = await adminClient().from('categories').update(patch).eq('id', id).select('*').maybeSingle();
  if (error) throw mapWriteError(error);
  if (!data) throw new HttpError(404, 'Categoría no encontrada');
  return data;
}
