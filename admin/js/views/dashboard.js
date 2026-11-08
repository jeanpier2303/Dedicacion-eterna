import { api } from '../api.js';
import { state } from '../state.js';
import { escapeHtml, formatDate } from '../ui.js';

function statCard(tone, icon, value, label, locked) {
  return `<div class="stat-card ${locked ? 'locked' : ''}">
    <span class="stat-icon ${tone}"><i class="fa-solid ${icon}"></i></span>
    <span class="stat-info"><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></span>
  </div>`;
}

function lockedCard(tone, icon, label) {
  return statCard(tone, icon, '—', label, true).replace(
    `<span>${escapeHtml(label)}</span>`,
    `<span>${escapeHtml(label)} · requiere permisos</span>`
  );
}

export async function renderDashboard(container) {
  const name = state.profile?.full_name || state.user?.email || '';
  const role = state.profile?.role || '';

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h3>Hola, ${escapeHtml(name)}</h3>
        <p>Resumen del catálogo y del equipo · ${escapeHtml(role)}</p>
      </div>
      <span class="muted">${escapeHtml(formatDate(new Date()))}</span>
    </div>
    <div class="stat-grid" id="stat-grid">
      ${statCard('brown', 'fa-box', '…', 'Total de productos')}
      ${statCard('green', 'fa-circle-check', '…', 'Productos publicados')}
      ${statCard('gray', 'fa-eye-slash', '…', 'Productos ocultos')}
      ${statCard('gold', 'fa-tags', '…', 'Categorías activas')}
      ${statCard('blue', 'fa-user-shield', '…', 'Usuarios administradores')}
    </div>
    <div class="panel">
      <h4>Accesos rápidos</h4>
      <div class="quick-links" id="quick-links"></div>
    </div>`;

  const links = container.querySelector('#quick-links');
  const allowed = {
    productos: 'Gestionar productos',
    categorias: 'Gestionar categorías',
    usuarios: 'Gestionar usuarios',
  };
  const roleRoute = { administrador: ['productos', 'categorias', 'usuarios'] };
  const items = (roleRoute[role] || []).map(
    (key) => `<a class="btn btn-outline" href="#/${key}">${allowed[key]}</a>`
  );
  items.unshift('<a class="btn btn-primary" href="#/dashboard"><i class="fa-solid fa-rotate"></i> Actualizar</a>');
  links.innerHTML = items.join('');

  const [products, categories, users] = await Promise.allSettled([
    api('GET', '/api/products'),
    api('GET', '/api/categories'),
    api('GET', '/api/users'),
  ]);

  const cards = [];
  const productsOk = products.status === 'fulfilled';
  const list = productsOk ? products.value.products : [];
  cards.push(
    productsOk
      ? statCard('brown', 'fa-box', list.length, 'Total de productos')
      : lockedCard('brown', 'fa-box', 'Total de productos')
  );
  cards.push(
    productsOk
      ? statCard('green', 'fa-circle-check', list.filter((p) => p.is_published).length, 'Productos publicados')
      : lockedCard('green', 'fa-circle-check', 'Productos publicados')
  );
  cards.push(
    productsOk
      ? statCard('gray', 'fa-eye-slash', list.filter((p) => !p.is_published).length, 'Productos ocultos')
      : lockedCard('gray', 'fa-eye-slash', 'Productos ocultos')
  );

  if (categories.status === 'fulfilled') {
    const active = categories.value.categories.filter((c) => c.is_active).length;
    cards.push(statCard('gold', 'fa-tags', active, 'Categorías activas'));
  } else if (categories.reason?.status === 403) {
    cards.push(lockedCard('gold', 'fa-tags', 'Categorías activas'));
  } else {
    cards.push(statCard('gold', 'fa-tags', '—', 'Categorías activas'));
  }

  if (users.status === 'fulfilled') {
    const admins = users.value.users.filter((u) => u.role === 'administrador').length;
    cards.push(statCard('blue', 'fa-user-shield', admins, 'Usuarios administradores'));
  } else if (users.reason?.status === 403) {
    cards.push(lockedCard('blue', 'fa-user-shield', 'Usuarios administradores'));
  } else {
    cards.push(statCard('blue', 'fa-user-shield', '—', 'Usuarios administradores'));
  }

  const statGrid = container.querySelector('#stat-grid');
  if (statGrid) statGrid.innerHTML = cards.join('');
}
