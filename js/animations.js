// Animaciones optimizadas para el header
const navMenu = document.getElementById('nav-menu');
const navToggle = document.getElementById('nav-toggle');
const navClose = document.getElementById('nav-close');

// Mostrar menú
if (navToggle) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.add('show-menu');
        document.body.style.overflow = 'hidden';
    });
}

// Ocultar menú
if (navClose) {
    navClose.addEventListener('click', () => {
        navMenu.classList.remove('show-menu');
        document.body.style.overflow = 'auto';
    });
}

// Cerrar menú al hacer clic en enlace
const navLinks = document.querySelectorAll('.nav__link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('show-menu');
        document.body.style.overflow = 'auto';
    });
});

// Cambiar header al hacer scroll con throttling
let scrollTimeout;
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
    if (scrollTimeout) return;
    
    scrollTimeout = setTimeout(() => {
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            header.style.background = 'rgba(var(--surface-rgb), 0.95)';
            header.style.backdropFilter = 'blur(10px)';
        } else {
            header.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            header.style.background = 'var(--color-surface)';
            header.style.backdropFilter = 'none';
        }
        scrollTimeout = null;
    }, 10);
});

// Animación de aparición optimizada
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            observer.unobserve(entry.target); // Dejar de observar una vez animado
        }
    });
}, observerOptions);

// Observar elementos de forma dinámica
function observeElements() {
    document.querySelectorAll('.libro-card, .galeria__item, .testimonial-card, .gallery-item').forEach(el => {
        observer.observe(el);
    });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', observeElements);

// Volver a observar elementos dinámicos cuando cambia el DOM
const observerConfig = { childList: true, subtree: true };
const domObserver = new MutationObserver(() => {
    observeElements();
});
domObserver.observe(document.body, observerConfig);