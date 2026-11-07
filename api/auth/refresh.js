import { handler } from '../../server/http.js';
import { refresh } from '../../server/controllers/authController.js';

export default handler(refresh);
