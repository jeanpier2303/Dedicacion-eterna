// ============================================================
// catalog.js — Renderizado y filtrado del catálogo
// ------------------------------------------------------------
// Lee window.PRODUCTS / CATEGORIES / TESTIMONIALS
// (js/products.js) y genera todo el HTML automáticamente.
// Además sincroniza productos y categorías publicados desde el
// panel administrativo vía /api/catalog (Supabase); los datos
// locales se conservan como respaldo si la API no responde.
// Los enlaces salen de window.WhatsApp (js/whatsapp.js).
// ============================================================
window.Catalog = (function () {
    'use strict';

    var reduceMotion = false;
    try {
        reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}

    var elements = {};
    var activeCategory = 'all';
    var showAll = false;

    function getProducts() {
        return window.PRODUCTS || [];
    }

    function getCategories() {
        return window.CATEGORIES || {};
    }

    function categoryLabel(category) {
        var cats = getCategories();
        return cats[category] || category;
    }

    function findProduct(id) {
        return getProducts().find(function (p) { return p.id === id; });
    }

    // ---------- Sincronización con el backend (/api/catalog) ----------
    // El panel administrativo gestiona productos y categorías en
    // Supabase. Aquí se fusionan con los datos locales: primero los
    // del panel (ordenados por display_order) y después los locales
    // que aún no existan allí. Si coincide el slug, gana el panel.

    var API_PRODUCTS = '/api/catalog/products';
    var API_CATEGORIES = '/api/catalog/categories';
    var FALLBACK_IMAGE = 'assets/images/brand/logo.png';

    function mapApiProduct(p) {
        var images = (p.images || []).filter(function (src) { return !!src; });
        var image = p.image || images[0] || null;
        return {
            id: p.slug || p.id,
            name: p.name || '',
            category: (p.category && p.category.slug) || 'otros',
            shortDescription: p.short_description || '',
            description: p.description || p.short_description || '',
            image: image,
            images: images,
            // Medios crudos del panel (imágenes y videos) con su
            // orden de carga; los convierte productMediaList.
            media: Array.isArray(p.media) ? p.media : [],
            price: (p.price === undefined ? null : p.price),
            oldPrice: (p.old_price === undefined ? null : p.old_price),
            featured: !!p.is_featured
        };
    }

    function mergeApiData(apiProducts, apiCategories) {
        var merged = apiProducts.slice();
        (window.PRODUCTS || []).forEach(function (p) {
            var apiProduct = merged.find(function (item) { return item.id === p.id; });
            if (!apiProduct) {
                merged.push(p);
            } else if (!apiProduct.image && !apiProduct.images.length) {
                apiProduct.image = p.image || FALLBACK_IMAGE;
                apiProduct.images = (p.images && p.images.length) ? p.images : [apiProduct.image];
            }
        });
        merged.forEach(function (p) {
            if (!p.image) p.image = FALLBACK_IMAGE;
            if (!p.images || !p.images.length) p.images = [p.image];
        });
        window.PRODUCTS = merged;

        var cats = window.CATEGORIES || {};
        (apiCategories || []).forEach(function (c) {
            if (c.slug && !cats[c.slug]) cats[c.slug] = c.name;
        });
        window.CATEGORIES = cats;
    }

    function fetchJson(url) {
        return fetch(url, { headers: { Accept: 'application/json' } })
            .then(function (res) { return res.ok ? res.json() : null; })
            .catch(function () { return null; });
    }

    // Avisa a js/featured.js y js/hero.js cuando los productos del
    // panel ya están en window.PRODUCTS, para que la galería de la
    // portada se refresque con los medios cargados desde el panel.
    function markCatalogSynced() {
        window.CATALOG_SYNCED = true;
        try {
            document.dispatchEvent(new CustomEvent('catalog:synced'));
        } catch (e) {}
    }

    function syncFromApi() {
        if (typeof fetch !== 'function') {
            markCatalogSynced();
            return;
        }
        Promise.all([fetchJson(API_PRODUCTS), fetchJson(API_CATEGORIES)])
            .then(function (results) {
                var data = results[0];
                if (!data || !Array.isArray(data.products)) return;
                var cats = (results[1] && results[1].categories) || [];
                mergeApiData(data.products.map(mapApiProduct), cats);
                renderFilters();
                renderProducts();
                // Abre ?producto= si el producto venía del panel y el
                // modal no esté ya abierto con otro producto.
                var currentId = productIdFromQuery();
                var modalOpen = elements.modal && elements.modal.classList.contains('active');
                if (currentId && !modalOpen) openFromQuery();
            })
            .catch(function () {})
            .then(markCatalogSynced);
    }

    function init() {
        elements = {
            filters: document.getElementById('catalog-filters'),
            grid: document.getElementById('products-grid'),
            verMasBtn: document.getElementById('ver-mas-productos'),
            testimonialsContainer: document.getElementById('testimonials-container'),
            modal: document.getElementById('product-modal'),
            modalTitle: document.getElementById('product-modal-title'),
            modalClose: document.getElementById('modal-close'),
            modalDetail: document.getElementById('product-detail')
        };

        renderFilters();
        renderProducts();
        loadTestimonios();
        initModal();
        bindEvents();
        openFromQuery();
        syncFromApi();
    }

    // Lee ?producto=id de forma segura: solo abre si el ID existe
    // en PRODUCTS. Nunca inserta el valor en el HTML.
    function productIdFromQuery() {
        try {
            return new URLSearchParams(window.location.search).get('producto');
        } catch (e) {
            return null;
        }
    }

    function openFromQuery() {
        var id = productIdFromQuery();
        if (id && findProduct(id)) {
            openProductDetail(id);
        }
    }

    // Refleja el modal en la URL sin recargar (replaceState para no
    // llenar el historial). Al cerrar se vuelve a la URL limpia.
    function setProductParam(id) {
        try {
            var url = new URL(window.location.href);
            if (id) {
                url.searchParams.set('producto', id);
            } else {
                url.searchParams.delete('producto');
            }
            window.history.replaceState(null, '', url.pathname + url.search + url.hash);
        } catch (e) {}
    }

    function bindEvents() {
        if (elements.verMasBtn) {
            elements.verMasBtn.addEventListener('click', function () {
                showAll = true;
                renderProducts();
            });
        }
    }

    // ---------- Filtros del catálogo ----------

    function renderFilters() {
        if (!elements.filters) return;
        elements.filters.innerHTML = '';

        var cats = getCategories();
        var order = ['all'].concat(Object.keys(cats));

        order.forEach(function (key) {
            var btn = document.createElement('button');
            btn.className = 'filter-btn' + (key === activeCategory ? ' active' : '');
            btn.dataset.filter = key;
            btn.textContent = key === 'all' ? 'Todos' : cats[key];
            btn.setAttribute('aria-pressed', key === activeCategory ? 'true' : 'false');
            btn.addEventListener('click', function () {
                activeCategory = key;
                renderFilters();
                renderProducts();
            });
            elements.filters.appendChild(btn);
        });
    }

    function visibleProducts() {
        return getProducts().filter(function (p) {
            return activeCategory === 'all' || p.category === activeCategory;
        });
    }

    function hiddenCount() {
        return 0;
    }

    // ---------- Tarjetas ----------

    function priceHTML(product, big) {
        if (product.price !== null && product.price !== undefined) {
            var old = product.oldPrice ? '<span class="price-old">$' + product.oldPrice + '</span>' : '';
            return '<p class="product-price' + (big ? ' product-price-lg' : '') + '">' + old +
                '<span class="price-new">$' + product.price + '</span></p>';
        }
        return '<p class="product-price' + (big ? ' product-price-lg' : '') + '">' +
            '<span class="price-consult">Consultar precio</span></p>';
    }

    function renderProducts() {
        if (!elements.grid) return;
        elements.grid.innerHTML = '';

        var list = visibleProducts();

        if (list.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML =
                '<p class="empty-state-text">Aún no tenemos creaciones en esta categoría.</p>' +
                '<p class="empty-state-sub">Cuéntanos tu idea y la hacemos realidad.</p>' +
                '<a class="button button-primary" target="_blank" rel="noopener" href="' +
                window.WhatsApp.generalLink() + '"><i class="fab fa-whatsapp"></i> Consultar por WhatsApp</a>';
            elements.grid.appendChild(empty);
        } else {
            list.forEach(function (product) {
                elements.grid.appendChild(createProductCard(product));
            });
        }

        updateVerMas();
    }

    function updateVerMas() {
        if (!elements.verMasBtn) return;
        var remaining = hiddenCount();
        var wrapper = elements.verMasBtn.closest('.text-center');
        if (remaining > 0) {
            elements.verMasBtn.querySelector('span').textContent = 'Ver más productos (' + remaining + ')';
            if (wrapper) wrapper.style.display = '';
        } else {
            if (wrapper) wrapper.style.display = 'none';
        }
    }

    // Item de lightbox a partir de un producto (reutiliza el visor).
    function productLightboxItem(product, imageSrc) {
        return {
            image: imageSrc || product.image,
            title: product.name,
            description: product.shortDescription || product.description || '',
            category: categoryLabel(product.category)
        };
    }

    // Medios de un producto (imágenes y videos) en el orden en que
    // los cargó la administradora: display_order (orden que ella
    // establezca) y, a igualdad, fecha de carga. Si el producto no
    // trae medios del panel se usan sus imágenes locales.
    function productMediaList(product) {
        var rows = (product && Array.isArray(product.media)) ? product.media : [];
        var list = rows
            .map(function (row) {
                if (!row || !row.signed_url) return null;
                return {
                    type: row.media_type === 'video' ? 'video' : 'image',
                    src: row.signed_url,
                    order: typeof row.display_order === 'number' ? row.display_order : 0,
                    created: row.created_at || ''
                };
            })
            .filter(function (entry) { return !!entry; })
            .sort(function (a, b) {
                if (a.order !== b.order) return a.order - b.order;
                return a.created < b.created ? -1 : a.created > b.created ? 1 : 0;
            })
            .map(function (entry) { return { type: entry.type, src: entry.src }; });
        if (list.length) return list;
        var images = (product && product.images && product.images.length)
            ? product.images
            : (product && product.image ? [product.image] : []);
        return images
            .filter(function (src) { return !!src; })
            .map(function (src) { return { type: 'image', src: src }; });
    }

    // Galería completa de un producto: fotos y videos en el mismo
    // visor ampliado, en el orden de la galería. Un solo producto,
    // múltiples vistas.
    function productGalleryItems(product) {
        var list = productMediaList(product);
        if (!list.length) list = [{ type: 'image', src: product.image }];
        return list.map(function (entry) {
            var item = productLightboxItem(product, entry.type === 'image' ? entry.src : null);
            if (entry.type === 'video') {
                item.video = entry.src;
                item.image = '';
            }
            return item;
        });
    }

    function openProductGallery(product, startIndex) {
        var items = productGalleryItems(product);
        openLightbox(items[startIndex || 0], items, startIndex || 0);
    }

    function createProductCard(product) {
        var card = document.createElement('article');
        card.className = 'product-card';
        card.setAttribute('data-id', product.id);
        card.setAttribute('data-category', product.category);
        card.innerHTML =
            '<div class="product-media">' +
                '<button type="button" class="product-zoom" data-zoom="' + product.id + '" aria-label="Ampliar imagen de ' + product.name + '">' +
                    '<img src="' + product.image + '" alt="' + product.name + '" loading="lazy">' +
                    '<span class="zoom-hint" aria-hidden="true"><i class="fas fa-search-plus"></i></span>' +
                '</button>' +
                '<span class="product-category">' + categoryLabel(product.category) + '</span>' +
            '</div>' +
            '<div class="product-body">' +
                '<h3 class="product-name">' + product.name + '</h3>' +
                '<p class="product-short">' + product.shortDescription + '</p>' +
                priceHTML(product, false) +
                '<div class="product-actions">' +
                    '<button type="button" class="button button-outline" data-details-id="' + product.id + '">' +
                        '<i class="fas fa-eye"></i> Ver detalles' +
                    '</button>' +
                    '<a class="button button-primary" target="_blank" rel="noopener" href="' +
                        window.WhatsApp.productLink(product) + '">' +
                        '<i class="fab fa-whatsapp"></i> Consultar' +
                    '</a>' +
                '</div>' +
            '</div>';

        card.querySelector('[data-details-id]').addEventListener('click', function () {
            openProductDetail(product.id);
        });
        card.querySelector('[data-zoom]').addEventListener('click', function () {
            openProductGallery(product, 0);
        });
        return card;
    }

    // ---------- Modal de detalle (reutiliza el overlay existente) ----------

    function initModal() {
        if (!elements.modal || !elements.modalClose) return;
        elements.modalClose.addEventListener('click', closeModal);
        elements.modal.addEventListener('click', function (e) {
            if (e.target === elements.modal) closeModal();
        });
        document.addEventListener('keydown', function (e) {
            // Si el lightbox está abierto encima, él gestiona el ESC.
            if (e.key === 'Escape' && elements.modal.classList.contains('active') &&
                !document.querySelector('.lightbox')) closeModal();
        });
    }

    var lastFocused = null;

    function openProductDetail(id) {
        var product = findProduct(id);
        if (!product || !elements.modal || !elements.modalDetail) return;

        if (elements.modalTitle) elements.modalTitle.textContent = product.name;

        elements.modalDetail.innerHTML =
            '<div class="product-detail-media">' +
                '<button type="button" class="product-zoom" data-zoom-detail="' + product.id + '" aria-label="Ampliar imagen de ' + product.name + '">' +
                    '<img src="' + product.image + '" alt="' + product.name + '">' +
                    '<span class="zoom-hint" aria-hidden="true"><i class="fas fa-search-plus"></i></span>' +
                '</button>' +
                '<span class="product-category">' + categoryLabel(product.category) + '</span>' +
            '</div>' +
            '<p class="zoom-caption"><i class="fas fa-search-plus" aria-hidden="true"></i> Toca para ampliar</p>' +
            '<div class="product-detail-info">' +
                '<p class="product-detail-desc">' + product.description + '</p>' +
                priceHTML(product, true) +
                '<div class="product-detail-actions">' +
                    '<a class="button button-primary button-lg" target="_blank" rel="noopener" href="' +
                        window.WhatsApp.productLink(product) + '">' +
                        '<i class="fab fa-whatsapp button-icon"></i><span>Consultar por WhatsApp</span>' +
                    '</a>' +
                '</div>' +
            '</div>';

        lastFocused = document.activeElement;
        elements.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        setProductParam(product.id);
        elements.modalDetail.querySelector('[data-zoom-detail]').addEventListener('click', function () {
            openProductGallery(product, 0);
        });
        elements.modalClose.focus();
    }

    function closeModal() {
        if (!elements.modal) return;
        elements.modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        setProductParam(null);
        if (lastFocused && typeof lastFocused.focus === 'function') {
            lastFocused.focus();
            lastFocused = null;
        }
    }

    // ---------- Testimonios ----------

    // Iniciales a partir del nombre real (sin fotos inventadas).
    function initials(name) {
        return String(name).trim().split(/\s+/).slice(0, 2).map(function (w) {
            return w.charAt(0);
        }).join('').toUpperCase();
    }

    function loadTestimonios() {
        if (!elements.testimonialsContainer) return;
        elements.testimonialsContainer.innerHTML = '';
        (window.TESTIMONIALS || []).forEach(function (t) {
            var div = document.createElement('div');
            div.className = 'testimonial-card';
            var avatar = t.avatar
                ? '<img class="testimonial-avatar-img" src="' + t.avatar + '" alt="' + t.name + '" loading="lazy">'
                : '<span class="testimonial-avatar" aria-hidden="true">' + initials(t.name) + '</span>';
            div.innerHTML =
                '<div class="testimonial-quote" aria-hidden="true">&ldquo;</div>' +
                '<p class="testimonial-text">' + t.text + '</p>' +
                '<div class="testimonial-author">' +
                    avatar +
                    '<div class="author-info"><h4>' + t.name + '</h4><span>' + t.role + '</span></div>' +
                '</div>';
            elements.testimonialsContainer.appendChild(div);
        });
    }

    // Lightbox único de la página. Acepta:
    //  openLightbox(item) -> un solo medio
    //  openLightbox(item, itemsArray, startIndex) -> galería navegable
    //  openLightbox(itemsArray, startIndex) -> atajo para galerías
    function openLightbox(item, galleryItems, startIndex) {
        var items = null;
        var current = 0;
        if (Array.isArray(item)) {
            items = item;
            current = typeof galleryItems === 'number' ? galleryItems : 0;
            item = items[current] || {};
        } else if (Array.isArray(galleryItems) && galleryItems.length > 1) {
            items = galleryItems;
            current = typeof startIndex === 'number' ? startIndex : 0;
            item = items[current] || item;
        } else {
            items = [item];
            current = 0;
        }

        var hasNav = items.length > 1;

        var lightbox = document.createElement('div');
        lightbox.className = 'lightbox' + (hasNav ? ' lightbox-has-nav' : '');
        lightbox.setAttribute('role', 'dialog');
        lightbox.setAttribute('aria-modal', 'true');
        lightbox.setAttribute('aria-label', item.title || 'Vista ampliada');
        lightbox.innerHTML =
            '<div class="lightbox-content">' +
                '<button class="lightbox-close" aria-label="Cerrar vista ampliada">&times;</button>' +
                '<div class="lightbox-media">' +
                    (hasNav ? '<button class="lightbox-nav lightbox-prev" aria-label="Imagen anterior"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>' : '') +
                    (hasNav ? '<button class="lightbox-nav lightbox-next" aria-label="Imagen siguiente"><i class="fas fa-chevron-right" aria-hidden="true"></i></button>' : '') +
                    '<div class="lightbox-image-container"></div>' +
                    (hasNav ? '<p class="lightbox-counter" aria-live="polite">' + (current + 1) + ' / ' + items.length + '</p>' : '') +
                '</div>' +
                '<div class="lightbox-info"><h3>' + (items[current].title || '') + '</h3><p>' + (items[current].description || '') + '</p></div>' +
            '</div>';

        document.body.appendChild(lightbox);
        document.body.style.overflow = 'hidden';

        var mediaEl = lightbox.querySelector('.lightbox-image-container');
        var counterEl = lightbox.querySelector('.lightbox-counter');
        var infoTitle = lightbox.querySelector('.lightbox-info h3');
        var infoDesc = lightbox.querySelector('.lightbox-info p');

        // Foto o video en el mismo marco ampliado. Los videos llevan
        // controles (con pantalla completa); al cambiar de medio se
        // detiene el video que estuviera reproduciéndose.
        function renderMedia() {
            var it = items[current];
            var playing = mediaEl.querySelector('video');
            if (playing) playing.pause();
            if (it.video) {
                mediaEl.innerHTML =
                    '<video src="' + it.video + '" controls playsinline muted' +
                    (reduceMotion ? '' : ' autoplay') +
                    ' loop preload="metadata" aria-label="' + (it.title || 'Video') + '"></video>';
            } else {
                mediaEl.innerHTML = '<img src="' + (it.image || '') + '" alt="' + (it.title || '') + '">';
            }
        }

        function render() {
            var it = items[current];
            renderMedia();
            lightbox.setAttribute('aria-label', it.title || 'Vista ampliada');
            if (counterEl) counterEl.textContent = (current + 1) + ' / ' + items.length;
            if (infoTitle) infoTitle.textContent = it.title || '';
            if (infoDesc) infoDesc.textContent = it.description || '';
        }

        function go(delta) {
            current = (current + delta + items.length) % items.length;
            render();
        }
        function goPrev() { go(-1); }
        function goNext() { go(1); }

        var closed = false;
        var closeLightbox = function () {
            if (closed) return;
            closed = true;
            var playing = mediaEl.querySelector('video');
            if (playing) playing.pause();
            document.removeEventListener('keydown', keyHandler);
            lightbox.classList.add('fade-out');
            setTimeout(function () {
                lightbox.remove();
                // No devolver el scroll si el modal sigue abierto debajo.
                if (!elements.modal || !elements.modal.classList.contains('active')) {
                    document.body.style.overflow = 'auto';
                }
            }, 300);
        };
        var keyHandler = function (e) {
            if (e.key === 'Escape') closeLightbox();
            else if (hasNav && e.key === 'ArrowLeft') goPrev();
            else if (hasNav && e.key === 'ArrowRight') goNext();
        };

        lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', function (e) {
            if (e.target === lightbox) closeLightbox();
        });
        document.addEventListener('keydown', keyHandler);
        if (hasNav) {
            lightbox.querySelector('.lightbox-prev').addEventListener('click', function (e) { e.stopPropagation(); goPrev(); });
            lightbox.querySelector('.lightbox-next').addEventListener('click', function (e) { e.stopPropagation(); goNext(); });
            // Swipe en móvil (no mientras se toca un video: sus
            // controles se desplazan en horizontal).
            var startX = null;
            var startY = null;
            lightbox.querySelector('.lightbox-image-container').addEventListener('touchstart', function (e) {
                if (e.touches && e.touches.length === 1 && !(e.target.closest && e.target.closest('video'))) {
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                } else {
                    startX = null;
                    startY = null;
                }
            }, { passive: true });
            lightbox.querySelector('.lightbox-image-container').addEventListener('touchend', function (e) {
                if (startX === null) return;
                var dx = e.changedTouches[0].clientX - startX;
                var dy = e.changedTouches[0].clientY - startY;
                if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) { dx > 0 ? goPrev() : goNext(); }
                startX = null;
                startY = null;
            }, { passive: true });
            lightbox.querySelector('.lightbox-image-container').addEventListener('touchcancel', function () {
                startX = null;
                startY = null;
            }, { passive: true });
        }
        render();
        lightbox.querySelector('.lightbox-close').focus();
    }

    function openGallery(items, startIndex) {
        openLightbox(items, typeof startIndex === 'number' ? startIndex : 0);
    }

    // ---------- Notificaciones ----------

    function notify(message, type) {
        type = type || 'success';
        var notification = document.createElement('div');
        notification.className = 'notification notification-' + type;
        notification.setAttribute('role', 'status');
        notification.innerHTML =
            '<i class="fas fa-' + (type === 'success' ? 'check-circle' : 'exclamation-circle') + '"></i>' +
            '<span>' + message + '</span>' +
            '<button class="notification-close" aria-label="Cerrar aviso">&times;</button>';

        document.body.appendChild(notification);
        notification.querySelector('.notification-close').addEventListener('click', function () {
            notification.remove();
        });
        setTimeout(function () { notification.classList.add('show'); }, 100);
        setTimeout(function () {
            notification.classList.remove('show');
            setTimeout(function () { notification.remove(); }, 300);
        }, 3000);
    }

    return {
        init: init,
        notify: notify,
        openProductDetail: openProductDetail,
        closeModal: closeModal,
        openLightbox: openLightbox,
        openGallery: openGallery,
        openProductGallery: openProductGallery,
        productGalleryItems: productGalleryItems,
        productMedia: productMediaList,
        findProduct: findProduct
    };
})();
