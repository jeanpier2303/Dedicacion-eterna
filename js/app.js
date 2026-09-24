// ============================================================
// app.js — Inicialización y coordinación general
// ------------------------------------------------------------
// Solo: preloader, tema, navegación móvil, scroll, AOS y
// coordinación. El catálogo vive en js/catalog.js, los datos
// en js/products.js y WhatsApp en js/whatsapp.js.
// Orden de carga en index.html (defer, se respeta el orden):
//   products.js → whatsapp.js → catalog.js → app.js
// ============================================================
var app = {
    elements: {},

    state: {
        theme: 'light',
        preloaderComplete: false
    },

    init: function () {
        document.body.style.overflow = 'hidden';
        document.body.classList.add('preloader-active');

        this.cacheElements();
        this.initPreloader();
        this.bindEvents();
        this.initTheme();
        this.initScrollAnimations();

        if (window.Catalog && typeof window.Catalog.init === 'function') {
            window.Catalog.init();
        }
    },

    cacheElements: function () {
        this.elements = {
            preloader: document.getElementById('preloader'),
            typingText: document.getElementById('typing-text'),
            navMenu: document.getElementById('nav-menu'),
            navToggle: document.getElementById('nav-toggle'),
            navClose: document.getElementById('nav-close'),
            themeToggle: document.getElementById('theme-toggle'),
            mobileThemeToggle: document.getElementById('mobile-theme-toggle'),
            backToTop: document.getElementById('back-to-top')
        };
    },

    // ---------- Preloader ----------
    initPreloader: function () {
        if (!this.elements.preloader) {
            this.onPreloaderComplete();
            return;
        }

        this.elements.preloader.style.display = 'flex';
        this.elements.preloader.style.opacity = '1';
        this.elements.preloader.style.visibility = 'visible';

        var typingText = this.elements.typingText;
        var self = this;

        var progress = 0;
        var totalTime = 600;
        var updateInterval = 50;
        var progressPerUpdate = 100 / (totalTime / updateInterval);

        var progressInterval = setInterval(function () {
            progress += progressPerUpdate;
            if (progress > 100) progress = 100;

            if (typingText) {
                typingText.textContent = progress >= 100 ? '¡Bienvenido!' : 'Preparando tus creaciones...';
            }

            if (progress >= 100) {
                clearInterval(progressInterval);
                self.finishPreloader();
            }
        }, updateInterval);

        setTimeout(function () {
            if (!self.state.preloaderComplete) {
                clearInterval(progressInterval);
                self.finishPreloader();
            }
        }, 2000);
    },

    finishPreloader: function () {
        if (this.state.preloaderComplete) return;
        this.state.preloaderComplete = true;
        var self = this;

        setTimeout(function () {
            if (!self.elements.preloader) {
                self.onPreloaderComplete();
                return;
            }
            self.elements.preloader.classList.add('fade-out');
            setTimeout(function () {
                self.elements.preloader.style.display = 'none';
                self.onPreloaderComplete();
            }, 350);
        }, 100);
    },

    onPreloaderComplete: function () {
        document.body.style.overflow = 'auto';
        document.body.classList.remove('preloader-active');
        this.initAOS();
        window.dispatchEvent(new CustomEvent('preloaderComplete'));
    },

    initAOS: function () {
        if (window.aosInitialized) return;
        if (typeof AOS !== 'undefined') {
            AOS.init({ duration: 800, once: true, mirror: false, offset: 100 });
            window.aosInitialized = true;
        }
    },

    // ---------- Menú móvil ----------
    setMenuOpen: function (open) {
        if (!this.elements.navMenu) return;
        this.elements.navMenu.classList.toggle('show-menu', open);
        document.body.style.overflow = open ? 'hidden' : 'auto';
        if (this.elements.navToggle) {
            this.elements.navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            this.elements.navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        }
    },

    // ---------- Eventos generales ----------
    bindEvents: function () {
        var self = this;

        if (this.elements.navToggle) {
            this.elements.navToggle.addEventListener('click', function () {
                var isOpen = self.elements.navMenu && self.elements.navMenu.classList.contains('show-menu');
                self.setMenuOpen(!isOpen);
            });
        }

        if (this.elements.navClose) {
            this.elements.navClose.addEventListener('click', function () {
                self.setMenuOpen(false);
            });
        }

        document.querySelectorAll('.nav__link').forEach(function (link) {
            link.addEventListener('click', function () {
                self.setMenuOpen(false);
            });
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && self.elements.navMenu &&
                self.elements.navMenu.classList.contains('show-menu')) {
                self.setMenuOpen(false);
            }
        });

        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', function () { self.toggleTheme(); });
        }
        if (this.elements.mobileThemeToggle) {
            this.elements.mobileThemeToggle.addEventListener('click', function () { self.toggleTheme(); });
        }

        if (this.elements.backToTop) {
            this.elements.backToTop.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            var scrollTimeout;
            window.addEventListener('scroll', function () {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(function () {
                    if (window.scrollY > 300) {
                        self.elements.backToTop.classList.add('visible');
                    } else {
                        self.elements.backToTop.classList.remove('visible');
                    }
                }, 100);
            });
        }

        // Scroll suave solo para anchors reales (los [data-wa] reciben
        // su href de WhatsApp y no deben ser interceptados).
        document.querySelectorAll('a[href^="#"]:not([data-wa])').forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                var targetId = this.getAttribute('href');
                if (!targetId || targetId === '#') return;
                var targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({ top: targetElement.offsetTop - 100, behavior: 'smooth' });
                }
            });
        });

        // Enlaces generales de WhatsApp (data-wa): href centralizado.
        if (window.WhatsApp) {
            document.querySelectorAll('[data-wa]').forEach(function (el) {
                var kind = el.getAttribute('data-wa');
                var href = kind === 'community'
                    ? window.WhatsApp.communityLink()
                    : window.WhatsApp.generalLink();
                el.setAttribute('href', href);
                el.setAttribute('target', '_blank');
                el.setAttribute('rel', 'noopener');
            });
        }
    },

    // ---------- Tema claro/oscuro (único gestor) ----------
    initTheme: function () {
        var savedTheme = null;
        try {
            savedTheme = localStorage.getItem('theme');
        } catch (e) { /* almacenamiento no disponible */ }
        this.setTheme(savedTheme === 'dark' ? 'dark' : 'light');
    },

    setTheme: function (theme) {
        this.state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('theme', theme);
        } catch (e) { /* almacenamiento no disponible */ }

        var moonIcon = document.querySelector('.moon-icon');
        var sunIcon = document.querySelector('.sun-icon');
        if (moonIcon && sunIcon) {
            moonIcon.classList.toggle('hidden', theme === 'dark');
            sunIcon.classList.toggle('hidden', theme === 'light');
        }

        var mobileIcon = document.querySelector('#mobile-theme-toggle i');
        if (mobileIcon) {
            mobileIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    },

    toggleTheme: function () {
        this.setTheme(this.state.theme === 'light' ? 'dark' : 'light');
    },

    // ---------- Animaciones al hacer scroll ----------
    initScrollAnimations: function () {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        document.querySelectorAll('.product-card, .testimonial-card, .gallery-item, .section-header').forEach(function (el) {
            observer.observe(el);
        });
    }
};

document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('preloader')) {
        document.body.style.overflow = 'auto';
    }
    if (window.app && typeof window.app.init === 'function') {
        window.app.init();
    } else {
        document.body.style.overflow = 'auto';
    }
});

// Fallback de seguridad: nunca dejar el preloader bloqueando la página.
setTimeout(function () {
    var preloader = document.getElementById('preloader');
    if (preloader && preloader.style.display !== 'none' && window.app) {
        preloader.style.display = 'none';
        document.body.style.overflow = 'auto';
        document.body.classList.remove('preloader-active');
        if (typeof window.app.initAOS === 'function') {
            window.app.initAOS();
        }
    }
}, 6000);

window.app = app;
