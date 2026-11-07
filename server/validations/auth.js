import { isEmail } from './common.js';

export function validateLogin(body) {
  const errors = [];
  const source = body || {};
  const email = typeof source.email === 'string' ? source.email.trim() : '';
  const password = typeof source.password === 'string' ? source.password : '';
  if (!email) errors.push('El correo es obligatorio');
  else if (!isEmail(email)) errors.push('El correo no es válido');
  if (!password) errors.push('La contraseña es obligatoria');
  if (errors.length) return { errors };
  return { data: { email, password } };
}
