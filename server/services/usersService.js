import { HttpError } from '../http.js';
import { adminClient } from '../supabase/admin.js';
import { isUuid } from '../validations/common.js';

function isActive(user) {
  if (!user.banned_until) return true;
  return new Date(user.banned_until).getTime() <= Date.now();
}

function merge(authUser, profile) {
  return {
    id: authUser.id,
    email: authUser.email,
    full_name: profile?.full_name || authUser.user_metadata?.full_name || null,
    role: profile?.role || null,
    active: isActive(authUser),
    created_at: authUser.created_at,
    last_sign_in_at: authUser.last_sign_in_at || null,
    email_confirmed_at: authUser.email_confirmed_at || null,
  };
}

async function ensureAdministrator(id) {
  const { data: existing, error: selectError } = await adminClient()
    .from('profiles')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) {
    const { data, error } = await adminClient().from('profiles').update({ role: 'administrador' }).eq('id', id).select('*').single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await adminClient().from('profiles').insert({ id, role: 'administrador' }).select('*').single();
  if (error) throw error;
  return data;
}

export async function list() {
  const users = [];
  let page = 1;
  while (page <= 20) {
    const { data, error } = await adminClient().auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new HttpError(502, 'No se pudieron consultar los usuarios', error.message);
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length === 0 || users.length >= (data?.total || 0)) break;
    page += 1;
  }
  const { data: profiles, error: profilesError } = await adminClient().from('profiles').select('*');
  if (profilesError) throw profilesError;
  const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
  return users
    .map((user) => merge(user, byId.get(user.id)))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

export async function create({ email, password, full_name }) {
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: full_name ? { full_name } : {},
  });
  if (error) {
    if (/already registered|already exists|already been registered/i.test(error.message || '') || (error.status === 422 && !/password/i.test(error.message || ''))) {
      throw new HttpError(409, 'Ya existe un usuario con ese correo');
    }
    const status = typeof error.status === 'number' && error.status >= 400 && error.status < 500 ? error.status : 400;
    throw new HttpError(status, error.message);
  }
  const userId = data.user.id;
  try {
    await ensureAdministrator(userId);
  } catch (roleError) {
    try {
      await adminClient().auth.admin.deleteUser(userId);
    } catch {}
    throw new HttpError(500, 'No se pudo asignar el rol; el usuario fue revertido', roleError.message);
  }
  const { data: profile } = await adminClient().from('profiles').select('*').eq('id', userId).maybeSingle();
  return merge(data.user, profile);
}

export async function update(id, changes, actorId) {
  if (!isUuid(id)) throw new HttpError(400, 'El ID de usuario no es válido');
  const { data: found, error: findError } = await adminClient().auth.admin.getUserById(id);
  if (findError || !found?.user) throw new HttpError(404, 'Usuario no encontrado');
  if (changes.active === false && id === actorId) throw new HttpError(400, 'No puedes desactivar tu propia cuenta');
  if (changes.active === false) {
    const { data: profile, error: profileError } = await adminClient().from('profiles').select('role').eq('id', id).maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role === 'administrador') {
      const { data: profiles, error: listError } = await adminClient().from('profiles').select('id').eq('role', 'administrador');
      if (listError) throw listError;
      const authUsers = [];
      let page = 1;
      while (page <= 20) {
        const { data, error: usersError } = await adminClient().auth.admin.listUsers({ page, perPage: 1000 });
        if (usersError) throw usersError;
        const batch = data?.users || [];
        authUsers.push(...batch);
        if (batch.length === 0 || authUsers.length >= (data?.total || 0)) break;
        page += 1;
      }
      const activeIds = new Set(authUsers.filter(isActive).map((user) => user.id));
      if ((profiles || []).filter((item) => activeIds.has(item.id)).length <= 1) throw new HttpError(409, 'No se puede desactivar al último administrador activo');
    }
  }
  let profile = null;
  if (changes.role) profile = await ensureAdministrator(id);
  if (changes.active !== undefined) {
    const { error: banError } = await adminClient().auth.admin.updateUserById(id, {
      ban_duration: changes.active ? 'none' : '87600h',
    });
    if (banError) {
      const status = typeof banError.status === 'number' && banError.status >= 400 && banError.status < 500 ? banError.status : 400;
      throw new HttpError(status, banError.message);
    }
  }
  const { data: refreshed } = await adminClient().auth.admin.getUserById(id);
  const { data: finalProfile } = await adminClient().from('profiles').select('*').eq('id', id).maybeSingle();
  return merge(refreshed?.user || found.user, finalProfile || profile);
}
