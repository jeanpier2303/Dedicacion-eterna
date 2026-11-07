import { HttpError } from '../http.js';
import { publicClient } from '../supabase/public.js';
import { adminClient } from '../supabase/admin.js';
import { requiredEnv } from '../config.js';
import { bearer } from '../auth/guard.js';

const LOGIN_ERRORS = new Map([
  ['Invalid login credentials', ['Credenciales inválidas', 400]],
  ['Email not confirmed', ['Correo no confirmado', 400]],
  ['User is banned', ['Usuario desactivado', 403]],
]);

function sessionPayload(session) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    token_type: session.token_type,
  };
}

export function userPayload(user) {
  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    email_confirmed_at: user.email_confirmed_at || null,
    last_sign_in_at: user.last_sign_in_at || null,
  };
}

export async function login({ email, password }) {
  const { data, error } = await publicClient().auth.signInWithPassword({ email, password });
  if (error || !data?.session) {
    const mapped = error ? LOGIN_ERRORS.get(error.message) : null;
    if (mapped) throw new HttpError(mapped[1], mapped[0]);
    const status = error && typeof error.status === 'number' && error.status >= 400 && error.status < 500 ? error.status : 400;
    throw new HttpError(status, error?.message || 'No se pudo iniciar sesión');
  }
  const { data: profile, error: profileError } = await adminClient()
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  return {
    session: sessionPayload(data.session),
    user: userPayload(data.user),
    profile: profile || null,
  };
}

export async function logout(req) {
  const token = bearer(req);
  if (token) {
    try {
      await adminClient().auth.admin.signOut(token);
    } catch {}
  }
  return { ok: true };
}

export async function refresh(refreshToken) {
  const response = await fetch(`${requiredEnv('SUPABASE_URL')}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: requiredEnv('SUPABASE_PUBLISHABLE_KEY'),
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) {
    throw new HttpError(401, 'No se pudo renovar la sesión');
  }
  return {
    session: sessionPayload(payload),
    user: payload.user ? userPayload(payload.user) : null,
  };
}
