import * as controller from '../controllers/authController.js';
import { notFound } from '../http.js';

export default function route(req, res) {
  const action = String(req.query?.resource || '');
  const handlers = { login: controller.login, logout: controller.logout, refresh: controller.refresh, me: controller.me };
  return handlers[action] ? handlers[action](req, res) : notFound(res);
}
