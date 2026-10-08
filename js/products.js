// ============================================================
// products.js — ÚNICA fuente de datos del catálogo
// ------------------------------------------------------------
// Bloque 2: array único PRODUCTS (se eliminaron `libretas` y
// `libretasAdicionales`). Para agregar un producto basta añadir
// un objeto aquí: NO hay que tocar index.html, CSS ni catalog.js.
//
// Reglas:
//  - `id`: slug estable y único.
//  - `category`: una clave de CATEGORIES.
//  - `image`: ruta local en assets/images/products/.
//  - `price: null` = "Consultar precio" (no inventar precios).
//  - `featured: true` = visible al inicio; el resto sale con
//    "Ver más productos" o eligiendo su filtro.
//  - Sin ratings, sin badges comerciales, sin props de la plantilla anterior.
// ============================================================

window.CATEGORIES = {
    agendas: 'Agendas',
    cuadros: 'Cuadros',
    fotografia: 'Fotografía',
    impresiones: 'Impresiones',
    velas: 'Velas',
    carteles: 'Carteles',
    albumes: 'Álbumes',
    invitaciones: 'Invitaciones',
    regalos: 'Regalos',
    papeleria: 'Papelería',
    otros: 'Otros'
};

window.PRODUCTS = [
    {
        id: 'agenda-personalizada-150-hojas',
        name: 'Agenda Personalizada (150 Hojas) – Tu Estilo, Tus Ideas',
        category: 'agendas',
        shortDescription: 'Haz que tu día a día sea único con una agenda pensada totalmente para ti.',
        description: 'Agenda Personalizada (150 Hojas) – Tu Estilo, Tus Ideas\nHaz que tu día a día sea único con una agenda pensada totalmente para ti. Diseñada para acompañarte en tu estudio, trabajo o proyectos personales, combina la máxima practicidad con un toque exclusivo.\nCaracterísticas principales:\n * 100% Personalizable: Llévala a tu estilo. Elige la foto, diseño o imagen que más te guste para la portada.\n * 150 Hojas (300 páginas): Espacio de sobra para organizar todo tu año sin preocuparte por el espacio.\n * Tipo de hoja a tu elección: Escoge el interior que mejor se adapte a tu forma de escribir u organizar:\n   * Rayadas: Ideales para tomar notas, escribir diarios o apuntes diarios.\n   * Punteadas: Perfectas para Bullet Journal, esquemas o bocetos rápidos.\n   * Cuadriculadas: Excelentes para gráficos, cálculos, tablas o un trazo más estructurado.\n * Tamaño cómodo y práctico: Ideal para llevar en la mochila o bolso a todas partes.\n¡Organiza tus días con un toque personal único o sorprende a alguien especial con un regal',
        image: 'assets/images/products/profuctos nuevos-one/1/1.jpeg',
        images: [
            'assets/images/products/profuctos nuevos-one/1/1.jpeg',
            'assets/images/products/profuctos nuevos-one/1/2.jpeg'
        ],
        price: null,
        oldPrice: null,
        featured: true
    },
    {
        id: 'agenda-personalizada-tu-estilo',
        name: 'Agenda Personalizada – Tu Estilo, Tus Ideas',
        category: 'agendas',
        shortDescription: 'Haz que tu día a día sea único con una agenda pensada totalmente para ti.',
        description: 'Agenda Personalizada – Tu Estilo, Tus Ideas\nHaz que tu día a día sea único con una agenda pensada totalmente para ti. Diseñada para acompañarte en tu estudio, trabajo o proyectos personales, combina la máxima practicidad con un toque exclusivo.\nCaracterísticas principales:\n * 100% Personalizable: Llévala a tu estilo. Elige la foto, diseño o imagen que más te guste para la portada.\n * 150 Hojas (300 páginas): Espacio de sobra para organizar todo tu año sin preocuparte por el espacio.\n * Tipo de hoja a tu elección: Escoge el interior que mejor se adapte a tu forma de escribir u organizar:\n   * Rayadas: Ideales para tomar notas, escribir diarios o apuntes diarios.\n   * Punteadas: Perfectas para Bullet Journal, esquemas o bocetos rápidos.\n   * Cuadriculadas: Excelentes para gráficos, cálculos, tablas o un trazo más estructurado.\n * Tamaño cómodo y práctico: Ideal para llevar en la mochila o bolso a todas partes.\n¡Organiza tus días con un toque personal único o sorprende a alguien especial con un regal',
        image: 'assets/images/products/profuctos nuevos-one/2/1.jpeg',
        images: [
            'assets/images/products/profuctos nuevos-one/2/1.jpeg',
            'assets/images/products/profuctos nuevos-one/2/2.jpeg',
            'assets/images/products/profuctos nuevos-one/2/3.jpeg'
        ],
        price: null,
        oldPrice: null,
        featured: true
    },
    {
        id: 'dos-velitas-un-mismo-deseo',
        name: 'Dos Velitas, Un Mismo Deseo',
        category: 'velas',
        shortDescription: 'Porque el amor también puede encenderse a la distancia.',
        description: '🕯️❤️ DOS VELITAS, UN MISMO DESEO ❤️🕯️\n\nPorque el amor también puede encenderse a la distancia. ✨\n\nAunque estén a kilómetros de distancia, tú y tu pareja pueden encender la misma luz, pedir el mismo deseo y compartir una misma oración.\n\nEste 8 de diciembre hagan de esta tradición un momento para ustedes. ❤️\n\n💌 Personaliza tus velitas con la foto de ustedes y recibe un detalle creado especialmente para compartir ese momento, estén donde estén.\n\n✨ Tu pedido incluye:\n\n🕯️ Dos velitas personalizadas con el sticker de la foto de ustedes.\n🔥 Fósforos para encenderlas.\n💌 Una hojita especial para escribir sus deseos.\n🙏 Una oración de plegaria dedicada a la pareja.\n\n📸 Tú nos envías la foto de ustedes y nosotros hacemos el resto.\n\nPueden estar juntos, separados por kilómetros o simplemente querer regalarse un momento especial… porque hay deseos que merecen pedirse juntos. ❤️\n\nDos velitas.\nDos lugares.\nUn mismo deseo. ✨\n\n💰 Valor: $10.000\n\n📩 Agenda tu pedido por mensaje directo.\n\nQue la distancia nunca sea más grande que un deseo',
        image: 'assets/images/products/profuctos nuevos-one/3/1.jpeg',
        images: [
            'assets/images/products/profuctos nuevos-one/3/1.jpeg',
            'assets/images/products/profuctos nuevos-one/3/2.jpeg'
        ],
        price: null,
        oldPrice: null,
        featured: true
    },
    {
        id: 'agenda-universitaria-plus',
        name: 'Agenda Universitaria Plus',
        category: 'agendas',
        shortDescription: 'Tu semestre. Tus materias. Tu estilo. Tu manera de organizarte.',
        description: '✨ AGENDA UNIVERSITARIA PLUS ✨\n\nTu semestre. Tus materias. Tu estilo. Tu manera de organizarte. 📚💜\n\n¿Y si tu agenda universitaria pudiera ser exactamente como tú la necesitas?\n\nEn Dedicación Eterna creamos la Agenda Universitaria PLUS, pensada para acompañarte durante tu semestre y ayudarte a organizar clases, trabajos, apuntes, pendientes y todo eso que hace parte de la vida universitaria.\n\n📚 5 MATERIAS · 125 HOJAS\n\nLa Agenda Universitaria PLUS cuenta con 125 hojas, distribuidas en:\n\n5 materias × 25 hojas por materia.\n\nY tú decides cómo quieres tus páginas:\n\n📖 Todas rayadas.\n📐 Todas cuadriculadas.\n✨ 3 materias rayadas + 2 cuadriculadas.\n💜 O una combinación personalizada según tus necesidades.\n\nPorque no todas las carreras, ni todas las personas, estudian de la misma manera.\n\n✨ ¿QUÉ INCLUYE?\n\n📅 Calendario anual.\n🗓️ Calendario perpetuo.\n⏰ Horario de clases.\n🎯 Espacio para organizar tus metas académicas.\n📚 5 secciones independientes para tus materias.',
        image: 'assets/images/products/profuctos nuevos-one/4/1.jpeg',
        images: [
            'assets/images/products/profuctos nuevos-one/4/1.jpeg',
            'assets/images/products/profuctos nuevos-one/4/2.jpeg'
        ],
        price: null,
        oldPrice: null,
        featured: true
    },
    {
        id: 'vela-personalizada',
        name: 'Vela Personalizada',
        category: 'velas',
        shortDescription: 'Un detalle pensado para celebrar momentos especiales.',
        description: 'Hay deseos que se dicen en voz alta… y otros que se encienden con el corazón. Esta vela de Jesús Nazareno de Magüí Payán puede ser ese pequeño detalle para alguien especial, para acompañar tus oraciones, tus sueños, tus proyectos o aquello que deseas con todo el corazón. Una luz para un deseo, una oración, una esperanza o un momento de gratitud.',
        image: 'assets/images/products/velas-one/vela-01.jpeg',
        images: [
            'assets/images/products/velas-one/vela-01.jpeg',
            'assets/images/products/velas-one/vela-02.jpeg',
            'assets/images/products/velas-one/vela-03.jpeg'
        ],
        price: null,
        oldPrice: null,
        featured: true
    },
    {
        id: 'agenda-profesional-tech',
        name: 'Agenda Profesional Personalizada',
        category: 'agendas',
        shortDescription: 'Portada con tu foto, nombre y profesión en acabado brillante.',
        description: 'Agenda con anillado y portada totalmente personalizada: tu fotografía, tu nombre y los símbolos de tu profesión con acabado brillante. Cuéntanos tu idea por WhatsApp y la diseñamos contigo.',
        image: 'assets/images/products/producto-personalizado-02.jpg',
        price: null,
        oldPrice: null,
        featured: true
    },
    {
        id: 'agenda-ingenieria-civil',
        name: 'Agenda de Ingeniería Personalizada',
        category: 'agendas',
        shortDescription: 'Tu foto y tu especialidad en una portada elegante con brillo.',
        description: 'Agenda con anillado, fotografía personal y detalles de tu carrera en portada con acabado brillante. Ideal para profesionales y estudiantes. Consúltanos las opciones de personalización.',
        image: 'assets/images/products/producto-personalizado-13.jpg',
        price: null,
        oldPrice: null,
        featured: true
    },
    {
        id: 'agenda-retrato-artistico',
        name: 'Agenda con Retrato Artístico',
        category: 'agendas',
        shortDescription: 'Ilustración personalizada en portada con estilo artístico.',
        description: 'Agenda con anillado y retrato ilustrado en portada. Envíanos tu fotografía y la convertimos en una ilustración única para tu agenda.',
        image: 'assets/images/products/producto-personalizado-03.jpg',
        price: null,
        oldPrice: null,
        featured: true
    },
    {
        id: 'agenda-tematica-personalizada',
        name: 'Agenda Temática Personalizada',
        category: 'agendas',
        shortDescription: 'Tu tema favorito y tu nombre en portada.',
        description: 'Agenda con anillado y portada temática a tu gusto: campo, animales, paisajes o el tema que elijas, con tu nombre incluido. Pregunta por WhatsApp.',
        image: 'assets/images/products/producto-personalizado-04.jpg',
        price: null,
        oldPrice: null,
        featured: true
    },
    {
        id: 'agenda-diseno-artistico',
        name: 'Agenda con Diseño Artístico',
        category: 'agendas',
        shortDescription: 'Diseños originales a todo color con acabado brillante.',
        description: 'Agenda con anillado y diseño artístico original a todo color. Elige entre nuestros diseños o pide uno creado especialmente para ti.',
        image: 'assets/images/products/producto-personalizado-05.jpg',
        price: null,
        oldPrice: null,
        featured: true
    },
    {
        id: 'cuaderno-infantil-panda',
        name: 'Cuaderno Infantil Personalizado',
        category: 'regalos',
        shortDescription: 'Diseños tiernos para niñas y niños, ideal para regalo.',
        description: 'Cuaderno con anillado y diseño infantil tierno con acabado brillante. Un regalo personalizado perfecto para niñas y niños: podemos añadir su nombre en portada.',
        image: 'assets/images/products/producto-personalizado-06.jpg',
        price: null,
        oldPrice: null,
        featured: true
    },
    {
        id: 'agenda-anime-personalizada',
        name: 'Agenda Anime Personalizada',
        category: 'agendas',
        shortDescription: 'Tus personajes favoritos en portada y contraportada.',
        description: 'Agenda con anillado y diseño anime a todo color en portada y contraportada con acabado brillante. Para fans de verdad: elige tu personaje o serie favorita.',
        image: 'assets/images/products/producto-personalizado-07.jpg',
        price: null,
        oldPrice: null,
        featured: true
    },
    {
        id: 'agenda-diseno-exclusivo',
        name: 'Agenda de Diseño Exclusivo',
        category: 'agendas',
        shortDescription: 'Diseños únicos con estilo elegante y acabado brillante.',
        description: 'Agenda con anillado y diseño exclusivo de nuestra colección, con acabado brillante y contraportada a juego. Consúltanos los diseños disponibles.',
        image: 'assets/images/products/producto-personalizado-08.jpg',
        price: null,
        oldPrice: null,
        featured: true
    },
    {
        id: 'agenda-deportiva-personalizada',
        name: 'Agenda Deportiva Personalizada',
        category: 'agendas',
        shortDescription: 'Los colores de tu equipo con tu nombre y número.',
        description: 'Agenda con anillado y portada deportiva: escudo de tu equipo, tu nombre y tu número en acabado brillante. Perfecta para hinchas de corazón.',
        image: 'assets/images/products/producto-personalizado-09.jpg',
        price: null,
        oldPrice: null,
        featured: false
    },
    {
        id: 'diseno-totalmente-a-tu-idea',
        name: 'Diseño Totalmente a Tu Idea',
        category: 'otros',
        shortDescription: '¿Tienes otra idea? La diseñamos desde cero contigo.',
        description: 'Si lo que buscas no está en el catálogo, lo creamos: cuéntanos tu idea, envíanos tus fotos o referencias y diseñamos tu producto personalizado desde cero.',
        image: 'assets/images/products/producto-personalizado-01.jpg',
        price: null,
        oldPrice: null,
        featured: false
    }
];

// NOTA: las fotos producto-personalizado-10, 11 y 12 son tomas
// alternativas (estilo de vida) de diseños ya publicados arriba
// (panda, ingeniero civil y tech). Quedan como assets pendientes
// para una futura galería por producto (campo `images: []`).

window.TESTIMONIALS = [
    {
        name: 'María González',
        role: 'Escritora',
        text: 'Mi libreta personalizada es mi compañera de escritura. La calidad del papel y la encuadernación son excepcionales.',
        rating: 5,
        avatar: ''
    },
    {
        name: 'Carlos Rodríguez',
        role: 'Artista',
        text: 'Perfecta para mis bocetos y acuarelas. El papel no se ondula y la portada es una obra de arte en sí misma.',
        rating: 5,
        avatar: ''
    },
    {
        name: 'Ana Martínez',
        role: 'Estudiante Universitaria',
        text: 'Llevo mi libreta a todas partes. Es resistente, elegante y cada página es un placer para escribir.',
        rating: 4,
        avatar: ''
    }
];

window.GALLERY = [
    {
        id: 1,
        title: 'Retratos que Cuentan Historias',
        description: 'Tu fotografía, convertida en diseño de portada',
        category: 'disenos',
        image: 'assets/images/products/producto-personalizado-11.jpg'
    },
    {
        id: 2,
        title: 'Acabados con Brillo',
        description: 'Laminado brillante y anillado dorado a la vista',
        category: 'detalles',
        image: 'assets/images/products/producto-personalizado-12.jpg'
    },
    {
        id: 3,
        title: 'Diseños para los Más Pequeños',
        description: 'Diseños tiernos con acabado brillante',
        category: 'disenos',
        image: 'assets/images/products/producto-personalizado-10.jpg'
    }
];
