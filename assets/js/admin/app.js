/* ==========================================================
   APP — Main application: router, shell, Phase 1 pages
   ========================================================== */

const App = (() => {

  const TABS = [
    { id: 'resumen',       nombre: 'Resumen Ejecutivo',          icon: '📊', fase: 8 },
    { id: 'utilidad',      nombre: 'Utilidad Real',             icon: '💰', fase: 4 },
    { id: 'finanzas',      nombre: 'Finanzas y Rentabilidad',   icon: '📈', fase: 4 },
    { id: 'flujo_caja',    nombre: 'Flujo de Caja y Runway',     icon: '💵', fase: 4 },
    { id: 'cartera',       nombre: 'Cartera y Facturas',         icon: '🧾', fase: 2 },
    { id: 'compras',       nombre: 'Compras y Proveedores',     icon: '🛒', fase: 3 },
    { id: 'ventas',        nombre: 'Ventas y Clientes',         icon: '🎯', fase: 5 },
    { id: 'meta_ads',      nombre: 'Meta Ads',                   icon: '📘', fase: 6 },
    { id: 'ingenieria',    nombre: 'Ingeniería',                icon: '⚙️', fase: 7, opcional: true },
    { id: 'proyectos',     nombre: 'Proyectos',                 icon: '📁', fase: 7 },
    { id: 'configuracion', nombre: 'Configuración y Docs',      icon: '🔧', fase: 1 },
  ];

  let currentTab = 'resumen';
  let dateRange = 'this_month';
  let customFrom = '';
  let customTo = '';

  // ── Init ──────────────────────────────────────────────
  function init() {
    Store.load();
    const user = Auth.getCurrentUser();
    if (user) showApp(); else showLogin();

    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('btn-logout').addEventListener('click', () => {
      Auth.logout();
      showLogin();
    });

    // Sidebar toggle (mobile)
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Theme toggle
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);

    // Date range
    document.getElementById('date-range').addEventListener('change', (e) => {
      dateRange = e.target.value;
      document.getElementById('custom-date-range').style.display = dateRange === 'custom' ? 'flex' : 'none';
      renderCurrentPage();
    });

    // Export
    document.getElementById('btn-export').addEventListener('click', handleExport);

    // Modal close
    document.getElementById('modal-close').addEventListener('click', UI.closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') UI.closeModal();
    });

    // Restore theme
    const savedTheme = localStorage.getItem('niw_admin_theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeBtn(savedTheme);

    // Hash routing
    window.addEventListener('hashchange', handleHash);
    handleHash();
  }

  function handleHash() {
    const hash = location.hash.replace('#', '') || 'resumen';
    if (TABS.find(t => t.id === hash)) {
      currentTab = hash;
      if (Auth.getCurrentUser()) renderApp();
    }
  }

  // ── Login ─────────────────────────────────────────────
  function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-shell').style.display = 'none';
  }

  function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';
    renderApp();
  }

  function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const user = Auth.login(email, password);
    if (user) {
      errorEl.textContent = '';
      showApp();
      UI.toast(`Bienvenido, ${user.nombre}`, 'success');
    } else {
      errorEl.textContent = 'Correo o contraseña incorrectos.';
    }
  }

  // ── Theme ─────────────────────────────────────────────
  function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('niw_admin_theme', next);
    updateThemeBtn(next);
  }
  function updateThemeBtn(theme) {
    document.getElementById('btn-theme').textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  // ── Export ────────────────────────────────────────────
  function handleExport() {
    UI.toast('Exportación a PDF/Excel disponible en fases siguientes', 'info');
  }

  // ── Render App ────────────────────────────────────────
  function renderApp() {
    renderSidebar();
    renderTopbar();
    renderCurrentPage();
  }

  function renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    const user = Auth.getCurrentUser();
    const empresa = Store.get('empresa');
    const ingenieriaActiva = empresa?.ingenieriaActiva;

    nav.innerHTML = TABS.map(tab => {
      const hasAccess = Auth.hasPermission(tab.id);
      if (tab.opcional && !ingenieriaActiva) return '';
      if (!hasAccess) return '';
      return `<button class="nav-item ${tab.id === currentTab ? 'active' : ''}" data-tab="${tab.id}">
        <span class="nav-icon">${tab.icon}</span>
        <span>${tab.nombre}</span>
      </button>`;
    }).filter(Boolean).join('');

    nav.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        currentTab = tabId;
        location.hash = tabId;
        document.getElementById('sidebar').classList.remove('open');
        renderApp();
      });
    });
  }

  function renderTopbar() {
    const tab = TABS.find(t => t.id === currentTab);
    document.getElementById('topbar-title').textContent = tab ? tab.nombre : '';
  }

  function renderCurrentPage() {
    const content = document.getElementById('content');
    const tab = TABS.find(t => t.id === currentTab);
    if (!tab) return;

    // Pages implemented
    if (currentTab === 'configuracion') {
      content.innerHTML = renderConfig();
      bindConfig();
      return;
    }
    if (currentTab === 'cartera') {
      content.innerHTML = CarteraPage.render();
      CarteraPage.bind();
      return;
    }

    // Placeholder for future phases
    content.innerHTML = renderComingSoon(tab);
  }

  function renderComingSoon(tab) {
    return `<div class="coming-soon">
      <div class="cs-icon">${tab.icon}</div>
      <h2>${tab.nombre}</h2>
      <p>Este módulo será construido en la <strong>Fase ${tab.fase}</strong>.</p>
      <p>Actualmente está en desarrollo. Fase 1 completada: modelo de datos, roles, menú lateral y configuración.</p>
      <span class="phase-tag">Fase ${tab.fase} — Próximamente</span>
    </div>`;
  }

  // ══════════════════════════════════════════════════════
  // CONFIGURATION PAGE
  // ══════════════════════════════════════════════════════

  function renderConfig() {
    const emp = Store.get('empresa');
    const umbrales = Store.get('umbralesKPI');
    const categorias = Store.get('categoriasGasto') || [];
    const usuarios = Store.get('usuarios') || [];
    const logs = (Store.get('logsAuditoria') || []).slice(-15).reverse();
    const canEdit = Auth.canWrite('configuracion');

    // ── Company section ──
    const companyHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">Datos de la Empresa</div></div>
        <div class="grid grid-2">
          ${UI.formField('Nombre de la empresa', 'cfg-nombre', 'text', emp.nombre)}
          ${UI.formField('NIT', 'cfg-nit', 'text', emp.nit)}
          ${UI.formField('Moneda', 'cfg-moneda', 'select', emp.moneda, { options: [
            { value: 'COP', label: 'COP — Peso Colombiano' },
            { value: 'USD', label: 'USD — Dólar' },
            { value: 'EUR', label: 'EUR — Euro' },
          ]})}
          ${UI.formField('Símbolo', 'cfg-simbolo', 'text', emp.simbolo)}
          ${UI.formField('% IVA', 'cfg-iva', 'number', emp.ivaPct, { step: '0.1' })}
          ${UI.formField('% Impuesto de renta estimado', 'cfg-renta', 'number', emp.rentaPct, { step: '0.1' })}
          ${UI.formField('% ICA estimado', 'cfg-ica', 'number', emp.icaPct, { step: '0.1' })}
          ${UI.formField('Colchón de caja (meses)', 'cfg-colchon', 'number', emp.colchonCajaMeses, { min: '0' })}
        </div>
        ${canEdit ? '<button class="btn btn-primary mt-16" id="btn-save-empresa">Guardar empresa</button>' : '<p class="muted mt-16">Solo lectura — sin permisos para editar.</p>'}
      </div>`;

    // ── Engineering toggle ──
    const engHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">Módulos</div></div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="cfg-ingenieria" ${emp.ingenieriaActiva ? 'checked' : ''} ${canEdit ? '' : 'disabled'}>
            Activar pestaña de Ingeniería (DORA + indicadores)
          </label>
        </div>
        ${canEdit ? '<button class="btn btn-primary" id="btn-save-modulos">Guardar</button>' : ''}
      </div>`;

    // ── KPI Thresholds ──
    const kpiLabels = {
      margenBruto: 'Margen Bruto %', margenNeto: 'Margen Neto %', runway: 'Runway (meses)',
      dso: 'Días de Cartera (DSO)', ltvCac: 'Relación LTV/CAC', roas: 'ROAS', nps: 'NPS',
    };
    const umbralesHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">Metas y Umbrales de KPIs (Semáforos)</div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Indicador</th><th>Verde (Meta)</th><th>Amarillo</th><th>Tipo</th></tr></thead>
            <tbody>
              ${Object.keys(umbrales).map(k => {
                const u = umbrales[k];
                return `<tr>
                  <td>${kpiLabels[k] || k}</td>
                  <td><input type="number" class="kpi-input" data-kpi="${k}" data-field="verde" value="${u.verde}" step="0.1" ${canEdit ? '' : 'readonly'}></td>
                  <td><input type="number" class="kpi-input" data-kpi="${k}" data-field="amarillo" value="${u.amarillo}" step="0.1" ${canEdit ? '' : 'readonly'}></td>
                  <td>
                    <select class="kpi-input" data-kpi="${k}" data-field="tipo" ${canEdit ? '' : 'disabled'}>
                      <option value="min" ${u.tipo === 'min' ? 'selected' : ''}>Mayor es mejor</option>
                      <option value="max" ${u.tipo === 'max' ? 'selected' : ''}>Menor es mejor</option>
                    </select>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${canEdit ? '<button class="btn btn-primary mt-16" id="btn-save-umbrales">Guardar umbrales</button>' : ''}
      </div>`;

    // ── Expense categories ──
    const catHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">Categorías de Gasto</div>
          ${canEdit ? '<button class="btn btn-primary btn-sm" id="btn-add-categoria">+ Agregar</button>' : ''}
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Tipo</th>${canEdit ? '<th>Acciones</th>' : ''}</tr></thead>
            <tbody>
              ${categorias.map(c => `<tr>
                <td>${c.nombre}</td>
                <td><span class="badge ${c.tipo === 'fijo' ? 'badge-blue' : 'badge-gray'}">${c.tipo}</span></td>
                ${canEdit ? `<td><button class="btn-icon" data-del-cat="${c.id}" title="Eliminar">🗑</button></td>` : ''}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    // ── Users section ──
    const roles = Auth.ROLES;
    const usersHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">Usuarios y Roles</div>
          ${canEdit ? '<button class="btn btn-primary btn-sm" id="btn-add-user">+ Nuevo usuario</button>' : ''}
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th>${canEdit ? '<th>Acciones</th>' : ''}</tr></thead>
            <tbody>
              ${usuarios.map(u => `<tr>
                <td>${u.nombre}</td>
                <td>${u.email}</td>
                <td><span class="badge badge-blue">${roles[u.rol]?.nombre || u.rol}</span></td>
                <td><span class="badge ${u.activo ? 'badge-green' : 'badge-gray'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
                ${canEdit ? `<td class="table-actions">
                  <button class="btn-icon" data-edit-user="${u.id}" title="Editar">✏️</button>
                  <button class="btn-icon" data-del-user="${u.id}" title="Eliminar">🗑</button>
                </td>` : ''}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    // ── Role descriptions ──
    const rolesDescHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">Roles y Permisos</div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Rol</th><th>Descripción</th><th>Acceso</th></tr></thead>
            <tbody>
              ${Object.values(roles).map(r => `<tr>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.descripcion}</td>
                <td>${r.permisos.includes('*') ? 'Todas las pestañas' : r.permisos.join(', ')}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    // ── Audit log ──
    const logsHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">Registro de Auditoría (últimos 15)</div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
            <tbody>
              ${logs.length === 0 ? '<tr><td colspan="4" class="muted text-center">Sin registros.</td></tr>' :
                logs.map(l => `<tr>
                  <td>${new Date(l.fecha).toLocaleString('es-CO')}</td>
                  <td>${l.usuario}</td>
                  <td>${l.accion}</td>
                  <td class="muted">${l.detalle}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    // ── Data management ──
    const dataHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">Gestión de Datos</div></div>
        <p class="muted mb-16">Los datos se almacenan localmente en el navegador. Puedes exportarlos o reiniciar el sistema.</p>
        <div class="flex gap-8 flex-wrap">
          <button class="btn btn-ghost" id="btn-export-data">📥 Exportar datos (JSON)</button>
          <button class="btn btn-ghost" id="btn-import-data">📤 Importar datos (JSON)</button>
          <button class="btn btn-danger" id="btn-reset-data">🗑 Reiniciar todo</button>
        </div>
        <input type="file" id="import-file" accept=".json" style="display:none;">
      </div>`;

    // ── Documentation ──
    const docsHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">Documentación</div></div>
        <div class="section-title">Manual de uso</div>
        <p class="muted mb-16">Esta sección contendrá el glosario de indicadores, manual por módulo, diccionario de datos y bitácora de cambios. Se completará en la Fase 8.</p>
        <div class="section-title">Entidades del modelo de datos</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Entidad</th><th>Descripción</th></tr></thead>
            <tbody>
              <tr><td>Empresa</td><td>Configuración general: nombre, NIT, moneda, impuestos</td></tr>
              <tr><td>Usuario</td><td>Usuarios del panel con rol y permisos</td></tr>
              <tr><td>Cliente</td><td>Ficha con historial de facturas y pagos</td></tr>
              <tr><td>Proveedor</td><td>Ficha con historial de OC y pagos</td></tr>
              <tr><td>Proyecto</td><td>Presupuesto, fechas, responsable, estado, hitos</td></tr>
              <tr><td>Factura</td><td>Venta o compra con estados y retenciones</td></tr>
              <tr><td>PagoFactura</td><td>Registro de pagos parciales/totales</td></tr>
              <tr><td>OrdenCompra</td><td>OC con flujo de estados y PDF</td></tr>
              <tr><td>ItemOrdenCompra</td><td>Ítems de una OC</td></tr>
              <tr><td>Gasto</td><td>Gasto con categoría y recurrencia</td></tr>
              <tr><td>Ingreso</td><td>Ingreso no facturado</td></tr>
              <tr><td>Lead</td><td>Prospecto en el embudo de ventas</td></tr>
              <tr><td>Venta</td><td>Venta cerrada vinculada a cliente/lead</td></tr>
              <tr><td>EncuestaNPS</td><td>Respuesta de NPS con score y comentario</td></tr>
              <tr><td>CampañaMeta</td><td>Campaña publicitaria de Meta</td></tr>
              <tr><td>MetricaMetaDiaria</td><td>Métricas diarias por campaña</td></tr>
              <tr><td>Despliegue</td><td>Registro de despliegue (DORA)</td></tr>
              <tr><td>Incidente</td><td>Registro de incidente (DORA)</td></tr>
              <tr><td>MetaKPI</td><td>Objetivo de un KPI</td></tr>
              <tr><td>LogAuditoria</td><td>Bitácora de cambios</td></tr>
            </tbody>
          </table>
        </div>
      </div>`;

    return `
      <div class="page-header">
        <h1>Configuración y Documentación</h1>
        <p>Parámetros de la empresa, roles, KPIs, categorías y datos del sistema.</p>
      </div>
      ${companyHTML}
      ${engHTML}
      ${umbralesHTML}
      ${catHTML}
      ${usersHTML}
      ${rolesDescHTML}
      ${dataHTML}
      ${docsHTML}
      ${logsHTML}
    `;
  }

  function bindConfig() {
    const canEdit = Auth.canWrite('configuracion');

    // Save company
    const btnEmp = document.getElementById('btn-save-empresa');
    if (btnEmp) btnEmp.addEventListener('click', () => {
      const emp = Store.get('empresa');
      Store.set('empresa', {
        ...emp,
        nombre: val('cfg-nombre'),
        nit: val('cfg-nit'),
        moneda: val('cfg-moneda'),
        simbolo: val('cfg-simbolo'),
        ivaPct: parseFloat(val('cfg-iva')) || 0,
        rentaPct: parseFloat(val('cfg-renta')) || 0,
        icaPct: parseFloat(val('cfg-ica')) || 0,
        colchonCajaMeses: parseFloat(val('cfg-colchon')) || 0,
      });
      const user = Auth.getCurrentUser();
      Store.log(user?.nombre, 'Editó empresa', 'empresa', 'Actualizó datos de la empresa');
      UI.toast('Datos de empresa guardados', 'success');
      renderApp();
    });

    // Save modules
    const btnMod = document.getElementById('btn-save-modulos');
    if (btnMod) btnMod.addEventListener('click', () => {
      const emp = Store.get('empresa');
      Store.set('empresa', { ...emp, ingenieriaActiva: document.getElementById('cfg-ingenieria').checked });
      const user = Auth.getCurrentUser();
      Store.log(user?.nombre, 'Editó módulos', 'empresa', `Ingeniería: ${document.getElementById('cfg-ingenieria').checked ? 'activada' : 'desactivada'}`);
      UI.toast('Módulos actualizados', 'success');
      renderApp();
    });

    // Save thresholds
    const btnUmb = document.getElementById('btn-save-umbrales');
    if (btnUmb) btnUmb.addEventListener('click', () => {
      const umbrales = Store.get('umbralesKPI');
      document.querySelectorAll('.kpi-input').forEach(inp => {
        const kpi = inp.dataset.kpi;
        const field = inp.dataset.field;
        if (!umbrales[kpi]) umbrales[kpi] = {};
        umbrales[kpi][field] = field === 'tipo' ? inp.value : parseFloat(inp.value) || 0;
      });
      Store.set('umbralesKPI', umbrales);
      const user = Auth.getCurrentUser();
      Store.log(user?.nombre, 'Editó umbrales KPI', 'umbralesKPI', 'Actualizó metas y semáforos');
      UI.toast('Umbrales guardados', 'success');
    });

    // Add category
    const btnAddCat = document.getElementById('btn-add-categoria');
    if (btnAddCat) btnAddCat.addEventListener('click', () => {
      UI.modal('Nueva categoría de gasto', `
        ${UI.formField('Nombre', 'cat-nombre', 'text')}
        ${UI.formField('Tipo', 'cat-tipo', 'select', 'variable', { options: [
          { value: 'fijo', label: 'Fijo' },
          { value: 'variable', label: 'Variable' },
        ]})}
      `, `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
         <button class="btn btn-primary" id="modal-save-cat">Guardar</button>`);
      document.getElementById('modal-save-cat').addEventListener('click', () => {
        const nombre = val('cat-nombre');
        if (!nombre) { UI.toast('Ingresa un nombre', 'error'); return; }
        Store.insert('categoriasGasto', { nombre, tipo: val('cat-tipo') });
        UI.closeModal();
        UI.toast('Categoría agregada', 'success');
        renderCurrentPage();
      });
    });

    // Delete category
    document.querySelectorAll('[data-del-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.remove('categoriasGasto', btn.dataset.delCat);
        UI.toast('Categoría eliminada', 'success');
        renderCurrentPage();
      });
    });

    // Add user
    const btnAddUser = document.getElementById('btn-add-user');
    if (btnAddUser) btnAddUser.addEventListener('click', () => {
      showUserModal();
    });

    // Edit user
    document.querySelectorAll('[data-edit-user]').forEach(btn => {
      btn.addEventListener('click', () => showUserModal(btn.dataset.editUser));
    });

    // Delete user
    document.querySelectorAll('[data-del-user]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delUser;
        UI.confirm('¿Eliminar este usuario?', () => {
          const result = Auth.deleteUser(id);
          if (result.error) UI.toast(result.error, 'error');
          else { UI.toast('Usuario eliminado', 'success'); renderCurrentPage(); }
        });
      });
    });

    // Export data
    document.getElementById('btn-export-data').addEventListener('click', () => {
      const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'niw-datos-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      UI.toast('Datos exportados', 'success');
    });

    // Import data
    document.getElementById('btn-import-data').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          Store.importJSON(ev.target.result);
          UI.toast('Datos importados', 'success');
          renderApp();
        } catch { UI.toast('Archivo inválido', 'error'); }
      };
      reader.readAsText(file);
    });

    // Reset data
    document.getElementById('btn-reset-data').addEventListener('click', () => {
      UI.confirm('¿Reiniciar todos los datos? Esta acción no se puede deshacer.', () => {
        Store.reset();
        UI.toast('Datos reiniciados', 'success');
        showLogin();
      });
    });
  }

  function showUserModal(userId) {
    const isEdit = !!userId;
    const user = isEdit ? Store.findById('usuarios', userId) : null;
    const roles = Auth.ROLES;
    const roleOptions = Object.values(roles).map(r => ({ value: r.id, label: r.nombre }));

    UI.modal(
      isEdit ? 'Editar usuario' : 'Nuevo usuario',
      `
        ${UI.formField('Nombre', 'user-nombre', 'text', user?.nombre || '')}
        ${UI.formField('Email', 'user-email', 'email', user?.email || '')}
        ${UI.formField(isEdit ? 'Contraseña (dejar igual para no cambiar)' : 'Contraseña', 'user-password', 'text', isEdit ? '' : '')}
        ${UI.formField('Rol', 'user-rol', 'select', user?.rol || 'lectura', { options: roleOptions })}
        <div class="form-group">
          <label><input type="checkbox" id="user-activo" ${!user || user.activo ? 'checked' : ''}> Usuario activo</label>
        </div>
      `,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
       <button class="btn btn-primary" id="modal-save-user">Guardar</button>`
    );

    document.getElementById('modal-save-user').addEventListener('click', () => {
      const nombre = val('user-nombre');
      const email = val('user-email');
      const password = val('user-password');
      const rol = val('user-rol');
      const activo = document.getElementById('user-activo').checked;

      if (!nombre || !email) { UI.toast('Nombre y email son obligatorios', 'error'); return; }

      if (isEdit) {
        const updates = { nombre, email, rol, activo };
        if (password) updates.password = password;
        Auth.updateUser(userId, updates);
        UI.toast('Usuario actualizado', 'success');
      } else {
        if (!password) { UI.toast('Contraseña requerida', 'error'); return; }
        // Check email not taken
        const exists = (Store.get('usuarios') || []).find(u => u.email === email);
        if (exists) { UI.toast('Ya existe un usuario con ese email', 'error'); return; }
        Auth.createUser({ nombre, email, password, rol, activo });
        UI.toast('Usuario creado', 'success');
      }
      UI.closeModal();
      renderCurrentPage();
    });
  }

  // ── Helpers ───────────────────────────────────────────
  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  return { init, TABS, renderCurrentPage };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
