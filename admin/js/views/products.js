import { api } from '../api.js';
import { state } from '../state.js';
import {
  escapeHtml,
  formatPrice,
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
import { openGallery } from './gallery.js';

let container;
let categories = [];
let products = [];
const filters = { q: '', category: '', status: '', featured: '' };

function canWrite() {
  return state.profile?.role === 'administrador';
}

function canDelete() {
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
  const q = filters.q.trim().toLowerCase();
  return products.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q)) return false;
    if (filters.category && p.category?.id !== filters.category) return false;
    if (filters.status === 'published' && !p.is_published) return false;
    if (filters.status === 'hidden' && p.is_published) return false;
    if (filters.featured === 'yes' && !p.is_featured) return false;
    if (filters.featured === 'no' && p.is_featured) return false;
    return true;
  });
}

function renderTable() {
  const wrap = container.querySelector('#prod-table');
  if (!wrap) return;
  const rows = filtered();
  if (!rows.length) {
    wrap.innerHTML = emptyState(
      'fa-box-open',
      'Sin productos',
      products.length ? 'Ajusta los filtros de búsqueda' : 'Crea tu primer producto'
    );
    return;
  }
  wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr>
      <th>Producto</th><th>Categoría</th><th>Precio</th><th>Estado</th><th>Orden</th><th style="text-align:right">Acciones</th>
    </tr></thead>
    <tbody>${rows
      .map((p) => {
        const fullIndex = products.findIndex((item) => item.id === p.id);
        return `<tr data-id="${p.id}">
      <td><div class="cell-title">
        ${
          p.primary_image_url
            ? `<img class="thumb" src="${escapeHtml(p.primary_image_url)}" alt="">`
            : '<span class="thumb placeholder"><i class="fa-solid fa-image"></i></span>'
        }
        <span><strong class="truncate">${escapeHtml(p.name)}</strong><small>${escapeHtml(p.slug)}</small></span>
      </div></td>
      <td>${escapeHtml(p.category?.name || '—')}</td>
      <td class="price-cell">${
        p.price !== null && p.price !== undefined
          ? `<strong>${escapeHtml(formatPrice(p.price))}</strong>${p.old_price ? `<s>${escapeHtml(formatPrice(p.old_price))}</s>` : ''}`
          : '<span class="muted">Consultar</span>'
      }</td>
      <td>
        <span class="badge ${p.is_published ? 'badge-success' : 'badge-muted'}">${p.is_published ? 'Publicado' : 'Oculto'}</span>
        ${
          canWrite()
            ? ` <button class="icon-btn star-btn ${p.is_featured ? 'on' : ''}" data-action="feature" aria-label="${p.is_featured ? 'Quitar de destacados' : 'Destacar producto'}">
            <i class="fa-solid fa-star"></i></button>`
            : p.is_featured ? ' <span class="badge badge-gold">Destacado</span>' : ''
        }
      </td>
      <td>${
        canWrite()
          ? `<span class="order-controls">
          <button data-action="up" ${fullIndex === 0 ? 'disabled' : ''} aria-label="Subir producto"><i class="fa-solid fa-chevron-up"></i></button>
          <button data-action="down" ${fullIndex === products.length - 1 ? 'disabled' : ''} aria-label="Bajar producto"><i class="fa-solid fa-chevron-down"></i></button>
        </span>`
          : p.display_order
      }</td>
      <td><div class="row-actions">
        ${
          canWrite()
            ? `<button class="icon-btn" data-action="gallery" aria-label="Galería de ${escapeHtml(p.name)}"><i class="fa-solid fa-images"></i></button>
          <button class="icon-btn" data-action="edit" aria-label="Editar ${escapeHtml(p.name)}"><i class="fa-solid fa-pen"></i></button>`
            : ''
        }
        ${
          canDelete()
            ? `<button class="icon-btn danger" data-action="delete" aria-label="Eliminar ${escapeHtml(p.name)}"><i class="fa-solid fa-trash"></i></button>`
            : ''
        }
      </div></td></tr>`;
      })
      .join('')}</tbody></table></div>`;

  wrap.querySelectorAll('[data-action]').forEach((btn) => {
    const id = btn.closest('tr').dataset.id;
    const product = products.find((p) => p.id === id);
    btn.addEventListener('click', () => handleAction(btn.dataset.action, product, btn));
  });
}

async function handleAction(action, product, btn) {
  if (action === 'edit') return openForm(product);
  if (action === 'gallery') {
    await openGallery(product);
    await load();
    return;
  }
  if (action === 'delete') {
    const ok = await confirmDialog(`¿Eliminar "${product.name}"? Se borrarán también sus fotos y videos.`, {
      danger: true,
      confirmText: 'Eliminar',
    });
    if (!ok) return;
    btn.disabled = true;
    try {
      const result = await api('DELETE', `/api/products/${product.id}`);
      toast('success', `Producto eliminado${result.deleted_media ? ` (${result.deleted_media} archivo(s) retirados)` : ''}`);
      await load();
    } catch (err) {
      toast('error', err.message);
      btn.disabled = false;
    }
    return;
  }
  if (action === 'feature') {
    btn.disabled = true;
    try {
      await api('PATCH', `/api/products/${product.id}`, { is_featured: !product.is_featured });
      toast('success', product.is_featured ? 'Quitado de destacados' : 'Producto destacado');
      await load();
    } catch (err) {
      toast('error', err.message);
      btn.disabled = false;
    }
    return;
  }
  if (action === 'up' || action === 'down') {
    const index = products.findIndex((p) => p.id === product.id);
    const target = index + (action === 'up' ? -1 : 1);
    if (target < 0 || target >= products.length) return;
    btn.disabled = true;
    try {
      const reordered = [...products];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      const patches = reordered
        .map((p, i) => ({ p, desired: i + 1 }))
        .filter(({ p, desired }) => p.display_order !== desired)
        .map(({ p, desired }) => api('PATCH', `/api/products/${p.id}`, { display_order: desired }));
      await Promise.all(patches);
      await load();
    } catch (err) {
      toast('error', err.message);
      btn.disabled = false;
    }
  }
}

function openForm(product) {
  const isNew = !product;
  const form = document.createElement('form');
  form.innerHTML = `
    <div id="prod-alert" class="form-alert" hidden></div>
    <div class="field-row">
      <div class="field">
        <label for="p-name">Nombre *</label>
        <input type="text" id="p-name" maxlength="200" value="${escapeHtml(product?.name || '')}" required>
        <span class="field-error"></span>
      </div>
      <div class="field">
        <label for="p-slug">Slug</label>
        <input type="text" id="p-slug" maxlength="80" value="${escapeHtml(product?.slug || '')}" placeholder="se-genera-automáticamente">
        <span class="field-error"></span>
      </div>
    </div>
    <div class="field">
      <label for="p-short">Descripción corta</label>
      <textarea id="p-short" rows="2" maxlength="300" placeholder="Resumen para el catálogo (opcional)">${escapeHtml(product?.short_description || '')}</textarea>
      <span class="char-count" id="p-short-count">0/300</span>
    </div>
    <div class="field">
      <label for="p-desc">Descripción completa</label>
      <textarea id="p-desc" rows="4" maxlength="10000" placeholder="Detalles del producto (opcional)">${escapeHtml(product?.description || '')}</textarea>
    </div>
    <div class="field">
      <label for="p-category">Categoría *</label>
      <select id="p-category" required>
        <option value="">Selecciona una categoría</option>
        ${categories
          .map(
            (c) =>
              `<option value="${c.id}" ${product?.category?.id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}${c.is_active ? '' : ' (inactiva)'}</option>`
          )
          .join('')}
      </select>
      <span class="field-error"></span>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="p-price">Precio</label>
        <input type="number" id="p-price" min="0" step="0.01" value="${product?.price ?? ''}" placeholder="Vacío = consultar">
        <span class="field-error"></span>
      </div>
      <div class="field">
        <label for="p-old">Precio anterior</label>
        <input type="number" id="p-old" min="0" step="0.01" value="${product?.old_price ?? ''}" placeholder="Opcional">
        <span class="field-error"></span>
      </div>
    </div>
    <div class="switch-field">
      <span>Publicado<small>Visible en el catálogo público</small></span>
      <label class="switch"><input type="checkbox" id="p-published" ${product?.is_published ? 'checked' : ''}><span class="track"></span></label>
    </div>
    <div class="switch-field">
      <span>Destacado<small>Se resalta en la portada</small></span>
      <label class="switch"><input type="checkbox" id="p-featured" ${product?.is_featured ? 'checked' : ''}><span class="track"></span></label>
    </div>
    ${
      isNew
        ? ''
        : '<p class="muted" style="margin-top:0.6rem"><i class="fa-solid fa-images"></i> Las fotos y videos se gestionan desde el botón de galería de la tabla.</p>'
    }`;

  const nameInput = form.querySelector('#p-name');
  const slugInput = form.querySelector('#p-slug');
  const shortInput = form.querySelector('#p-short');
  const shortCount = form.querySelector('#p-short-count');
  let slugTouched = !isNew;
  slugInput.addEventListener('input', () => { slugTouched = true; });
  nameInput.addEventListener('input', () => {
    if (!slugTouched) slugInput.value = slugify(nameInput.value);
  });
  shortInput.addEventListener('input', () => {
    shortCount.textContent = `${shortInput.value.length}/300`;
  });
  shortCount.textContent = `${shortInput.value.length}/300`;

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'btn btn-primary';
  submit.innerHTML = `<span class="btn-label">${isNew ? 'Crear producto' : 'Guardar cambios'}</span><i class="fa-solid fa-spinner fa-spin btn-spinner" hidden></i>`;
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn-outline';
  cancel.textContent = 'Cancelar';

  const modal = openModal({
    title: isNew ? 'Nuevo producto' : `Editar: ${product.name}`,
    body: form,
    footer: [cancel, submit],
    size: 'modal-lg',
  });
  cancel.addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    form.querySelector('#prod-alert').hidden = true;
    let valid = true;

    const name = nameInput.value.trim();
    if (!name) {
      fieldError(nameInput, 'El nombre es obligatorio');
      valid = false;
    }
    const categoryId = form.querySelector('#p-category').value;
    if (!categoryId) {
      fieldError(form.querySelector('#p-category'), 'Selecciona una categoría');
      valid = false;
    }
    const priceRaw = form.querySelector('#p-price').value.trim();
    const oldRaw = form.querySelector('#p-old').value.trim();
    if (priceRaw && (isNaN(Number(priceRaw)) || Number(priceRaw) < 0)) {
      fieldError(form.querySelector('#p-price'), 'Precio no válido (≥ 0)');
      valid = false;
    }
    if (oldRaw && (isNaN(Number(oldRaw)) || Number(oldRaw) < 0)) {
      fieldError(form.querySelector('#p-old'), 'Precio no válido (≥ 0)');
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
      category_id: categoryId,
      short_description: shortInput.value.trim() || null,
      description: form.querySelector('#p-desc').value.trim() || null,
      price: priceRaw === '' ? null : Number(priceRaw),
      old_price: oldRaw === '' ? null : Number(oldRaw),
      is_published: form.querySelector('#p-published').checked,
      is_featured: form.querySelector('#p-featured').checked,
    };
    if (slug) payload.slug = slug;

    setLoading(submit, true);
    try {
      if (isNew) await api('POST', '/api/products', payload);
      else await api('PATCH', `/api/products/${product.id}`, payload);
      closeModal();
      toast('success', isNew ? 'Producto creado' : 'Producto actualizado');
      await load();
    } catch (err) {
      const alert = form.querySelector('#prod-alert');
      alert.textContent = err.message;
      alert.hidden = false;
      setLoading(submit, false);
    }
  });

  nameInput.focus();
}

async function load() {
  const data = await api('GET', '/api/products');
  products = data.products;
  renderTable();
}

export async function renderProducts(containerEl) {
  container = containerEl;
  container.innerHTML = `
    <div class="view-header">
      <div><h3>Productos</h3><p>Administra la información, el estado y el orden del catálogo.</p></div>
      ${
        canWrite()
          ? '<button class="btn btn-primary" id="prod-new"><i class="fa-solid fa-plus"></i> Nuevo producto</button>'
          : ''
      }
    </div>
    <div class="toolbar">
      <div class="search-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="search" id="prod-search" placeholder="Buscar por nombre o slug…">
      </div>
      <select id="prod-cat-filter"><option value="">Todas las categorías</option></select>
      <select id="prod-status-filter">
        <option value="">Todos los estados</option>
        <option value="published">Publicados</option>
        <option value="hidden">Ocultos</option>
      </select>
      <select id="prod-featured-filter">
        <option value="">Destacados y no</option>
        <option value="yes">Solo destacados</option>
        <option value="no">Sin destacar</option>
      </select>
    </div>
    <div id="prod-table">${loadingState()}</div>`;

  container.querySelector('#prod-search').addEventListener('input', (event) => {
    filters.q = event.target.value;
    renderTable();
  });
  container.querySelector('#prod-cat-filter').addEventListener('change', (event) => {
    filters.category = event.target.value;
    renderTable();
  });
  container.querySelector('#prod-status-filter').addEventListener('change', (event) => {
    filters.status = event.target.value;
    renderTable();
  });
  container.querySelector('#prod-featured-filter').addEventListener('change', (event) => {
    filters.featured = event.target.value;
    renderTable();
  });
  container.querySelector('#prod-new')?.addEventListener('click', () => openForm(null));

  const catData = await api('GET', '/api/categories');
  categories = catData.categories;
  const select = container.querySelector('#prod-cat-filter');
  for (const c of categories) {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = c.name;
    select.appendChild(option);
  }

  await load();
}
