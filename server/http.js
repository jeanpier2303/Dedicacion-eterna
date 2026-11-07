export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const PG_ERRORS = {
  '23505': 'El registro ya existe (valor duplicado)',
  '23503': 'El recurso relacionado no existe o está en uso',
  '23502': 'Falta un campo obligatorio',
  '22P02': 'Formato de dato inválido',
  '42501': 'Base de datos sin permisos GRANT configurados',
};

export function toHttpError(err) {
  if (err instanceof HttpError) return err;
  const code = err?.code;
  if (code === '42501') return new HttpError(503, PG_ERRORS['42501']);
  if (code && PG_ERRORS[code]) return new HttpError(409, PG_ERRORS[code]);
  const status = typeof err?.statusCode === 'number' ? err.statusCode : err?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return new HttpError(status, err.message || 'Error en la solicitud');
  }
  return null;
}

export function handler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      const mapped = toHttpError(err);
      if (mapped) {
        res.status(mapped.status).json({
          error: mapped.message,
          ...(mapped.details !== undefined ? { details: mapped.details } : {}),
        });
        return;
      }
      console.error(err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}

export function methodNotAllowed(res, methods) {
  res.setHeader('Allow', methods.join(', '));
  res.status(405).json({ error: 'Método no permitido' });
}

export function notFound(res, message = 'Recurso no encontrado') {
  res.status(404).json({ error: message });
}

export function badRequest(res, details, message = 'Datos inválidos') {
  res.status(400).json({
    error: message,
    details: Array.isArray(details) ? details : [String(details)],
  });
}
