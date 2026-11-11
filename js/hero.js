// ============================================================
// hero.js — Presentación administrada del hero superior (#tendencia)
// ------------------------------------------------------------
// Aplica la portada publicada (/api/catalog/hero, gestionada desde
// el panel) sobre la sección de tendencia, el hero superior del
// inicio. Nunca toca la sección de marca inferior (#inicio):
//  - Con producto destacado: el panel elige el producto y se
//    conservan su galería, descripción y botones (WhatsApp +
//    Ver detalles) vía window.TrendProduct (js/featured.js).
//  - Campaña sin producto: galería propia de la portada
//    (home_hero_media: fotos y videos con su orden) en la
//    columna izquierda vía window.TrendGallery (js/trend-gallery.js);
//    en la derecha el título y la descripción de la campaña y los
//    dos botones permanentes (WhatsApp general + Ver detalles).
//    Si la galería está vacía se muestra el contenido anterior
//    (image_path / video_path de home_hero) como respaldo.
// La sección es de dos columnas: título y descripción son
// estáticos en el HTML (.trend-intro) y solo se actualizan aquí;
// los botones #trend-wa / #trend-details también son estáticos y
// cada modo reasigna href/onclick (nunca addEventListener) para
// alternar de modo sin acumular oyentes.
// Si no hay portada publicada se conserva el contenido
// predeterminado actual (js/featured.js lo mantiene intacto).
// ============================================================
(function () {
    'use strict';

    var API_HERO = '/api/catalog/hero';
    var PRODUCT_WAIT_MS = 6000;

    function fetchJson(url) {
        if (typeof fetch !== 'function') return Promise.resolve(null);
        return fetch(url, { headers: { Accept: 'application/json' } })
            .then(function (res) { return res.ok ? res.json() : null; })
            .catch(function () { return null; });
    }

    function getSection() {
        return document.getElementById('tendencia');
    }

    function setHeader(section, hero) {
        // Sincronización exacta con el panel: si la administradora
        // deja vacía la descripción, el sitio no conserva el texto
        // anterior.
        var title = section.querySelector('.trend-title');
        if (title) title.textContent = hero.title || '';
        var subtitle = section.querySelector('.trend-subtitle');
        if (subtitle) subtitle.textContent = hero.description || '';
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function findInCatalog(slug) {
        if (window.Catalog && typeof window.Catalog.findProduct === 'function') {
            return window.Catalog.findProduct(slug);
        }
        var list = window.PRODUCTS || [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === slug) return list[i];
        }
        return null;
    }

    // Espera a que el catálogo (js/catalog.js) sincronice el
    // producto elegido en el panel; degrada a campaña si no existe
    // (producto oculto o borrado).
    function waitForProduct(slug, done) {
        var start = Date.now();
        (function check() {
            var product = findInCatalog(slug);
            if (product) return done(product);
            if (Date.now() - start >= PRODUCT_WAIT_MS) return done(null);
            setTimeout(check, 200);
        })();
    }

    // ---------- Galería de la campaña (columna izquierda) ----------

    // Respaldo neutro: nunca reutiliza imágenes anteriores.
    function placeholderHtml(kind) {
        var isVideo = kind === 'video';
        return '<div class="trend-main" id="trend-main">' +
            '<div class="trend-media-placeholder">' +
                '<i class="fas ' + (isVideo ? 'fa-film' : 'fa-image') + '" aria-hidden="true"></i>' +
                '<span>' + (isVideo ? 'Video no disponible' : 'Sin contenido visual') + '</span>' +
            '</div>' +
        '</div>';
    }

    // Medios de la portada en el orden de la galería del panel
    // (display_order y, a igualdad, fecha de carga). Si la
    // galería propia está vacía se usa el contenido anterior
    // (image_path / video_path) como respaldo.
    function campaignEntries(hero) {
        var rows = Array.isArray(hero.media)
            ? hero.media.filter(function (row) { return row && row.signed_url; })
            : [];
        rows.sort(function (a, b) {
            var order = (a.display_order || 0) - (b.display_order || 0);
            if (order) return order;
            var createdA = String(a.created_at || '');
            var createdB = String(b.created_at || '');
            return createdA < createdB ? -1 : createdA > createdB ? 1 : 0;
        });
        var entries = rows.map(function (row) {
            return {
                type: row.media_type === 'video' ? 'video' : 'image',
                src: row.signed_url
            };
        });
        if (entries.length) return entries;
        if (hero.media_type === 'video' && hero.video_url) return [{ type: 'video', src: hero.video_url }];
        if (hero.image_url) return [{ type: 'image', src: hero.image_url }];
        return [];
    }

    // Ítems del lightbox único para la galería de la portada.
    function lightboxItems(hero, entries) {
        return entries.map(function (entry) {
            var item = { title: hero.title || '', description: hero.description || '' };
            if (entry.type === 'video') {
                item.video = entry.src;
                item.image = '';
            } else {
                item.image = entry.src;
            }
            return item;
        });
    }

    // ---------- Vista de detalles de la campaña ----------

    function openCampaignDetail(hero) {
        var entries = campaignEntries(hero);

        // Con medios: reutiliza el lightbox único de la página (la
        // misma vista que al ampliar un medio de la galería) con la
        // información de la campaña. Los videos abren con controles.
        if (entries.length && window.Catalog && typeof window.Catalog.openLightbox === 'function') {
            window.Catalog.openLightbox(lightboxItems(hero, entries), 0);
            return;
        }

        // Campaña sin medios: vista propia con el mismo aspecto
        // del lightbox y la información.
        openCampaignOverlay(hero, '');
    }

    function openCampaignOverlay(hero, videoSrc) {
        if (document.querySelector('.trend-campaign-overlay')) return;
        var title = hero.title || 'Campaña';
        var overlay = document.createElement('div');
        overlay.className = 'lightbox trend-campaign-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', title);
        overlay.innerHTML =
            '<div class="lightbox-content">' +
                '<button type="button" class="lightbox-close" aria-label="Cerrar vista ampliada">&times;</button>' +
                (videoSrc
                    ? '<div class="lightbox-image-container">' +
                        '<video src="' + escapeHtml(videoSrc) + '" muted loop autoplay playsinline preload="auto"></video>' +
                      '</div>'
                    : '') +
                '<div class="lightbox-info">' +
                    '<h3>' + escapeHtml(title) + '</h3>' +
                    (hero.description ? '<p>' + escapeHtml(hero.description) + '</p>' : '') +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        var closed = false;
        var onKey = function (e) { if (e.key === 'Escape') close(); };
        var close = function () {
            if (closed) return;
            closed = true;
            document.removeEventListener('keydown', onKey);
            overlay.classList.add('fade-out');
            setTimeout(function () {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                // No devolver el scroll si otro lightbox o el modal
                // de producto siguen abiertos debajo.
                if (!document.querySelector('.lightbox') && !document.querySelector('.modal-overlay.active')) {
                    document.body.style.overflow = 'auto';
                }
            }, 300);
        };

        overlay.querySelector('.lightbox-close').addEventListener('click', close);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        document.addEventListener('keydown', onKey);
        overlay.querySelector('.lightbox-close').focus();

        var video = overlay.querySelector('video');
        if (video) {
            var play = video.play();
            if (play && typeof play.catch === 'function') play.catch(function () {});
        }
    }

    // ---------- Render por modo ----------

    function renderCampaign(section, hero) {
        var media = section.querySelector('.trend-media');
        if (!media) return;

        // Galería propia de la portada (fotos y videos con su
        // orden) con el mismo patrón de la galería de productos.
        // Si la galería está vacía se muestra el contenido anterior
        // como respaldo o, en su defecto, un respaldo neutro.
        var entries = campaignEntries(hero);
        if (entries.length) {
            if (window.TrendGallery && typeof window.TrendGallery.render === 'function') {
                window.TrendGallery.render(media, entries, {
                    label: hero.title || 'Portada',
                    items: lightboxItems(hero, entries)
                });
            }
        } else {
            media.innerHTML = placeholderHtml(hero.media_type === 'video' ? 'video' : 'image');
        }

        // Sin producto: el bloque de detalle (producto) queda vacío.
        var detail = section.querySelector('#trend-detail');
        if (detail) {
            detail.innerHTML = '';
            detail.hidden = true;
        }

        // Botones permanentes: siempre visibles en modo campaña.
        var wa = section.querySelector('#trend-wa');
        if (wa && window.WhatsApp) {
            wa.setAttribute('href', window.WhatsApp.generalLink());
        }
        var details = section.querySelector('#trend-details');
        if (details) {
            details.onclick = function () { openCampaignDetail(hero); };
        }

        // Nota de ayuda solo cuando hay medios que ampliar.
        var note = section.querySelector('#trend-note');
        if (note) {
            if (entries.length) {
                note.hidden = false;
                note.textContent = 'Toca el medio para ampliar · ' +
                    (entries.length === 1 ? '1 vista de la portada' : entries.length + ' vistas de la portada');
            } else {
                note.hidden = true;
            }
        }
    }

    function renderProduct(section, hero, slug) {
        waitForProduct(slug, function (product) {
            if (!product || !window.TrendProduct || typeof window.TrendProduct.render !== 'function') {
                renderCampaign(section, hero);
                return;
            }
            window.TrendProduct.render(product);
        });
    }

    var lastHero = null;

    function applyHero(section, hero) {
        lastHero = hero;
        // Marca la sección como gestionada por la portada para que
        // js/featured.js no la pise cuando el catálogo sincronice.
        section.setAttribute('data-hero-managed', '1');
        setHeader(section, hero);
        var slug = typeof hero.product_slug === 'string' ? hero.product_slug.trim() : '';
        if (slug) {
            renderProduct(section, hero, slug);
        } else {
            renderCampaign(section, hero);
        }
    }

    function init() {
        var section = getSection();
        if (!section) return;
        fetchJson(API_HERO).then(function (data) {
            var hero = data && data.hero;
            if (!hero) return;
            applyHero(section, hero);
        });
    }

    // Si el catálogo termina de sincronizar con el panel después de
    // la portada, la galería del producto destacado se vuelve a
    // renderizar con sus medios (fotos y videos) ya disponibles.
    document.addEventListener('catalog:synced', function () {
        if (!lastHero) return;
        var slug = typeof lastHero.product_slug === 'string' ? lastHero.product_slug.trim() : '';
        if (!slug) return;
        var section = getSection();
        if (!section) return;
        renderProduct(section, lastHero, slug);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
