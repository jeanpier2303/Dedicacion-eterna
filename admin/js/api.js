import { accessToken, saveSession, clearSession, state } from './state.js';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let refreshPromise = null;

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = state.session?.refresh_token;
      if (!refreshToken) throw new ApiError(401, 'Sesión expirada');
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.session) {
        clearSession();
        throw new ApiError(401, 'La sesión expiró, vuelve a iniciar sesión');
      }
      saveSession(data.session);
      return data.session;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function api(method, path, body) {
  const doRequest = () =>
    fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken() ? { Authorization: `Bearer ${accessToken()}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doRequest();
  if (res.status === 401 && state.session) {
    try {
      await refreshSession();
      res = await doRequest();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(401, 'La sesión expiró, vuelve a iniciar sesión');
    }
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error || data?.details?.join?.('. ') || 'Error en la solicitud';
    throw new ApiError(res.status, message, data?.details);
  }
  return data;
}

export function uploadToSignedUrl(signedUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let message = 'No se pudo subir el archivo';
        try {
          message = JSON.parse(xhr.responseText)?.message || message;
        } catch {}
        reject(new ApiError(xhr.status, message));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, 'Error de red al subir el archivo'));
    xhr.send(file);
  });
}
