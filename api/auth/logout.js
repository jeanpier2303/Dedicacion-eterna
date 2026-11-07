import { handler } from '../../server/http.js';
import { logout } from '../../server/controllers/authController.js';

export default handler(logout);
