import { handler } from '../../server/http.js';
import { login } from '../../server/controllers/authController.js';

export default handler(login);
