import { api } from '../api.js';
import { state } from '../state.js';
import {
  escapeHtml,
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
let items = [];
let query = '';

function canWrite() {
  return state.profile?.role === 'administrador';
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

function filtered() {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
  );
}

function renderTable() {
  const wrap = container.querySelector('#cat-table');
  if (!wrap) return;
  const rows = filtered();
  if (!rows.length) {
    wrap.innerHTML = emptyState('fa-tags', 'Sin categorías', query ? 'Ajusta la búsqueda' : 'Crea la primera categoría');
    return;
  }
  wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr>
      <th>Nombre</th><th>Slug</th><th>Descripción</th><th>Estado</th><th style="text-align:right">Acciones</th>
    </tr></thead>
    <tbody>${rows
      .map(
        (c) => `<tr data-id="${c.id}">
      <td><strong>${escapeHtml(c.name)}</strong></td>
      <td><code>${escapeHtml(c.slug)}</code></td>
      <td><span class="truncate muted">${escapeHtml(c.description || '—')}</span></td>
      <td><span class="badge ${c.is_active ? 'badge-success' : 'badge-muted'}">${c.is_active ? 'Activa' : 'Inactiva'}</span></td>
      <td><div class="row-actions">
        ${
          canWrite()
            ? `<button class="icon-btn" data-action="toggle" aria-label="${c.is_active ? 'Desactivar' : 'Activar'} categoría">
            <i class="fa-solid ${c.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i></button>
          <button class="icon-btn" data-action="edit" aria-label="Editar ${escapeHtml(c.name)}"><i class="fa-solid fa-pen"></i></button>`
            : '<span class="muted">Solo lectura</span>'
        }
      </div></td></tr>`
      )
      .join('')}</tbody></table></div>`;

  wrap.querySelectorAll('[data-action]').forEach((btn) => {
    const id = btn.closest('tr').dataset.id;
    const category = items.find((c) => c.id === id);
    btn.addEventListener('click', () => {
      if (btn.dataset.action === 'edit') openForm(category);
      else toggleCategory(category, btn);
    });
  });
}

async function toggleCategory(category, btn) {
  btn.disabled = true;
  try {
    await api('PATCH', `/api/categories/${category.id}`, { is_active: !category.is_active });
    toast('success', category.is_active ? 'Categoría desactivada' : 'Categoría activada');
    await load();
  } catch (err) {
    toast('error', err.message);
    btn.disabled = false;
  }
}

function openForm(category) {
  const isNew = !category;
  const form = document.createElement('form');
  form.innerHTML = `
    <div id="cat-alert" class="form-alert" hidden></div>
    <div class="field">
      <label for="cat-name">Nombre</label>
      <input type="text" id="cat-name" maxlength="80" value="${escapeHtml(category?.name || '')}" placeholder="Ej: Velas personalizadas" required>
      <span class="field-error"></span>
    </div>
    <div class="field">
      <label for="cat-slug">Slug</label>
      <input type="text" id="cat-slug" maxlength="80" value="${escapeHtml(category?.slug || '')}" placeholder="se-genera-automaticamente">
      <span class="field-error"></span>
      <span class="muted">Déjalo vacío para generarlo desde el nombre.</span>
    </div>
    <div class="field">
      <label for="cat-desc">Descripción</label>
      <textarea id="cat-desc" maxlength="300" rows="3" placeholder="Descripción breve (opcional)">${escapeHtml(category?.description || '')}</textarea>
      <span class="char-count" id="cat-count">0/300</span>
    </div>
    <div class="switch-field">
      <span>Categoría activa<small>Visible en el catálogo público</small></span>
      <label class="switch"><input type="checkbox" id="cat-active" ${category?.is_active === false ? '' : 'checked'}><span class="track"></span></label>
    </div>`;

  const nameInput = form.querySelector('#cat-name');
  const slugInput = form.querySelector('#cat-slug');
  const count = form.querySelector('#cat-count');
  let slugTouched = !isNew;
  slugInput.addEventListener('input', () => { slugTouched = true; });
  nameInput.addEventListener('input', () => {
    count.textContent = `${form.querySelector('#cat-desc').value.length}/300`;
    if (!slugTouched) slugInput.value = slugify(nameInput.value);
  });
  form.querySelector('#cat-desc').addEventListener('input', (e) => {
    count.textContent = `${e.target.value.length}/300`;
  });
  count.textContent = `${form.querySelector('#cat-desc').value.length}/300`;

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'btn btn-primary';
  submit.innerHTML = `<span class="btn-label">${isNew ? 'Crear' : 'Guardar'}</span><i class="fa-solid fa-spinner fa-spin btn-spinner" hidden></i>`;

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn-outline';
  cancel.textContent = 'Cancelar';

  const modal = openModal({
    title: isNew ? 'Nueva categoría' : 'Editar categoría',
    body: form,
    footer: [cancel, submit],
  });
  cancel.addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    form.querySelector('#cat-alert').hidden = true;
    let valid = true;
    const name = nameInput.value.trim();
    if (!name) {
      fieldError(nameInput, 'El nombre es obligatorio');
      valid = false;
    }
    const slug = slugify(slugInput.value);
    if (slugInput.value.trim() && !slug) {
      fieldError(slugInput, 'El slug no es válido');
      valid = false;
    }
    if (!valid) return;

    const payload = {
      name,
      description: form.querySelector('#cat-desc').value.trim() || null,
      is_active: form.querySelector('#cat-active').checked,
    };
    if (slug) payload.slug = slug;

    setLoading(submit, true);
    try {
      if (isNew) await api('POST', '/api/categories', payload);
      else await api('PATCH', `/api/categories/${category.id}`, payload);
      closeModal();
      toast('success', isNew ? 'Categoría creada' : 'Categoría actualizada');
      await load();
    } catch (err) {
      const alert = form.querySelector('#cat-alert');
      alert.textContent = err.message;
      alert.hidden = false;
      setLoading(submit, false);
    }
  });

  nameInput.focus();
}

async function load() {
  const data = await api('GET', '/api/categories');
  items = data.categories;
  renderTable();
}

export async function renderCategories(containerEl) {
  container = containerEl;
  container.innerHTML = `
    <div class="view-header">
      <div><h3>Categorías</h3><p>Organiza el catálogo y controla qué categorías están visibles.</p></div>
      ${
        canWrite()
          ? '<button class="btn btn-primary" id="cat-new"><i class="fa-solid fa-plus"></i> Nueva categoría</button>'
          : ''
      }
    </div>
    <div class="toolbar">
      <div class="search-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="search" id="cat-search" placeholder="Buscar categoría…">
      </div>
    </div>
    <div id="cat-table">${loadingState()}</div>`;

  container.querySelector('#cat-search').addEventListener('input', (event) => {
    query = event.target.value;
    renderTable();
  });
  container.querySelector('#cat-new')?.addEventListener('click', () => openForm(null));

  await load();
}
