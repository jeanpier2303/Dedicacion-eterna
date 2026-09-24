// ============================================================
// featured.js — Galería del producto destacado (Vela Personalizada)
// ------------------------------------------------------------
// Un solo producto (id: vela-personalizada) con 3 vistas.
// Reutiliza:
//  - window.PRODUCTS (js/products.js) como única fuente de datos
//  - window.WhatsApp.productLink (js/whatsapp.js) para el CTA
//  - window.Catalog.openLightbox / openProductGallery (js/catalog.js)
// Sin duplicar productos ni crear un segundo lightbox.
// ============================================================
(function () {
    'use strict';

    var PRODUCT_ID = 'vela-personalizada';
    var reduceMotion = false;
    try {
        reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}

    function findProduct() {
        if (window.Catalog && typeof window.Catalog.findProduct === 'function') {
            return window.Catalog.findProduct(PRODUCT_ID);
        }
        var list = window.PRODUCTS || [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === PRODUCT_ID) return list[i];
        }
        return null;
    }

    function init() {
        var section = document.getElementById('tendencia');
        if (!section) return;
        var product = findProduct();
        if (!product) return;

        var images = (product.images && product.images.length) ? product.images : [product.image];
        var main = document.getElementById('trend-main');
        var img = document.getElementById('trend-image');
        var counter = document.getElementById('trend-counter');
        var prev = document.getElementById('trend-prev');
        var next = document.getElementById('trend-next');
        var zoom = document.getElementById('trend-zoom');
        var thumbs = Array.prototype.slice.call(section.querySelectorAll('.trend-thumb'));
        var wa = document.getElementById('trend-wa');
        var details = document.getElementById('trend-details');
        if (!img || !counter || !prev || !next || !zoom) return;

        var current = 0;

        function render(navigate) {
            current = (current + images.length) % images.length;
            var apply = function () {
                img.setAttribute('src', images[current]);
                img.setAttribute('alt', product.name || 'Vela personalizada');
                counter.textContent = (current + 1) + ' / ' + images.length;
                thumbs.forEach(function (t, i) {
                    var active = i === current;
                    t.classList.toggle('is-active', active);
                    t.setAttribute('aria-current', active ? 'true' : 'false');
                });
                img.classList.remove('is-fading');
            };
            if (navigate && !reduceMotion) {
                img.classList.add('is-fading');
                setTimeout(apply, 120);
            } else {
                apply();
            }
        }

        function go(delta) {
            current = (current + delta + images.length) % images.length;
            render(true);
        }

        prev.addEventListener('click', function () { go(-1); });
        next.addEventListener('click', function () { go(1); });

        thumbs.forEach(function (t) {
            t.addEventListener('click', function () {
                var idx = parseInt(t.getAttribute('data-index'), 10) || 0;
                if (idx !== current) {
                    current = idx;
                    render(true);
                }
            });
        });

        // Teclado cuando el foco está en la galería.
        main.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') go(-1);
            else if (e.key === 'ArrowRight') go(1);
        });

        // Swipe en móvil.
        var startX = null;
        main.addEventListener('touchstart', function (e) {
            if (e.touches && e.touches.length === 1) startX = e.touches[0].clientX;
        }, { passive: true });
        main.addEventListener('touchend', function (e) {
            if (startX === null) return;
            var dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 30) { dx > 0 ? go(-1) : go(1); }
            startX = null;
        }, { passive: true });

        // Ampliar: reutiliza el lightbox único con las 3 vistas.
        zoom.addEventListener('click', function () {
            if (window.Catalog && typeof window.Catalog.openProductGallery === 'function') {
                window.Catalog.openProductGallery(product, current);
            } else if (window.Catalog && typeof window.Catalog.openLightbox === 'function') {
                var items = images.map(function (src) {
                    return { image: src, title: product.name, description: product.shortDescription || '' };
                });
                window.Catalog.openLightbox(items, current);
            }
        });

        // CTA WhatsApp con el sistema existente (573245778318).
        if (wa && window.WhatsApp) {
            wa.setAttribute('href', window.WhatsApp.productLink(product));
        }

        // Ver detalles: reutiliza el modal existente.
        if (details && window.Catalog) {
            details.addEventListener('click', function () {
                window.Catalog.openProductDetail(PRODUCT_ID);
            });
        }

        render(false);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
