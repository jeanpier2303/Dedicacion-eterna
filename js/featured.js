// ============================================================
// featured.js — Galería del producto destacado (Vela Personalizada)
// ------------------------------------------------------------
// Renderiza la sección de tendencia (hero superior) para un
// producto concreto: galería (columna izquierda) y bloque de
// detalle (columna derecha), y enlaza los dos botones
// permanentes (WhatsApp + Ver detalles) del HTML.
// Reutiliza:
//  - window.PRODUCTS (js/products.js) como única fuente de datos
//  - window.WhatsApp.productLink (js/whatsapp.js) para el CTA
//  - window.Catalog.productMedia (orden de fotos y videos del panel)
//  - window.TrendGallery (js/trend-gallery.js) para la galería
//  - window.Catalog.openLightbox (js/catalog.js) para ampliar
// Por defecto muestra vela-personalizada (contenido predeterminado);
// js/hero.js reutiliza window.TrendProduct.render cuando hay una
// portada publicada desde el panel.
// Sin duplicar productos ni crear un segundo lightbox.
// ============================================================
(function () {
    'use strict';

    var PRODUCT_ID = 'vela-personalizada';

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

    function productImages(product) {
        return (product.images && product.images.length) ? product.images.slice() : [product.image];
    }

    function viewsLabel(count) {
        return count === 1 ? '1 vista del mismo producto' : count + ' vistas del mismo producto';
    }

    // Medios del producto para la galería: los del panel (fotos y
    // videos, en su orden de carga o en el orden personalizado que
    // fije la administradora) o, si el producto es local, sus
    // imágenes.
    function mediaList(product) {
        if (window.Catalog && typeof window.Catalog.productMedia === 'function') {
            var fromPanel = window.Catalog.productMedia(product);
            if (fromPanel && fromPanel.length) return fromPanel;
        }
        return productImages(product).map(function (src) {
            return { type: 'image', src: src };
        });
    }

    function hasVideo(entries) {
        return entries.some(function (entry) { return entry.type === 'video'; });
    }

    // Ítems del lightbox único para la galería del producto: la
    // misma lista de medios, con el título y la descripción del
    // producto (js/catalog.js los muestra en la vista ampliada).
    function lightboxItems(entries, product) {
        return entries.map(function (entry) {
            var item = {
                title: product.name,
                description: product.shortDescription || product.description || ''
            };
            if (entry.type === 'video') {
                item.video = entry.src;
                item.image = '';
            } else {
                item.image = entry.src;
            }
            return item;
        });
    }

    function detailHtml(product) {
        return '<p class="trend-eyebrow">Producto destacado</p>' +
            '<h3 class="trend-product-name">' + product.name + '</h3>' +
            '<p class="trend-desc">' + (product.description || product.shortDescription || '') + '</p>';
    }

    // Los botones #trend-wa / #trend-details son estáticos en el
    // HTML (no se reemplazan al re-renderizar). Se reasignan con
    // onclick (no addEventListener) para poder alternar entre modo
    // producto y modo campaña (js/hero.js) sin acumular oyentes.
    function bindActions(section, product) {
        var wa = section.querySelector('#trend-wa');
        var details = section.querySelector('#trend-details');
        if (wa && window.WhatsApp) {
            wa.setAttribute('href', window.WhatsApp.productLink(product));
        }
        if (details) {
            details.onclick = function () {
                if (window.Catalog && typeof window.Catalog.openProductDetail === 'function') {
                    window.Catalog.openProductDetail(product.id);
                }
            };
        }
    }

    // La galería (marco grande, miniaturas, flechas, contador,
    // ampliar y clic sobre el video) vive en js/trend-gallery.js:
    // aquí solo se montan los medios y los datos del producto.
    function bindTrend(section, entries, product) {
        var media = section.querySelector('.trend-media');
        if (!media || !window.TrendGallery || typeof window.TrendGallery.render !== 'function') return;
        window.TrendGallery.render(media, entries, {
            label: product.name || '',
            items: lightboxItems(entries, product)
        });
    }

    // Reconstruye la sección #tendencia para el producto indicado.
    // Solo toca el medio y el bloque de detalle: el título, la
    // descripción y los dos botones permanecen en el HTML.
    function renderProductTrend(product) {
        var section = document.getElementById('tendencia');
        if (!section || !product) return;
        var entries = mediaList(product);
        if (!entries[0]) return;
        var media = section.querySelector('.trend-media');
        var detail = section.querySelector('#trend-detail');
        if (!media || !detail) return;
        detail.hidden = false;
        detail.innerHTML = detailHtml(product);
        var note = section.querySelector('#trend-note');
        if (note) {
            note.hidden = false;
            note.textContent = (hasVideo(entries) ? 'Toca el medio para ampliar · ' : 'Toca la foto para ampliar · ') +
                viewsLabel(entries.length);
        }
        bindActions(section, product);
        bindTrend(section, entries, product);
    }

    // Expuesto para js/hero.js (portada administrada desde el panel).
    window.TrendProduct = { render: renderProductTrend };

    // Cuando el catálogo termina de sincronizar con el panel, la
    // galería por defecto se refresca con los medios (fotos y videos)
    // cargados allí. Si la portada está gestionada por js/hero.js no
    // se toca: él decide qué se muestra.
    document.addEventListener('catalog:synced', function () {
        var section = document.getElementById('tendencia');
        if (section && section.getAttribute('data-hero-managed') === '1') return;
        var product = findProduct();
        if (product) renderProductTrend(product);
    });

    function init() {
        var product = findProduct();
        if (!product) return;
        renderProductTrend(product);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
