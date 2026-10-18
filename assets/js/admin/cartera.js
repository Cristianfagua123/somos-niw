/* ==========================================================
   CARTERA PAGE — Facturas, clientes, proveedores (Fase 2)
   ========================================================== */

const CarteraPage = (() => {

  let subTab = 'facturas';

  const ESTADOS = ['borrador', 'emitida', 'parcialmente pagada', 'pagada', 'vencida', 'anulada'];
  const MEDIOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro'];

  function render() {
    const canEdit = Auth.canWrite('cartera');
    const facturas = Store.get('facturas') || [];
    const clientes = Store.get('clientes') || [];
    const proveedores = Store.get('proveedores') || [];

    // Alerts
    const alerts = buildAlerts(facturas);

    // Sub-tabs
    const subTabs = `
      <div class="sub-tabs">
        <button class="sub-tab ${subTab === 'facturas' ? 'active' : ''}" data-subtab="facturas">🧾 Facturas (${facturas.length})</button>
        <button class="sub-tab ${subTab === 'clientes' ? 'active' : ''}" data-subtab="clientes">👥 Clientes (${clientes.length})</button>
        <button class="sub-tab ${subTab === 'proveedores' ? 'active' : ''}" data-subtab="proveedores">🏢 Proveedores (${proveedores.length})</button>
      </div>`;

    let content = '';
    if (subTab === 'facturas') content = renderFacturas(canEdit, facturas, clientes, proveedores);
    else if (subTab === 'clientes') content = renderClientes(canEdit, clientes);
    else if (subTab === 'proveedores') content = renderProveedores(canEdit, proveedores);

    return `
      <div class="page-header">
        <h1>Cartera y Facturas</h1>
        <p>Gestión de facturas de venta y compra, clientes, proveedores y pagos.</p>
      </div>
      ${alerts}
      ${subTabs}
      ${content}
    `;
  }

  // ── Alerts ────────────────────────────────────────────
  function buildAlerts(facturas) {
    const hoy = new Date();
    let vencidas = [], dias7 = [], dias3 = [];

    facturas.forEach(f => {
      if (f.tipo !== 'venta' || f.estado === 'pagada' || f.estado === 'anulada') return;
      if (!f.fechaVencimiento) return;
      const venc = new Date(f.fechaVencimiento);
      const diff = Math.ceil((venc - hoy) / 86400000);
      if (diff < 0) vencidas.push(f);
      else if (diff <= 3) dias3.push(f);
      else if (diff <= 7) dias7.push(f);
    });

    let html = '';
    if (vencidas.length) html += UI.alertBox('danger', `<strong>${vencidas.length}</strong> factura(s) vencida(s): ${vencidas.map(f => f.numero).join(', ')}`);
    if (dias3.length) html += UI.alertBox('warning', `<strong>${dias3.length}</strong> factura(s) vencen en 3 días: ${dias3.map(f => f.numero).join(', ')}`);
    if (dias7.length) html += UI.alertBox('info', `<strong>${dias7.length}</strong> factura(s) vencen en 7 días: ${dias7.map(f => f.numero).join(', ')}`);
    return html;
  }

  // ── Facturas ───────────────────────────────────────────
  function renderFacturas(canEdit, facturas, clientes, proveedores) {
    const filterBtns = `
      <div class="flex gap-8 mb-16 flex-wrap">
        <button class="btn btn-ghost btn-sm filter-fac active" data-filter="all">Todas (${facturas.length})</button>
        <button class="btn btn-ghost btn-sm filter-fac" data-filter="venta">Venta (${facturas.filter(f => f.tipo === 'venta').length})</button>
        <button class="btn btn-ghost btn-sm filter-fac" data-filter="compra">Compra (${facturas.filter(f => f.tipo === 'compra').length})</button>
        <button class="btn btn-ghost btn-sm filter-fac" data-filter="vencida">Vencidas (${facturas.filter(f => f.estado === 'vencida').length})</button>
        ${canEdit ? '<button class="btn btn-primary btn-sm ml-auto" id="btn-add-factura">+ Nueva factura</button>' : ''}
      </div>`;

    const rows = facturas.map(f => {
      const pagos = (Store.get('pagosFactura') || []).filter(p => p.facturaId === f.id);
      const pagado = pagos.reduce((s, p) => s + p.monto, 0);
      const saldo = f.total - pagado;
      const estadoBadge = `<span class="badge badge-${f.estado === 'pagada' ? 'green' : f.estado === 'vencida' ? 'red' : f.estado === 'anulada' ? 'gray' : f.estado === 'parcialmente pagada' ? 'yellow' : 'blue'}">${f.estado}</span>`;
      const tercero = f.tipo === 'venta'
        ? (Store.findById('clientes', f.terceroId)?.nombre || f.terceroNombre || '—')
        : (Store.findById('proveedores', f.terceroId)?.nombre || f.terceroNombre || '—');
      return [
        `<strong>${f.numero}</strong>`,
        `<span class="badge badge-${f.tipo === 'venta' ? 'green' : 'gray'}">${f.tipo}</span>`,
        tercero,
        new Date(f.fechaEmision).toLocaleDateString('es-CO'),
        f.fechaVencimiento ? new Date(f.fechaVencimiento).toLocaleDateString('es-CO') : '—',
        UI.formatCOP(f.total),
        UI.formatCOP(pagado),
        UI.formatCOP(saldo),
        estadoBadge,
        canEdit ? `<td class="table-actions">
          <button class="btn-icon" data-pay-fac="${f.id}" title="Registrar pago">💰</button>
          <button class="btn-icon" data-edit-fac="${f.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-del-fac="${f.id}" title="Eliminar">🗑</button>
        </td>` : ''
      ];
    });

    return `${filterBtns}
      <div class="card">
        ${UI.table(['Número', 'Tipo', 'Tercero', 'Emisión', 'Vencimiento', 'Total', 'Pagado', 'Saldo', 'Estado', canEdit ? 'Acciones' : ''], rows, { emptyText: 'No hay facturas. Crea la primera con "+ Nueva factura".' })}
      </div>`;
  }

  // ── Clientes ──────────────────────────────────────────
  function renderClientes(canEdit, clientes) {
    const rows = clientes.map(c => {
      const facturas = (Store.get('facturas') || []).filter(f => f.tipo === 'venta' && f.terceroId === c.id);
      const totalFacturado = facturas.reduce((s, f) => s + f.total, 0);
      const pagos = (Store.get('pagosFactura') || []).filter(p => facturas.some(f => f.id === p.facturaId));
      const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
      return [
        `<strong>${c.nombre}</strong>`,
        c.nit || '—',
        c.email || '—',
        c.telefono || '—',
        facturas.length,
        UI.formatCOP(totalFacturado),
        UI.formatCOP(totalFacturado - totalPagado),
        canEdit ? `<td class="table-actions">
          <button class="btn-icon" data-view-cli="${c.id}" title="Ver historial">👁</button>
          <button class="btn-icon" data-edit-cli="${c.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-del-cli="${c.id}" title="Eliminar">🗑</button>
        </td>` : ''
      ];
    });

    return `
      <div class="flex mb-16">
        ${canEdit ? '<button class="btn btn-primary btn-sm ml-auto" id="btn-add-cliente">+ Nuevo cliente</button>' : ''}
      </div>
      <div class="card">
        ${UI.table(['Nombre', 'NIT', 'Email', 'Teléfono', 'Facturas', 'Facturado', 'Saldo', canEdit ? 'Acciones' : ''], rows, { emptyText: 'No hay clientes registrados.' })}
      </div>`;
  }

  // ── Proveedores ───────────────────────────────────────
  function renderProveedores(canEdit, proveedores) {
    const rows = proveedores.map(p => {
      const facturas = (Store.get('facturas') || []).filter(f => f.tipo === 'compra' && f.terceroId === p.id);
      const totalComprado = facturas.reduce((s, f) => s + f.total, 0);
      const pagos = (Store.get('pagosFactura') || []).filter(pay => facturas.some(f => f.id === pay.facturaId));
      const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
      return [
        `<strong>${p.nombre}</strong>`,
        p.nit || '—',
        p.email || '—',
        p.telefono || '—',
        facturas.length,
        UI.formatCOP(totalComprado),
        UI.formatCOP(totalComprado - totalPagado),
        canEdit ? `<td class="table-actions">
          <button class="btn-icon" data-view-prov="${p.id}" title="Ver historial">👁</button>
          <button class="btn-icon" data-edit-prov="${p.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-del-prov="${p.id}" title="Eliminar">🗑</button>
        </td>` : ''
      ];
    });

    return `
      <div class="flex mb-16">
        ${canEdit ? '<button class="btn btn-primary btn-sm ml-auto" id="btn-add-proveedor">+ Nuevo proveedor</button>' : ''}
      </div>
      <div class="card">
        ${UI.table(['Nombre', 'NIT', 'Email', 'Teléfono', 'Facturas', 'Comprado', 'Saldo', canEdit ? 'Acciones' : ''], rows, { emptyText: 'No hay proveedores registrados.' })}
      </div>`;
  }

  // ── Bind events ───────────────────────────────────────
  function bind() {
    const canEdit = Auth.canWrite('cartera');

    // Sub-tabs
    document.querySelectorAll('.sub-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        subTab = btn.dataset.subtab;
        App.renderCurrentPage();
      });
    });

    if (subTab === 'facturas') bindFacturas(canEdit);
    else if (subTab === 'clientes') bindClientes(canEdit);
    else if (subTab === 'proveedores') bindProveedores(canEdit);
  }

  function bindFacturas(canEdit) {
    // Filter buttons
    document.querySelectorAll('.filter-fac').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-fac').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterFacturas(btn.dataset.filter);
      });
    });

    if (!canEdit) return;

    document.getElementById('btn-add-factura')?.addEventListener('click', () => showFacturaModal());
    document.querySelectorAll('[data-edit-fac]').forEach(b => b.addEventListener('click', () => showFacturaModal(b.dataset.editFac)));
    document.querySelectorAll('[data-del-fac]').forEach(b => b.addEventListener('click', () => {
      UI.confirm('¿Eliminar esta factura y sus pagos?', () => {
        const id = b.dataset.delFac;
        Store.remove('facturas', id);
        (Store.get('pagosFactura') || []).filter(p => p.facturaId === id).forEach(p => Store.remove('pagosFactura', p.id));
        Store.log(Auth.getCurrentUser()?.nombre, 'Eliminó factura', 'facturas', `Factura ${id} eliminada`);
        UI.toast('Factura eliminada', 'success');
        App.renderCurrentPage();
      });
    }));
    document.querySelectorAll('[data-pay-fac]').forEach(b => b.addEventListener('click', () => showPagoModal(b.dataset.payFac)));
  }

  function filterFacturas(filter) {
    const rows = document.querySelectorAll('.card table tbody tr');
    const facturas = Store.get('facturas') || [];
    rows.forEach((row, i) => {
      const f = facturas[i];
      if (!f) return;
      let show = true;
      if (filter === 'venta') show = f.tipo === 'venta';
      else if (filter === 'compra') show = f.tipo === 'compra';
      else if (filter === 'vencida') show = f.estado === 'vencida';
      row.style.display = show ? '' : 'none';
    });
  }

  function bindClientes(canEdit) {
    if (!canEdit) return;
    document.getElementById('btn-add-cliente')?.addEventListener('click', () => showTerceroModal('cliente'));
    document.querySelectorAll('[data-edit-cli]').forEach(b => b.addEventListener('click', () => showTerceroModal('cliente', b.dataset.editCli)));
    document.querySelectorAll('[data-del-cli]').forEach(b => b.addEventListener('click', () => {
      UI.confirm('¿Eliminar este cliente?', () => {
        Store.remove('clientes', b.dataset.delCli);
        Store.log(Auth.getCurrentUser()?.nombre, 'Eliminó cliente', 'clientes', `Cliente ${b.dataset.delCli} eliminado`);
        UI.toast('Cliente eliminado', 'success');
        App.renderCurrentPage();
      });
    }));
    document.querySelectorAll('[data-view-cli]').forEach(b => b.addEventListener('click', () => showTerceroHistory('cliente', b.dataset.viewCli)));
  }

  function bindProveedores(canEdit) {
    if (!canEdit) return;
    document.getElementById('btn-add-proveedor')?.addEventListener('click', () => showTerceroModal('proveedor'));
    document.querySelectorAll('[data-edit-prov]').forEach(b => b.addEventListener('click', () => showTerceroModal('proveedor', b.dataset.editProv)));
    document.querySelectorAll('[data-del-prov]').forEach(b => b.addEventListener('click', () => {
      UI.confirm('¿Eliminar este proveedor?', () => {
        Store.remove('proveedores', b.dataset.delProv);
        Store.log(Auth.getCurrentUser()?.nombre, 'Eliminó proveedor', 'proveedores', `Proveedor ${b.dataset.delProv} eliminado`);
        UI.toast('Proveedor eliminado', 'success');
        App.renderCurrentPage();
      });
    }));
    document.querySelectorAll('[data-view-prov]').forEach(b => b.addEventListener('click', () => showTerceroHistory('proveedor', b.dataset.viewProv)));
  }

  // ── Factura modal ─────────────────────────────────────
  function showFacturaModal(facturaId) {
    const isEdit = !!facturaId;
    const fac = isEdit ? Store.findById('facturas', facturaId) : null;
    const clientes = Store.get('clientes') || [];
    const proveedores = Store.get('proveedores') || [];
    const proyectos = Store.get('proyectos') || [];
    const emp = Store.get('empresa');
    const tipo = fac?.tipo || 'venta';
    const terceros = tipo === 'venta' ? clientes : proveedores;
    const terceroOpts = terceros.map(t => ({ value: t.id, label: `${t.nombre} — ${t.nit || 'sin NIT'}` }));

    const proyectoOpts = [{ value: '', label: 'Sin proyecto' }, ...proyectos.map(p => ({ value: p.id, label: p.nombre }))];

    UI.modal(
      isEdit ? 'Editar factura' : 'Nueva factura',
      `
        <div class="form-row">
          ${UI.formField('Tipo', 'fac-tipo', 'select', tipo, { options: [{ value: 'venta', label: 'Venta (cliente)' }, { value: 'compra', label: 'Compra (proveedor)' }] })}
          ${UI.formField('Número', 'fac-numero', 'text', fac?.numero || '')}
        </div>
        <div class="form-row">
          ${UI.formField('Fecha emisión', 'fac-emision', 'date', fac?.fechaEmision || new Date().toISOString().slice(0, 10))}
          ${UI.formField('Fecha vencimiento', 'fac-vencimiento', 'date', fac?.fechaVencimiento || '')}
        </div>
        <div class="form-row">
          ${UI.formField(tipo === 'venta' ? 'Cliente' : 'Proveedor', 'fac-tercero', 'select', fac?.terceroId || '', { options: terceroOpts.length ? terceroOpts : [{ value: '', label: 'Sin registros — crea uno primero' }] })}
          ${UI.formField('NIT', 'fac-nit', 'text', fac?.nit || '')}
        </div>
        <div class="form-row">
          ${UI.formField('Subtotal', 'fac-subtotal', 'number', fac?.subtotal || '', { step: '0.01' })}
          ${UI.formField('% IVA', 'fac-iva-pct', 'number', fac?.ivaPct ?? emp?.ivaPct ?? 19, { step: '0.1' })}
        </div>
        <div class="form-row">
          ${UI.formField('% Ret. Fuente', 'fac-ret-fuente', 'number', fac?.retFuentePct || 0, { step: '0.1' })}
          ${UI.formField('% Ret. ICA', 'fac-ret-ica', 'number', fac?.retIcaPct || 0, { step: '0.1' })}
          ${UI.formField('% Ret. IVA', 'fac-ret-iva', 'number', fac?.retIvaPct || 0, { step: '0.1' })}
        </div>
        <div class="form-row">
          ${UI.formField('Estado', 'fac-estado', 'select', fac?.estado || 'borrador', { options: ESTADOS.map(e => ({ value: e, label: e })) })}
          ${UI.formField('Proyecto', 'fac-proyecto', 'select', fac?.proyectoId || '', { options: proyectoOpts })}
        </div>
        ${UI.formField('Categoría', 'fac-categoria', 'text', fac?.categoria || '')}
        <div class="form-group">
          <label>Total calculado</label>
          <div id="fac-total-display" style="font-size:1.4rem;font-weight:800;color:var(--accent);">${UI.formatCOP(0)}</div>
        </div>
      `,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
       <button class="btn btn-primary" id="modal-save-fac">Guardar</button>`
    );

    // Auto-calc total
    const calcTotal = () => {
      const subtotal = parseFloat(document.getElementById('fac-subtotal').value) || 0;
      const ivaPct = parseFloat(document.getElementById('fac-iva-pct').value) || 0;
      const retFuente = parseFloat(document.getElementById('fac-ret-fuente').value) || 0;
      const retIca = parseFloat(document.getElementById('fac-ret-ica').value) || 0;
      const retIva = parseFloat(document.getElementById('fac-ret-iva').value) || 0;
      const iva = subtotal * ivaPct / 100;
      const retF = subtotal * retFuente / 100;
      const retI = subtotal * retIca / 100;
      const retIV = iva * retIva / 100;
      const total = subtotal + iva - retF - retI - retIV;
      document.getElementById('fac-total-display').textContent = UI.formatCOP(total);
      return total;
    };
    ['fac-subtotal', 'fac-iva-pct', 'fac-ret-fuente', 'fac-ret-ica', 'fac-ret-iva'].forEach(id => {
      document.getElementById(id).addEventListener('input', calcTotal);
    });
    calcTotal();

    // Update tercero options when tipo changes
    document.getElementById('fac-tipo').addEventListener('change', (e) => {
      const newTipo = e.target.value;
      const newTerceros = newTipo === 'venta' ? clientes : proveedores;
      const sel = document.getElementById('fac-tercero');
      const label = document.querySelector('label[for="fac-tercero"]');
      if (label) label.textContent = newTipo === 'venta' ? 'Cliente' : 'Proveedor';
      sel.innerHTML = newTerceros.map(t => `<option value="${t.id}">${t.nombre} — ${t.nit || 'sin NIT'}</option>`).join('') || '<option value="">Sin registros</option>';
    });

    document.getElementById('modal-save-fac').addEventListener('click', () => {
      const numero = document.getElementById('fac-numero').value.trim();
      const subtotal = parseFloat(document.getElementById('fac-subtotal').value) || 0;
      if (!numero) { UI.toast('El número de factura es obligatorio', 'error'); return; }
      if (subtotal <= 0) { UI.toast('El subtotal debe ser mayor a 0', 'error'); return; }

      const tipo = document.getElementById('fac-tipo').value;
      const terceroId = document.getElementById('fac-tercero').value;
      const tercero = tipo === 'venta' ? Store.findById('clientes', terceroId) : Store.findById('proveedores', terceroId);
      const ivaPct = parseFloat(document.getElementById('fac-iva-pct').value) || 0;
      const total = calcTotal();

      const data = {
        tipo,
        numero,
        fechaEmision: document.getElementById('fac-emision').value,
        fechaVencimiento: document.getElementById('fac-vencimiento').value,
        terceroId,
        terceroNombre: tercero?.nombre || '',
        nit: document.getElementById('fac-nit').value.trim(),
        subtotal,
        ivaPct,
        iva: subtotal * ivaPct / 100,
        retFuentePct: parseFloat(document.getElementById('fac-ret-fuente').value) || 0,
        retIcaPct: parseFloat(document.getElementById('fac-ret-ica').value) || 0,
        retIvaPct: parseFloat(document.getElementById('fac-ret-iva').value) || 0,
        total,
        estado: document.getElementById('fac-estado').value,
        categoria: document.getElementById('fac-categoria').value.trim(),
        proyectoId: document.getElementById('fac-proyecto').value || null,
      };

      if (isEdit) {
        Store.update('facturas', facturaId, data);
        Store.log(Auth.getCurrentUser()?.nombre, 'Editó factura', 'facturas', `Factura ${numero} actualizada`);
        UI.toast('Factura actualizada', 'success');
      } else {
        Store.insert('facturas', data);
        Store.log(Auth.getCurrentUser()?.nombre, 'Creó factura', 'facturas', `Factura ${numero} creada`);
        UI.toast('Factura creada', 'success');
      }
      UI.closeModal();
      App.renderCurrentPage();
    });
  }

  // ── Pago modal ────────────────────────────────────────
  function showPagoModal(facturaId) {
    const fac = Store.findById('facturas', facturaId);
    if (!fac) return;
    const pagos = (Store.get('pagosFactura') || []).filter(p => p.facturaId === facturaId);
    const pagado = pagos.reduce((s, p) => s + p.monto, 0);
    const saldo = fac.total - pagado;

    const pagosHTML = pagos.length ? `
      <div class="section-title">Pagos registrados</div>
      <div class="table-wrap mb-16">
        <table><thead><tr><th>Fecha</th><th>Monto</th><th>Medio</th><th></th></tr></thead>
        <tbody>
          ${pagos.map(p => `<tr>
            <td>${new Date(p.fecha).toLocaleDateString('es-CO')}</td>
            <td>${UI.formatCOP(p.monto)}</td>
            <td>${p.medioPago}</td>
            <td><button class="btn-icon" data-del-pago="${p.id}">🗑</button></td>
          </tr>`).join('')}
        </tbody></table>
      </div>` : '';

    UI.modal(
      `Registrar pago — ${fac.numero}`,
      `
        <div class="flex-between mb-16">
          <span class="muted">Total: ${UI.formatCOP(fac.total)}</span>
          <span class="muted">Pagado: ${UI.formatCOP(pagado)}</span>
          <span class="muted">Saldo: <strong>${UI.formatCOP(saldo)}</strong></span>
        </div>
        ${pagosHTML}
        <div class="form-row">
          ${UI.formField('Monto del pago', 'pago-monto', 'number', saldo, { step: '0.01' })}
          ${UI.formField('Fecha', 'pago-fecha', 'date', new Date().toISOString().slice(0, 10))}
        </div>
        ${UI.formField('Medio de pago', 'pago-medio', 'select', 'Transferencia', { options: MEDIOS_PAGO.map(m => ({ value: m, label: m })) })}
      `,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">Cerrar</button>
       <button class="btn btn-primary" id="modal-save-pago">Registrar pago</button>`
    );

    // Delete existing payment
    document.querySelectorAll('[data-del-pago]').forEach(b => b.addEventListener('click', () => {
      Store.remove('pagosFactura', b.dataset.delPago);
      UI.toast('Pago eliminado', 'success');
      UI.closeModal();
      App.renderCurrentPage();
    }));

    document.getElementById('modal-save-pago').addEventListener('click', () => {
      const monto = parseFloat(document.getElementById('pago-monto').value) || 0;
      if (monto <= 0) { UI.toast('El monto debe ser mayor a 0', 'error'); return; }
      if (monto > saldo + 0.01) { UI.toast('El monto excede el saldo', 'error'); return; }

      Store.insert('pagosFactura', {
        facturaId,
        fecha: document.getElementById('pago-fecha').value,
        monto,
        medioPago: document.getElementById('pago-medio').value,
      });

      // Update factura state
      const newPagado = pagado + monto;
      let newEstado = fac.estado;
      if (newPagado >= fac.total - 0.01) newEstado = 'pagada';
      else if (newPagado > 0) newEstado = 'parcialmente pagada';
      Store.update('facturas', facturaId, { estado: newEstado });

      Store.log(Auth.getCurrentUser()?.nombre, 'Registró pago', 'pagosFactura', `Pago de ${UI.formatCOP(monto)} a factura ${fac.numero}`);
      UI.toast('Pago registrado', 'success');
      UI.closeModal();
      App.renderCurrentPage();
    });
  }

  // ── Tercero modal (cliente/proveedor) ─────────────────
  function showTerceroModal(tipo, id) {
    const isEdit = !!id;
    const collection = tipo === 'cliente' ? 'clientes' : 'proveedores';
    const entity = isEdit ? Store.findById(collection, id) : null;
    const title = tipo === 'cliente' ? (isEdit ? 'Editar cliente' : 'Nuevo cliente') : (isEdit ? 'Editar proveedor' : 'Nuevo proveedor');

    UI.modal(title, `
      ${UI.formField('Nombre / Razón social', 'ter-nombre', 'text', entity?.nombre || '')}
      <div class="form-row">
        ${UI.formField('NIT', 'ter-nit', 'text', entity?.nit || '')}
        ${UI.formField('Teléfono', 'ter-telefono', 'text', entity?.telefono || '')}
      </div>
      ${UI.formField('Email', 'ter-email', 'email', entity?.email || '')}
      ${UI.formField('Dirección', 'ter-direccion', 'text', entity?.direccion || '')}
    `, `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="modal-save-ter">Guardar</button>`);

    document.getElementById('modal-save-ter').addEventListener('click', () => {
      const nombre = document.getElementById('ter-nombre').value.trim();
      if (!nombre) { UI.toast('El nombre es obligatorio', 'error'); return; }
      const data = {
        nombre,
        nit: document.getElementById('ter-nit').value.trim(),
        telefono: document.getElementById('ter-telefono').value.trim(),
        email: document.getElementById('ter-email').value.trim(),
        direccion: document.getElementById('ter-direccion').value.trim(),
      };
      if (isEdit) {
        Store.update(collection, id, data);
        Store.log(Auth.getCurrentUser()?.nombre, `Editó ${tipo}`, collection, `${tipo} ${nombre} actualizado`);
        UI.toast(`${tipo === 'cliente' ? 'Cliente' : 'Proveedor'} actualizado`, 'success');
      } else {
        Store.insert(collection, data);
        Store.log(Auth.getCurrentUser()?.nombre, `Creó ${tipo}`, collection, `${tipo} ${nombre} creado`);
        UI.toast(`${tipo === 'cliente' ? 'Cliente' : 'Proveedor'} creado`, 'success');
      }
      UI.closeModal();
      App.renderCurrentPage();
    });
  }

  // ── Tercero history ───────────────────────────────────
  function showTerceroHistory(tipo, id) {
    const collection = tipo === 'cliente' ? 'clientes' : 'proveedores';
    const entity = Store.findById(collection, id);
    if (!entity) return;
    const facturas = (Store.get('facturas') || []).filter(f =>
      f.terceroId === id && (tipo === 'cliente' ? f.tipo === 'venta' : f.tipo === 'compra')
    );
    const pagos = (Store.get('pagosFactura') || []).filter(p => facturas.some(f => f.id === p.facturaId));
    const totalFacturado = facturas.reduce((s, f) => s + f.total, 0);
    const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
    const saldo = totalFacturado - totalPagado;

    const facRows = facturas.map(f => {
      const fPagos = pagos.filter(p => p.facturaId === f.id);
      const fPagado = fPagos.reduce((s, p) => s + p.monto, 0);
      return [
        `<strong>${f.numero}</strong>`,
        new Date(f.fechaEmision).toLocaleDateString('es-CO'),
        f.fechaVencimiento ? new Date(f.fechaVencimiento).toLocaleDateString('es-CO') : '—',
        UI.formatCOP(f.total),
        UI.formatCOP(fPagado),
        `<span class="badge badge-${f.estado === 'pagada' ? 'green' : f.estado === 'vencida' ? 'red' : 'blue'}">${f.estado}</span>`,
      ];
    });

    UI.modal(
      `${tipo === 'cliente' ? 'Cliente' : 'Proveedor'}: ${entity.nombre}`,
      `
        <div class="grid grid-3 mb-16">
          <div class="kpi-card sem-gray"><div class="kpi-label">Total facturado</div><div class="kpi-value">${UI.formatCOP(totalFacturado)}</div></div>
          <div class="kpi-card sem-green"><div class="kpi-label">Total pagado</div><div class="kpi-value">${UI.formatCOP(totalPagado)}</div></div>
          <div class="kpi-card sem-${saldo > 0 ? 'red' : 'green'}"><div class="kpi-label">Saldo pendiente</div><div class="kpi-value">${UI.formatCOP(saldo)}</div></div>
        </div>
        <div class="section-title">Datos de contacto</div>
        <p class="muted mb-16">NIT: ${entity.nit || '—'} | Email: ${entity.email || '—'} | Tel: ${entity.telefono || '—'} | Dir: ${entity.direccion || '—'}</p>
        <div class="section-title">Historial de facturas</div>
        ${UI.table(['Número', 'Emisión', 'Vencimiento', 'Total', 'Pagado', 'Estado'], facRows, { emptyText: 'Sin facturas registradas.' })}
      `,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">Cerrar</button>`
    );
  }

  return { render, bind };
})();
