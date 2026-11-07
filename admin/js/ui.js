export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatPrice(value) {
  if (value === null || value === undefined || value === '') return 'Consultar precio';
  const number = Number(value);
  if (!Number.isFinite(number)) return 'Consultar precio';
  return '$' + number.toLocaleString('es-ES');
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function debounce(fn, delay = 350) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function toast(type, message) {
  const container = document.getElementById('toast-container');
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 220);
  }, 3800);
}

const modalStack = [];

export function openModal({ title, body, footer, size = '', onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="modal-header">
        <h3>${escapeHtml(title)}</h3>
        <button type="button" class="icon-btn" data-close aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body"></div>
      ${footer ? '<div class="modal-footer"></div>' : ''}
    </div>`;
  backdrop.querySelector('.modal-body').append(...[].concat(body));
  if (footer) {
    const footerEl = backdrop.querySelector('.modal-footer');
    footerEl.append(...[].concat(footer));
    const form = backdrop.querySelector('.modal-body form');
    if (form) {
      form.noValidate = true;
      footerEl.querySelectorAll('button:not([type="button"])').forEach((btn) => {
        btn.addEventListener('click', () => form.requestSubmit());
      });
    }
  }

  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    const index = modalStack.indexOf(close);
    if (index >= 0) modalStack.splice(index, 1);
    onClose?.();
  };
  const onKey = (event) => {
    if (event.key === 'Escape' && modalStack[modalStack.length - 1] === close) close();
  };
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop || event.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  document.getElementById('modal-root').appendChild(backdrop);
  modalStack.push(close);
  return { close, el: backdrop };
}

export function closeModal() {
  modalStack[modalStack.length - 1]?.();
}

export function closeAllModals() {
  while (modalStack.length) modalStack[modalStack.length - 1]();
}

export function confirmDialog(message, { confirmText = 'Confirmar', danger = false } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const confirmBtn = document.createElement('button');
    confirmBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    confirmBtn.textContent = confirmText;
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-outline';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.type = 'button';

    const body = document.createElement('p');
    body.textContent = message;
    body.style.fontSize = '0.95rem';

    const modal = openModal({
      title: 'Confirmar acción',
      body,
      footer: [cancelBtn, confirmBtn],
      onClose: () => finish(false),
    });
    cancelBtn.addEventListener('click', () => modal.close());
    confirmBtn.addEventListener('click', () => {
      finish(true);
      modal.close();
    });
  });
}

export function setLoading(button, loading) {
  if (!button) return;
  button.classList.toggle('is-loading', loading);
  button.disabled = loading;
  const spinner = button.querySelector('.btn-spinner');
  if (spinner) spinner.hidden = !loading;
}

export function fieldError(input, message) {
  const field = input.closest('.field');
  if (!field) return;
  field.classList.toggle('has-error', Boolean(message));
  const slot = field.querySelector('.field-error');
  if (slot) slot.textContent = message || '';
}

export function clearFieldErrors(form) {
  form.querySelectorAll('.field').forEach((field) => {
    field.classList.remove('has-error');
    const slot = field.querySelector('.field-error');
    if (slot) slot.textContent = '';
  });
  const alert = form.querySelector('.form-alert');
  if (alert) alert.hidden = true;
}

export function showFormAlert(form, message, type = 'error') {
  const alert = form.querySelector('.form-alert');
  if (!alert) return;
  alert.textContent = message;
  alert.classList.toggle('success', type === 'success');
  alert.hidden = false;
}

export function emptyState(icon, title, subtitle) {
  return `<div class="empty-state"><i class="fa-solid ${icon}"></i><strong>${escapeHtml(title)}</strong><span>${escapeHtml(subtitle || '')}</span></div>`;
}

export function loadingState(label = 'Cargando…') {
  return `<div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i><div>${escapeHtml(label)}</div></div>`;
}
