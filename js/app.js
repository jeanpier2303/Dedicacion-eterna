// Aplicación principal mejorada de Sueños de Papiro
const app = {
    // Datos de la aplicación mejorados para libretas
    data: {
        libretas: [
            {
                id: 1,
                title: "Libreta Clásica Elegante",
                author: "Cuero natural con detalles dorados",
                description: "Libreta artesanal en cuero natural con esquinas reforzadas, páginas de papel algodón.",
                pages: 200,
                year: 2024,
                category: "Libreta de Cuero",
                price: 50000,
                oldPrice: 60000,
                rating: 4.8,
                badge: "Más Vendida",
                coverImage: "../asset/images/auth/1.png"            },
            {
                id: 2,
                title: "Libreta Viajera Aventurera",
                author: "Tela encerada impermeable",
                description: "Perfecta para viajeros, con cubierta impermeable, bolsillo interior y papel resistente a la tinta.",
                pages: 180,
                year: 2024,
                category: "Libreta de Viaje",
                price: 50000,
                oldPrice: 60000,
                rating: 4.9,
                badge: "Nueva Colección",
                coverImage: "../asset/images/auth/2.png",
            },
            {
                id: 3,
                title: "Libreta Minimalista Zen",
                author: "Lino natural con hilo bordado",
                description: "Diseño minimalista con portada de lino, papel de arroz y costura expuesta artesanal.",
                pages: 160,
                year: 2024,
                category: "Libreta Minimalista",
                price: 50000,
                oldPrice: 60000,
                rating: 4.7,
                badge: "Edición Limitada",
                coverImage: "../asset/images/auth/3.png",
            },
            {
                id: 4,
                title: "Libreta Vintage Coleccionista",
                author: "Piel envejecida artesanalmente",
                pages: 240,
                year: 2024,
                category: "Libreta Vintage",
                price: 50000,
                rating: 5.0,
                badge: "Coleccionista",
                coverImage: "../asset/images/auth/4.png",
            }
        ],

        libretasAdicionales: [
            {
                id: 5,
                title: "Libreta Acuarelista Profesional",
                author: "Papel para acuarela 300g",
                description: "Especial para artistas, con papel para acuarela de alta gramaje y cubierta de lona impermeable.",
                pages: 120,
                year: 2024,
                category: "Libreta Artística",
                price: 50000,
                rating: 4.9,
                badge: "Profesional",
                coverImage: "../asset/images/auth/5.png",
            },
            {
                id: 6,
                title: "Libreta Ejecutiva Moderna",
                author: "Cuero italiano negro",
                description: "Elegante libreta ejecutiva con divisiones internas, tarjetero y papel de calidad premium.",
                pages: 220,
                year: 2024,
                category: "Libreta Ejecutiva",
                price: 50000,
                rating: 4.8,
                badge: "Premium",
                coverImage: "../asset/images/auth/6.png",
            },
            {
                id: 7,
                title: "Libreta Ecológica Natural",
                author: "Materiales 100% reciclados",
                description: "Libreta ecológica con papel reciclado, cubierta de corcho y tintas vegetales.",
                pages: 180,
                year: 2024,
                category: "Libreta Ecológica",
                price: 50000,
                rating: 4.7,
                badge: "Eco-Friendly",
                coverImage: "../asset/images/auth/7.png",
                backImage: "https://images.unsplash.com/photo-1461360228754-6e81c478b882?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            },
            {
                id: 8,
                title: "Libreta Infantil Creativa",
                author: "Tela lavable y páginas gruesas",
                description: "Libreta para niños con páginas extra gruesas, portada ilustrada y esquinas redondeadas.",
                pages: 100,
                year: 2024,
                category: "Libreta Infantil",
                price: 50000,
                rating: 4.9,
                badge: "Para Niños",
                coverImage: "../asset/images/auth/8.png",
            }
        ],
        
        testimonios: [
            {
                name: "María González",
                role: "Escritora",
                text: "Mi libreta personalizada es mi compañera de escritura. La calidad del papel y la encuadernación son excepcionales.",
                rating: 5,
                avatar: "https://i.pravatar.cc/150?u=1"
            },
            {
                name: "Carlos Rodríguez",
                role: "Artista",
                text: "Perfecta para mis bocetos y acuarelas. El papel no se ondula y la portada es una obra de arte en sí misma.",
                rating: 5,
                avatar: "https://i.pravatar.cc/150?u=5"
            },
            {
                name: "Ana Martínez",
                role: "Estudiante Universitaria",
                text: "Llevo mi libreta a todas partes. Es resistente, elegante y cada página es un placer para escribir.",
                rating: 4,
                avatar: ""
            }
        ],
        
        galeria: [
            {
                id: 1,
                title: "Proceso de Encuadernación",
                description: "Encuadernación artesanal hilo a hilo",
                category: "details",
                image: "../asset/images/auth/1.png"
            },
            {
                id: 2,
                title: "Detalles de Costura",
                description: "Costura expuesta con hilo encerado",
                category: "details",
                image: "../asset/images/auth/2.png"            },
            {
                id: 3,
                title: "Papeles Especiales",
                description: "Selección de papeles premium",
                category: "interior",
                image: "../asset/images/auth/3.png"
            },
            {
                id: 4,
                title: "Portadas Personalizadas",
                description: "Diferentes materiales y texturas",
                category: "covers",
                image: "../asset/images/auth/4.png"
            },
            {
                id: 5,
                title: "Portadas Personalizadas",
                description: "Diferentes materiales y texturas",
                category: "covers",
                image: "../asset/images/auth/1.png"
            }
        ]
    },
    
    // Elementos del DOM
    elements: {},
    
    // Estado de la aplicación
    state: {
        theme: 'light',
        cart: [],
        currentGalleryFilter: 'all',
        preloaderComplete: false
    },
    
    // Inicialización mejorada
    init: function() {
        // Bloquear scroll durante el preloader
        document.body.style.overflow = 'hidden';
        document.body.classList.add('preloader-active');
        
        // Inicializar preloader primero
        this.initPreloader();
        
        // Luego inicializar todo lo demás
        this.cacheElements();
        this.bindEvents();
        this.loadLibretas();
        this.loadTestimonios();
        this.loadGaleria();
        this.initTheme();
        this.initScrollAnimations();
        this.initModal();
    },
    
    // Cachear elementos del DOM
    cacheElements: function() {
        this.elements = {
            preloader: document.getElementById('preloader'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            typingText: document.getElementById('typing-text'),
            navMenu: document.getElementById('nav-menu'),
            navToggle: document.getElementById('nav-toggle'),
            navClose: document.getElementById('nav-close'),
            themeToggle: document.getElementById('theme-toggle'),
            mobileThemeToggle: document.getElementById('mobile-theme-toggle'),
            backToTop: document.getElementById('back-to-top'),
            librosGrid: document.getElementById('libros-grid'),
            testimonialsContainer: document.getElementById('testimonials-container'),
            galleryGrid: document.getElementById('gallery-grid'),
            galleryFilters: document.querySelectorAll('.filter-btn'),
            verMasLibretasBtn: document.getElementById('ver-mas-libretas'),
            libretasModal: document.getElementById('libretas-modal'),
            modalClose: document.getElementById('modal-close'),
            modalGrid: document.getElementById('modal-grid')
        };
    },
    
    // PRELOADER MEJORADO - Con libreta que se abre y cierra
    initPreloader: function() {
        if (!this.elements.preloader) {
            console.warn('Preloader no encontrado, continuando...');
            this.onPreloaderComplete();
            return;
        }
        
        // Asegurar que el preloader esté visible
        this.elements.preloader.style.display = 'flex';
        this.elements.preloader.style.opacity = '1';
        this.elements.preloader.style.visibility = 'visible';
        
        // Elementos específicos del nuevo preloader
        const notebookCover = document.querySelector('.notebook-cover');
        const notebookPreloader = document.querySelector('.notebook-preloader');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const typingText = document.getElementById('typing-text');
        
        // Iniciar animación de apertura de la libreta
        notebookCover.style.animation = 'openNotebookRealistic 2s ease-out forwards';
        
        // Configurar animación de carga
        let progress = 0;
        const totalTime = 4000; // 4 segundos total
        const updateInterval = 50; // Actualizar cada 50ms
        const totalUpdates = totalTime / updateInterval;
        const progressPerUpdate = 100 / totalUpdates;
        
        const progressInterval = setInterval(() => {
            progress += progressPerUpdate;
            
            // Limitar a 100%
            if (progress > 100) progress = 100;
            
            // Actualizar barra de progreso
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
            
            // Actualizar texto de progreso
            if (progressText) {
                progressText.textContent = `${Math.round(progress)}%`;
            }
            
            // Actualizar mensaje según progreso
            if (typingText) {
                let message = "Preparando tu libreta personal...";
                if (progress > 25) message = "Seleccionando materiales...";
                if (progress > 50) message = "Personalizando detalles...";
                if (progress > 75) message = "¡Listo para comenzar!";
                if (progress >= 100) message = "¡Bienvenido!";
                typingText.textContent = message;
            }
            
            // Cuando llegue al 100% - ANIMACIÓN DE CIERRE DE LIBRETA
            if (progress >= 100) {
                clearInterval(progressInterval);
                
                // Añadir clase de completado al preloader
                this.elements.preloader.classList.add('complete');
                
                // Animación de cierre de la libreta
                if (notebookCover) {
                    notebookCover.style.animation = 'closeNotebookRealistic 1.5s ease-in forwards';
                }
                
                // Efecto de pulso en toda la libreta
                if (notebookPreloader) {
                    notebookPreloader.classList.add('closing');
                }
                
                // Detener animación de páginas
                document.querySelectorAll('.notebook-pages .page').forEach(page => {
                    page.style.animation = 'none';
                    page.style.opacity = '0';
                });
                
                // Cambiar color de la barra de progreso
                if (progressFill) {
                    progressFill.style.background = 'var(--color-success)';
                }
                
                // Esperar a que termine la animación de cierre antes de desaparecer
                setTimeout(() => {
                    this.finishPreloader();
                }, 1500);
            }
        }, updateInterval);
        
        // Fallback de seguridad
        setTimeout(() => {
            if (!this.state.preloaderComplete) {
                clearInterval(progressInterval);
                this.finishPreloader();
            }
        }, 6000);
    },
    
    // Finalizar preloader con animación suave
    finishPreloader: function() {
        this.state.preloaderComplete = true;
        
        // Añadir clase de fade-out con retraso para ver la animación de cierre
        setTimeout(() => {
            this.elements.preloader.classList.add('fade-out');
            
            // Esperar a que termine la transición CSS
            setTimeout(() => {
                this.elements.preloader.style.display = 'none';
                this.onPreloaderComplete();
            }, 800);
        }, 500);
    },
    
    onPreloaderComplete: function() {
        // Restaurar scroll
        document.body.style.overflow = 'auto';
        document.body.classList.remove('preloader-active');
        
        // Iniciar AOS después del preloader
        this.initAOS();
        
        // Iniciar animación de estadísticas
        this.initStatsCounter();
        
        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('preloaderComplete'));
        
        console.log('Preloader completado exitosamente');
    },
    
    // Inicializar AOS después del preloader
    initAOS: function() {
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 800,
                once: true,
                mirror: false,
                offset: 100
            });
        }
    },
    
    // Animación de estadísticas del hero
    initStatsCounter: function() {
        const statNumbers = document.querySelectorAll('.stat-number');
        
        statNumbers.forEach(stat => {
            const target = parseFloat(stat.getAttribute('data-count'));
            const duration = 2000;
            const step = target / (duration / 16);
            let current = 0;
            
            const updateNumber = () => {
                current += step;
                if (current < target) {
                    stat.textContent = current.toFixed(target % 1 === 0 ? 0 : 1);
                    requestAnimationFrame(updateNumber);
                } else {
                    stat.textContent = target;
                }
            };
            
            // Iniciar animación cuando el elemento sea visible
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        updateNumber();
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });
            
            observer.observe(stat);
        });
    },
    
    // Vincular eventos
    bindEvents: function() {
        // Navegación móvil
        if (this.elements.navToggle) {
            this.elements.navToggle.addEventListener('click', () => {
                this.elements.navMenu.classList.add('show-menu');
                document.body.style.overflow = 'hidden';
            });
        }
        
        if (this.elements.navClose) {
            this.elements.navClose.addEventListener('click', () => {
                this.elements.navMenu.classList.remove('show-menu');
                document.body.style.overflow = 'auto';
            });
        }
        
        // Cerrar menú al hacer clic en enlace
        document.querySelectorAll('.nav__link').forEach(link => {
            link.addEventListener('click', () => {
                this.elements.navMenu.classList.remove('show-menu');
                document.body.style.overflow = 'auto';
            });
        });
        
        // Toggle de tema
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        if (this.elements.mobileThemeToggle) {
            this.elements.mobileThemeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Back to top mejorado
        if (this.elements.backToTop) {
            this.elements.backToTop.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            
            let scrollTimeout;
            window.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    if (window.scrollY > 300) {
                        this.elements.backToTop.classList.add('visible');
                    } else {
                        this.elements.backToTop.classList.remove('visible');
                    }
                }, 100);
            });
        }
        
        // Filtros de galería
        if (this.elements.galleryFilters) {
            this.elements.galleryFilters.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const filter = e.target.dataset.filter;
                    this.filterGaleria(filter);
                });
            });
        }
        
        // Botón Ver Más Libretas
        if (this.elements.verMasLibretasBtn) {
            this.elements.verMasLibretasBtn.addEventListener('click', () => {
                this.openModal();
            });
        }
        
        // Smooth scroll para enlaces internos
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 100,
                        behavior: 'smooth'
                    });
                }
            });
        });
    },
    
    // Cargar libretas
    loadLibretas: function() {
        if (!this.elements.librosGrid) return;
        
        this.elements.librosGrid.innerHTML = '';
        
        this.data.libretas.forEach(libreta => {
            const libretaCard = this.createLibretaCard(libreta);
            this.elements.librosGrid.appendChild(libretaCard);
        });
    },
    
    // Crear tarjeta de libreta
    createLibretaCard: function(libreta) {
        const div = document.createElement('div');
        div.className = 'libro-card';
        div.setAttribute('data-id', libreta.id);
        div.innerHTML = `
            <div class="libro-card-inner">
                <div class="libro-card-front">
                    <div class="libro-cover" style="background-image: url('${libreta.coverImage}')">
                        <div class="libro-badge">${libreta.badge}</div>
                        <div class="libro-shine"></div>
                        <h3 class="libro-title">${libreta.title}</h3>
                        <div class="libro-author-front">${libreta.author}</div>
                    </div>
                    <div class="libro-info">
                        <div class="libro-rating">
                            ${this.generateStars(libreta.rating)}
                            <span class="rating-text">${libreta.rating}/5</span>
                        </div>
                        <button class="libro-preview" onclick="app.showLibretaPreview(${libreta.id})">
                            <i class="fas fa-expand"></i> Ver Detalles
                        </button>
                    </div>
                </div>
                <div class="libro-card-back">
                    <div class="libro-back-content">
                        <h3 class="libro-back-title">${libreta.title}</h3>
                        <p class="libro-synopsis">${libreta.description}</p>
                        <ul class="libro-details">
                            <li><i class="fas fa-book-open"></i> <strong>${libreta.pages}</strong> páginas</li>
                            <li><i class="fas fa-tag"></i> ${libreta.category}</li>
                        </ul>
                        <div class="libro-price">
                            ${libreta.oldPrice ? `<span class="price-old">$${libreta.oldPrice}</span>` : ''}
                            ${libreta.price ? `<span class="price-new">$${libreta.price}</span>` : '<span class="price-coming">Próximamente</span>'}
                        </div>
                        <div class="libro-actions">
                            ${libreta.price ? 
                                `<a href="https://api.whatsapp.com/message/GTUT6QTKTZ45K1?autoload=1&app_absent=0${encodeURIComponent(libreta.title)}" 
                                   class="libro-button button button-primary" target="_blank">
                                    <i class="fab fa-whatsapp"></i> Comprar por WhatsApp
                                </a>` :
                                `<button class="libro-button button button-primary disabled">
                                    <i class="fas fa-bell"></i> Notificarme
                                </button>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return div;
    },
    
    // Vista previa de la libreta
    showLibretaPreview: function(libretaId) {
        const libreta = this.data.libretas.find(l => l.id === libretaId);
        if (!libreta) return;
        
        this.showNotification(`Vista previa de "${libreta.title}"`, 'info');
    },
    
    // Generar estrellas
    generateStars: function(rating) {
        let stars = '';
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.3;
        
        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                stars += '<i class="fas fa-star"></i>';
            } else if (i === fullStars + 1 && hasHalfStar) {
                stars += '<i class="fas fa-star-half-alt"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        
        return stars;
    },
    
    // Cargar testimonios
    loadTestimonios: function() {
        if (!this.elements.testimonialsContainer) return;
        
        this.elements.testimonialsContainer.innerHTML = '';
        
        this.data.testimonios.forEach(testimonio => {
            const testimonioCard = this.createTestimonioCard(testimonio);
            this.elements.testimonialsContainer.appendChild(testimonioCard);
        });
    },
    
    // Crear tarjeta de testimonio
    createTestimonioCard: function(testimonio) {
        const div = document.createElement('div');
        div.className = 'testimonial-card';
        div.innerHTML = `
            <div class="quote-icon">
                <i class="fas fa-quote-left"></i>
            </div>
            <p class="testimonial-text">"${testimonio.text}"</p>
            <div class="testimonial-author">
                <div class="author-avatar">
                    <img src="${testimonio.avatar}" alt="${testimonio.name}" loading="lazy">
                </div>
                <div class="author-info">
                    <h4>${testimonio.name}</h4>
                    <span>${testimonio.role}</span>
                </div>
                <div class="testimonial-rating">
                    ${this.generateStars(testimonio.rating)}
                </div>
            </div>
        `;
        
        return div;
    },
    
    // Cargar galería
    loadGaleria: function() {
        if (!this.elements.galleryGrid) return;
        
        this.elements.galleryGrid.innerHTML = '';
        
        this.data.galeria.forEach(item => {
            if (this.state.currentGalleryFilter === 'all' || item.category === this.state.currentGalleryFilter) {
                const galleryItem = this.createGalleryItem(item);
                this.elements.galleryGrid.appendChild(galleryItem);
            }
        });
    },
    
    // Crear item de galería
    createGalleryItem: function(item) {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        div.dataset.category = item.category;
        div.innerHTML = `
            <div class="gallery-image-container">
                <img src="${item.image}" alt="${item.title}" loading="lazy">
                <div class="gallery-overlay">
                    <h4>${item.title}</h4>
                    <p>${item.description}</p>
                    <button class="gallery-view-button">
                        <i class="fas fa-search-plus"></i>
                    </button>
                </div>
            </div>
        `;
        
        div.addEventListener('click', () => this.openLightbox(item));
        return div;
    },
    
    // Filtrar galería
    filterGaleria: function(filter) {
        this.state.currentGalleryFilter = filter;
        
        // Actualizar botones activos
        this.elements.galleryFilters.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Recargar galería con animación
        this.elements.galleryGrid.classList.add('filtering');
        setTimeout(() => {
            this.loadGaleria();
            setTimeout(() => {
                this.elements.galleryGrid.classList.remove('filtering');
            }, 50);
        }, 300);
    },
    
    // Lightbox
    openLightbox: function(item) {
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <button class="lightbox-close">&times;</button>
                <div class="lightbox-image-container">
                    <img src="${item.image}" alt="${item.title}">
                </div>
                <div class="lightbox-info">
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                    <div class="lightbox-meta">
                        <span class="category-badge">${item.category}</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(lightbox);
        document.body.style.overflow = 'hidden';
        
        // Cerrar lightbox
        const closeLightbox = () => {
            lightbox.classList.add('fade-out');
            setTimeout(() => {
                lightbox.remove();
                document.body.style.overflow = 'auto';
            }, 300);
        };
        
        lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
        
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
        
        // Cerrar con ESC
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closeLightbox();
                document.removeEventListener('keydown', escHandler);
            }
        });
    },
    
    // Inicializar Modal
    initModal: function() {
        if (!this.elements.libretasModal || !this.elements.modalClose) return;
        
        // Cerrar modal con botón
        this.elements.modalClose.addEventListener('click', () => {
            this.closeModal();
        });
        
        // Cerrar modal al hacer clic fuera
        this.elements.libretasModal.addEventListener('click', (e) => {
            if (e.target === this.elements.libretasModal) {
                this.closeModal();
            }
        });
        
        // Cargar libretas adicionales en el modal
        this.loadModalLibretas();
    },
    
    // Abrir Modal
    openModal: function() {
        if (!this.elements.libretasModal) return;
        
        this.elements.libretasModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    // Cerrar Modal
    closeModal: function() {
        if (!this.elements.libretasModal) return;
        
        this.elements.libretasModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    },
    
    // Cargar libretas en el modal
    loadModalLibretas: function() {
        if (!this.elements.modalGrid) return;
        
        this.elements.modalGrid.innerHTML = '';
        
        this.data.libretasAdicionales.forEach(libreta => {
            const libretaCard = this.createModalLibretaCard(libreta);
            this.elements.modalGrid.appendChild(libretaCard);
        });
    },
    
    // Crear tarjeta de libreta para el modal
    createModalLibretaCard: function(libreta) {
        const div = document.createElement('div');
        div.className = 'modal-libreta-card';
        div.innerHTML = `
            <div class="modal-libreta-image">
                <img src="${libreta.coverImage}" alt="${libreta.title}" loading="lazy">
                <div class="modal-libreta-badge">${libreta.badge}</div>
            </div>
            <div class="modal-libreta-info">
                <h4>${libreta.title}</h4>
                <p class="modal-libreta-author">${libreta.author}</p>
                <p class="modal-libreta-description">${libreta.description}</p>
                <div class="modal-libreta-details">
                    <span><i class="fas fa-book-open"></i> ${libreta.pages} páginas</span>
                    <span><i class="fas fa-tag"></i> ${libreta.category}</span>
                </div>
                <div class="modal-libreta-price">
                    <span class="modal-price">$${libreta.price}</span>
                </div>
                <div class="modal-libreta-actions">
                    <a href="https://wa.me/5215512345678?text=Hola,%20me%20interesa%20la%20libreta%20${encodeURIComponent(libreta.title)}" 
                       class="button button-primary" target="_blank">
                        <i class="fab fa-whatsapp"></i> Comprar
                    </a>
                    <button class="button button-outline" onclick="app.showLibretaPreview(${libreta.id})">
                        <i class="fas fa-info-circle"></i> Detalles
                    </button>
                </div>
            </div>
        `;
        
        return div;
    },
    
    // Tema oscuro/claro
    initTheme: function() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    },
    
    setTheme: function(theme) {
        this.state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Actualizar iconos
        const moonIcon = document.querySelector('.moon-icon');
        const sunIcon = document.querySelector('.sun-icon');
        
        if (moonIcon && sunIcon) {
            moonIcon.classList.toggle('hidden', theme === 'dark');
            sunIcon.classList.toggle('hidden', theme === 'light');
        }
        
        // Actualizar botón móvil
        const mobileIcon = document.querySelector('#mobile-theme-toggle i');
        if (mobileIcon) {
            mobileIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    },
    
    toggleTheme: function() {
        const newTheme = this.state.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    },
    
    // Animaciones al hacer scroll
    initScrollAnimations: function() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                    observer.unobserve(entry.target);
                }
            });
        }, { 
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        document.querySelectorAll('.libro-card, .testimonial-card, .gallery-item, .section-header').forEach(el => {
            observer.observe(el);
        });
    },
    
    // Carrito
    addToCart: function(libretaId) {
        const libreta = this.data.libretas.find(l => l.id === libretaId);
        if (!libreta || !libreta.price) return;
        
        this.state.cart.push({
            id: libreta.id,
            title: libreta.title,
            price: libreta.price,
            quantity: 1,
            image: libreta.coverImage
        });
        
        this.updateCartCount();
        this.showNotification(`${libreta.title} agregado al carrito`);
    },
    
    updateCartCount: function() {
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = this.state.cart.length;
            cartCount.classList.add('pulse');
            setTimeout(() => cartCount.classList.remove('pulse'), 300);
        }
    },
    
    // Notificaciones
    showNotification: function(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, inicializando aplicación...');
    
    // Verificar que el preloader exista
    if (!document.getElementById('preloader')) {
        console.warn('Preloader no encontrado, continuando sin él...');
        document.body.style.overflow = 'auto';
    }
    
    if (window.app && typeof app.init === 'function') {
        app.init();
    } else {
        console.error('Error: app no está definida o no tiene método init');
        document.body.style.overflow = 'auto';
    }
});

// Fallback de seguridad para el preloader
setTimeout(function() {
    const preloader = document.getElementById('preloader');
    if (preloader && preloader.style.display !== 'none') {
        console.log('Fallback: Ocultando preloader después de timeout');
        preloader.style.display = 'none';
        document.body.style.overflow = 'auto';
        document.body.classList.remove('preloader-active');
        
        // Inicializar AOS si no se ha hecho
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 800,
                once: true,
                mirror: false,
                offset: 100
            });
        }
    }
}, 6000); // 6 segundos como máximo

// Hacer app global para usar en HTML
window.app = app;