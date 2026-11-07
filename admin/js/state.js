const STORAGE_KEY = 'sp_admin_session';

export const state = {
  session: null,
  user: null,
  profile: null,
};

export function saveSession(session) {
  state.session = {
    ...session,
    expires_at: Date.now() + (session.expires_in || 3600) * 1000,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.session));
  } catch {}
}

export function loadStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.refresh_token) return null;
    state.session = session;
    return session;
  } catch {
    return null;
  }
}

export function setIdentity(user, profile) {
  state.user = user;
  state.profile = profile;
}

export function clearSession() {
  state.session = null;
  state.user = null;
  state.profile = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function accessToken() {
  return state.session?.access_token || null;
}

export function sessionExpired() {
  if (!state.session?.expires_at) return true;
  return Date.now() >= state.session.expires_at - 30000;
}
