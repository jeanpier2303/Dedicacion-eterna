import { api } from '../api.js';
import { saveSession, setIdentity } from '../state.js';
import { setLoading, clearFieldErrors, fieldError } from '../ui.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initLogin(onSuccess) {
  const form = document.getElementById('login-form');
  const email = document.getElementById('login-email');
  const password = document.getElementById('login-password');
  const toggle = document.getElementById('toggle-password');
  const submit = document.getElementById('login-submit');
  const errorBox = document.getElementById('login-error');

  toggle.addEventListener('click', () => {
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    toggle.innerHTML = `<i class="fa-solid ${visible ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
    toggle.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    let valid = true;

    const emailValue = email.value.trim();
    if (!emailValue) {
      fieldError(email, 'Ingresa tu correo electrónico');
      valid = false;
    } else if (!EMAIL_RE.test(emailValue)) {
      fieldError(email, 'El correo no es válido');
      valid = false;
    }
    if (!password.value) {
      fieldError(password, 'Ingresa tu contraseña');
      valid = false;
    }
    if (!valid) return;

    setLoading(submit, true);
    try {
      const data = await api('POST', '/api/auth/login', {
        email: emailValue,
        password: password.value,
      });
      saveSession(data.session);
      setIdentity(data.user, data.profile);
      password.value = '';
      onSuccess();
    } catch (err) {
      errorBox.textContent = err?.message || 'No se pudo iniciar sesión';
      errorBox.hidden = false;
    } finally {
      setLoading(submit, false);
    }
  });
}
