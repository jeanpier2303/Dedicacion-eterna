import { handler, methodNotAllowed } from '../../server/http.js';
import { patch, remove } from '../../server/controllers/mediaController.js';

export default handler(async (req, res) => {
  if (req.method === 'PATCH') return patch(req, res);
  if (req.method === 'DELETE') return remove(req, res);
  return methodNotAllowed(res, ['PATCH', 'DELETE']);
});
