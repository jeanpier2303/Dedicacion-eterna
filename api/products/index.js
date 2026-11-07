import { handler, methodNotAllowed } from '../../server/http.js';
import { list, create } from '../../server/controllers/productsController.js';

export default handler(async (req, res) => {
  if (req.method === 'POST') return create(req, res);
  if (req.method === 'GET') return list(req, res);
  return methodNotAllowed(res, ['GET', 'POST']);
});
