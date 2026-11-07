import { handler } from '../../../server/http.js';
import { createUploadUrl } from '../../../server/controllers/mediaController.js';

export default handler(createUploadUrl);
