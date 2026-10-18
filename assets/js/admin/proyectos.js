/* ==========================================================
   PROYECTOS PAGE — Gestión de proyectos (Fase 7)
   ========================================================== */

const ProyectosPage = (() => {

  const ESTADOS = ['planificacion', 'en_progreso', 'en_pausa', 'completado', 'cancelado'];
  const estadoLabels = {
    planificacion: 'Planificación', en_progreso: 'En progreso', en_pausa: 'En pausa',
    completado: 'Completado', cancelado: 'Cancelado'
  };

  function render() {
    const canEdit = Auth.canWrite('proyectos');
    const proyectos = Store.get('proyectos') || [];

    const kpis = renderKPIs(proyectos);
    const list = renderList(canEdit, proyectos);

    return `
      <div class="page-header">
        <h1>Proyectos</h1>
        <p>Gestión de proyectos: presupuesto, rentabilidad, fechas y estado.</p>
      </div>
      ${kpis}
      ${list}
    `;
  }

  function renderKPIs(proyectos) {
    const activos = proyectos.filter(p => p.estado === 'en_progreso');
    const totalPresupuesto = proyectos.reduce((s, p) => s + (p.presupuesto || 0), 0);
    const totalFacturado = proyectos.reduce((s, p) => s + (p.facturado || 0), 0);
    const totalCostos = proyectos.reduce((s, p) => s + (p.costos || 0), 0);
    const margenTotal = totalFacturado - totalCostos;
    const completados = proyectos.filter(p => p.estado === 'completado').length;

    return `
      <div class="grid grid-4">
        ${UI.kpiCard('Proyectos Activos', activos.length, `de ${proyectos.length} totales`, 'gray')}
        ${UI.kpiCard('Presupuesto Total', UI.formatCOP(totalPresupuesto), '—', 'gray')}
        ${UI.kpiCard('Facturado', UI.formatCOP(totalFacturado), `Costos: ${UI.formatCOP(totalCostos)}`, 'gray')}
        ${UI.kpiCard('Margen Proyectos', UI.formatCOP(margenTotal), `${completados} completados`, margenTotal >= 0 ? 'green' : 'red')}
      </div>`;
  }

  function renderList(canEdit, proyectos) {
    const rows = proyectos.map(p => {
      const margen = (p.facturado || 0) - (p.costos || 0);
      const margenPct = p.facturado > 0 ? (margen / p.facturado * 100).toFixed(0) : 0;
      const progreso = p.progreso || 0;
      const estadoBadge = `<span class="badge badge-${p.estado === 'completado' ? 'green' : p.estado === 'en_progreso' ? 'blue' : p.estado === 'en_pausa' ? 'yellow' : p.estado === 'cancelado' ? 'red' : 'gray'}">${estadoLabels[p.estado] || p.estado}</span>`;
      const responsable = p.responsable || '—';
      return [
        `<strong>${p.nombre}</strong>`,
        p.clienteNombre || '—',
        responsable,
        estadoBadge,
        `<div class="progress-bar"><div class="progress-fill" style="width:${progreso}%"></div></div><span class="muted" style="font-size:0.78rem;">${progreso}%</span>`,
        UI.formatCOP(p.presupuesto || 0),
        UI.formatCOP(p.facturado || 0),
        `<span style="color:${margen >= 0 ? 'var(--success)' : 'var(--danger)'};">${UI.formatCOP(margen)}</span>`,
        p.fechaInicio ? new Date(p.fechaInicio).toLocaleDateString('es-CO') : '—',
        canEdit ? `<td class="table-actions">
          <button class="btn-icon" data-view-proy="${p.id}" title="Ver detalle">👁</button>
          <button class="btn-icon" data-edit-proy="${p.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-del-proy="${p.id}" title="Eliminar">🗑</button>
        </td>` : ''
      ];
    });

    return `
      <div class="card mt-16">
        <div class="card-header">
          <div class="card-title">Proyectos (${proyectos.length})</div>
          ${canEdit ? '<button class="btn btn-primary btn-sm" id="btn-add-proy">+ Nuevo proyecto</button>' : ''}
        </div>
        ${UI.table(['Nombre', 'Cliente', 'Responsable', 'Estado', 'Progreso', 'Presupuesto', 'Facturado', 'Margen', 'Inicio', canEdit ? 'Acciones' : ''], rows, { emptyText: 'No hay proyectos. Crea el primero.' })}
      </div>`;
  }

  // ── Bind ──────────────────────────────────────────────
  function bind() {
    const canEdit = Auth.canWrite('proyectos');
    if (!canEdit) return;

    document.getElementById('btn-add-proy')?.addEventListener('click', () => showProyectoModal());
    document.querySelectorAll('[data-edit-proy]').forEach(b => b.addEventListener('click', () => showProyectoModal(b.dataset.editProy)));
    document.querySelectorAll('[data-del-proy]').forEach(b => b.addEventListener('click', () => {
      UI.confirm('¿Eliminar este proyecto?', () => {
        Store.remove('proyectos', b.dataset.delProy);
        UI.toast('Proyecto eliminado', 'success');
        App.renderCurrentPage();
      });
    }));
    document.querySelectorAll('[data-view-proy]').forEach(b => b.addEventListener('click', () => showProyectoDetalle(b.dataset.viewProy)));
  }

  function showProyectoModal(proyId) {
    const isEdit = !!proyId;
    const p = isEdit ? Store.findById('proyectos', proyId) : null;
    const clientes = Store.get('clientes') || [];
    const cliOpts = [{ value: '', label: 'Sin cliente' }, ...clientes.map(c => ({ value: c.id, label: c.nombre }))];

    UI.modal(isEdit ? 'Editar proyecto' : 'Nuevo proyecto', `
      ${UI.formField('Nombre del proyecto', 'proy-nombre', 'text', p?.nombre || '')}
      <div class="form-row">
        ${UI.formField('Cliente', 'proy-cliente', 'select', p?.clienteId || '', { options: cliOpts })}
        ${UI.formField('Responsable', 'proy-responsable', 'text', p?.responsable || '')}
      </div>
      <div class="form-row">
        ${UI.formField('Estado', 'proy-estado', 'select', p?.estado || 'planificacion', { options: ESTADOS.map(e => ({ value: e, label: estadoLabels[e] })) })}
        ${UI.formField('Progreso (%)', 'proy-progreso', 'number', p?.progreso || 0, { min: '0', max: '100', step: '1' })}
      </div>
      <div class="form-row">
        ${UI.formField('Fecha inicio', 'proy-inicio', 'date', p?.fechaInicio || '')}
        ${UI.formField('Fecha fin estimada', 'proy-fin', 'date', p?.fechaFin || '')}
      </div>
      <div class="form-row">
        ${UI.formField('Presupuesto', 'proy-presupuesto', 'number', p?.presupuesto || 0, { step: '0.01' })}
        ${UI.formField('Facturado', 'proy-facturado', 'number', p?.facturado || 0, { step: '0.01' })}
      </div>
      <div class="form-row">
        ${UI.formField('Costos incurridos', 'proy-costos', 'number', p?.costos || 0, { step: '0.01' })}
      </div>
      ${UI.formField('Descripción', 'proy-desc', 'textarea', p?.descripcion || '')}
    `, `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="modal-save-proy">Guardar</button>`);

    document.getElementById('modal-save-proy').addEventListener('click', () => {
      const nombre = document.getElementById('proy-nombre').value.trim();
      if (!nombre) { UI.toast('El nombre es obligatorio', 'error'); return; }
      const clienteId = document.getElementById('proy-cliente').value;
      const cliente = Store.findById('clientes', clienteId);
      const data = {
        nombre,
        clienteId: clienteId || null,
        clienteNombre: cliente?.nombre || '',
        responsable: document.getElementById('proy-responsable').value.trim(),
        estado: document.getElementById('proy-estado').value,
        progreso: Math.min(100, Math.max(0, parseInt(document.getElementById('proy-progreso').value) || 0)),
        fechaInicio: document.getElementById('proy-inicio').value,
        fechaFin: document.getElementById('proy-fin').value,
        presupuesto: parseFloat(document.getElementById('proy-presupuesto').value) || 0,
        facturado: parseFloat(document.getElementById('proy-facturado').value) || 0,
        costos: parseFloat(document.getElementById('proy-costos').value) || 0,
        descripcion: document.getElementById('proy-desc').value.trim(),
      };
      if (isEdit) { Store.update('proyectos', proyId, data); UI.toast('Proyecto actualizado', 'success'); }
      else { Store.insert('proyectos', data); Store.log(Auth.getCurrentUser()?.nombre, 'Creó proyecto', 'proyectos', nombre); UI.toast('Proyecto creado', 'success'); }
      UI.closeModal();
      App.renderCurrentPage();
    });
  }

  function showProyectoDetalle(proyId) {
    const p = Store.findById('proyectos', proyId);
    if (!p) return;
    const margen = (p.facturado || 0) - (p.costos || 0);
    const margenPct = p.facturado > 0 ? (margen / p.facturado * 100).toFixed(1) : 0;
    const facturas = (Store.get('facturas') || []).filter(f => f.proyectoId === proyId);

    const facRows = facturas.map(f => [
      `<strong>${f.numero}</strong>`,
      `<span class="badge badge-${f.tipo === 'venta' ? 'green' : 'gray'}">${f.tipo}</span>`,
      new Date(f.fechaEmision).toLocaleDateString('es-CO'),
      UI.formatCOP(f.total),
      `<span class="badge badge-${f.estado === 'pagada' ? 'green' : 'blue'}">${f.estado}</span>`,
    ]);

    UI.modal(`Proyecto: ${p.nombre}`, `
      <div class="grid grid-3 mb-16">
        <div class="kpi-card sem-gray"><div class="kpi-label">Presupuesto</div><div class="kpi-value">${UI.formatCOP(p.presupuesto || 0)}</div></div>
        <div class="kpi-card sem-green"><div class="kpi-label">Facturado</div><div class="kpi-value">${UI.formatCOP(p.facturado || 0)}</div></div>
        <div class="kpi-card sem-${margen >= 0 ? 'green' : 'red'}"><div class="kpi-label">Margen (${margenPct}%)</div><div class="kpi-value">${UI.formatCOP(margen)}</div></div>
      </div>
      <div class="section-title">Información general</div>
      <div class="table-wrap mb-16">
        <table>
          <tbody>
            <tr><td>Cliente</td><td>${p.clienteNombre || '—'}</td></tr>
            <tr><td>Responsable</td><td>${p.responsable || '—'}</td></tr>
            <tr><td>Estado</td><td><span class="badge badge-blue">${estadoLabels[p.estado] || p.estado}</span></td></tr>
            <tr><td>Progreso</td><td><div class="progress-bar"><div class="progress-fill" style="width:${p.progreso || 0}%"></div></div> ${p.progreso || 0}%</td></tr>
            <tr><td>Fecha inicio</td><td>${p.fechaInicio ? new Date(p.fechaInicio).toLocaleDateString('es-CO') : '—'}</td></tr>
            <tr><td>Fecha fin</td><td>${p.fechaFin ? new Date(p.fechaFin).toLocaleDateString('es-CO') : '—'}</td></tr>
            <tr><td>Costos incurridos</td><td>${UI.formatCOP(p.costos || 0)}</td></tr>
          </tbody>
        </table>
      </div>
      ${p.descripcion ? `<div class="section-title">Descripción</div><p class="muted mb-16">${p.descripcion}</p>` : ''}
      <div class="section-title">Facturas vinculadas</div>
      ${UI.table(['Número', 'Tipo', 'Fecha', 'Total', 'Estado'], facRows, { emptyText: 'Sin facturas vinculadas a este proyecto.' })}
    `, `<button class="btn btn-ghost" onclick="UI.closeModal()">Cerrar</button>`);
  }

  return { render, bind };
})();
