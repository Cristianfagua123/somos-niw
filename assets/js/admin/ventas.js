/* ==========================================================
   VENTAS PAGE — Embudo, CAC, LTV, NPS (Fase 5)
   ========================================================== */

const VentasPage = (() => {

  let subTab = 'embudo';

  function render() {
    const canEdit = Auth.canWrite('ventas');
    const leads = Store.get('leads') || [];
    const ventas = Store.get('ventas') || [];
    const nps = Store.get('encuestasNPS') || [];

    const subTabs = `
      <div class="sub-tabs">
        <button class="sub-tab ${subTab === 'embudo' ? 'active' : ''}" data-subtab="embudo">🎯 Embudo (${leads.length})</button>
        <button class="sub-tab ${subTab === 'ventas' ? 'active' : ''}" data-subtab="ventas">✅ Ventas (${ventas.length})</button>
        <button class="sub-tab ${subTab === 'nps' ? 'active' : ''}" data-subtab="nps">⭐ NPS (${nps.length})</button>
        <button class="sub-tab ${subTab === 'metricas' ? 'active' : ''}" data-subtab="metricas">📊 CAC / LTV</button>
      </div>`;

    let content = '';
    if (subTab === 'embudo') content = renderEmbudo(canEdit, leads);
    else if (subTab === 'ventas') content = renderVentas(canEdit, ventas, leads);
    else if (subTab === 'nps') content = renderNPS(canEdit, nps);
    else if (subTab === 'metricas') content = renderMetricas(canEdit, leads, ventas, nps);

    return `
      <div class="page-header">
        <h1>Ventas y Clientes</h1>
        <p>Embudo de ventas, CAC, LTV, NPS y análisis de clientes.</p>
      </div>
      ${subTabs}
      ${content}
    `;
  }

  // ── Embudo ────────────────────────────────────────────
  function renderEmbudo(canEdit, leads) {
    const ETAPAS = ['nuevo', 'contactado', 'calificado', 'propuesta', 'negociacion', 'ganado', 'perdido'];
    const etapaLabels = {
      nuevo: 'Nuevo', contactado: 'Contactado', calificado: 'Calificado',
      propuesta: 'Propuesta', negociacion: 'Negociación', ganado: 'Ganado', perdido: 'Perdido'
    };

    const funnelData = ETAPAS.filter(e => e !== 'perdido').map(etapa => ({
      etapa, label: etapaLabels[etapa], count: leads.filter(l => l.etapa === etapa).length
    }));
    const maxCount = Math.max(...funnelData.map(d => d.count), 1);

    const funnel = `
      <div class="card">
        <div class="card-header"><div class="card-title">Embudo de Ventas</div></div>
        <div class="funnel">
          ${funnelData.map((d, i) => {
            const width = maxCount > 0 ? Math.max((d.count / maxCount) * 100, 15) : 15;
            const colors = ['#2fa390', '#3ba88f', '#4cb09a', '#5db8a5', '#6ec0b0', '#7fc8bb'];
            return `<div class="funnel-row">
              <div class="funnel-bar" style="width:${width}%;background:${colors[i] || '#2fa390'};">
                <span class="funnel-label">${d.label}</span>
                <span class="funnel-count">${d.count}</span>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;

    const rows = leads.map(l => {
      const cliente = Store.findById('clientes', l.clienteId);
      return [
        `<strong>${l.nombre}</strong>`,
        cliente?.nombre || l.empresa || '—',
        l.fuente || '—',
        `<span class="badge badge-${l.etapa === 'ganado' ? 'green' : l.etapa === 'perdido' ? 'red' : 'blue'}">${etapaLabels[l.etapa] || l.etapa}</span>`,
        l.valor ? UI.formatCOP(l.valor) : '—',
        l.fecha ? new Date(l.fecha).toLocaleDateString('es-CO') : '—',
        canEdit ? `<td class="table-actions">
          <button class="btn-icon" data-edit-lead="${l.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-del-lead="${l.id}" title="Eliminar">🗑</button>
        </td>` : ''
      ];
    });

    const table = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">Leads (${leads.length})</div>
          ${canEdit ? '<button class="btn btn-primary btn-sm" id="btn-add-lead">+ Nuevo lead</button>' : ''}
        </div>
        ${UI.table(['Nombre', 'Empresa', 'Fuente', 'Etapa', 'Valor', 'Fecha', canEdit ? 'Acciones' : ''], rows, { emptyText: 'No hay leads. Agrega el primero.' })}
      </div>`;

    return funnel + table;
  }

  // ── Ventas ────────────────────────────────────────────
  function renderVentas(canEdit, ventas, leads) {
    const rows = ventas.map(v => {
      const cliente = Store.findById('clientes', v.clienteId);
      const lead = Store.findById('leads', v.leadId);
      return [
        `<strong>${v.numero || 'V-' + v.id.slice(-4)}</strong>`,
        cliente?.nombre || v.clienteNombre || '—',
        lead?.nombre || '—',
        new Date(v.fecha).toLocaleDateString('es-CO'),
        UI.formatCOP(v.monto),
        v.cac ? UI.formatCOP(v.cac) : '—',
        canEdit ? `<td class="table-actions">
          <button class="btn-icon" data-edit-venta="${v.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-del-venta="${v.id}" title="Eliminar">🗑</button>
        </td>` : ''
      ];
    });

    return `
      <div class="flex mb-16">
        ${canEdit ? '<button class="btn btn-primary btn-sm ml-auto" id="btn-add-venta">+ Registrar venta</button>' : ''}
      </div>
      <div class="card">
        ${UI.table(['Número', 'Cliente', 'Lead origen', 'Fecha', 'Monto', 'CAC', canEdit ? 'Acciones' : ''], rows, { emptyText: 'No hay ventas registradas.' })}
      </div>`;
  }

  // ── NPS ───────────────────────────────────────────────
  function renderNPS(canEdit, nps) {
    const promotores = nps.filter(n => n.score >= 9).length;
    const pasivos = nps.filter(n => n.score >= 7 && n.score <= 8).length;
    const detractores = nps.filter(n => n.score <= 6).length;
    const total = nps.length;
    const npsScore = total > 0 ? Math.round((promotores - detractores) / total * 100) : 0;
    const umbrales = Store.get('umbralesKPI');
    const semNPS = UI.semaphore(npsScore, umbrales.nps);

    const kpis = `
      <div class="grid grid-4">
        ${UI.kpiCard('NPS', npsScore, `${total} respuestas`, semNPS, 'Net Promoter Score')}
        ${UI.kpiCard('Promotores', promotores, `${total > 0 ? (promotores / total * 100).toFixed(0) : 0}%`, 'green')}
        ${UI.kpiCard('Pasivos', pasivos, `${total > 0 ? (pasivos / total * 100).toFixed(0) : 0}%`, 'yellow')}
        ${UI.kpiCard('Detractores', detractores, `${total > 0 ? (detractores / total * 100).toFixed(0) : 0}%`, 'red')}
      </div>`;

    const rows = nps.map(n => {
      const cliente = Store.findById('clientes', n.clienteId);
      const cat = n.score >= 9 ? 'green' : n.score >= 7 ? 'yellow' : 'red';
      const catLabel = n.score >= 9 ? 'Promotor' : n.score >= 7 ? 'Pasivo' : 'Detractor';
      return [
        `<strong>${n.score}/10</strong>`,
        `<span class="badge badge-${cat}">${catLabel}</span>`,
        cliente?.nombre || n.clienteNombre || '—',
        new Date(n.fecha).toLocaleDateString('es-CO'),
        n.comentario ? `"${n.comentario}"` : '—',
        canEdit ? `<td class="table-actions">
          <button class="btn-icon" data-edit-nps="${n.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-del-nps="${n.id}" title="Eliminar">🗑</button>
        </td>` : ''
      ];
    });

    return kpis + `
      <div class="card mt-16">
        <div class="card-header">
          <div class="card-title">Respuestas NPS (${nps.length})</div>
          ${canEdit ? '<button class="btn btn-primary btn-sm" id="btn-add-nps">+ Registrar NPS</button>' : ''}
        </div>
        ${UI.table(['Score', 'Categoría', 'Cliente', 'Fecha', 'Comentario', canEdit ? 'Acciones' : ''], rows, { emptyText: 'No hay respuestas NPS.' })}
      </div>`;
  }

  // ── CAC / LTV ─────────────────────────────────────────
  function renderMetricas(canEdit, leads, ventas, nps) {
    const umbrales = Store.get('umbralesKPI');
    const range = getDateRange();

    // CAC: total marketing spend / number of new customers
    const gastosMarketing = (Store.get('gastos') || [])
      .filter(g => g.categoriaId && (Store.get('categoriasGasto') || []).find(c => c.id === g.categoriaId)?.nombre?.toLowerCase().includes('marketing') || g.categoriaId === 'cat-5')
      .filter(g => inRange(g.fecha, range));
    const totalMarketing = gastosMarketing.reduce((s, g) => s + g.monto, 0);
    const ventasPeriodo = ventas.filter(v => inRange(v.fecha, range));
    const nuevosClientes = new Set(ventasPeriodo.map(v => v.clienteId).filter(Boolean)).size;
    const cac = nuevosClientes > 0 ? totalMarketing / nuevosClientes : (ventasPeriodo.length > 0 ? totalMarketing / ventasPeriodo.length : 0);

    // LTV: average revenue per client * gross margin / churn rate
    const clientes = Store.get('clientes') || [];
    const facturas = Store.get('facturas') || [];
    let ltv = 0;
    if (clientes.length > 0) {
      const revenuePerClient = clientes.map(c => {
        const facs = facturas.filter(f => f.tipo === 'venta' && f.terceroId === c.id && f.estado !== 'anulada');
        return facs.reduce((s, f) => s + f.subtotal, 0);
      });
      const avgRevenue = revenuePerClient.reduce((s, r) => s + r, 0) / clientes.length;
      const emp = Store.get('empresa');
      const margen = 0.4; // default 40% if no data
      ltv = avgRevenue * margen;
    }

    const ltvCac = cac > 0 ? ltv / cac : 0;
    const semLtvCac = UI.semaphore(ltvCac, umbrales.ltvCac);

    // Conversion rate
    const leadsGanados = leads.filter(l => l.etapa === 'ganado').length;
    const conversionRate = leads.length > 0 ? (leadsGanados / leads.length * 100) : 0;

    // NPS
    const promotores = nps.filter(n => n.score >= 9).length;
    const detractores = nps.filter(n => n.score <= 6).length;
    const npsScore = nps.length > 0 ? Math.round((promotores - detractores) / nps.length * 100) : 0;

    const kpis = `
      <div class="grid grid-4">
        ${UI.kpiCard('CAC', UI.formatCOP(cac), `${nuevosClientes} clientes nuevos`, cac > 0 ? 'gray' : 'gray', 'Costo de Adquisición de Cliente')}
        ${UI.kpiCard('LTV', UI.formatCOP(ltv), `Promedio por cliente`, 'gray', 'Valor de Vida del Cliente')}
        ${UI.kpiCard('LTV/CAC', ltvCac.toFixed(1) + 'x', `Meta: ${umbrales.ltvCac.verde}x`, semLtvCac, 'Relación LTV a CAC — ideal > 3x')}
        ${UI.kpiCard('Tasa de Conversión', conversionRate.toFixed(1) + '%', `${leadsGanados}/${leads.length} leads`, conversionRate >= 20 ? 'green' : conversionRate >= 10 ? 'yellow' : 'red')}
      </div>
      <div class="grid grid-4 mt-16">
        ${UI.kpiCard('NPS', npsScore, `${nps.length} respuestas`, UI.semaphore(npsScore, umbrales.nps))}
        ${UI.kpiCard('Leads Totales', leads.length, `Activos: ${leads.filter(l => !['ganado', 'perdido'].includes(l.etapa)).length}`, 'gray')}
        ${UI.kpiCard('Ventas del Período', ventasPeriodo.length, UI.formatCOP(ventasPeriodo.reduce((s, v) => s + v.monto, 0)), 'green')}
        ${UI.kpiCard('Ticket Promedio', ventasPeriodo.length > 0 ? UI.formatCOP(ventasPeriodo.reduce((s, v) => s + v.monto, 0) / ventasPeriodo.length) : '$0', '—', 'gray')}
      </div>`;

    // CAC by source
    const fuentes = {};
    leads.forEach(l => { fuentes[l.fuente || 'Sin fuente'] = (fuentes[l.fuente || 'Sin fuente'] || 0) + 1; });
    const maxFuente = Math.max(...Object.values(fuentes), 1);

    const sourceChart = `
      <div class="card mt-16">
        <div class="card-header"><div class="card-title">Leads por Fuente</div></div>
        ${Object.keys(fuentes).length === 0
          ? '<p class="muted p-16">Sin datos de leads.</p>'
          : `<div class="bar-chart">
            ${Object.entries(fuentes).sort((a, b) => b[1] - a[1]).map(([fuente, count]) => `
              <div class="bar-row">
                <span class="bar-label">${fuente}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${(count / maxFuente * 100).toFixed(1)}%"></div></div>
                <span class="bar-value">${count}</span>
              </div>
            `).join('')}
          </div>`}
      </div>`;

    return kpis + sourceChart;
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
    const canEdit = Auth.canWrite('ventas');
    document.querySelectorAll('.sub-tab').forEach(btn => {
      btn.addEventListener('click', () => { subTab = btn.dataset.subtab; App.renderCurrentPage(); });
    });

    if (!canEdit) return;

    if (subTab === 'embudo') bindEmbudo();
    else if (subTab === 'ventas') bindVentas();
    else if (subTab === 'nps') bindNPS();
  }

  function bindEmbudo() {
    document.getElementById('btn-add-lead')?.addEventListener('click', () => showLeadModal());
    document.querySelectorAll('[data-edit-lead]').forEach(b => b.addEventListener('click', () => showLeadModal(b.dataset.editLead)));
    document.querySelectorAll('[data-del-lead]').forEach(b => b.addEventListener('click', () => {
      UI.confirm('¿Eliminar este lead?', () => {
        Store.remove('leads', b.dataset.delLead);
        UI.toast('Lead eliminado', 'success');
        App.renderCurrentPage();
      });
    }));
  }

  function bindVentas() {
    document.getElementById('btn-add-venta')?.addEventListener('click', () => showVentaModal());
    document.querySelectorAll('[data-edit-venta]').forEach(b => b.addEventListener('click', () => showVentaModal(b.dataset.editVenta)));
    document.querySelectorAll('[data-del-venta]').forEach(b => b.addEventListener('click', () => {
      UI.confirm('¿Eliminar esta venta?', () => {
        Store.remove('ventas', b.dataset.delVenta);
        UI.toast('Venta eliminada', 'success');
        App.renderCurrentPage();
      });
    }));
  }

  function bindNPS() {
    document.getElementById('btn-add-nps')?.addEventListener('click', () => showNPSModal());
    document.querySelectorAll('[data-edit-nps]').forEach(b => b.addEventListener('click', () => showNPSModal(b.dataset.editNps)));
    document.querySelectorAll('[data-del-nps]').forEach(b => b.addEventListener('click', () => {
      UI.confirm('¿Eliminar esta respuesta NPS?', () => {
        Store.remove('encuestasNPS', b.dataset.delNps);
        UI.toast('NPS eliminado', 'success');
        App.renderCurrentPage();
      });
    }));
  }

  function showLeadModal(leadId) {
    const isEdit = !!leadId;
    const l = isEdit ? Store.findById('leads', leadId) : null;
    const clientes = Store.get('clientes') || [];
    const cliOpts = [{ value: '', label: 'Sin cliente vinculado' }, ...clientes.map(c => ({ value: c.id, label: c.nombre }))];

    UI.modal(isEdit ? 'Editar lead' : 'Nuevo lead', `
      ${UI.formField('Nombre del contacto', 'lead-nombre', 'text', l?.nombre || '')}
      <div class="form-row">
        ${UI.formField('Empresa', 'lead-empresa', 'text', l?.empresa || '')}
        ${UI.formField('Email', 'lead-email', 'email', l?.email || '')}
      </div>
      <div class="form-row">
        ${UI.formField('Teléfono', 'lead-telefono', 'text', l?.telefono || '')}
        ${UI.formField('Fuente', 'lead-fuente', 'select', l?.fuente || 'web', { options: [
          { value: 'web', label: 'Web' }, { value: 'referido', label: 'Referido' },
          { value: 'meta_ads', label: 'Meta Ads' }, { value: 'google_ads', label: 'Google Ads' },
          { value: 'linkedin', label: 'LinkedIn' }, { value: 'evento', label: 'Evento' },
          { value: 'otro', label: 'Otro' }
        ]})}
      </div>
      <div class="form-row">
        ${UI.formField('Etapa', 'lead-etapa', 'select', l?.etapa || 'nuevo', { options: [
          { value: 'nuevo', label: 'Nuevo' }, { value: 'contactado', label: 'Contactado' },
          { value: 'calificado', label: 'Calificado' }, { value: 'propuesta', label: 'Propuesta' },
          { value: 'negociacion', label: 'Negociación' }, { value: 'ganado', label: 'Ganado' },
          { value: 'perdido', label: 'Perdido' }
        ]})}
        ${UI.formField('Valor potencial', 'lead-valor', 'number', l?.valor || '', { step: '0.01' })}
      </div>
      <div class="form-row">
        ${UI.formField('Cliente vinculado', 'lead-cliente', 'select', l?.clienteId || '', { options: cliOpts })}
        ${UI.formField('Fecha', 'lead-fecha', 'date', l?.fecha || new Date().toISOString().slice(0, 10))}
      </div>
    `, `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="modal-save-lead">Guardar</button>`);

    document.getElementById('modal-save-lead').addEventListener('click', () => {
      const nombre = document.getElementById('lead-nombre').value.trim();
      if (!nombre) { UI.toast('El nombre es obligatorio', 'error'); return; }
      const data = {
        nombre,
        empresa: document.getElementById('lead-empresa').value.trim(),
        email: document.getElementById('lead-email').value.trim(),
        telefono: document.getElementById('lead-telefono').value.trim(),
        fuente: document.getElementById('lead-fuente').value,
        etapa: document.getElementById('lead-etapa').value,
        valor: parseFloat(document.getElementById('lead-valor').value) || 0,
        clienteId: document.getElementById('lead-cliente').value || null,
        fecha: document.getElementById('lead-fecha').value,
      };
      if (isEdit) { Store.update('leads', leadId, data); UI.toast('Lead actualizado', 'success'); }
      else { Store.insert('leads', data); Store.log(Auth.getCurrentUser()?.nombre, 'Creó lead', 'leads', `Lead ${nombre}`); UI.toast('Lead creado', 'success'); }
      UI.closeModal();
      App.renderCurrentPage();
    });
  }

  function showVentaModal(ventaId) {
    const isEdit = !!ventaId;
    const v = isEdit ? Store.findById('ventas', ventaId) : null;
    const clientes = Store.get('clientes') || [];
    const leads = Store.get('leads') || [];
    const cliOpts = clientes.length ? clientes.map(c => ({ value: c.id, label: c.nombre })) : [{ value: '', label: 'Sin clientes — crea uno en Cartera' }];
    const leadOpts = [{ value: '', label: 'Sin lead vinculado' }, ...leads.map(l => ({ value: l.id, label: l.nombre }))];

    UI.modal(isEdit ? 'Editar venta' : 'Registrar venta', `
      <div class="form-row">
        ${UI.formField('Número', 'v-numero', 'text', v?.numero || '')}
        ${UI.formField('Fecha', 'v-fecha', 'date', v?.fecha || new Date().toISOString().slice(0, 10))}
      </div>
      ${UI.formField('Cliente', 'v-cliente', 'select', v?.clienteId || '', { options: cliOpts })}
      ${UI.formField('Lead de origen', 'v-lead', 'select', v?.leadId || '', { options: leadOpts })}
      <div class="form-row">
        ${UI.formField('Monto', 'v-monto', 'number', v?.monto || '', { step: '0.01' })}
        ${UI.formField('CAC (costo adquisición)', 'v-cac', 'number', v?.cac || '', { step: '0.01' })}
      </div>
    `, `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="modal-save-venta">Guardar</button>`);

    document.getElementById('modal-save-venta').addEventListener('click', () => {
      const monto = parseFloat(document.getElementById('v-monto').value) || 0;
      if (monto <= 0) { UI.toast('El monto debe ser mayor a 0', 'error'); return; }
      const clienteId = document.getElementById('v-cliente').value;
      const cliente = Store.findById('clientes', clienteId);
      const data = {
        numero: document.getElementById('v-numero').value.trim(),
        fecha: document.getElementById('v-fecha').value,
        clienteId,
        clienteNombre: cliente?.nombre || '',
        leadId: document.getElementById('v-lead').value || null,
        monto,
        cac: parseFloat(document.getElementById('v-cac').value) || 0,
      };
      if (isEdit) { Store.update('ventas', ventaId, data); UI.toast('Venta actualizada', 'success'); }
      else { Store.insert('ventas', data); Store.log(Auth.getCurrentUser()?.nombre, 'Registró venta', 'ventas', `Venta ${UI.formatCOP(monto)}`); UI.toast('Venta registrada', 'success'); }
      UI.closeModal();
      App.renderCurrentPage();
    });
  }

  function showNPSModal(npsId) {
    const isEdit = !!npsId;
    const n = isEdit ? Store.findById('encuestasNPS', npsId) : null;
    const clientes = Store.get('clientes') || [];
    const cliOpts = [{ value: '', label: 'Sin cliente vinculado' }, ...clientes.map(c => ({ value: c.id, label: c.nombre }))];

    UI.modal(isEdit ? 'Editar NPS' : 'Registrar NPS', `
      <div class="form-row">
        ${UI.formField('Cliente', 'nps-cliente', 'select', n?.clienteId || '', { options: cliOpts })}
        ${UI.formField('Score (0-10)', 'nps-score', 'number', n?.score ?? '', { min: '0', max: '10' })}
      </div>
      ${UI.formField('Fecha', 'nps-fecha', 'date', n?.fecha || new Date().toISOString().slice(0, 10))}
      ${UI.formField('Comentario', 'nps-comentario', 'textarea', n?.comentario || '')}
    `, `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="modal-save-nps">Guardar</button>`);

    document.getElementById('modal-save-nps').addEventListener('click', () => {
      const score = parseInt(document.getElementById('nps-score').value);
      if (isNaN(score) || score < 0 || score > 10) { UI.toast('Score debe ser entre 0 y 10', 'error'); return; }
      const clienteId = document.getElementById('nps-cliente').value;
      const cliente = Store.findById('clientes', clienteId);
      const data = {
        clienteId: clienteId || null,
        clienteNombre: cliente?.nombre || '',
        score,
        fecha: document.getElementById('nps-fecha').value,
        comentario: document.getElementById('nps-comentario').value.trim(),
      };
      if (isEdit) { Store.update('encuestasNPS', npsId, data); UI.toast('NPS actualizado', 'success'); }
      else { Store.insert('encuestasNPS', data); UI.toast('NPS registrado', 'success'); }
      UI.closeModal();
      App.renderCurrentPage();
    });
  }

  return { render, bind };
})();
