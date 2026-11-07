import { handler } from '../../../server/http.js';
import { products } from '../../../server/controllers/catalogController.js';

export default handler(products);
