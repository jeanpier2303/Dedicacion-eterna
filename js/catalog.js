// ============================================================
// catalog.js — Renderizado y filtrado del catálogo
// ------------------------------------------------------------
// Lee window.PRODUCTS / CATEGORIES / TESTIMONIALS / GALLERY
// (js/products.js) y genera todo el HTML automáticamente.
// Agregar un producto = añadir un objeto en products.js.
// Los enlaces salen de window.WhatsApp (js/whatsapp.js).
// ============================================================
window.Catalog = (function () {
    'use strict';

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

    function init() {
        elements = {
            filters: document.getElementById('catalog-filters'),
            grid: document.getElementById('products-grid'),
            verMasBtn: document.getElementById('ver-mas-productos'),
            testimonialsContainer: document.getElementById('testimonials-container'),
            galleryGrid: document.getElementById('gallery-grid'),
            galleryFilters: document.querySelectorAll('#galeria .filter-btn'),
            modal: document.getElementById('product-modal'),
            modalTitle: document.getElementById('product-modal-title'),
            modalClose: document.getElementById('modal-close'),
            modalDetail: document.getElementById('product-detail')
        };

        renderFilters();
        renderProducts();
        loadTestimonios();
        loadGaleria();
        initModal();
        bindEvents();
        openFromQuery();
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

        if (elements.galleryFilters) {
            elements.galleryFilters.forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    filterGaleria(e.currentTarget.dataset.filter);
                });
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
        var list = getProducts().filter(function (p) {
            return activeCategory === 'all' || p.category === activeCategory;
        });
        if (activeCategory === 'all' && !showAll) {
            return list.filter(function (p) { return p.featured; });
        }
        return list;
    }

    function hiddenCount() {
        if (activeCategory !== 'all' || showAll) return 0;
        return getProducts().filter(function (p) { return !p.featured; }).length;
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

    // Galería completa de un producto: usa `images[]` si existe,
    // si no, una sola imagen. Un solo producto, múltiples vistas.
    function productGalleryItems(product) {
        var srcs = (product.images && product.images.length) ? product.images : [product.image];
        return srcs.map(function (src) {
            return productLightboxItem(product, src);
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

    // ---------- Galería ----------

    var currentGalleryFilter = 'all';

    function loadGaleria() {
        if (!elements.galleryGrid) return;
        elements.galleryGrid.innerHTML = '';
        var list = (window.GALLERY || []).filter(function (item) {
            return currentGalleryFilter === 'all' || item.category === currentGalleryFilter;
        });
        if (list.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML =
                '<p class="empty-state-text">Próximamente encontrarás aquí nuevas creaciones personalizadas.</p>' +
                '<p class="empty-state-sub">Estamos preparando nuevas creaciones para esta categoría.</p>' +
                '<a class="button button-primary" target="_blank" rel="noopener" href="' +
                window.WhatsApp.generalLink() + '"><i class="fab fa-whatsapp"></i> Consultar por WhatsApp</a>';
            elements.galleryGrid.appendChild(empty);
            return;
        }
        list.forEach(function (item) {
            elements.galleryGrid.appendChild(createGalleryItem(item));
        });
    }

    function createGalleryItem(item) {
        var div = document.createElement('div');
        div.className = 'gallery-item';
        div.dataset.category = item.category;
        div.innerHTML =
            '<div class="gallery-image-container">' +
                '<img src="' + item.image + '" alt="' + item.title + '" loading="lazy">' +
                '<div class="gallery-overlay">' +
                    '<h4>' + item.title + '</h4>' +
                    '<p>' + item.description + '</p>' +
                    '<button class="gallery-view-button" aria-label="Ampliar ' + item.title + '">' +
                        '<i class="fas fa-search-plus"></i>' +
                    '</button>' +
                '</div>' +
            '</div>';
        div.addEventListener('click', function () { openLightbox(item); });
        return div;
    }

    function filterGaleria(filter) {
        currentGalleryFilter = filter;
        if (elements.galleryFilters) {
            elements.galleryFilters.forEach(function (btn) {
                var isActive = btn.dataset.filter === filter;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
        }
        if (!elements.galleryGrid) return;
        elements.galleryGrid.classList.add('filtering');
        setTimeout(function () {
            loadGaleria();
            setTimeout(function () {
                elements.galleryGrid.classList.remove('filtering');
            }, 50);
        }, 300);
    }

    // Lightbox único de la página. Acepta:
    //  openLightbox(item) -> una sola imagen (galería, catálogo simple)
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
                (hasNav ? '<button class="lightbox-nav lightbox-prev" aria-label="Imagen anterior"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>' : '') +
                (hasNav ? '<button class="lightbox-nav lightbox-next" aria-label="Imagen siguiente"><i class="fas fa-chevron-right" aria-hidden="true"></i></button>' : '') +
                '<div class="lightbox-image-container"><img src="' + items[current].image + '" alt="' + (items[current].title || '') + '"></div>' +
                (hasNav ? '<p class="lightbox-counter" aria-live="polite">' + (current + 1) + ' / ' + items.length + '</p>' : '') +
                '<div class="lightbox-info"><h3>' + (items[current].title || '') + '</h3><p>' + (items[current].description || '') + '</p></div>' +
            '</div>';

        document.body.appendChild(lightbox);
        document.body.style.overflow = 'hidden';

        var imgEl = lightbox.querySelector('.lightbox-image-container img');
        var counterEl = lightbox.querySelector('.lightbox-counter');
        var infoTitle = lightbox.querySelector('.lightbox-info h3');
        var infoDesc = lightbox.querySelector('.lightbox-info p');

        function render() {
            var it = items[current];
            imgEl.setAttribute('src', it.image);
            imgEl.setAttribute('alt', it.title || '');
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
            // Swipe en móvil.
            var startX = null;
            lightbox.querySelector('.lightbox-image-container').addEventListener('touchstart', function (e) {
                if (e.touches && e.touches.length === 1) startX = e.touches[0].clientX;
            }, { passive: true });
            lightbox.querySelector('.lightbox-image-container').addEventListener('touchend', function (e) {
                if (startX === null) return;
                var dx = e.changedTouches[0].clientX - startX;
                if (Math.abs(dx) > 30) { dx > 0 ? goPrev() : goNext(); }
                startX = null;
            }, { passive: true });
        }
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
        filterGaleria: filterGaleria,
        openLightbox: openLightbox,
        openGallery: openGallery,
        openProductGallery: openProductGallery,
        productGalleryItems: productGalleryItems,
        findProduct: findProduct
    };
})();
