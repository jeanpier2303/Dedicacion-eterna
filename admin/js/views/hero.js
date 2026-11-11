import { api, uploadToSignedUrl } from '../api.js';
import { escapeHtml, toast, setLoading, loadingState, confirmDialog } from '../ui.js';

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const VIDEO_EXT = ['.mp4', '.webm', '.mov'];
const MAX_SIZE = { image: 10485760, video: 104857600 };
const HREF_RE = /^(https?:\/\/|mailto:|tel:|\/|#)/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let container;
let hero = null;
let draft = null;
// Galería propia de la portada (home_hero_media): fotos y videos
// cargados desde este formulario, con su orden.
let gallery = [];
let galleryBlocked = false;
let busy = false;
let products = [];

function extensionOf(name) {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index).toLowerCase() : '';
}

function isVideoFile(file) {
  return file.type.startsWith('video/') || VIDEO_EXT.includes(extensionOf(file.name));
}

function validateHeroFile(file) {
  const video = isVideoFile(file);
  const ext = extensionOf(file.name);
  const allowed = video ? VIDEO_EXT : IMAGE_EXT;
  if (!allowed.includes(ext)) return `formato .${ext || '(sin extensión)'} no permitido`;
  const max = video ? MAX_SIZE.video : MAX_SIZE.image;
  if (file.size > max) return `supera ${Math.floor(max / 1048576)} MB`;
  if (file.size === 0) return 'archivo vacío';
  return null;
}

function altFromFilename(filename) {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .slice(0, 200);
}

// Archivos en el orden en que los verá el sitio.
function sortedGallery() {
  return [...gallery].sort((a, b) => {
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return String(a.created_at || '').localeCompare(String(b.created_at || ''));
  });
}

function toDraft(data) {
  return {
    title: data?.title || '',
    description: data?.description || '',
    button_label: data?.button_label || '',
    button_href: data?.button_href || '',
    product_slug: data?.product_slug || null,
    media_type: data?.media_type === 'video' ? 'video' : 'image',
    image_path: data?.image_path || null,
    video_path: data?.video_path || null,
    is_published: !!data?.is_published,
    starts_at: data?.starts_at || null,
    ends_at: data?.ends_at || null,
    image_url: data?.image_url || null,
    video_url: data?.video_url || null,
  };
}

function toLocalInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function statusOf(data) {
  if (!data.is_published) return { label: 'Borrador', cls: 'badge-muted' };
  const now = Date.now();
  if (data.starts_at && Date.parse(data.starts_at) > now) return { label: 'Programada', cls: 'badge-gold' };
  if (data.ends_at && Date.parse(data.ends_at) <= now) return { label: 'Finalizada', cls: 'badge-danger' };
  return { label: 'Publicada', cls: 'badge-success' };
}

function payload() {
  return {
    title: draft.title,
    description: draft.description,
    button_label: draft.button_label,
    button_href: draft.button_href,
    product_slug: draft.product_slug,
    media_type: draft.media_type,
    image_path: draft.image_path,
    video_path: draft.video_path,
    is_published: draft.is_published,
    starts_at: draft.starts_at,
    ends_at: draft.ends_at,
  };
}

function validate() {
  if (draft.is_published && !draft.title.trim()) return 'El título es obligatorio para publicar';
  if (draft.title.length > 120) return 'El título no puede superar 120 caracteres';
  if (draft.description.length > 500) return 'El texto descriptivo no puede superar 500 caracteres';
  if (draft.button_label.length > 60) return 'El texto del botón no puede superar 60 caracteres';
  if (draft.button_href.length > 500) return 'El enlace del botón no puede superar 500 caracteres';
  if (draft.button_href && !HREF_RE.test(draft.button_href)) return 'El enlace debe ser http(s), mailto, tel, ruta o ancla';
  if (draft.product_slug && !SLUG_RE.test(draft.product_slug)) return 'El producto seleccionado no es válido';
  if (draft.starts_at && draft.ends_at && Date.parse(draft.ends_at) <= Date.parse(draft.starts_at)) {
    return 'La fecha de finalización debe ser posterior a la de inicio';
  }
  return null;
}

function applyMode() {
  const withProduct = !!draft.product_slug;
  const campaign = container.querySelector('#hero-campaign-fields');
  if (campaign) campaign.style.display = withProduct ? 'none' : '';
  const note = container.querySelector('#hero-mode-note');
  if (note) {
    note.textContent = withProduct
      ? 'Se mostrarán la galería, la descripción y los botones del producto (WhatsApp + Ver detalles).'
      : 'Sin producto: la portada muestra la galería de medios que cargues aquí, con el título, la descripción y los dos botones (WhatsApp + Ver detalles).';
  }
}

function updatePreview() {
  const wrap = container.querySelector('#hero-preview');
  if (!wrap || !draft) return;
  const first = sortedGallery()[0];
  const product = draft.product_slug ? products.find((p) => p.slug === draft.product_slug) : null;
  const videoHtml = (src) =>
    `<video class="hp-media" controls muted loop autoplay playsinline preload="metadata" src="${escapeHtml(src)}"></video>`;
  let media;
  if (product) {
    const productImage = product.primary_image_url || (first && first.media_type === 'image' ? first.signed_url : draft.image_url);
    media = productImage
      ? `<img class="hp-media" src="${escapeHtml(productImage)}" alt="">`
      : `<div class="hp-media hp-empty"><i class="fa-solid fa-image"></i><span>Galería del producto</span></div>`;
  } else if (first) {
    // Igual que el sitio: el primer archivo de la galería es el
    // medio principal; los videos llevan controles.
    media = first.media_type === 'video'
      ? videoHtml(first.signed_url)
      : `<img class="hp-media" src="${escapeHtml(first.signed_url)}" alt="">`;
  } else if (draft.media_type === 'video' && draft.video_url) {
    media = videoHtml(draft.video_url);
  } else if (draft.image_url) {
    media = `<img class="hp-media" src="${escapeHtml(draft.image_url)}" alt="">`;
  } else {
    media = `<div class="hp-media hp-empty"><i class="fa-solid fa-image"></i><span>Sin contenido visual</span></div>`;
  }
  const modeIcon = product
    ? 'fa-star'
    : first
      ? first.media_type === 'video' ? 'fa-film' : 'fa-image'
      : draft.media_type === 'video' ? 'fa-film' : 'fa-image';
  const modeLabel = product
    ? 'Producto'
    : first
      ? first.media_type === 'video' ? 'Video' : 'Imagen'
      : draft.media_type === 'video' ? 'Video' : 'Imagen';
  const status = statusOf(draft);
  const badge = container.querySelector('#hero-status-badge');
  if (badge) {
    badge.className = `badge ${status.cls}`;
    badge.textContent = status.label;
  }
  // Los mismos dos botones fijos que verá el sitio, en ambos modos.
  const actions = `<span class="hp-button">Consultar por WhatsApp</span> <span class="hp-button">Ver detalles</span>`;
  const productTag = product
    ? `<p class="muted">Producto destacado: ${escapeHtml(product.name)}</p>`
    : '';
  wrap.innerHTML = `
    <div class="hp-topbar">
      <span class="badge ${status.cls}">${status.label}</span>
      <span class="hp-mode"><i class="fa-solid ${modeIcon}"></i> ${modeLabel}</span>
    </div>
    <div class="hp-media-frame">${media}</div>
    <div class="hp-body">
      <h4 class="hp-title">${escapeHtml(draft.title || 'Título principal')}</h4>
      <p class="hp-desc">${escapeHtml(draft.description || 'Texto descriptivo de la portada.')}</p>
      ${productTag}
      <span>${actions}</span>
    </div>`;
  const video = wrap.querySelector('video');
  if (video) {
    const fallback = () => {
      const frame = wrap.querySelector('.hp-media-frame');
      if (!frame || !frame.querySelector('video')) return;
      frame.innerHTML = `<div class="hp-media hp-empty"><i class="fa-solid fa-film"></i><span>Video no disponible</span></div>`;
    };
    // Igual que el sitio: si el video falla se muestra el respaldo
    // neutro, nunca una imagen anterior.
    video.addEventListener('error', fallback);
  }
}

// ---------- Galería propia de la portada (home_hero_media) ----------

async function loadGallery() {
  const grid = container.querySelector('#hero-gz-grid');
  if (!grid) return;
  try {
    const data = await api('GET', '/api/hero/media');
    gallery = data.media || [];
    galleryBlocked = false;
  } catch (err) {
    gallery = [];
    galleryBlocked = true;
    grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i>
      <strong>No se pudo cargar la galería</strong>
      <span>${escapeHtml(err.message || 'Error desconocido')}</span></div>`;
    const legacy = container.querySelector('#hero-legacy');
    if (legacy) legacy.hidden = true;
    updatePreview();
    return;
  }
  renderGallery();
}

function renderGallery() {
  const grid = container.querySelector('#hero-gz-grid');
  if (!grid || galleryBlocked) return;
  const sorted = sortedGallery();
  if (!sorted.length) {
    grid.innerHTML = `<div class="empty-state"><i class="fa-regular fa-images"></i>
      <strong>Sin archivos aún</strong><span>Sube las primeras fotos o el video de la portada</span></div>`;
  } else {
    grid.innerHTML = `<div class="gallery-grid">${sorted
      .map((item, index) => {
        const preview =
          item.media_type === 'video'
            ? `<video src="${escapeHtml(item.signed_url)}" preload="metadata" muted playsinline></video>
               <span class="video-icon"><i class="fa-solid fa-circle-play"></i></span>`
            : `<img src="${escapeHtml(item.signed_url)}" alt="${escapeHtml(item.alt_text || '')}" loading="lazy">`;
        return `<div class="gallery-item ${index === 0 ? 'is-primary' : ''}" data-id="${item.id}">
        ${index === 0 ? '<span class="primary-flag">Primero</span>' : ''}
        <div class="gallery-media">${preview}</div>
        <div class="gallery-item-body">
          <span class="name" title="${escapeHtml(item.alt_text || '')}">${escapeHtml(item.alt_text || (item.media_type === 'video' ? 'Video' : 'Foto') + ' ' + (index + 1))}</span>
          <div class="gallery-item-actions">
            <button class="icon-btn" data-gz="first" aria-label="Hacer el primero" ${index === 0 ? 'disabled' : ''}>
              <i class="fa-solid fa-star"></i></button>
            <button class="icon-btn" data-gz="left" aria-label="Mover antes" ${index === 0 ? 'disabled' : ''}>
              <i class="fa-solid fa-arrow-left"></i></button>
            <button class="icon-btn" data-gz="right" aria-label="Mover después" ${index === sorted.length - 1 ? 'disabled' : ''}>
              <i class="fa-solid fa-arrow-right"></i></button>
            <button class="icon-btn danger" data-gz="delete" aria-label="Eliminar archivo">
              <i class="fa-solid fa-trash"></i></button>
          </div>
        </div></div>`;
      })
      .join('')}</div>`;

    grid.querySelectorAll('.gallery-item').forEach((el) => {
      const item = sorted.find((m) => m.id === el.dataset.id);
      el.querySelectorAll('[data-gz]').forEach((btn) => {
        btn.addEventListener('click', () => galleryAction(btn.dataset.gz, item, btn));
      });
    });
  }
  renderLegacyImport(sorted);
  updatePreview();
}

// Contenido anterior (image_path / video_path) que aún no está en
// la galería: se ofrece añadirlo sin reemplazar nada.
function renderLegacyImport(sorted) {
  const box = container.querySelector('#hero-legacy');
  if (!box) return;
  const paths = new Set(sorted.map((m) => m.storage_path).filter(Boolean));
  const pending = [];
  if (draft.image_path && !paths.has(draft.image_path)) pending.push({ path: draft.image_path, type: 'image' });
  if (draft.video_path && !paths.has(draft.video_path)) pending.push({ path: draft.video_path, type: 'video' });
  box.hidden = !pending.length;
  box.dataset.pending = JSON.stringify(pending);
}

async function galleryAction(action, item, btn) {
  if (busy) {
    toast('error', 'Hay una operación en curso; espera a que termine');
    return;
  }
  const sorted = sortedGallery();
  const index = sorted.findIndex((m) => m.id === item.id);

  if (action === 'delete') {
    const ok = await confirmDialog('¿Eliminar este archivo? Se borra también de Storage.', {
      danger: true,
      confirmText: 'Eliminar',
    });
    if (!ok) return;
    btn.disabled = true;
    busy = true;
    try {
      await api('DELETE', `/api/hero/media/${item.id}`);
      toast('success', 'Archivo eliminado de la galería');
      await loadGallery();
    } catch (err) {
      toast('error', err.message);
      btn.disabled = false;
    } finally {
      busy = false;
    }
    return;
  }

  let ids;
  if (action === 'first') {
    if (index <= 0) return;
    ids = [item.id, ...sorted.filter((m) => m.id !== item.id).map((m) => m.id)];
  } else {
    const otherIndex = index + (action === 'left' ? -1 : 1);
    const other = sorted[otherIndex];
    if (!other) return;
    ids = sorted.map((m) => m.id);
    ids[index] = other.id;
    ids[otherIndex] = item.id;
  }

  btn.disabled = true;
  busy = true;
  try {
    const data = await api('PATCH', '/api/hero/media', { ordered_ids: ids });
    gallery = data.media || [];
    renderGallery();
    toast('success', action === 'first' ? 'El archivo pasó a ser el primero' : 'Orden actualizado');
  } catch (err) {
    toast('error', err.message);
    try {
      await loadGallery();
    } catch {}
  } finally {
    busy = false;
  }
}

async function importLegacy() {
  const box = container.querySelector('#hero-legacy');
  let pending = [];
  try {
    pending = JSON.parse((box && box.dataset.pending) || '[]');
  } catch (e) {
    pending = [];
  }
  if (!pending.length) return;
  if (busy) {
    toast('error', 'Hay una operación en curso; espera a que termine');
    return;
  }
  busy = true;
  const btn = container.querySelector('#hero-legacy-import');
  if (btn) btn.disabled = true;
  try {
    for (const entry of pending) {
      await api('POST', '/api/hero/media', {
        storage_path: entry.path,
        media_type: entry.type,
        alt_text: entry.path.split('/').pop(),
      });
    }
    toast('success', 'Contenido anterior añadido a la galería; sigue intacto como respaldo');
    await loadGallery();
  } catch (err) {
    toast('error', err.message || 'No se pudo añadir el contenido anterior');
    try {
      await loadGallery();
    } catch {}
  } finally {
    busy = false;
    if (btn) btn.disabled = false;
  }
}

// Sube uno o varios archivos y los AÑADE a la galería: nunca
// borra ni reemplaza los que ya estaban. Cada archivo se registra
// con POST /api/hero/media después de subirlo a Storage.
async function uploadFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  if (busy) {
    toast('error', 'Hay una operación en curso; espera a que termine para subir archivos');
    return;
  }
  const valid = [];
  for (const file of files) {
    const error = validateHeroFile(file);
    if (error) toast('error', `${file.name}: ${error}`);
    else valid.push(file);
  }
  if (!valid.length) return;

  busy = true;
  const drop = container.querySelector('#hero-gz-drop');
  const progress = container.querySelector('#hero-gz-progress');
  const fill = container.querySelector('#hero-gz-fill');
  const pct = container.querySelector('#hero-gz-pct');
  const label = container.querySelector('#hero-gz-label');
  const setProgress = (bytes, text) => {
    const value = totalBytes > 0 ? Math.min(100, Math.round((bytes / totalBytes) * 100)) : 0;
    if (fill) fill.style.width = `${value}%`;
    if (pct) pct.textContent = `${value}%`;
    if (label && text) label.textContent = text;
  };
  if (drop) drop.querySelectorAll('button').forEach((b) => (b.disabled = true));
  if (progress) progress.hidden = false;
  const totalBytes = valid.reduce((sum, file) => sum + file.size, 0);
  let doneBytes = 0;
  let uploaded = 0;

  try {
    for (const file of valid) {
      const mediaType = isVideoFile(file) ? 'video' : 'image';
      setProgress(doneBytes, `Subiendo ${file.name}…`);
      const upload = await api('POST', '/api/hero/upload-url', {
        filename: file.name,
        media_type: mediaType,
        size: file.size,
      });
      await uploadToSignedUrl(upload.signed_url, file, (filePct) => {
        setProgress(doneBytes + (file.size * filePct) / 100, `Subiendo ${file.name}…`);
      });
      await api('POST', '/api/hero/media', {
        storage_path: upload.path,
        media_type: mediaType,
        alt_text: altFromFilename(file.name),
      });
      doneBytes += file.size;
      uploaded += 1;
      setProgress(doneBytes, `Subiendo ${file.name}…`);
      if (mediaType === 'video' && extensionOf(file.name) === '.mov') {
        toast('info', `Formato MOV (${file.name}): algunos navegadores no lo reproducen. Si no se reproduce, sube el video en MP4 o WEBM.`);
      }
    }
    await loadGallery();
    toast('success', `${uploaded} archivo(s) añadido(s) a la galería de la portada`);
  } catch (err) {
    toast('error', err.message || 'La subida falló');
    try {
      await loadGallery();
    } catch {}
  } finally {
    busy = false;
    if (drop) drop.querySelectorAll('button').forEach((b) => (b.disabled = false));
    if (progress) progress.hidden = true;
    if (fill) fill.style.width = '0%';
  }
}

async function save() {
  if (!draft) return;
  if (busy) {
    toast('error', 'Hay una operación en curso; espera a que termine para guardar');
    return;
  }
  const problem = validate();
  if (problem) {
    toast('error', problem);
    return;
  }
  const btn = container.querySelector('#hero-save');
  setLoading(btn, true);
  busy = true;
  try {
    const data = await api('PATCH', '/api/hero', payload());
    hero = data.hero;
    draft = toDraft(hero);
    updatePreview();
    if (!galleryBlocked) renderLegacyImport(sortedGallery());
    // Sin simulación: si la URL firmada no volvió, se avisa aunque
    // la ruta ya esté escrita en la base de datos.
    if (draft.media_type === 'video' && draft.video_path && !draft.video_url) {
      toast('error', 'El video quedó guardado, pero no se pudo generar la URL para reproducirlo');
    } else if (draft.media_type === 'image' && draft.image_path && !draft.image_url) {
      toast('error', 'La imagen quedó guardada, pero no se pudo generar la URL para verla');
    } else {
      toast('success', 'Portada guardada');
    }
  } catch (err) {
    toast('error', err.message || 'No se pudo guardar la portada');
  } finally {
    busy = false;
    setLoading(btn, false);
  }
}

function bindForm(form) {
  const bind = (selector, apply) => {
    const el = form.querySelector(selector);
    if (!el) return;
    el.addEventListener('input', () => {
      apply(el.value);
      updatePreview();
    });
  };

  bind('#hero-title', (value) => { draft.title = value; });
  bind('#hero-description', (value) => { draft.description = value; });
  bind('#hero-start', (value) => { draft.starts_at = fromLocalInput(value); });
  bind('#hero-end', (value) => { draft.ends_at = fromLocalInput(value); });

  const published = form.querySelector('#hero-published');
  published.addEventListener('change', () => {
    draft.is_published = published.checked;
    updatePreview();
  });

  const productSelect = form.querySelector('#hero-product');
  productSelect.addEventListener('change', () => {
    draft.product_slug = productSelect.value || null;
    applyMode();
    updatePreview();
  });

  // Galería de la portada: subir (con arrastrar y soltar) y
  // añadir el contenido anterior sin reemplazar nada.
  const gzInputImages = form.querySelector('#hero-gz-input-images');
  const gzInputVideo = form.querySelector('#hero-gz-input-video');
  const gzDrop = form.querySelector('#hero-gz-drop');

  form.querySelector('#hero-gz-images').addEventListener('click', () => gzInputImages.click());
  form.querySelector('#hero-gz-video').addEventListener('click', () => gzInputVideo.click());
  gzInputImages.addEventListener('change', () => {
    uploadFiles(gzInputImages.files);
    gzInputImages.value = '';
  });
  gzInputVideo.addEventListener('change', () => {
    uploadFiles(gzInputVideo.files);
    gzInputVideo.value = '';
  });
  if (gzDrop) {
    gzDrop.addEventListener('dragover', (event) => {
      event.preventDefault();
      gzDrop.classList.add('dragover');
    });
    gzDrop.addEventListener('dragleave', () => gzDrop.classList.remove('dragover'));
    gzDrop.addEventListener('drop', (event) => {
      event.preventDefault();
      gzDrop.classList.remove('dragover');
      uploadFiles(event.dataTransfer.files);
    });
  }

  const legacyBtn = form.querySelector('#hero-legacy-import');
  if (legacyBtn) legacyBtn.addEventListener('click', importLegacy);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    save();
  });
}

function formHtml() {
  const status = statusOf(draft);
  return `
    <div class="view-header">
      <div>
        <h3>Portada principal</h3>
        <p>Contenido que se muestra al ingresar al sitio.</p>
      </div>
      <div class="view-header-actions">
        <a class="btn btn-outline" href="/" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> Ver sitio</a>
        <button type="submit" form="hero-form" class="btn btn-primary" id="hero-save"><span class="btn-label">Guardar cambios</span><i class="fa-solid fa-spinner fa-spin btn-spinner" hidden></i></button>
      </div>
    </div>

    <div class="hero-editor">
      <form id="hero-form" class="hero-form" novalidate>
        <div class="switch-field">
          <span>Publicar en la portada
            <small>Solo se muestra al estar activa y dentro de las fechas configuradas.</small>
          </span>
          <label class="switch">
            <input type="checkbox" id="hero-published" ${draft.is_published ? 'checked' : ''}>
            <span class="track"></span>
          </label>
        </div>

        <div class="field">
          <label for="hero-product">Producto destacado</label>
          <select id="hero-product">
            <option value="" ${draft.product_slug ? '' : 'selected'}>Campaña sin producto</option>
            ${products.map((p) => `<option value="${escapeHtml(p.slug)}" ${draft.product_slug === p.slug ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
            ${
              draft.product_slug && !products.some((p) => p.slug === draft.product_slug)
                ? `<option value="${escapeHtml(draft.product_slug)}" selected>${escapeHtml(draft.product_slug)} (no disponible)</option>`
                : ''
            }
          </select>
          <span class="muted" id="hero-mode-note"></span>
        </div>

        <div class="field">
          <label for="hero-title">Título principal *</label>
          <input type="text" id="hero-title" maxlength="120" value="${escapeHtml(draft.title)}" placeholder="Detalles hechos para recordar">
          <span class="muted">Máximo 120 caracteres.</span>
        </div>

        <div class="field">
          <label for="hero-description">Texto descriptivo</label>
          <textarea id="hero-description" rows="4" maxlength="500" placeholder="Transformamos tus ideas en creaciones únicas.">${escapeHtml(draft.description)}</textarea>
          <span class="muted">Máximo 500 caracteres.</span>
        </div>

        <div id="hero-campaign-fields">
        <div class="field">
          <label>Galería de la portada</label>
          <div class="gallery-dropzone" id="hero-gz-drop" role="group" aria-label="Zona de carga: arrastra fotos o videos de la portada">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <strong>Arrastra tus archivos aquí</strong>
            <div class="gallery-actions">
              <button type="button" class="btn btn-primary btn-sm" id="hero-gz-images">
                <i class="fa-solid fa-image"></i> Subir fotografías
              </button>
              <button type="button" class="btn btn-secondary btn-sm" id="hero-gz-video">
                <i class="fa-solid fa-video"></i> Subir video
              </button>
            </div>
            <span class="muted">Fotos: JPG, PNG, WEBP, GIF hasta 10 MB · Videos: MP4, WEBM, MOV hasta 100 MB</span>
            <input type="file" id="hero-gz-input-images" accept=".jpg,.jpeg,.png,.webp,.gif,image/*" multiple hidden>
            <input type="file" id="hero-gz-input-video" accept=".mp4,.webm,.mov,video/*" multiple hidden>
          </div>
          <div class="upload-progress" id="hero-gz-progress" hidden>
            <div class="progress-label"><span id="hero-gz-label">Subiendo…</span><span id="hero-gz-pct">0%</span></div>
            <div class="progress-track"><div class="progress-fill" id="hero-gz-fill"></div></div>
          </div>
          <div id="hero-gz-grid"></div>
          <div class="field" id="hero-legacy" hidden>
            <span class="muted">Tienes contenido anterior de la portada que aún no está en la galería.</span>
            <button type="button" class="btn btn-outline btn-sm" id="hero-legacy-import"><i class="fa-solid fa-plus"></i> Añadirlo a la galería</button>
          </div>
          <span class="muted">Los archivos se añaden sin reemplazar los anteriores. Usa ★ para elegir cuál es el primero (el que se muestra al ingresar) y ← → para reordenar; la papelera elimina un archivo.</span>
        </div>
        </div>

        <div class="field-grid">
          <div class="field">
            <label for="hero-start">Fecha de inicio</label>
            <input type="datetime-local" id="hero-start" value="${toLocalInput(draft.starts_at)}">
            <span class="muted">Vacío = publicar sin fecha de inicio.</span>
          </div>
          <div class="field">
            <label for="hero-end">Fecha de finalización</label>
            <input type="datetime-local" id="hero-end" value="${toLocalInput(draft.ends_at)}">
            <span class="muted">Vacío = sin fecha de cierre.</span>
          </div>
        </div>
      </form>

      <aside class="hero-preview-panel">
        <div class="hero-preview-head">
          <span class="hero-preview-title">Vista previa</span>
          <span class="badge ${status.cls}" id="hero-status-badge">${status.label}</span>
        </div>
        <div class="hero-preview" id="hero-preview"></div>
        <p class="muted">Así verán la portada las visitas mientras esté publicada y vigente.</p>
      </aside>
    </div>`;
}

export async function renderHero(containerEl) {
  container = containerEl;
  container.innerHTML = loadingState('Cargando la portada…');
  try {
    const [data, listData] = await Promise.all([
      api('GET', '/api/hero'),
      api('GET', '/api/products').catch(() => ({ products: [] })),
    ]);
    hero = data.hero;
    draft = toDraft(hero);
    products = (listData.products || []).filter((p) => p.is_published);
    // Galería propia de la portada: se carga tras montar el
    // formulario (rejilla + vista previa + importación del
    // contenido anterior). Si falla, loadGallery muestra el aviso.
    gallery = [];
    galleryBlocked = false;
    container.innerHTML = formHtml();
    bindForm(container.querySelector('#hero-form'));
    applyMode();
    updatePreview();
    await loadGallery();
  } catch (err) {
    container.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <strong>No se pudo cargar la portada</strong>
      <span>${escapeHtml(err?.message || 'Error desconocido')}</span>
    </div>`;
    toast('error', err?.message || 'No se pudo cargar la portada');
  }
}
