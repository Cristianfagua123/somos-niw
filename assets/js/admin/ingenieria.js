/* ==========================================================
   INGENIERIA PAGE — DORA metrics (Fase 7)
   ========================================================== */

const IngenieriaPage = (() => {

  function render() {
    const canEdit = Auth.canWrite('ingenieria');
    const despliegues = Store.get('despliegues') || [];
    const incidentes = Store.get('incidentes') || [];

    const kpis = renderKPIS(despliegues, incidentes);
    const desplieguesSection = renderDespliegues(canEdit, despliegues);
    const incidentesSection = renderIncidentes(canEdit, incidentes);

    return `
      <div class="page-header">
        <h1>Ingeniería (DORA)</h1>
        <p>Métricas DORA: frecuencia de despliegue, lead time, tiempo de recuperación y tasa de cambios.</p>
      </div>
      ${kpis}
      ${desplieguesSection}
      ${incidentesSection}
    `;
  }

  // ── KPIs ──────────────────────────────────────────────
  function renderKPIS(despliegues, incidentes) {
    const range = getDateRange();
    const desplieguesPeriodo = despliegues.filter(d => inRange(d.fecha, range));
    const incidentesPeriodo = incidentes.filter(i => inRange(i.fechaInicio, range));

    // Deployment frequency
    const diasPeriodo = Math.max((range.to - range.from) / 86400000, 1);
    const freqDespliegue = desplieguesPeriodo.length / diasPeriodo;
    const freqLabel = freqDespliegue >= 1 ? 'Diaria' : freqDespliegue >= 1/7 ? 'Semanal' : freqDespliegue >= 1/30 ? 'Mensual' : 'Baja';

    // Lead time (average from commit to deploy)
    const leadTimes = desplieguesPeriodo.filter(d => d.fechaCommit).map(d => {
      const commit = new Date(d.fechaCommit);
      const deploy = new Date(d.fecha);
      return (deploy - commit) / 3600000; // hours
    });
    const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((s, t) => s + t, 0) / leadTimes.length : 0;

    // MTTR (Mean Time To Restore)
    const mttrData = incidentesPeriodo.filter(i => i.fechaResolucion && i.fechaInicio);
    const mttrValues = mttrData.map(i => (new Date(i.fechaResolucion) - new Date(i.fechaInicio)) / 3600000);
    const mttr = mttrValues.length > 0 ? mttrValues.reduce((s, t) => s + t, 0) / mttrValues.length : 0;

    // Change Failure Rate
    const desplieguesFallidos = desplieguesPeriodo.filter(d => d.resultado === 'fallido').length;
    const cfr = desplieguesPeriodo.length > 0 ? (desplieguesFallidos / desplieguesPeriodo.length * 100) : 0;

    // DORA levels
    const doraLevel = getDORALevel(freqDespliegue, avgLeadTime, mttr, cfr);

    return `
      <div class="grid grid-4">
        ${UI.kpiCard('Frecuencia de Despliegue', freqLabel, `${desplieguesPeriodo.length} despliegues`, freqDespliegue >= 1/7 ? 'green' : freqDespliegue >= 1/30 ? 'yellow' : 'red', 'Despliegues por período')}
        ${UI.kpiCard('Lead Time', avgLeadTime > 24 ? (avgLeadTime / 24).toFixed(1) + ' días' : avgLeadTime.toFixed(1) + ' hrs', `${leadTimes.length} con datos`, avgLeadTime <= 24 ? 'green' : avgLeadTime <= 168 ? 'yellow' : 'red', 'Tiempo de commit a producción')}
        ${UI.kpiCard('MTTR', mttr > 24 ? (mttr / 24).toFixed(1) + ' días' : mttr.toFixed(1) + ' hrs', `${mttrData.length} incidentes`, mttr <= 1 ? 'green' : mttr <= 24 ? 'yellow' : 'red', 'Tiempo medio de recuperación')}
        ${UI.kpiCard('Change Failure Rate', cfr.toFixed(1) + '%', `${desplieguesFallidos} fallidos`, cfr <= 15 ? 'green' : cfr <= 30 ? 'yellow' : 'red', '% de despliegues que causan incidentes')}
      </div>
      <div class="grid grid-2 mt-16">
        <div class="card">
          <div class="card-header"><div class="card-title">Nivel DORA</div></div>
          <div style="text-align:center;padding:24px;">
            <div style="font-size:2rem;font-weight:800;color:var(--accent);">${doraLevel}</div>
            <p class="muted mt-16">Clasificación según las 4 métricas DORA clave</p>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Resumen del Período</div></div>
          <div class="table-wrap">
            <table>
              <tbody>
                <tr><td>Despliegues totales</td><td class="text-right">${desplieguesPeriodo.length}</td></tr>
                <tr><td>Despliegues exitosos</td><td class="text-right" style="color:var(--success);">${desplieguesPeriodo.filter(d => d.resultado === 'exito').length}</td></tr>
                <tr><td>Despliegues fallidos</td><td class="text-right" style="color:var(--danger);">${desplieguesFallidos}</td></tr>
                <tr><td>Incidentes registrados</td><td class="text-right">${incidentesPeriodo.length}</td></tr>
                <tr><td>Incidentes resueltos</td><td class="text-right">${mttrData.length}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  }

  function getDORALevel(freq, leadTime, mttr, cfr) {
    if (freq >= 1/7 && leadTime <= 24 && mttr <= 1 && cfr <= 15) return 'Élite';
    if (freq >= 1/30 && leadTime <= 168 && mttr <= 24 && cfr <= 30) return 'Alto';
    if (freq >= 1/180 && leadTime <= 720 && mttr <= 168 && cfr <= 60) return 'Medio';
    return 'Bajo';
  }

  // ── Despliegues ───────────────────────────────────────
  function renderDespliegues(canEdit, despliegues) {
    const sorted = [...despliegues].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 20);
    const rows = sorted.map(d => [
      new Date(d.fecha).toLocaleString('es-CO'),
      `<strong>${d.version || '—'}</strong>`,
      d.entorno || '—',
      d.autor || '—',
      `<span class="badge badge-${d.resultado === 'exito' ? 'green' : 'red'}">${d.resultado || '—'}</span>`,
      d.notas || '—',
      canEdit ? `<td class="table-actions">
        <button class="btn-icon" data-edit-depl="${d.id}" title="Editar">✏️</button>
        <button class="btn-icon" data-del-depl="${d.id}" title="Eliminar">🗑</button>
      </td>` : ''
    ]);

    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">Despliegues Recientes (${despliegues.length})</div>
          ${canEdit ? '<button class="btn btn-primary btn-sm" id="btn-add-depl">+ Registrar despliegue</button>' : ''}
        </div>
        ${UI.table(['Fecha', 'Versión', 'Entorno', 'Autor', 'Resultado', 'Notas', canEdit ? 'Acciones' : ''], rows, { emptyText: 'No hay despliegues registrados.' })}
      </div>`;
  }

  // ── Incidentes ────────────────────────────────────────
  function renderIncidentes(canEdit, incidentes) {
    const sorted = [...incidentes].sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio)).slice(0, 20);
    const rows = sorted.map(i => {
      const resuelto = i.fechaResolucion ? new Date(i.fechaResolucion) : null;
      const inicio = new Date(i.fechaInicio);
      const duracion = resuelto ? ((resuelto - inicio) / 3600000).toFixed(1) + ' hrs' : 'En curso';
      return [
        new Date(i.fechaInicio).toLocaleString('es-CO'),
        `<strong>${i.titulo}</strong>`,
        `<span class="badge badge-${i.severidad === 'critica' ? 'red' : i.severidad === 'alta' ? 'yellow' : 'gray'}">${i.severidad}</span>`,
        duracion,
        i.fechaResolucion ? `<span class="badge badge-green">Resuelto</span>` : `<span class="badge badge-yellow">Abierto</span>`,
        canEdit ? `<td class="table-actions">
          <button class="btn-icon" data-edit-inc="${i.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-del-inc="${i.id}" title="Eliminar">🗑</button>
        </td>` : ''
      ];
    });

    return `
      <div class="card mt-16">
        <div class="card-header">
          <div class="card-title">Incidentes (${incidentes.length})</div>
          ${canEdit ? '<button class="btn btn-primary btn-sm" id="btn-add-inc">+ Registrar incidente</button>' : ''}
        </div>
        ${UI.table(['Inicio', 'Título', 'Severidad', 'Duración', 'Estado', canEdit ? 'Acciones' : ''], rows, { emptyText: 'No hay incidentes registrados.' })}
      </div>`;
  }

  // ── Date helpers ──────────────────────────────────────
  function getDateRange() {
    const now = new Date();
    let from, to;
    const range = App._dateRange || 'this_month';
    if (range === 'this_month') { from = new Date(now.getFullYear(), now.getMonth(), 1); to = new Date(now.getFullYear(), now.getMonth() + 1, 0); }
    else if (range === 'last_month') { from = new Date(now.getFullYear(), now.getMonth() - 1, 1); to = new Date(now.getFullYear(), now.getMonth(), 0); }
    else if (range === 'this_quarter') { const q = Math.floor(now.getMonth() / 3); from = new Date(now.getFullYear(), q * 3, 1); to = new Date(now.getFullYear(), q * 3 + 3, 0); }
    else if (range === 'this_year') { from = new Date(now.getFullYear(), 0, 1); to = new Date(now.getFullYear(), 11, 31); }
    else { from = App._customFrom ? new Date(App._customFrom) : new Date(now.getFullYear(), now.getMonth(), 1); to = App._customTo ? new Date(App._customTo) : new Date(now.getFullYear(), now.getMonth() + 1, 0); }
    return { from, to: new Date(to.getTime() + 86400000) };
  }

  function inRange(dateStr, range) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= range.from && d < range.to;
  }

  // ── Bind ──────────────────────────────────────────────
  function bind() {
    const canEdit = Auth.canWrite('ingenieria');
    if (!canEdit) return;

    document.getElementById('btn-add-depl')?.addEventListener('click', () => showDespliegueModal());
    document.querySelectorAll('[data-edit-depl]').forEach(b => b.addEventListener('click', () => showDespliegueModal(b.dataset.editDepl)));
    document.querySelectorAll('[data-del-depl]').forEach(b => b.addEventListener('click', () => {
      UI.confirm('¿Eliminar este despliegue?', () => {
        Store.remove('despliegues', b.dataset.delDepl);
        UI.toast('Despliegue eliminado', 'success');
        App.renderCurrentPage();
      });
    }));

    document.getElementById('btn-add-inc')?.addEventListener('click', () => showIncidenteModal());
    document.querySelectorAll('[data-edit-inc]').forEach(b => b.addEventListener('click', () => showIncidenteModal(b.dataset.editInc)));
    document.querySelectorAll('[data-del-inc]').forEach(b => b.addEventListener('click', () => {
      UI.confirm('¿Eliminar este incidente?', () => {
        Store.remove('incidentes', b.dataset.delInc);
        UI.toast('Incidente eliminado', 'success');
        App.renderCurrentPage();
      });
    }));
  }

  function showDespliegueModal(deplId) {
    const isEdit = !!deplId;
    const d = isEdit ? Store.findById('despliegues', deplId) : null;

    UI.modal(isEdit ? 'Editar despliegue' : 'Registrar despliegue', `
      <div class="form-row">
        ${UI.formField('Versión', 'depl-version', 'text', d?.version || '')}
        ${UI.formField('Entorno', 'depl-entorno', 'select', d?.entorno || 'produccion', { options: [
          { value: 'produccion', label: 'Producción' }, { value: 'staging', label: 'Staging' }, { value: 'dev', label: 'Dev' }
        ]})}
      </div>
      <div class="form-row">
        ${UI.formField('Fecha despliegue', 'depl-fecha', 'datetime-local', d?.fecha ? d.fecha.slice(0, 16) : new Date().toISOString().slice(0, 16))}
        ${UI.formField('Fecha commit', 'depl-commit', 'datetime-local', d?.fechaCommit ? d.fechaCommit.slice(0, 16) : '')}
      </div>
      <div class="form-row">
        ${UI.formField('Autor', 'depl-autor', 'text', d?.autor || '')}
        ${UI.formField('Resultado', 'depl-resultado', 'select', d?.resultado || 'exito', { options: [
          { value: 'exito', label: 'Éxito' }, { value: 'fallido', label: 'Fallido' }
        ]})}
      </div>
      ${UI.formField('Notas', 'depl-notas', 'textarea', d?.notas || '')}
    `, `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="modal-save-depl">Guardar</button>`);

    document.getElementById('modal-save-depl').addEventListener('click', () => {
      const data = {
        version: document.getElementById('depl-version').value.trim(),
        entorno: document.getElementById('depl-entorno').value,
        fecha: document.getElementById('depl-fecha').value,
        fechaCommit: document.getElementById('depl-commit').value || null,
        autor: document.getElementById('depl-autor').value.trim(),
        resultado: document.getElementById('depl-resultado').value,
        notas: document.getElementById('depl-notas').value.trim(),
      };
      if (isEdit) { Store.update('despliegues', deplId, data); UI.toast('Despliegue actualizado', 'success'); }
      else { Store.insert('despliegues', data); UI.toast('Despliegue registrado', 'success'); }
      UI.closeModal();
      App.renderCurrentPage();
    });
  }

  function showIncidenteModal(incId) {
    const isEdit = !!incId;
    const i = isEdit ? Store.findById('incidentes', incId) : null;

    UI.modal(isEdit ? 'Editar incidente' : 'Registrar incidente', `
      ${UI.formField('Título', 'inc-titulo', 'text', i?.titulo || '')}
      <div class="form-row">
        ${UI.formField('Severidad', 'inc-severidad', 'select', i?.severidad || 'media', { options: [
          { value: 'critica', label: 'Crítica' }, { value: 'alta', label: 'Alta' },
          { value: 'media', label: 'Media' }, { value: 'baja', label: 'Baja' }
        ]})}
        ${UI.formField('Fecha inicio', 'inc-inicio', 'datetime-local', i?.fechaInicio ? i.fechaInicio.slice(0, 16) : new Date().toISOString().slice(0, 16))}
      </div>
      ${UI.formField('Fecha resolución', 'inc-resolucion', 'datetime-local', i?.fechaResolucion ? i.fechaResolucion.slice(0, 16) : '')}
      ${UI.formField('Descripción', 'inc-desc', 'textarea', i?.descripcion || '')}
    `, `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="modal-save-inc">Guardar</button>`);

    document.getElementById('modal-save-inc').addEventListener('click', () => {
      const titulo = document.getElementById('inc-titulo').value.trim();
      if (!titulo) { UI.toast('El título es obligatorio', 'error'); return; }
      const data = {
        titulo,
        severidad: document.getElementById('inc-severidad').value,
        fechaInicio: document.getElementById('inc-inicio').value,
        fechaResolucion: document.getElementById('inc-resolucion').value || null,
        descripcion: document.getElementById('inc-desc').value.trim(),
      };
      if (isEdit) { Store.update('incidentes', incId, data); UI.toast('Incidente actualizado', 'success'); }
      else { Store.insert('incidentes', data); UI.toast('Incidente registrado', 'success'); }
      UI.closeModal();
      App.renderCurrentPage();
    });
  }

  return { render, bind };
})();
