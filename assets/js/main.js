/* ==========================================================
   PLANTILLA NIW WEB - JAVASCRIPT PRINCIPAL
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Elementos de la sección "Ideales para"
  const catButtons = document.querySelectorAll('.cat-btn');
  const laptopImages = document.querySelectorAll('.laptop-mockup-img');
  const mobileImages = document.querySelectorAll('.mobile-mockup-img');
  const previewStatusText = document.getElementById('preview-status-text');

  const categoryDescriptions = {
    ecommerce: 'Tienda en línea completa con carrito, catálogo interactivo y pasarela de pago.',
    restaurantes: 'Restaurante & Comidas con menú digital, fotos de platillos y pedidos por WhatsApp.',
    joyerias: 'Joyería fina & alta relojería con catálogo exclusivo y solicitud de asesoría personalizada.',
    opticas: 'Óptica & visión con catálogo de monturas, probador virtual y agendamiento de citas.',
    inmobiliarias: 'Portal inmobiliario con fichas técnicas, filtros de búsqueda y recorridos de propiedades.',
    autos: 'Concesionario de vehículos con inventario detallado, simulador de crédito y test drive.',
    consultorios: 'Centro médico & odontológico con especialidades y reserva de citas en línea.'
  };

  function switchCategory(catId) {
    if (!catId) return;

    // Actualizar botones
    catButtons.forEach(btn => {
      const isTarget = btn.getAttribute('data-category') === catId;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-pressed', isTarget ? 'true' : 'false');
    });

    // Actualizar imágenes del portátil
    laptopImages.forEach(img => {
      const isTarget = img.getAttribute('data-category') === catId;
      img.classList.toggle('active', isTarget);
    });

    // Actualizar imágenes del celular
    mobileImages.forEach(img => {
      const isTarget = img.getAttribute('data-category') === catId;
      img.classList.toggle('active', isTarget);
    });

    // Actualizar texto de estado
    if (previewStatusText && categoryDescriptions[catId]) {
      const activeBtn = document.querySelector(`.cat-btn[data-category="${catId}"]`);
      const catName = activeBtn ? activeBtn.innerText.trim() : catId;
      previewStatusText.innerHTML = `Mostrando: <strong>${catName}</strong> — ${categoryDescriptions[catId]}`;
    }
  }

  // Escuchar eventos tanto de hover (mouseenter) como de click en cada botón
  catButtons.forEach(btn => {
    const catId = btn.getAttribute('data-category');

    // Al pasar el mouse por encima (hover)
    btn.addEventListener('mouseenter', () => {
      switchCategory(catId);
    });

    // Al hacer click
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      switchCategory(catId);
    });
  });

  // 2. Navegación fluida y enlaces directos
  const cotizaBtn = document.getElementById('btn-cotiza');
  const verPlanesBtn = document.getElementById('btn-planes');
  const formSection = document.getElementById('personalizar-configuracion');
  const planesSection = document.getElementById('que-viene-despues');

  if (cotizaBtn && formSection) {
    cotizaBtn.addEventListener('click', (e) => {
      e.preventDefault();
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const companyInput = document.getElementById('form-company');
      if (companyInput) {
        setTimeout(() => companyInput.focus(), 600);
      }
    });
  }

  if (verPlanesBtn && planesSection) {
    verPlanesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      planesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Botón "Empezar" dentro de la sección ¿Qué viene después?
  const btnStartSteps = document.getElementById('btn-start-steps');
  if (btnStartSteps && formSection) {
    btnStartSteps.addEventListener('click', (e) => {
      e.preventDefault();
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // 3. Navbar con efecto scrolled
  const siteNav = document.getElementById('site-nav');
  window.addEventListener('scroll', () => {
    if (siteNav) {
      if (window.scrollY > 40) {
        siteNav.classList.add('scrolled');
      } else {
        siteNav.classList.remove('scrolled');
      }
    }
  });

  // 4. Selección de Categoría en el Formulario "Cotiza tu web"
  const formCatPills = document.querySelectorAll('.form-cat-pill');
  const formSelectedCatInput = document.getElementById('form-selected-category');

  formCatPills.forEach(pill => {
    pill.addEventListener('click', () => {
      formCatPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const categoryValue = pill.getAttribute('data-category');
      if (formSelectedCatInput) {
        formSelectedCatInput.value = categoryValue;
      }
    });
  });

  // 5. Manejo del Formulario de Configuración
  const configForm = document.getElementById('config-form');
  const toastModal = document.getElementById('toast-modal');
  const toastClose = document.getElementById('toast-close');
  const toastMessage = document.getElementById('toast-message');

  function showToast(message, isSuccess = true) {
    if (!toastModal) return;
    if (toastMessage) toastMessage.innerHTML = message;
    toastModal.classList.add('show');

    setTimeout(() => {
      toastModal.classList.remove('show');
    }, 7000);
  }

  if (toastClose) {
    toastClose.addEventListener('click', () => {
      toastModal.classList.remove('show');
    });
  }

  if (configForm) {
    configForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const company = document.getElementById('form-company')?.value.trim();
      const category = formSelectedCatInput?.value || 'E-commerce';
      const deadline = document.getElementById('form-deadline')?.value;

      if (!company) {
        showToast('⚠️ Por favor ingresa el nombre de tu empresa.', false);
        return;
      }

      // Crear mensaje para WhatsApp / Confirmación
      let referralNote = '';
      if (refParam) {
        referralNote = `• Código de referido invitado: ${refParam}\n`;
      }

      const whatsappText = encodeURIComponent(
        `¡Hola! Acabo de solicitar una cotización en la web:\n` +
        `• Nombre de la empresa: ${company}\n` +
        `• Necesito una web para: ${category}\n` +
        `• Fecha límite: ${deadline || 'Flexible'}\n` +
        referralNote +
        `¡Me gustaría recibir la cotización personalizada!`
      );

      const whatsappUrl = `https://api.whatsapp.com/send?phone=573243651165&text=${whatsappText}`;

      // Si llegó con código de referido, registrar apoyo en localStorage si existe cuenta
      if (refParam) {
        try {
          const rawData = localStorage.getItem('niw_referral_data');
          if (rawData) {
            const refData = JSON.parse(rawData);
            if (refData && refData.user && refData.user.code === refParam) {
              refData.referrals = refData.referrals || [];
              if (refData.referrals.length < 5) {
                refData.referrals.push({
                  id: 'quote-' + Date.now(),
                  name: company,
                  biz: category,
                  date: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                  status: 'Cotización Enviada'
                });
                localStorage.setItem('niw_referral_data', JSON.stringify(refData));
              }
            }
          }
        } catch (err) {
          console.error(err);
        }
      }

      showToast(`
        <strong>¡Solicitud para "${company}" recibida!</strong><br>
        Categoría seleccionada: <strong>${category}</strong>.<br>
        ${refParam ? `<small style="color:#25d366;">Código de referido aplicado: ${refParam}</small><br>` : ''}
        <div style="margin-top: 10px;">
          <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" 
             style="display:inline-block; padding: 7px 16px; background: #25d366; color: #fff; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 0.82rem;">
            📱 Continuar cotización por WhatsApp
          </a>
        </div>
      `, true);

      configForm.reset();
      // Restaurar categoría por defecto
      if (formCatPills.length > 0) {
        formCatPills.forEach(p => p.classList.remove('active'));
        formCatPills[0].classList.add('active');
        if (formSelectedCatInput) formSelectedCatInput.value = 'E-commerce';
      }
    });
  }

  // 6. Detección de Código de Referido en URL (?ref=...)
  const urlParams = new URLSearchParams(window.location.search);
  const refParam = urlParams.get('ref');
  const refAlertBanner = document.getElementById('index-ref-alert-banner');
  const refCodeDisplay = document.getElementById('index-ref-code-display');
  const btnCloseRefBanner = document.getElementById('btn-close-ref-banner');

  if (refParam && refAlertBanner) {
    if (refCodeDisplay) refCodeDisplay.textContent = refParam;
    refAlertBanner.classList.add('show');
  }

  if (btnCloseRefBanner && refAlertBanner) {
    btnCloseRefBanner.addEventListener('click', () => {
      refAlertBanner.classList.remove('show');
    });
  }
});
