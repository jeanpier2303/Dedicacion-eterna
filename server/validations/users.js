import { isEmail } from './common.js';

export function validateUserCreate(body) {
  const errors = [];
  const source = body || {};
  const email = typeof source.email === 'string' ? source.email.trim() : '';
  const password = typeof source.password === 'string' ? source.password : '';
  const fullName = typeof source.full_name === 'string' ? source.full_name.trim() : '';
  if (!email) errors.push('El correo es obligatorio');
  else if (!isEmail(email)) errors.push('El correo no es válido');
  if (!password) errors.push('La contraseña es obligatoria');
  else if (password.length < 8) errors.push('La contraseña debe tener al menos 8 caracteres');
  else if (password.length > 72) errors.push('La contraseña no puede superar 72 caracteres');
  if (fullName.length > 120) errors.push('El nombre no puede superar 120 caracteres');
  if (source.role !== undefined && source.role !== 'administrador') errors.push('El único rol permitido es administrador');
  if (errors.length) return { errors };
  return { data: { email, password, full_name: fullName || null } };
}

export function validateUserPatch(body) {
  const errors = [];
  const data = {};
  const source = body || {};
  if (Object.prototype.hasOwnProperty.call(source, 'role')) {
    if (source.role !== 'administrador') errors.push('El único rol permitido es administrador');
    else data.role = 'administrador';
  }
  if (Object.prototype.hasOwnProperty.call(source, 'active')) {
    if (typeof source.active !== 'boolean') errors.push('El campo active debe ser booleano');
    else data.active = source.active;
  }
  if (!errors.length && !Object.keys(data).length) errors.push('No hay cambios para aplicar');
  if (errors.length) return { errors };
  return { data };
}
