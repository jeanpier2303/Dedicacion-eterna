import { handler } from '../../server/http.js';
import { me } from '../../server/controllers/authController.js';

export default handler(me);
