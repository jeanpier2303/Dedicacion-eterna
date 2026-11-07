import { handler, methodNotAllowed } from '../../../server/http.js';
import { list, register } from '../../../server/controllers/mediaController.js';

export default handler(async (req, res) => {
  if (req.method === 'GET') return list(req, res);
  if (req.method === 'POST') return register(req, res);
  return methodNotAllowed(res, ['GET', 'POST']);
});
