// Dark Mode System Mejorado con Local Storage
class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.mobileThemeToggle = document.getElementById('mobile-theme-toggle');
        this.html = document.documentElement;
        this.theme = this.getSavedTheme() || this.getSystemTheme();
        this.transitionStyle = null;
        
        this.init();
    }

    init() {
        this.setTheme(this.theme);
        this.bindEvents();
        this.updateMetaThemeColor();
        this.addTransitionStyles();
    }

    getSavedTheme() {
        const saved = localStorage.getItem('theme');
        return saved === 'dark' || saved === 'light' ? saved : null;
    }

    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    setTheme(theme) {
        this.theme = theme;
        this.html.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.updateButtonIcons(theme);
        this.updateMetaThemeColor();
        this.dispatchThemeChangeEvent(theme);
    }

    toggleTheme() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        
        // Añadir transición suave
        this.html.classList.add('theme-transitioning');
        setTimeout(() => {
            this.setTheme(newTheme);
            setTimeout(() => {
                this.html.classList.remove('theme-transitioning');
            }, 300);
        }, 10);
    }

    updateButtonIcons(theme) {
        // Desktop theme toggle
        if (this.themeToggle) {
            const moonIcon = this.themeToggle.querySelector('.moon-icon');
            const sunIcon = this.themeToggle.querySelector('.sun-icon');
            
            if (theme === 'dark') {
                moonIcon?.classList.add('hidden');
                sunIcon?.classList.remove('hidden');
            } else {
                moonIcon?.classList.remove('hidden');
                sunIcon?.classList.add('hidden');
            }
        }
        
        // Mobile theme toggle
        if (this.mobileThemeToggle) {
            const icon = this.mobileThemeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }

    updateMetaThemeColor() {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            const color = this.theme === 'dark' ? '#1A0F0A' : '#F9F6F0';
            metaThemeColor.setAttribute('content', color);
        }
    }

    dispatchThemeChangeEvent(theme) {
        const event = new CustomEvent('themechange', { 
            detail: { theme } 
        });
        window.dispatchEvent(event);
    }

    addTransitionStyles() {
        if (!this.transitionStyle) {
            this.transitionStyle = document.createElement('style');
            this.transitionStyle.textContent = `
                .theme-transitioning * {
                    transition: background-color 0.3s ease,
                                border-color 0.3s ease,
                                color 0.3s ease,
                                fill 0.3s ease,
                                stroke 0.3s ease,
                                opacity 0.3s ease,
                                transform 0.3s ease !important;
                }
            `;
            document.head.appendChild(this.transitionStyle);
        }
    }

    bindEvents() {
        // Desktop theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Mobile theme toggle
        if (this.mobileThemeToggle) {
            this.mobileThemeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.theme = e.matches ? 'dark' : 'light';
                this.setTheme(this.theme);
            }
        });

        // Listen for theme changes from other sources
        window.addEventListener('themechange', (e) => {
            this.updateButtonIcons(e.detail.theme);
        });
    }

    // Public methods
    getCurrentTheme() {
        return this.theme;
    }

    isDarkMode() {
        return this.theme === 'dark';
    }

    setLightMode() {
        this.setTheme('light');
    }

    setDarkMode() {
        this.setTheme('dark');
    }
}

// Initialize theme manager
let themeManager = null;

function initTheme() {
    if (!themeManager) {
        themeManager = new ThemeManager();
    }
    return themeManager;
}

// Theme-dependent adjustments mejoradas
function adjustElementsForTheme(theme) {
    // Ajustar imágenes para modo oscuro
    const images = document.querySelectorAll('img:not([data-no-filter])');
    images.forEach(img => {
        if (theme === 'dark') {
            img.style.filter = 'brightness(0.9) contrast(1.05)';
        } else {
            img.style.filter = 'none';
        }
    });

    // Ajustar colores de texto
    document.querySelectorAll('.text-theme').forEach(el => {
        el.style.color = theme === 'dark' ? 'var(--color-text-primary-dark)' : 'var(--color-text-primary)';
    });

    // Actualizar colores de botones
    document.querySelectorAll('.button-theme').forEach(btn => {
        if (theme === 'dark') {
            btn.classList.remove('button-light');
            btn.classList.add('button-dark');
        } else {
            btn.classList.remove('button-dark');
            btn.classList.add('button-light');
        }
    });
}

// Listen for theme changes
window.addEventListener('themechange', (e) => {
    adjustElementsForTheme(e.detail.theme);
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const theme = initTheme();
    adjustElementsForTheme(theme.getCurrentTheme());
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThemeManager, initTheme };
}