import { handler, methodNotAllowed } from '../../../server/http.js';
import { get, update, remove } from '../../../server/controllers/productsController.js';

export default handler(async (req, res) => {
  if (req.method === 'GET') return get(req, res);
  if (req.method === 'PATCH') return update(req, res);
  if (req.method === 'DELETE') return remove(req, res);
  return methodNotAllowed(res, ['GET', 'PATCH', 'DELETE']);
});
