import { HttpError } from '../http.js';
import { adminClient } from '../supabase/admin.js';

export function bearer(req) {
  const header = req.headers?.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

export function assertRole(profile) {
  if (profile?.role !== 'administrador') throw new HttpError(403, 'No tienes permisos para esta acción');
}

export async function requireAuth(req) {
  const token = bearer(req);
  if (!token) throw new HttpError(401, 'Se requiere token de autenticación');
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, 'Token inválido o expirado');
  const { data: profile, error: profileError } = await adminClient()
    .from('profiles')
    .select('id, full_name, role, created_at, updated_at')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) throw new HttpError(403, 'Perfil de usuario no encontrado');
  assertRole(profile);
  return { user: data.user, profile };
}
