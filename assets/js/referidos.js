/* ==========================================================
   SISTEMA DE REFERIDOS NIW - JAVASCRIPT (REFERIDOS.JS)
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Configuración de la Empresa
  const COMPANY_PHONE = '573243651165';
  const STORAGE_KEY = 'niw_referral_data';
  const TARGET_REFERRALS = 5;

  // Referencias DOM
  const formCreateCode = document.getElementById('form-create-code');
  const inputUserName = document.getElementById('ref-user-name');
  const inputUserPhone = document.getElementById('ref-user-phone');
  const cardRegister = document.getElementById('ref-card-register');
  const cardActiveDashboard = document.getElementById('ref-card-active');
  
  const displayGreeting = document.getElementById('ref-active-greeting');
  const displayCode = document.getElementById('ref-display-code');
  const displayLink = document.getElementById('ref-display-link');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const btnCopyLink = document.getElementById('btn-copy-link');
  const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
  const btnResetUser = document.getElementById('btn-reset-user');

  // Progreso DOM
  const displayCount = document.getElementById('ref-count-number');
  const progressFill = document.getElementById('ref-progress-fill');
  const checkpoints = document.querySelectorAll('.ref-checkpoint');
  const historyList = document.getElementById('ref-history-list');
  const historyEmpty = document.getElementById('ref-history-empty');

  // Simulador DOM
  const btnSimAdd = document.getElementById('btn-sim-add');
  const btnSimComplete = document.getElementById('btn-sim-complete');
  const btnSimReset = document.getElementById('btn-sim-reset');

  // Cupón y Premio DOM
  const rewardContainer = document.getElementById('ref-reward-container');
  const displayRewardCode = document.getElementById('ref-reward-code');
  const btnCopyReward = document.getElementById('btn-copy-reward');
  const btnClaimWhatsapp = document.getElementById('btn-claim-whatsapp');

  // Notificación de Visitante Invitado
  const visitorBanner = document.getElementById('ref-visitor-banner');
  const visitorCodeText = document.getElementById('ref-visitor-code-text');
  const btnConfirmVisit = document.getElementById('btn-confirm-visit');

  // Toast flotante
  const toast = document.getElementById('ref-toast');

  // Lista de nombres ficticios para simulación divertida y realista
  const simulatedNames = [
    { name: 'Carlos Mendoza', biz: 'Restaurante El Fuego' },
    { name: 'Andrea Peñaranda', biz: 'Joyería Ámbar' },
    { name: 'Mateo Cárdenas', biz: 'Óptica Visión Clara' },
    { name: 'Valeria Restrepo', biz: 'Inmobiliaria Futuro' },
    { name: 'Santiago Morales', biz: 'Automotores del Norte' },
    { name: 'Dr. Alejandro Silva', biz: 'Consultorio Dental Silva' },
    { name: 'Daniela Gómez', biz: 'Moda & E-commerce Urbana' }
  ];

  // Helper para Toasts
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3200);
  }

  // Generar Código Alfanumérico Único
  function generateUniqueCode(name) {
    const cleanName = (name || 'USER')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z]/g, '')
      .slice(0, 5) || 'NIW';
    
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `NIW-${cleanName}-${randomChars}`;
  }

  // Generar Código de Descuento del 100% para el premio
  function generateRewardCode() {
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `DESC100-FREE-${randomHex}`;
  }

  // Obtener URL de Referido
  function getReferralLink(code) {
    // Si estamos en un servidor web o en local
    let baseUrl = window.location.href.split('?')[0];
    if (baseUrl.includes('referidos.html')) {
      baseUrl = baseUrl.replace('referidos.html', 'index.html');
    } else if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl + 'index.html';
    }
    return `${baseUrl}?ref=${encodeURIComponent(code)}`;
  }

  // Cargar estado desde LocalStorage
  function loadState() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error cargando estado de referidos:', e);
    }
    return null;
  }

  // Guardar estado en LocalStorage
  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error guardando estado de referidos:', e);
    }
  }

  // Renderizar la UI con el estado actual
  function renderUI(state) {
    if (!state || !state.user) {
      // Estado Inicial: Mostrar Formulario de Registro
      if (cardRegister) cardRegister.style.display = 'block';
      if (cardActiveDashboard) cardActiveDashboard.style.display = 'none';
      if (rewardContainer) rewardContainer.classList.remove('active');
      updateProgressDisplay(0);
      renderReferralHistory([]);
      return;
    }

    // Usuario Registrado: Mostrar Dashboard Activo
    if (cardRegister) cardRegister.style.display = 'none';
    if (cardActiveDashboard) cardActiveDashboard.style.display = 'block';

    const code = state.user.code;
    const refLink = getReferralLink(code);

    if (displayGreeting) {
      displayGreeting.textContent = `¡Hola, ${state.user.name}! Tu código está activo.`;
    }
    if (displayCode) displayCode.textContent = code;
    if (displayLink) {
      displayLink.textContent = refLink;
      displayLink.setAttribute('title', refLink);
    }

    // Configurar enlace de compartir por WhatsApp
    if (btnShareWhatsapp) {
      const shareText = encodeURIComponent(
        `¡Hola! Te recomiendo a Niw para crear la página web de tu negocio. ` +
        `Incluye dominio, hosting, IA integrada y catálogo autoadministrable. ` +
        `Cotiza usando mi enlace de invitado para recibir asesoría prioritaria:\n${refLink}`
      );
      btnShareWhatsapp.href = `https://api.whatsapp.com/send?text=${shareText}`;
    }

    // Actualizar Progreso
    const count = (state.referrals && state.referrals.length) || 0;
    updateProgressDisplay(count);
    renderReferralHistory(state.referrals || []);

    // Verificar si se alcanzó la meta de 5 referidos
    if (count >= TARGET_REFERRALS) {
      if (!state.rewardCode) {
        state.rewardCode = generateRewardCode();
        saveState(state);
      }
      unlockReward(state.rewardCode);
    } else {
      if (rewardContainer) rewardContainer.classList.remove('active');
    }
  }

  // Actualizar Barra y Números de Progreso
  function updateProgressDisplay(count) {
    const clampedCount = Math.min(count, TARGET_REFERRALS);
    const percentage = (clampedCount / TARGET_REFERRALS) * 100;

    if (displayCount) displayCount.textContent = clampedCount;
    if (progressFill) progressFill.style.width = `${percentage}%`;

    checkpoints.forEach((cp, index) => {
      const stepIndex = index + 1;
      if (stepIndex <= clampedCount) {
        cp.classList.add('achieved');
      } else {
        cp.classList.remove('achieved');
      }
    });
  }

  // Renderizar Historial de Amigos Referidos
  function renderReferralHistory(list) {
    if (!historyList) return;

    // Limpiar elementos dinámicos previos (manteniendo mensaje de vacío si aplica)
    const existingItems = historyList.querySelectorAll('.ref-referral-item');
    existingItems.forEach(item => item.remove());

    if (!list || list.length === 0) {
      if (historyEmpty) historyEmpty.style.display = 'block';
      return;
    }

    if (historyEmpty) historyEmpty.style.display = 'none';

    list.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'ref-referral-item';
      row.innerHTML = `
        <div class="ref-item-info">
          <div class="ref-item-avatar">${index + 1}</div>
          <div>
            <div class="ref-item-name">${item.name || 'Amigo Referido'} ${item.biz ? `(${item.biz})` : ''}</div>
            <div class="ref-item-date">${item.date || 'Reciente'}</div>
          </div>
        </div>
        <div class="ref-item-status">✔️ ${item.status || 'Confirmado'}</div>
      `;
      historyList.appendChild(row);
    });
  }

  // Desbloquear Premio al Llegar a 5
  function unlockReward(rewardCode) {
    if (!rewardContainer) return;
    rewardContainer.classList.add('active');

    if (displayRewardCode) {
      displayRewardCode.textContent = rewardCode;
    }

    // Configurar el botón de WhatsApp con el mensaje EXACTO requerido por el usuario:
    // "Mi código de descuento por invitar a 5 personas es: CODIGO Quisiera reclamarlo"
    if (btnClaimWhatsapp) {
      const rawMessage = `Mi código de descuento por invitar a 5 personas es: ${rewardCode} Quisiera reclamarlo`;
      const encodedMessage = encodeURIComponent(rawMessage);
      btnClaimWhatsapp.href = `https://api.whatsapp.com/send?phone=${COMPANY_PHONE}&text=${encodedMessage}`;
    }

    // Scroll suave hacia el cupón de premio si recién se desbloqueó
    rewardContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Evento: Crear Código
  if (formCreateCode) {
    formCreateCode.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = inputUserName ? inputUserName.value.trim() : '';
      const phone = inputUserPhone ? inputUserPhone.value.trim() : '';

      if (!name) {
        showToast('⚠️ Por favor ingresa tu nombre o el de tu negocio');
        return;
      }

      const newCode = generateUniqueCode(name);
      const newState = {
        user: {
          name: name,
          phone: phone,
          code: newCode,
          createdAt: new Date().toLocaleDateString('es-CO')
        },
        referrals: [],
        rewardCode: null
      };

      saveState(newState);
      renderUI(newState);
      showToast('🎉 ¡Tu código de referido ha sido generado!');
    });
  }

  // Evento: Copiar Código
  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', () => {
      const code = displayCode ? displayCode.textContent.trim() : '';
      if (!code) return;

      navigator.clipboard.writeText(code).then(() => {
        btnCopyCode.classList.add('copied');
        btnCopyCode.textContent = '¡Copiado!';
        showToast(`📋 Código ${code} copiado al portapapeles`);
        setTimeout(() => {
          btnCopyCode.classList.remove('copied');
          btnCopyCode.textContent = 'Copiar Código';
        }, 2200);
      }).catch(() => {
        showToast('⚠️ No se pudo copiar automáticamente');
      });
    });
  }

  // Evento: Copiar Enlace
  if (btnCopyLink) {
    btnCopyLink.addEventListener('click', () => {
      const state = loadState();
      if (!state || !state.user) return;
      const link = getReferralLink(state.user.code);

      navigator.clipboard.writeText(link).then(() => {
        btnCopyLink.classList.add('copied');
        btnCopyLink.textContent = '¡Copiado!';
        showToast('🔗 Enlace copiado al portapapeles');
        setTimeout(() => {
          btnCopyLink.classList.remove('copied');
          btnCopyLink.textContent = 'Copiar Enlace';
        }, 2200);
      }).catch(() => {
        showToast('⚠️ No se pudo copiar automáticamente');
      });
    });
  }

  // Evento: Copiar Cupón de Recompensa
  if (btnCopyReward) {
    btnCopyReward.addEventListener('click', () => {
      const code = displayRewardCode ? displayRewardCode.textContent.trim() : '';
      if (!code) return;

      navigator.clipboard.writeText(code).then(() => {
        btnCopyReward.classList.add('copied');
        btnCopyReward.textContent = '¡Copiado!';
        showToast(`🎉 Cupón ${code} copiado`);
        setTimeout(() => {
          btnCopyReward.classList.remove('copied');
          btnCopyReward.textContent = 'Copiar Cupón';
        }, 2200);
      }).catch(() => {
        showToast('⚠️ No se pudo copiar automáticamente');
      });
    });
  }

  // Evento: Resetear Usuario / Crear Nuevo
  if (btnResetUser) {
    btnResetUser.addEventListener('click', () => {
      if (confirm('¿Deseas reiniciar tu código o ingresar con otro nombre?')) {
        localStorage.removeItem(STORAGE_KEY);
        renderUI(null);
        showToast('🔄 Estado reiniciado. Ya puedes generar un nuevo código.');
      }
    });
  }

  // ==========================================================
  // SIMULADOR DE PRUEBAS INTERACTIVO
  // ==========================================================
  if (btnSimAdd) {
    btnSimAdd.addEventListener('click', () => {
      let state = loadState();
      if (!state || !state.user) {
        showToast('⚠️ Primero genera tu código de referido arriba para iniciar la simulación.');
        return;
      }

      state.referrals = state.referrals || [];
      if (state.referrals.length >= TARGET_REFERRALS) {
        showToast('✨ Ya has alcanzado la meta máxima de 5 referidos.');
        return;
      }

      const nextSample = simulatedNames[state.referrals.length % simulatedNames.length];
      state.referrals.push({
        id: 'sim-' + Date.now(),
        name: nextSample.name,
        biz: nextSample.biz,
        date: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        status: 'Confirmado'
      });

      saveState(state);
      renderUI(state);
      showToast(`➕ Referido simulado: ${nextSample.name} (+1)`);
    });
  }

  if (btnSimComplete) {
    btnSimComplete.addEventListener('click', () => {
      let state = loadState();
      if (!state || !state.user) {
        showToast('⚠️ Primero genera tu código de referido arriba.');
        return;
      }

      state.referrals = [];
      for (let i = 0; i < TARGET_REFERRALS; i++) {
        const sample = simulatedNames[i % simulatedNames.length];
        state.referrals.push({
          id: 'sim-' + (Date.now() + i),
          name: sample.name,
          biz: sample.biz,
          date: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
          status: 'Confirmado'
        });
      }

      saveState(state);
      renderUI(state);
      showToast('🎉 ¡5 referidos completados al instante! Cupón 100% desbloqueado.');
    });
  }

  if (btnSimReset) {
    btnSimReset.addEventListener('click', () => {
      let state = loadState();
      if (!state || !state.user) return;

      state.referrals = [];
      state.rewardCode = null;
      saveState(state);
      renderUI(state);
      showToast('🔄 Contador de referidos reiniciado a 0/5.');
    });
  }

  // ==========================================================
  // DETECCIÓN DE ENLACE DE REFERIDO VISITANTE (?ref=CODE)
  // ==========================================================
  const urlParams = new URLSearchParams(window.location.search);
  const refParam = urlParams.get('ref');

  if (refParam && visitorBanner) {
    visitorBanner.classList.add('show');
    if (visitorCodeText) {
      visitorCodeText.innerHTML = `Llegaste invitado por el código especial: <strong>${refParam}</strong>.`;
    }

    if (btnConfirmVisit) {
      btnConfirmVisit.addEventListener('click', () => {
        let state = loadState();
        // Si el usuario actual tiene el mismo código, no puede autoreferirse
        if (state && state.user && state.user.code === refParam) {
          showToast('ℹ️ Este es tu propio código de referido.');
          return;
        }

        // Si es otro o no tiene código propio, registramos un referido si existe el estado del anfitrión
        if (state && state.user && state.user.code === refParam) {
          state.referrals = state.referrals || [];
          if (state.referrals.length < TARGET_REFERRALS) {
            state.referrals.push({
              id: 'ref-' + Date.now(),
              name: 'Visitante Web Amigo',
              biz: 'Contacto Referido',
              date: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
              status: 'Confirmado'
            });
            saveState(state);
            renderUI(state);
          }
        }
        showToast(`🎉 ¡Confirmaste tu visita con el código ${refParam}!`);
        visitorBanner.classList.remove('show');
      });
    }
  }

  // ==========================================================
  // FAQ ACORDEÓN
  // ==========================================================
  const faqItems = document.querySelectorAll('.ref-faq-item');
  faqItems.forEach(item => {
    item.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      faqItems.forEach(i => i.classList.remove('open'));
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });

  // Inicializar UI al cargar la página
  const initialState = loadState();
  renderUI(initialState);
});
