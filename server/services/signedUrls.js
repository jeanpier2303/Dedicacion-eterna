import { HttpError } from '../http.js';
import { adminClient } from '../supabase/admin.js';

const TTL = 604800;

export function bucketFor(mediaType) {
  return mediaType === 'video' ? 'product-videos' : 'product-images';
}

export async function signPath(bucket, path) {
  const { data, error } = await adminClient().storage.from(bucket).createSignedUrl(path, TTL);
  if (error) throw new HttpError(502, 'No se pudo generar la URL firmada', error.message);
  return data.signedUrl;
}

export async function signMediaRows(rows) {
  return Promise.all(
    (rows || []).map(async (row) => {
      const { storage_path, ...rest } = row;
      let signedUrl = null;
      if (storage_path) {
        const { data, error } = await adminClient().storage.from(bucketFor(row.media_type)).createSignedUrl(storage_path, TTL);
        if (!error) signedUrl = data.signedUrl;
      }
      return { ...rest, signed_url: signedUrl };
    })
  );
}
