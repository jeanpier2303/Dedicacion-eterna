import { state, loadStoredSession, clearSession, setIdentity } from './state.js';
import { api } from './api.js';
import { toast, setLoading, loadingState, escapeHtml } from './ui.js';
import { initLogin } from './views/login.js';
import { renderDashboard } from './views/dashboard.js';
import { renderHero } from './views/hero.js';
import { renderProducts } from './views/products.js';
import { renderCategories } from './views/categories.js';
import { renderUsers } from './views/users.js';

const NAV_ITEMS = {
  dashboard: { label: 'Dashboard', icon: 'fa-chart-line' },
  portada: { label: 'Portada principal', icon: 'fa-image' },
  productos: { label: 'Productos', icon: 'fa-box-open' },
  categorias: { label: 'Categorías', icon: 'fa-tags' },
  usuarios: { label: 'Usuarios', icon: 'fa-users' },
};

const NAV_SECTIONS = [
  { title: 'General', keys: ['dashboard', 'portada'] },
  { title: 'Catálogo', keys: ['productos', 'categorias'] },
  { title: 'Equipo', keys: ['usuarios'] },
];

const ROUTES = {
  dashboard: { title: 'Dashboard', roles: ['administrador'], render: renderDashboard },
  portada: { title: 'Portada principal', roles: ['administrador'], render: renderHero },
  productos: { title: 'Productos', roles: ['administrador'], render: renderProducts },
  categorias: { title: 'Categorías', roles: ['administrador'], render: renderCategories },
  usuarios: { title: 'Usuarios', roles: ['administrador'], render: renderUsers },
};

const ROLE_LABELS = { administrador: 'Administrador' };

function role() {
  return state.profile?.role || null;
}

function currentRouteKey() {
  const key = location.hash.replace(/^#\/?/, '');
  return ROUTES[key] ? key : 'dashboard';
}

function showLogin() {
  document.getElementById('app-shell').hidden = true;
  document.getElementById('login-screen').hidden = false;
  document.title = 'Iniciar sesión | Sueños de Papiro';
}

function renderNav() {
  const nav = document.getElementById('sidebar-nav');
  const active = currentRouteKey();
  let html = '';
  for (const section of NAV_SECTIONS) {
    const keys = section.keys.filter((key) => ROUTES[key].roles.includes(role()));
    if (!keys.length) continue;
    html += `<div class="nav-section">${escapeHtml(section.title)}</div>`;
    for (const key of keys) {
      const item = NAV_ITEMS[key];
      html += `<button type="button" class="nav-item ${key === active ? 'active' : ''}" data-route="${key}">
        <i class="fa-solid ${item.icon}"></i>${escapeHtml(item.label)}</button>`;
    }
  }
  nav.innerHTML = html;
  nav.querySelectorAll('[data-route]').forEach((btn) => {
    btn.addEventListener('click', () => {
      location.hash = '#/' + btn.dataset.route;
      document.getElementById('app-shell').classList.remove('sidebar-open');
      document.getElementById('sidebar-overlay').hidden = true;
    });
  });
}

function renderUserChip() {
  const name = state.profile?.full_name || state.user?.email || 'Usuario';
  document.getElementById('user-name').textContent = name;
  document.getElementById('user-avatar').textContent = name.trim().charAt(0).toUpperCase();
  document.getElementById('user-role').textContent = ROLE_LABELS[role()] || role();
}

function showApp() {
  document.getElementById('login-screen').hidden = true;
  document.getElementById('app-shell').hidden = false;
  renderNav();
  renderUserChip();
  navigate();
}

function sessionExpired(message) {
  clearSession();
  showLogin();
  toast('info', message || 'Tu sesión expiró, vuelve a iniciar sesión');
}

async function navigate() {
  const key = currentRouteKey();
  const route = ROUTES[key];
  if (!route.roles.includes(role())) {
    location.hash = '#/dashboard';
    return;
  }
  document.getElementById('page-title').textContent = route.title;
  document.title = `${route.title} | Sueños de Papiro`;
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.route === key);
  });
  const view = document.getElementById('view');
  view.innerHTML = loadingState();
  try {
    await route.render(view);
  } catch (err) {
    if (err?.status === 401) {
      sessionExpired();
      return;
    }
    view.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i>
      <strong>No se pudo cargar la vista</strong><span>${escapeHtml(err?.message || 'Error desconocido')}</span></div>`;
    toast('error', err?.message || 'Error al cargar');
  }
}

function wireShell() {
  const shell = document.getElementById('app-shell');
  const overlay = document.getElementById('sidebar-overlay');
  document.getElementById('btn-menu').addEventListener('click', () => {
    shell.classList.add('sidebar-open');
    overlay.hidden = false;
  });
  overlay.addEventListener('click', () => {
    shell.classList.remove('sidebar-open');
    overlay.hidden = true;
  });

  const logoutBtn = document.getElementById('btn-logout');
  logoutBtn.addEventListener('click', async () => {
    setLoading(logoutBtn, true);
    try {
      await api('POST', '/api/auth/logout');
    } catch {}
    clearSession();
    setLoading(logoutBtn, false);
    showLogin();
    toast('success', 'Sesión cerrada');
  });

  window.addEventListener('hashchange', () => {
    if (!document.getElementById('app-shell').hidden) navigate();
  });
}

async function boot() {
  initLogin(() => showApp());
  wireShell();

  const session = loadStoredSession();
  if (!session) {
    showLogin();
    return;
  }
  try {
    const data = await api('GET', '/api/auth/me');
    setIdentity(data.user, data.profile);
    showApp();
  } catch (err) {
    if (err?.status === 401) {
      showLogin();
    } else {
      showLogin();
      toast('error', err?.message || 'No se pudo verificar la sesión');
    }
  }
}

boot();
