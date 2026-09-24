// ============================================================
// whatsapp.js — Generación centralizada de enlaces de WhatsApp
// ------------------------------------------------------------
// ÚNICO lugar con el número del negocio. Todo enlace (tarjeta,
// modal, botón flotante, comunidad, hero) se genera aquí.
// ============================================================
window.WhatsApp = (function () {
    'use strict';

    var NUMBER = '573245778318';

    function link(message) {
        return 'https://wa.me/' + NUMBER + '?text=' + encodeURIComponent(message);
    }

    function categoryLabel(category) {
        if (window.CATEGORIES && window.CATEGORIES[category]) {
            return window.CATEGORIES[category];
        }
        return category;
    }

    // Origen http(s) actual (local o producción). Vacío en file://
    // para no generar URLs inválidas en el mensaje.
    function httpOrigin() {
        try {
            var o = window.location.origin;
            if (o && (o.indexOf('http://') === 0 || o.indexOf('https://') === 0)) return o;
        } catch (e) {}
        return '';
    }

    // URL directa al producto (?producto=id). Sin backend.
    function productUrl(product) {
        var o = httpOrigin();
        if (!o || !product.id) return '';
        return o + '/?producto=' + encodeURIComponent(product.id);
    }

    return {
        NUMBER: NUMBER,
        link: link,
        categoryLabel: categoryLabel,
        productUrl: productUrl,
        // Mensaje específico por producto (tarjeta y modal).
        // Solo transporta al cliente hacia el producto: la foto se
        // ve y se amplía en la propia página.
        productLink: function (product) {
            var p = typeof product === 'string' ? { name: product } : product;
            var lines = ['Hola, estoy interesado/a en este producto:', '', 'Producto: ' + p.name];
            if (p.category) lines.push('Categoría: ' + categoryLabel(p.category));
            var url = p.id ? productUrl(p) : '';
            if (url) {
                lines.push('', 'Ver producto:', url);
            }
            return link(lines.join('\n'));
        },
        // Botón general flotante / hero.
        generalLink: function () {
            return link('Hola, quisiera conocer más sobre sus productos personalizados.');
        },
        // Tarjeta de comunidad.
        communityLink: function () {
            return link('Hola, quiero unirme a la comunidad de Sueños de Papiro.');
        }
    };
})();
