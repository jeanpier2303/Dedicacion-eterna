import { handler } from '../../../server/http.js';
import { productBySlug } from '../../../server/controllers/catalogController.js';

export default handler(productBySlug);
