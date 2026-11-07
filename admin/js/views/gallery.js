import { api, uploadToSignedUrl } from '../api.js';
import {
  escapeHtml,
  openModal,
  confirmDialog,
  toast,
  loadingState,
} from '../ui.js';

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const VIDEO_EXT = ['mp4', 'webm', 'mov'];
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;

function extensionOf(filename) {
  const index = filename.lastIndexOf('.');
  return index >= 0 ? filename.slice(index + 1).toLowerCase() : '';
}

function isVideoFile(file) {
  return file.type.startsWith('video/') || VIDEO_EXT.includes(extensionOf(file.name));
}

function validateFile(file) {
  const video = isVideoFile(file);
  const ext = extensionOf(file.name);
  const allowed = video ? VIDEO_EXT : IMAGE_EXT;
  if (!allowed.includes(ext)) return `formato .${ext || '(sin extensión)'} no permitido`;
  const max = video ? MAX_VIDEO : MAX_IMAGE;
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

export function openGallery(product) {
  return new Promise((resolve) => {
    let media = [];
    let uploading = false;
    let closed = false;

    const body = document.createElement('div');
    body.innerHTML = `
      <div class="gallery-dropzone" id="gz-drop" role="group" aria-label="Zona de carga: arrastra fotos o videos">
        <i class="fa-solid fa-cloud-arrow-up"></i>
        <strong>Arrastra tus archivos aquí</strong>
        <div class="gallery-actions">
          <button type="button" class="btn btn-primary btn-sm" id="gz-images">
            <i class="fa-solid fa-image"></i> Subir fotografías
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="gz-video">
            <i class="fa-solid fa-video"></i> Subir video
          </button>
        </div>
        <span class="muted">Fotos: JPG, PNG, WEBP, GIF hasta 10 MB · Videos: MP4, WEBM, MOV hasta 100 MB</span>
        <input type="file" id="gz-input-images" accept=".jpg,.jpeg,.png,.webp,.gif,image/*" multiple hidden>
        <input type="file" id="gz-input-video" accept=".mp4,.webm,.mov,video/*" hidden>
      </div>
      <div class="upload-progress" id="gz-progress" hidden>
        <div class="progress-label"><span id="gz-progress-label">Subiendo…</span><span id="gz-progress-pct">0%</span></div>
        <div class="progress-track"><div class="progress-fill" id="gz-progress-fill"></div></div>
      </div>
      <div id="gz-grid">${loadingState()}</div>`;

    const grid = body.querySelector('#gz-grid');
    const drop = body.querySelector('#gz-drop');
    const progress = body.querySelector('#gz-progress');
    const fill = body.querySelector('#gz-progress-fill');
    const pct = body.querySelector('#gz-progress-pct');
    const label = body.querySelector('#gz-progress-label');
    const inputImages = body.querySelector('#gz-input-images');
    const inputVideo = body.querySelector('#gz-input-video');

    function setProgress(done, total, text) {
      const value = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
      fill.style.width = value + '%';
      pct.textContent = value + '%';
      if (text) label.textContent = text;
    }

    function renderGrid() {
      if (closed) return;
      const sorted = [...media].sort((a, b) => a.display_order - b.display_order);
      if (!sorted.length) {
        grid.innerHTML = `<div class="empty-state"><i class="fa-regular fa-images"></i>
          <strong>Sin archivos aún</strong><span>Sube las primeras fotos o el video del producto</span></div>`;
        return;
      }
      grid.innerHTML = `<div class="gallery-grid">${sorted
        .map((item, index) => {
          const preview =
            item.media_type === 'video'
              ? `<video src="${escapeHtml(item.signed_url)}" preload="metadata" muted playsinline></video>
                 <span class="video-icon"><i class="fa-solid fa-circle-play"></i></span>`
              : `<img src="${escapeHtml(item.signed_url)}" alt="${escapeHtml(item.alt_text || '')}" loading="lazy">`;
          return `<div class="gallery-item ${item.is_primary ? 'is-primary' : ''}" data-id="${item.id}">
          ${item.is_primary ? '<span class="primary-flag">Principal</span>' : ''}
          <div class="gallery-media">${preview}</div>
          <div class="gallery-item-body">
            <span class="name" title="${escapeHtml(item.alt_text || '')}">${escapeHtml(item.alt_text || (item.media_type === 'video' ? 'Video' : 'Foto') + ' ' + (index + 1))}</span>
            <div class="gallery-item-actions">
              <button class="icon-btn" data-gz="primary" aria-label="Hacer imagen principal" ${item.media_type === 'image' && !item.is_primary ? '' : 'disabled'}>
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
          btn.addEventListener('click', () => handleItemAction(btn.dataset.gz, item, btn));
        });
      });
    }

    async function reload() {
      const data = await api('GET', `/api/products/${product.id}/media`);
      media = data.media;
      renderGrid();
    }

    async function handleItemAction(action, item, btn) {
      if (action === 'primary') {
        btn.disabled = true;
        try {
          await api('PATCH', `/api/media/${item.id}`, { is_primary: true });
          toast('success', 'Imagen principal actualizada');
          await reload();
        } catch (err) {
          toast('error', err.message);
          btn.disabled = false;
        }
        return;
      }
      if (action === 'left' || action === 'right') {
        const sorted = [...media].sort((a, b) => a.display_order - b.display_order);
        const index = sorted.findIndex((m) => m.id === item.id);
        const other = sorted[index + (action === 'left' ? -1 : 1)];
        if (!other) return;
        btn.disabled = true;
        try {
          await api('PATCH', `/api/media/${item.id}`, { display_order: other.display_order });
          await api('PATCH', `/api/media/${other.id}`, { display_order: item.display_order });
          await reload();
        } catch (err) {
          toast('error', err.message);
          btn.disabled = false;
        }
        return;
      }
      if (action === 'delete') {
        const ok = await confirmDialog('¿Eliminar este archivo? Se borra también de Storage.', {
          danger: true,
          confirmText: 'Eliminar',
        });
        if (!ok) return;
        btn.disabled = true;
        try {
          await api('DELETE', `/api/media/${item.id}`);
          toast('success', 'Archivo eliminado');
          await reload();
        } catch (err) {
          toast('error', err.message);
          btn.disabled = false;
        }
      }
    }

    async function uploadFiles(fileList) {
      if (uploading) return;
      const files = [...fileList];
      if (!files.length) return;
      const valid = [];
      for (const file of files) {
        const error = validateFile(file);
        if (error) toast('error', `${file.name}: ${error}`);
        else valid.push(file);
      }
      if (!valid.length) return;

      uploading = true;
      drop.querySelectorAll('button').forEach((b) => (b.disabled = true));
      progress.hidden = false;
      const totalBytes = valid.reduce((sum, file) => sum + file.size, 0);
      let doneBytes = 0;
      let hasImage = media.some((m) => m.media_type === 'image');
      let uploaded = 0;

      try {
        for (const file of valid) {
          const mediaType = isVideoFile(file) ? 'video' : 'image';
          setProgress(doneBytes, totalBytes, `Subiendo ${file.name}…`);
          const upload = await api('POST', `/api/products/${product.id}/upload-url`, {
            filename: file.name,
            media_type: mediaType,
            size: file.size,
          });
          await uploadToSignedUrl(upload.signed_url, file, (filePct) => {
            setProgress(doneBytes + (file.size * filePct) / 100, totalBytes, `Subiendo ${file.name}…`);
          });
          await api('POST', `/api/products/${product.id}/media`, {
            storage_path: upload.path,
            media_type: mediaType,
            alt_text: altFromFilename(file.name),
            is_primary: mediaType === 'image' && !hasImage,
          });
          if (mediaType === 'image') hasImage = true;
          doneBytes += file.size;
          uploaded += 1;
          setProgress(doneBytes, totalBytes, `Subiendo ${file.name}…`);
        }
        await reload();
        toast('success', `${uploaded} archivo(s) subido(s) correctamente`);
      } catch (err) {
        toast('error', err.message || 'La subida falló');
        try {
          await reload();
        } catch {}
      } finally {
        uploading = false;
        drop.querySelectorAll('button').forEach((b) => (b.disabled = false));
        progress.hidden = true;
        setProgress(0, 1);
      }
    }

    body.querySelector('#gz-images').addEventListener('click', () => inputImages.click());
    body.querySelector('#gz-video').addEventListener('click', () => inputVideo.click());
    inputImages.addEventListener('change', () => {
      uploadFiles(inputImages.files);
      inputImages.value = '';
    });
    inputVideo.addEventListener('change', () => {
      uploadFiles(inputVideo.files);
      inputVideo.value = '';
    });
    drop.addEventListener('dragover', (event) => {
      event.preventDefault();
      drop.classList.add('dragover');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', (event) => {
      event.preventDefault();
      drop.classList.remove('dragover');
      uploadFiles(event.dataTransfer.files);
    });

    const modal = openModal({
      title: `Galería: ${product.name}`,
      body,
      size: 'modal-xl',
      onClose: () => {
        closed = true;
        resolve();
      },
    });

    reload().catch((err) => {
      if (!closed) {
        grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i>
          <strong>No se pudo cargar la galería</strong><span>${escapeHtml(err.message)}</span></div>`;
      }
    });
  });
}
