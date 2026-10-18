/* ==========================================================
   META ADS PAGE — Campañas y métricas (Fase 6)
   ========================================================== */

const MetaAdsPage = (() => {

  let subTab = 'resumen';

  function render() {
    const canEdit = Auth.canWrite('meta_ads');
    const campanas = Store.get('campanasMeta') || [];

    const subTabs = `
      <div class="sub-tabs">
        <button class="sub-tab ${subTab === 'resumen' ? 'active' : ''}" data-subtab="resumen">📊 Resumen</button>
        <button class="sub-tab ${subTab === 'campanas' ? 'active' : ''}" data-subtab="campanas">📘 Campañas (${campanas.length})</button>
        <button class="sub-tab ${subTab === 'metricas' ? 'active' : ''}" data-subtab="metricas">📈 Métricas Diarias</button>
      </div>`;

    let content = '';
    if (subTab === 'resumen') content = renderResumen(canEdit);
    else if (subTab === 'campanas') content = renderCampanas(canEdit, campanas);
    else if (subTab === 'metricas') content = renderMetricas(canEdit, campanas);

    return `
      <div class="page-header">
        <h1>Meta Ads</h1>
        <p>Reporte de campañas publicitarias de Meta (Facebook/Instagram).</p>
      </div>
      ${subTabs}
      ${content}
    `;
  }

  // ── Resumen ───────────────────────────────────────────
  function renderResumen(canEdit) {
    const range = getDateRange();
    const metricas = (Store.get('metricasMetaDiaria') || []).filter(m => inRange(m.fecha, range));
    const campanas = Store.get('campanasMeta') || [];
    const umbrales = Store.get('umbralesKPI');

    const totalInversion = metricas.reduce((s, m) => s + (m.inversion || 0), 0);
    const totalImpresiones = metricas.reduce((s, m) => s + (m.impresiones || 0), 0);
    const totalClicks = metricas.reduce((s, m) => s + (m.clicks || 0), 0);
    const totalConversiones = metricas.reduce((s, m) => s + (m.conversiones || 0), 0);
    const totalIngresos = metricas.reduce((s, m) => s + (m.ingresos || 0), 0);

    const ctr = totalImpresiones > 0 ? (totalClicks / totalImpresiones * 100) : 0;
    const cpc = totalClicks > 0 ? (totalInversion / totalClicks) : 0;
    const cpm = totalImpresiones > 0 ? (totalInversion / totalImpresiones * 1000) : 0;
    const cpa = totalConversiones > 0 ? (totalInversion / totalConversiones) : 0;
    const roas = totalInversion > 0 ? (totalIngresos / totalInversion) : 0;
    const semRoas = UI.semaphore(roas, umbrales.roas);

    const kpis = `
      <div class="grid grid-4">
        ${UI.kpiCard('Inversión Total', UI.formatCOP(totalInversion), `${campanas.length} campañas`, 'gray')}
        ${UI.kpiCard('ROAS', roas.toFixed(2) + 'x', `Meta: ${umbrales.roas.verde}x`, semRoas, 'Retorno sobre inversión publicitaria')}
        ${UI.kpiCard('CTR', ctr.toFixed(2) + '%', `${totalClicks} clicks`, ctr >= 2 ? 'green' : ctr >= 1 ? 'yellow' : 'red', 'Click-through rate')}
        ${UI.kpiCard('CPC', UI.formatCOP(cpc), 'Costo por click', 'gray')}
      </div>
      <div class="grid grid-4 mt-16">
        ${UI.kpiCard('Impresiones', totalImpresiones.toLocaleString(), `CPM: ${UI.formatCOP(cpm)}`, 'gray')}
        ${UI.kpiCard('Conversiones', totalConversiones, `CPA: ${UI.formatCOP(cpa)}`, 'gray', 'Costo por adquisición')}
        ${UI.kpiCard('Ingresos Atribuidos', UI.formatCOP(totalIngresos), `ROAS: ${roas.toFixed(2)}x`, 'green')}
        ${UI.kpiCard('Conversion Rate', totalClicks > 0 ? (totalConversiones / totalClicks * 100).toFixed(2) + '%' : '0%', 'Conv/Click', 'gray')}
      </div>`;

    // Performance by campaign
    const campanaData = campanas.map(c => {
      const m = metricas.filter(x => x.campanaId === c.id);
      const inv = m.reduce((s, x) => s + (x.inversion || 0), 0);
      const ing = m.reduce((s, x) => s + (x.ingresos || 0), 0);
      const clicks = m.reduce((s, x) => s + (x.clicks || 0), 0);
      const conv = m.reduce((s, x) => s + (x.conversiones || 0), 0);
      return { ...c, inversion: inv, ingresos: ing, roas: inv > 0 ? ing / inv : 0, clicks, conv };
    }).sort((a, b) => b.inversion - a.inversion);

    const maxInv = Math.max(...campanaData.map(c => c.inversion), 1);

    const chart = `
      <div class="card mt-16">
        <div class="card-header"><div class="card-title">Inversión por Campaña</div></div>
        ${campanaData.length === 0
          ? '<p class="muted p-16">Sin campañas registradas.</p>'
          : `<div class="bar-chart">
            ${campanaData.map(c => `
              <div class="bar-row">
                <span class="bar-label">${c.nombre}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${(c.inversion / maxInv * 100).toFixed(1)}%"></div></div>
                <span class="bar-value">${UI.formatCOP(c.inversion)} · ROAS ${c.roas.toFixed(1)}x</span>
              </div>
            `).join('')}
          </div>`}
      </div>`;

    return kpis + chart;
  }

  // ── Campañas ──────────────────────────────────────────
  function renderCampanas(canEdit, campanas) {
    const rows = campanas.map(c => {
      const metricas = (Store.get('metricasMetaDiaria') || []).filter(m => m.campanaId === c.id);
      const inv = metricas.reduce((s, m) => s + (m.inversion || 0), 0);
      const ing = metricas.reduce((s, m) => s + (m.ingresos || 0), 0);
      const roas = inv > 0 ? ing / inv : 0;
      return [
        `<strong>${c.nombre}</strong>`,
        `<span class="badge badge-${c.estado === 'activa' ? 'green' : c.estado === 'pausada' ? 'yellow' : 'gray'}">${c.estado}</span>`,
        c.plataforma || 'Facebook',
        c.objetivo || '—',
        UI.formatCOP(inv),
        UI.formatCOP(ing),
        roas.toFixed(2) + 'x',
        canEdit ? `<td class="table-actions">
          <button class="btn-icon" data-edit-camp="${c.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-del-camp="${c.id}" title="Eliminar">🗑</button>
        </td>` : ''
      ];
    });

    return `
      <div class="flex mb-16">
        ${canEdit ? '<button class="btn btn-primary btn-sm ml-auto" id="btn-add-camp">+ Nueva campaña</button>' : ''}
      </div>
      <div class="card">
        ${UI.table(['Nombre', 'Estado', 'Plataforma', 'Objetivo', 'Inversión', 'Ingresos', 'ROAS', canEdit ? 'Acciones' : ''], rows, { emptyText: 'No hay campañas registradas.' })}
      </div>`;
  }

  // ── Métricas diarias ──────────────────────────────────
  function renderMetricas(canEdit, campanas) {
    const metricas = (Store.get('metricasMetaDiaria') || []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const rows = metricas.map(m => {
      const camp = Store.findById('campanasMeta', m.campanaId);
      const ctr = m.impresiones > 0 ? (m.clicks / m.impresiones * 100).toFixed(2) : '0';
      const roas = m.inversion > 0 ? (m.ingresos / m.inversion).toFixed(2) : '0';
      return [
        new Date(m.fecha).toLocaleDateString('es-CO'),
        camp?.nombre || '—',
        (m.impresiones || 0).toLocaleString(),
        (m.clicks || 0).toLocaleString(),
        ctr + '%',
        UI.formatCOP(m.inversion || 0),
        (m.conversiones || 0).toString(),
        UI.formatCOP(m.ingresos || 0),
        roas + 'x',
        canEdit ? `<td class="table-actions">
          <button class="btn-icon" data-edit-metrica="${m.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-del-metrica="${m.id}" title="Eliminar">🗑</button>
        </td>` : ''
      ];
    });

    return `
      <div class="flex mb-16">
        ${canEdit ? '<button class="btn btn-primary btn-sm ml-auto" id="btn-add-metrica">+ Registrar métrica</button>' : ''}
      </div>
      <div class="card">
        ${UI.table(['Fecha', 'Campaña', 'Impresiones', 'Clicks', 'CTR', 'Inversión', 'Conv.', 'Ingresos', 'ROAS', canEdit ? 'Acciones' : ''], rows, { emptyText: 'No hay métricas diarias registradas.' })}
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
    const canEdit = Auth.canWrite('meta_ads');
    document.querySelectorAll('.sub-tab').forEach(btn => {
      btn.addEventListener('click', () => { subTab = btn.dataset.subtab; App.renderCurrentPage(); });
    });

    if (!canEdit) return;

    if (subTab === 'campanas') {
      document.getElementById('btn-add-camp')?.addEventListener('click', () => showCampanaModal());
      document.querySelectorAll('[data-edit-camp]').forEach(b => b.addEventListener('click', () => showCampanaModal(b.dataset.editCamp)));
      document.querySelectorAll('[data-del-camp]').forEach(b => b.addEventListener('click', () => {
        UI.confirm('¿Eliminar esta campaña y sus métricas?', () => {
          Store.remove('campanasMeta', b.dataset.delCamp);
          (Store.get('metricasMetaDiaria') || []).filter(m => m.campanaId === b.dataset.delCamp).forEach(m => Store.remove('metricasMetaDiaria', m.id));
          UI.toast('Campaña eliminada', 'success');
          App.renderCurrentPage();
        });
      }));
    }

    if (subTab === 'metricas') {
      document.getElementById('btn-add-metrica')?.addEventListener('click', () => showMetricaModal());
      document.querySelectorAll('[data-edit-metrica]').forEach(b => b.addEventListener('click', () => showMetricaModal(b.dataset.editMetrica)));
      document.querySelectorAll('[data-del-metrica]').forEach(b => b.addEventListener('click', () => {
        UI.confirm('¿Eliminar esta métrica?', () => {
          Store.remove('metricasMetaDiaria', b.dataset.delMetrica);
          UI.toast('Métrica eliminada', 'success');
          App.renderCurrentPage();
        });
      }));
    }
  }

  function showCampanaModal(campId) {
    const isEdit = !!campId;
    const c = isEdit ? Store.findById('campanasMeta', campId) : null;

    UI.modal(isEdit ? 'Editar campaña' : 'Nueva campaña', `
      ${UI.formField('Nombre', 'camp-nombre', 'text', c?.nombre || '')}
      <div class="form-row">
        ${UI.formField('Plataforma', 'camp-plataforma', 'select', c?.plataforma || 'Facebook', { options: [
          { value: 'Facebook', label: 'Facebook' }, { value: 'Instagram', label: 'Instagram' },
          { value: 'Messenger', label: 'Messenger' }, { value: 'Audience Network', label: 'Audience Network' }
        ]})}
        ${UI.formField('Estado', 'camp-estado', 'select', c?.estado || 'activa', { options: [
          { value: 'activa', label: 'Activa' }, { value: 'pausada', label: 'Pausada' }, { value: 'finalizada', label: 'Finalizada' }
        ]})}
      </div>
      <div class="form-row">
        ${UI.formField('Objetivo', 'camp-objetivo', 'select', c?.objetivo || 'conversiones', { options: [
          { value: 'reconocimiento', label: 'Reconocimiento' }, { value: 'trafico', label: 'Tráfico' },
          { value: 'interaccion', label: 'Interacción' }, { value: 'conversiones', label: 'Conversiones' },
          { value: 'ventas', label: 'Ventas del catálogo' }
        ]})}
        ${UI.formField('Presupuesto diario', 'camp-presupuesto', 'number', c?.presupuestoDiario || '', { step: '0.01' })}
      </div>
      <div class="form-row">
        ${UI.formField('Fecha inicio', 'camp-inicio', 'date', c?.fechaInicio || '')}
        ${UI.formField('Fecha fin', 'camp-fin', 'date', c?.fechaFin || '')}
      </div>
    `, `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="modal-save-camp">Guardar</button>`);

    document.getElementById('modal-save-camp').addEventListener('click', () => {
      const nombre = document.getElementById('camp-nombre').value.trim();
      if (!nombre) { UI.toast('El nombre es obligatorio', 'error'); return; }
      const data = {
        nombre,
        plataforma: document.getElementById('camp-plataforma').value,
        estado: document.getElementById('camp-estado').value,
        objetivo: document.getElementById('camp-objetivo').value,
        presupuestoDiario: parseFloat(document.getElementById('camp-presupuesto').value) || 0,
        fechaInicio: document.getElementById('camp-inicio').value,
        fechaFin: document.getElementById('camp-fin').value,
      };
      if (isEdit) { Store.update('campanasMeta', campId, data); UI.toast('Campaña actualizada', 'success'); }
      else { Store.insert('campanasMeta', data); UI.toast('Campaña creada', 'success'); }
      UI.closeModal();
      App.renderCurrentPage();
    });
  }

  function showMetricaModal(metricaId) {
    const isEdit = !!metricaId;
    const m = isEdit ? Store.findById('metricasMetaDiaria', metricaId) : null;
    const campanas = Store.get('campanasMeta') || [];
    const campOpts = campanas.length ? campanas.map(c => ({ value: c.id, label: c.nombre })) : [{ value: '', label: 'Sin campañas — crea una primero' }];

    UI.modal(isEdit ? 'Editar métrica' : 'Registrar métrica diaria', `
      <div class="form-row">
        ${UI.formField('Campaña', 'met-camp', 'select', m?.campanaId || '', { options: campOpts })}
        ${UI.formField('Fecha', 'met-fecha', 'date', m?.fecha || new Date().toISOString().slice(0, 10))}
      </div>
      <div class="form-row">
        ${UI.formField('Impresiones', 'met-imp', 'number', m?.impresiones || 0, { min: '0' })}
        ${UI.formField('Clicks', 'met-clicks', 'number', m?.clicks || 0, { min: '0' })}
      </div>
      <div class="form-row">
        ${UI.formField('Inversión (COP)', 'met-inv', 'number', m?.inversion || 0, { step: '0.01' })}
        ${UI.formField('Conversiones', 'met-conv', 'number', m?.conversiones || 0, { min: '0' })}
      </div>
      ${UI.formField('Ingresos atribuidos (COP)', 'met-ing', 'number', m?.ingresos || 0, { step: '0.01' })}
    `, `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="modal-save-met">Guardar</button>`);

    document.getElementById('modal-save-met').addEventListener('click', () => {
      const campanaId = document.getElementById('met-camp').value;
      if (!campanaId) { UI.toast('Selecciona una campaña', 'error'); return; }
      const data = {
        campanaId,
        fecha: document.getElementById('met-fecha').value,
        impresiones: parseInt(document.getElementById('met-imp').value) || 0,
        clicks: parseInt(document.getElementById('met-clicks').value) || 0,
        inversion: parseFloat(document.getElementById('met-inv').value) || 0,
        conversiones: parseInt(document.getElementById('met-conv').value) || 0,
        ingresos: parseFloat(document.getElementById('met-ing').value) || 0,
      };
      if (isEdit) { Store.update('metricasMetaDiaria', metricaId, data); UI.toast('Métrica actualizada', 'success'); }
      else { Store.insert('metricasMetaDiaria', data); UI.toast('Métrica registrada', 'success'); }
      UI.closeModal();
      App.renderCurrentPage();
    });
  }

  return { render, bind };
})();
