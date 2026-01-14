// Cargador de Componentes Mejorado
const componentCache = new Map();

async function loadComponent(url, cacheKey) {
    if (componentCache.has(cacheKey)) {
        return componentCache.get(cacheKey);
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        componentCache.set(cacheKey, html);
        return html;
    } catch (error) {
        console.error(`Error cargando componente ${url}:`, error);
        return `<div class="component-error">Error cargando componente</div>`;
    }
}

async function loadComponents() {
    const components = [
        { id: 'header-component', url: 'components/header.html', cacheKey: 'header' },
        { id: 'hero-component', url: 'components/hero.html', cacheKey: 'hero' },
        { id: 'libros-grid-component', url: 'components/libros-grid.html', cacheKey: 'libros-grid' },
        { id: 'footer-component', url: 'components/footer.html', cacheKey: 'footer' }
    ];

    try {
        // Cargar componentes en paralelo
        const promises = components.map(async ({ id, url, cacheKey }) => {
            const element = document.getElementById(id);
            if (element) {
                const html = await loadComponent(url, cacheKey);
                element.innerHTML = html;
            }
        });

        await Promise.all(promises);
        
        // Inicializar componentes después de cargar
        initLoadedComponents();
        
    } catch (error) {
        console.error('Error cargando componentes:', error);
    }
}

function initLoadedComponents() {
    // Reinicializar cualquier funcionalidad que necesite los componentes cargados
    const initFunctions = ['initNav', 'initBookCards', 'initGallery', 'initTheme'];
    
    initFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            window[funcName]();
        }
    });
    
    // Disparar evento de componentes cargados
    window.dispatchEvent(new CustomEvent('componentsLoaded'));
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadComponents);
} else {
    loadComponents();
}