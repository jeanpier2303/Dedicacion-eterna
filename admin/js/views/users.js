import { api } from '../api.js';
import {
  escapeHtml,
  formatDate,
  openModal,
  closeModal,
  confirmDialog,
  toast,
  setLoading,
  clearFieldErrors,
  fieldError,
  emptyState,
  loadingState,
} from '../ui.js';

let container;
let users = [];

const ROLE_OPTIONS = [
  { value: 'editor', label: 'Editor' },
  { value: 'consulta', label: 'Consulta' },
];

function renderTable() {
  const wrap = container.querySelector('#users-table');
  if (!wrap) return;
  if (!users.length) {
    wrap.innerHTML = emptyState('fa-users', 'Sin usuarios', 'Crea la primera cuenta del equipo');
    return;
  }
  wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr>
      <th>Usuario</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th>Creado</th><th style="text-align:right">Acciones</th>
    </tr></thead>
    <tbody>${users
      .map((u) => {
        const currentRole = ['editor', 'consulta'].includes(u.role) ? u.role : '';
        return `<tr data-id="${u.id}">
      <td><div class="cell-title">
        <span class="user-avatar">${escapeHtml((u.full_name || u.email).charAt(0).toUpperCase())}</span>
        <span><strong>${escapeHtml(u.full_name || 'Sin nombre')}</strong><small>${escapeHtml(u.email)}</small></span>
      </div></td>
      <td>
        ${
          currentRole
            ? `<select class="role-select" data-role-select>
            ${ROLE_OPTIONS.map((r) => `<option value="${r.value}" ${u.role === r.value ? 'selected' : ''}>${r.label}</option>`).join('')}
          </select>`
            : '<span class="badge badge-gold">Administrador</span>'
        }
      </td>
      <td><span class="badge ${u.active ? 'badge-success' : 'badge-danger'}">${u.active ? 'Activo' : 'Desactivado'}</span></td>
      <td>${escapeHtml(formatDate(u.last_sign_in_at))}</td>
      <td>${escapeHtml(formatDate(u.created_at))}</td>
      <td><div class="row-actions">
        ${
          u.active
            ? `<button class="icon-btn danger" data-action="deactivate" aria-label="Desactivar ${escapeHtml(u.email)}"><i class="fa-solid fa-user-slash"></i></button>`
            : `<button class="icon-btn" data-action="activate" aria-label="Reactivar ${escapeHtml(u.email)}"><i class="fa-solid fa-user-check"></i></button>`
        }
      </div></td></tr>`;
      })
      .join('')}</tbody></table></div>`;

  wrap.querySelectorAll('tr[data-id]').forEach((row) => {
    const user = users.find((u) => u.id === row.dataset.id);
    row.querySelector('[data-role-select]')?.addEventListener('change', async (event) => {
      const select = event.target;
      select.disabled = true;
      try {
        await api('PATCH', `/api/users/${user.id}`, { role: select.value });
        toast('success', `Rol actualizado a ${select.value}`);
        await load();
      } catch (err) {
        toast('error', err.message);
        select.value = user.role;
        select.disabled = false;
      }
    });
    row.querySelector('[data-action]')?.addEventListener('click', async (event) => {
      const btn = event.currentTarget;
      const deactivate = btn.dataset.action === 'deactivate';
      if (deactivate) {
        const ok = await confirmDialog(`¿Desactivar la cuenta de ${user.email}? No podrá iniciar sesión.`, {
          danger: true,
          confirmText: 'Desactivar',
        });
        if (!ok) return;
      }
      btn.disabled = true;
      try {
        await api('PATCH', `/api/users/${user.id}`, { active: !deactivate });
        toast('success', deactivate ? 'Cuenta desactivada' : 'Cuenta reactivada');
        await load();
      } catch (err) {
        toast('error', err.message);
        btn.disabled = false;
      }
    });
  });
}

function openForm() {
  const form = document.createElement('form');
  form.innerHTML = `
    <div id="user-alert" class="form-alert" hidden></div>
    <div class="field">
      <label for="u-email">Correo electrónico *</label>
      <input type="email" id="u-email" maxlength="254" placeholder="persona@correo.com" required>
      <span class="field-error"></span>
    </div>
    <div class="field">
      <label for="u-name">Nombre completo</label>
      <input type="text" id="u-name" maxlength="120" placeholder="Nombre y apellido (opcional)">
      <span class="field-error"></span>
    </div>
    <div class="field">
      <label for="u-password">Contraseña *</label>
      <div class="input-icon">
        <i class="fa-solid fa-lock"></i>
        <input type="password" id="u-password" minlength="8" maxlength="72" autocomplete="new-password" placeholder="Mínimo 8 caracteres" required>
        <button type="button" class="icon-btn" id="u-toggle" aria-label="Mostrar contraseña"><i class="fa-solid fa-eye"></i></button>
      </div>
      <span class="field-error"></span>
    </div>
    <div class="field">
      <label for="u-role">Rol *</label>
      <select id="u-role" required>
        ${ROLE_OPTIONS.map((r) => `<option value="${r.value}">${r.label}</option>`).join('')}
      </select>
      <span class="muted">El panel solo asigna roles editor y consulta. Los administradores se crean desde Supabase.</span>
    </div>`;

  const email = form.querySelector('#u-email');
  const password = form.querySelector('#u-password');
  const toggle = form.querySelector('#u-toggle');
  toggle.addEventListener('click', () => {
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    toggle.innerHTML = `<i class="fa-solid ${visible ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
  });

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'btn btn-primary';
  submit.innerHTML = '<span class="btn-label">Crear usuario</span><i class="fa-solid fa-spinner fa-spin btn-spinner" hidden></i>';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn-outline';
  cancel.textContent = 'Cancelar';

  const modal = openModal({
    title: 'Nuevo usuario',
    body: form,
    footer: [cancel, submit],
  });
  cancel.addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    form.querySelector('#user-alert').hidden = true;
    let valid = true;

    const emailValue = email.value.trim();
    if (!emailValue) {
      fieldError(email, 'El correo es obligatorio');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      fieldError(email, 'El correo no es válido');
      valid = false;
    }
    if (password.value.length < 8) {
      fieldError(password, 'La contraseña debe tener al menos 8 caracteres');
      valid = false;
    }
    if (!valid) return;

    setLoading(submit, true);
    try {
      await api('POST', '/api/users', {
        email: emailValue,
        password: password.value,
        full_name: form.querySelector('#u-name').value.trim() || null,
        role: form.querySelector('#u-role').value,
      });
      closeModal();
      toast('success', 'Usuario creado');
      await load();
    } catch (err) {
      const alert = form.querySelector('#user-alert');
      alert.textContent = err.message;
      alert.hidden = false;
      setLoading(submit, false);
    }
  });

  email.focus();
}

async function load() {
  const data = await api('GET', '/api/users');
  users = data.users;
  renderTable();
}

export async function renderUsers(containerEl) {
  container = containerEl;
  container.innerHTML = `
    <div class="view-header">
      <div><h3>Usuarios</h3><p>Cuentas del panel, roles y estado de acceso.</p></div>
      <button class="btn btn-primary" id="user-new"><i class="fa-solid fa-user-plus"></i> Nuevo usuario</button>
    </div>
    <div id="users-table">${loadingState()}</div>`;

  container.querySelector('#user-new').addEventListener('click', openForm);
  await load();
}
