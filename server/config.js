import { HttpError } from './http.js';

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new HttpError(503, `Falta la variable de entorno ${name}`);
  return value;
}
