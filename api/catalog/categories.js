import { handler } from '../../server/http.js';
import { categories } from '../../server/controllers/catalogController.js';

export default handler(categories);
