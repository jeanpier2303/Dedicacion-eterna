// ============================================================
// trend-gallery.js — Galería reutilizable de #tendencia
// ------------------------------------------------------------
// Un único medio principal grande a la izquierda y, debajo, la
// fila de miniaturas, con flechas y contador: exactamente el
// mismo patrón visual de la galería de productos. Fotos y videos
// comparten el marco; los videos llevan controles (pantalla
// completa incluida) y se amplían al pulsarlos.
// Lo usan:
//  - js/featured.js → galería del producto destacado
//  - js/hero.js     → galería propia de la portada (home_hero_media)
// Reutiliza el lightbox único de la página
// (window.Catalog.openLightbox, js/catalog.js): sin visores nuevos.
// ============================================================
window.TrendGallery = (function () {
    'use strict';

    var reduceMotion = false;
    try {
        reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}

    // Altura aproximada de los controles nativos del <video>
    // (pausa, barra de tiempo, volumen, pantalla completa): ese
    // clic es del reproductor y no debe abrir la vista ampliada.
    var CONTROLS_ZONE = 60;

    function escapeAttr(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Medio en el marco grande: la foto conserva el botón de
    // ampliar completo; el video ocupa exactamente el mismo marco
    // con sus controles y un botón de ampliar circular (misma
    // estética que las flechas, arriba a la izquierda).
    function mainHtml(entry, label) {
        var safe = escapeAttr(label);
        if (entry.type === 'video') {
            return '<video id="trend-video" class="trend-video" src="' + escapeAttr(entry.src) + '"' +
                    ' controls playsinline muted loop' + (reduceMotion ? '' : ' autoplay') +
                    ' preload="auto" aria-label="Video: ' + safe + '"></video>' +
                '<button type="button" class="trend-arrow trend-expand" id="trend-zoom"' +
                    ' aria-label="Ampliar video: ' + safe + '">' +
                    '<i class="fas fa-search-plus" aria-hidden="true"></i>' +
                '</button>';
        }
        return '<button type="button" class="trend-zoom" id="trend-zoom" aria-label="Ampliar imagen: ' + safe + '">' +
            '<img src="' + escapeAttr(entry.src) + '" alt="' + safe + '" fetchpriority="high">' +
            '<span class="zoom-hint" aria-hidden="true"><i class="fas fa-search-plus"></i></span>' +
        '</button>';
    }

    function galleryHtml(entries, label) {
        var safe = escapeAttr(label);
        var single = entries.length <= 1;
        var hidden = single ? ' style="display:none"' : '';
        // Con video el contador sube a la esquina superior para no
        // tapar los controles nativos (pantalla completa, etc.).
        var counterClass = 'trend-counter' + (entries[0].type === 'video' ? ' trend-counter-top' : '');
        var html =
            '<div class="trend-main" id="trend-main">' +
                '<div class="trend-media-layer" id="trend-media-layer">' + mainHtml(entries[0], label) + '</div>' +
                '<span class="' + counterClass + '" id="trend-counter" aria-live="polite"' + hidden + '>1 / ' + entries.length + '</span>' +
                '<button class="trend-arrow trend-prev" id="trend-prev" aria-label="Imagen anterior"' + hidden + '>' +
                    '<i class="fas fa-chevron-left" aria-hidden="true"></i>' +
                '</button>' +
                '<button class="trend-arrow trend-next" id="trend-next" aria-label="Imagen siguiente"' + hidden + '>' +
                    '<i class="fas fa-chevron-right" aria-hidden="true"></i>' +
                '</button>' +
            '</div>' +
            '<div class="trend-thumbs" role="group" aria-label="Vistas de ' + safe + '"' + hidden + '>';
        entries.forEach(function (entry, i) {
            // La miniatura del video muestra su primer fotograma.
            var inner = entry.type === 'video'
                ? '<video src="' + escapeAttr(entry.src) + '" muted playsinline preload="metadata" aria-hidden="true"></video>'
                : '<img src="' + escapeAttr(entry.src) + '" alt="" loading="lazy">';
            html +=
                '<button type="button" class="trend-thumb' + (i === 0 ? ' is-active' : '') + '" data-index="' + i +
                    '" aria-label="Ver vista ' + (i + 1) + ' de ' + safe + '" aria-current="' + (i === 0) + '">' +
                    inner +
                '</button>';
        });
        html += '</div>';
        return html;
    }

    function bind(container, entries, label, items) {
        var main = container.querySelector('#trend-main');
        var layer = container.querySelector('#trend-media-layer');
        var counter = container.querySelector('#trend-counter');
        var prev = container.querySelector('#trend-prev');
        var next = container.querySelector('#trend-next');
        var thumbs = Array.prototype.slice.call(container.querySelectorAll('.trend-thumb'));
        if (!main || !layer || !counter || !prev || !next) return;

        var current = 0;
        var renderToken = 0;

        // Vista ampliada: reutiliza el lightbox único de la página
        // (fotos y videos con controles y pantalla completa). El
        // video del marco grande se detiene al abrir.
        function openExpanded() {
            var video = layer.querySelector('video');
            if (video) video.pause();
            if (window.Catalog && typeof window.Catalog.openLightbox === 'function') {
                window.Catalog.openLightbox(items, current);
            }
        }

        // Pone el medio elegido en el marco grande y detiene el
        // video que estuviera reproduciéndose. Una foto ya presente
        // solo cambia de origen para conservar el fundido actual.
        function setMainMedia(entry) {
            var img = layer.querySelector('img');
            var video = layer.querySelector('video');
            var keepImage = entry.type === 'image' && !!img;
            var keepVideo = entry.type === 'video' && !!video && video.getAttribute('src') === entry.src;
            if (video && !keepVideo) video.pause();
            if (keepImage) {
                img.setAttribute('src', entry.src);
                img.setAttribute('alt', label || '');
                img.classList.remove('is-fading');
            } else if (!keepVideo) {
                layer.innerHTML = mainHtml(entry, label);
            }
            counter.classList.toggle('trend-counter-top', entry.type === 'video');
        }

        function renderState(navigate) {
            current = (current + entries.length) % entries.length;
            var index = current;
            var entry = entries[index];
            var fade = navigate && !reduceMotion && entry.type === 'image' && !!layer.querySelector('img');
            var token = ++renderToken;
            var apply = function () {
                if (token !== renderToken) return;
                setMainMedia(entry);
                counter.textContent = (index + 1) + ' / ' + entries.length;
                thumbs.forEach(function (t, i) {
                    var active = i === index;
                    t.classList.toggle('is-active', active);
                    t.setAttribute('aria-current', active ? 'true' : 'false');
                });
            };
            if (fade) {
                layer.querySelector('img').classList.add('is-fading');
                setTimeout(apply, 120);
            } else {
                apply();
            }
        }

        function go(delta) {
            current = (current + delta + entries.length) % entries.length;
            renderState(true);
        }

        prev.addEventListener('click', function () { go(-1); });
        next.addEventListener('click', function () { go(1); });

        thumbs.forEach(function (t) {
            t.addEventListener('click', function () {
                var idx = parseInt(t.getAttribute('data-index'), 10) || 0;
                if (idx !== current) {
                    current = idx;
                    renderState(true);
                }
            });
        });

        // Ampliar y clic sobre el video, delegados en la capa
        // porque el medio se reconstruye al cambiar de miniatura.
        layer.addEventListener('click', function (e) {
            var target = e.target || {};
            // Botón de ampliar (foto o el circular del video).
            if (target.closest && target.closest('#trend-zoom')) {
                openExpanded();
                return;
            }
            // Clic sobre el cuerpo del video: abre el reproductor
            // ampliado. Los controles nativos (barra inferior) y el
            // modo pantalla completa quedan intactos.
            if (target.tagName !== 'VIDEO') return;
            if (document.fullscreenElement) return;
            var rect = target.getBoundingClientRect();
            if (rect.bottom - e.clientY <= CONTROLS_ZONE) return;
            openExpanded();
        });

        // Teclado cuando el foco está en la galería.
        main.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') go(-1);
            else if (e.key === 'ArrowRight') go(1);
        });

        // Swipe en móvil (nunca sobre un video: sus controles se
        // desplazan en horizontal).
        var startX = null;
        main.addEventListener('touchstart', function (e) {
            if (e.touches && e.touches.length === 1 && !(e.target.closest && e.target.closest('video'))) {
                startX = e.touches[0].clientX;
            } else {
                startX = null;
            }
        }, { passive: true });
        main.addEventListener('touchend', function (e) {
            if (startX === null) return;
            var dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 30) { dx > 0 ? go(-1) : go(1); }
            startX = null;
        }, { passive: true });

        renderState(false);
    }

    // Reemplaza el contenido del contenedor .trend-media por la
    // galería. options: { label, items } — items es la lista de
    // ítems del lightbox (misma longitud y orden que entries); si
    // no se pasa, se construye a partir de los medios.
    function render(container, entries, options) {
        if (!container || !entries || !entries.length) return;
        var opts = options || {};
        var label = opts.label || '';
        var items = opts.items;
        if (!Array.isArray(items) || items.length !== entries.length) {
            items = entries.map(function (entry) {
                var item = { title: label, description: '' };
                if (entry.type === 'video') {
                    item.video = entry.src;
                    item.image = '';
                } else {
                    item.image = entry.src;
                }
                return item;
            });
        }
        container.innerHTML = galleryHtml(entries, label);
        bind(container, entries, label, items);
    }

    return { render: render };
})();
