/* ==========================================================
   JAVASCRIPT PARA LA PÁGINA DE DEMOS (DEMO.JS)
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Filtros de Categorías
  const filterButtons = document.querySelectorAll('.filter-btn');
  const demoCards = document.querySelectorAll('.demo-card');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetCategory = btn.getAttribute('data-filter');

      // Actualizar botones de filtro
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Filtrar tarjetas
      demoCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        if (targetCategory === 'all' || cardCategory === targetCategory) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  // 2. Lightbox Modal
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxSubtitle = document.getElementById('lightbox-subtitle');
  const lightboxLaptopImg = document.getElementById('lightbox-laptop-img');
  const lightboxMobileImg = document.getElementById('lightbox-mobile-img');
  const lightboxWhatsappBtn = document.getElementById('lightbox-whatsapp-btn');

  const viewDemoButtons = document.querySelectorAll('.btn-demo-view');

  viewDemoButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.demo-card');
      if (!card) return;

      const title = card.getAttribute('data-title') || 'Demostración de Sitio Web';
      const subtitle = card.getAttribute('data-subtitle') || 'Vista previa completa para escritorio y móvil';
      const laptopSrc = card.getAttribute('data-laptop');
      const mobileSrc = card.getAttribute('data-mobile');
      const categoryName = card.querySelector('.demo-tag')?.innerText || 'Proyecto';

      if (lightboxTitle) lightboxTitle.innerText = title;
      if (lightboxSubtitle) lightboxSubtitle.innerText = `${categoryName} • ${subtitle}`;
      if (lightboxLaptopImg && laptopSrc) lightboxLaptopImg.src = laptopSrc;
      if (lightboxMobileImg && mobileSrc) lightboxMobileImg.src = mobileSrc;

      if (lightboxWhatsappBtn) {
        const text = encodeURIComponent(`¡Hola! Me encantó la demo de "${title}" (${categoryName}) y quiero una cotización similar.`);
        lightboxWhatsappBtn.href = `https://api.whatsapp.com/send?phone=573243651165&text=${text}`;
      }

      if (lightboxModal) {
        lightboxModal.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  function closeLightbox() {
    if (lightboxModal) {
      lightboxModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  if (lightboxCloseBtn) {
    lightboxCloseBtn.addEventListener('click', closeLightbox);
  }

  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) {
        closeLightbox();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
    }
  });
});
