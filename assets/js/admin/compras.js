/* ==========================================================
   COMPRAS PAGE — Órdenes de compra, aprobación, PDF (Fase 3)
   ========================================================== */

const ComprasPage = (() => {

  let subTab = 'ordenes';
  const ESTADOS_OC = ['borrador', 'pendiente', 'aprobada', 'rechazada', 'recibida', 'anulada'];

  function render() {
    const canEdit = Auth.canWrite('compras');
    const ordenes = Store.get('ordenesCompra') || [];

    const subTabs = `
      <div class="sub-tabs">
        <button class="sub-tab ${subTab === 'ordenes' ? 'active' : ''}" data-subtab="ordenes">🛒 Órdenes (${ordenes.length})</button>
      </div>`;

    let content = renderOrdenes(canEdit, ordenes);

    return `
      <div class="page-header">
        <h1>Compras y Proveedores</h1>
        <p>Órdenes de compra con flujo de aprobación y generación de PDF.</p>
      </div>
      ${subTabs}
      ${content}
    `;
  }

  // ── Órdenes ───────────────────────────────────────────
  function renderOrdenes(canEdit, ordenes) {
    const proveedores = Store.get('proveedores') || [];
    const filterBtns = `
      <div class="flex gap-8 mb-16 flex-wrap">
        <button class="btn btn-ghost btn-sm filter-oc active" data-filter="all">Todas (${ordenes.length})</button>
        <button class="btn btn-ghost btn-sm filter-oc" data-filter="pendiente">Pendientes (${ordenes.filter(o => o.estado === 'pendiente').length})</button>
        <button class="btn btn-ghost btn-sm filter-oc" data-filter="aprobada">Aprobadas (${ordenes.filter(o => o.estado === 'aprobada').length})</button>
        <button class="btn btn-ghost btn-sm filter-oc" data-filter="recibida">Recibidas (${ordenes.filter(o => o.estado === 'recibida').length})</button>
        ${canEdit ? '<button class="btn btn-primary btn-sm ml-auto" id="btn-add-oc">+ Nueva orden</button>' : ''}
      </div>`;

    const rows = ordenes.map(o => {
      const items = (Store.get('itemsOrdenCompra') || []).filter(i => i.ordenId === o.id);
      const total = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
      const prov = Store.findById('proveedores', o.proveedorId);
      const estadoBadge = estadoOcBadge(o.estado);
      return [
        `<strong>${o.numero}</strong>`,
        prov?.nombre || o.proveedorNombre || '—',
        new Date(o.fecha).toLocaleDateString('es-CO'),
        items.length,
        UI.formatCOP(total),
        estadoBadge,
        canEdit ? `<td class="table-actions">
          ${o.estado === 'pendiente' ? `<button class="btn-icon" data-approve-oc="${o.id}" title="Aprobar">✅</button><button class="btn-icon" data-reject-oc="${o.id}" title="Rechazar">❌</button>` : ''}
          <button class="btn-icon" data-pdf-oc="${o.id}" title="Ver PDF">📄</button>
          <button class="btn-icon" data-edit-oc="${o.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-del-oc="${o.id}" title="Eliminar">🗑</button>
        </td>` : ''
      ];
    });

    return `${filterBtns}
      <div class="card">
        ${UI.table(['Número', 'Proveedor', 'Fecha', 'Ítems', 'Total', 'Estado', canEdit ? 'Acciones' : ''], rows, { emptyText: 'No hay órdenes de compra. Crea la primera con "+ Nueva orden".' })}
      </div>`;
  }

  function estadoOcBadge(estado) {
    const map = {
      'borrador': 'gray', 'pendiente': 'yellow', 'aprobada': 'green',
      'rechazada': 'red', 'recibida': 'blue', 'anulada': 'gray'
    };
    return `<span class="badge badge-${map[estado] || 'gray'}">${estado}</span>`;
  }

  // ── Bind ──────────────────────────────────────────────
  function bind() {
    const canEdit = Auth.canWrite('compras');
    document.querySelectorAll('.sub-tab').forEach(btn => {
      btn.addEventListener('click', () => { subTab = btn.dataset.subtab; App.renderCurrentPage(); });
    });

    document.querySelectorAll('.filter-oc').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-oc').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterOrdenes(btn.dataset.filter);
      });
    });

    if (!canEdit) return;

    document.getElementById('btn-add-oc')?.addEventListener('click', () => showOCModal());
    document.querySelectorAll('[data-edit-oc]').forEach(b => b.addEventListener('click', () => showOCModal(b.dataset.editOc)));
    document.querySelectorAll('[data-del-oc]').forEach(b => b.addEventListener('click', () => {
      UI.confirm('¿Eliminar esta orden de compra y sus ítems?', () => {
        const id = b.dataset.delOc;
        Store.remove('ordenesCompra', id);
        (Store.get('itemsOrdenCompra') || []).filter(i => i.ordenId === id).forEach(i => Store.remove('itemsOrdenCompra', i.id));
        Store.log(Auth.getCurrentUser()?.nombre, 'Eliminó OC', 'ordenesCompra', `OC ${id} eliminada`);
        UI.toast('Orden eliminada', 'success');
        App.renderCurrentPage();
      });
    }));
    document.querySelectorAll('[data-approve-oc]').forEach(b => b.addEventListener('click', () => {
      Store.update('ordenesCompra', b.dataset.approveOc, { estado: 'aprobada', aprobadoPor: Auth.getCurrentUser()?.nombre, fechaAprobacion: new Date().toISOString() });
      Store.log(Auth.getCurrentUser()?.nombre, 'Aprobó OC', 'ordenesCompra', `OC aprobada`);
      UI.toast('Orden aprobada', 'success');
      App.renderCurrentPage();
    }));
    document.querySelectorAll('[data-reject-oc]').forEach(b => b.addEventListener('click', () => {
      Store.update('ordenesCompra', b.dataset.rejectOc, { estado: 'rechazada', aprobadoPor: Auth.getCurrentUser()?.nombre, fechaAprobacion: new Date().toISOString() });
      Store.log(Auth.getCurrentUser()?.nombre, 'Rechazó OC', 'ordenesCompra', `OC rechazada`);
      UI.toast('Orden rechazada', 'success');
      App.renderCurrentPage();
    }));
    document.querySelectorAll('[data-pdf-oc]').forEach(b => b.addEventListener('click', () => generatePDF(b.dataset.pdfOc)));
  }

  function filterOrdenes(filter) {
    const rows = document.querySelectorAll('.card table tbody tr');
    const ordenes = Store.get('ordenesCompra') || [];
    rows.forEach((row, i) => {
      const o = ordenes[i];
      if (!o) return;
      let show = true;
      if (filter !== 'all') show = o.estado === filter;
      row.style.display = show ? '' : 'none';
    });
  }

  // ── OC Modal ──────────────────────────────────────────
  function showOCModal(ocId) {
    const isEdit = !!ocId;
    const oc = isEdit ? Store.findById('ordenesCompra', ocId) : null;
    const proveedores = Store.get('proveedores') || [];
    const provOpts = proveedores.length
      ? proveedores.map(p => ({ value: p.id, label: `${p.nombre} — ${p.nit || 'sin NIT'}` }))
      : [{ value: '', label: 'Sin proveedores — crea uno en Cartera' }];
    const items = isEdit ? (Store.get('itemsOrdenCompra') || []).filter(i => i.ordenId === ocId) : [];

    UI.modal(
      isEdit ? 'Editar orden de compra' : 'Nueva orden de compra',
      `
        <div class="form-row">
          ${UI.formField('Número', 'oc-numero', 'text', oc?.numero || '')}
          ${UI.formField('Fecha', 'oc-fecha', 'date', oc?.fecha || new Date().toISOString().slice(0, 10))}
        </div>
        <div class="form-row">
          ${UI.formField('Proveedor', 'oc-proveedor', 'select', oc?.proveedorId || '', { options: provOpts })}
          ${UI.formField('Estado', 'oc-estado', 'select', oc?.estado || 'borrador', { options: ESTADOS_OC.map(e => ({ value: e, label: e })) })}
        </div>
        ${UI.formField('Notas', 'oc-notas', 'textarea', oc?.notas || '')}
        <div class="section-title">Ítems de la orden</div>
        <div id="oc-items-list"></div>
        <button class="btn btn-ghost btn-sm mt-8" id="oc-add-item">+ Agregar ítem</button>
        <div class="form-group mt-16">
          <label>Total</label>
          <div id="oc-total-display" style="font-size:1.4rem;font-weight:800;color:var(--accent);">${UI.formatCOP(0)}</div>
        </div>
      `,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
       <button class="btn btn-primary" id="modal-save-oc">Guardar</button>`
    );

    const itemsList = document.getElementById('oc-items-list');
    let itemRows = items.map(i => ({ ...i }));

    function renderItems() {
      itemsList.innerHTML = itemRows.length === 0
        ? '<p class="muted">Sin ítems. Agrega al menos uno.</p>'
        : itemRows.map((it, idx) => `
          <div class="oc-item-row" data-idx="${idx}">
            <input type="text" class="oc-item-desc" placeholder="Descripción" value="${it.descripcion || ''}">
            <input type="number" class="oc-item-qty" placeholder="Cant." value="${it.cantidad || 1}" step="0.01" min="0">
            <input type="number" class="oc-item-price" placeholder="Precio unit." value="${it.precioUnitario || 0}" step="0.01" min="0">
            <span class="oc-item-subtotal">${UI.formatCOP((it.cantidad || 0) * (it.precioUnitario || 0))}</span>
            <button class="btn-icon oc-item-del" data-idx="${idx}">🗑</button>
          </div>
        `).join('');
      bindItemEvents();
      calcTotal();
    }

    function bindItemEvents() {
      itemsList.querySelectorAll('.oc-item-row').forEach(row => {
        const idx = parseInt(row.dataset.idx);
        row.querySelector('.oc-item-desc').addEventListener('input', e => { itemRows[idx].descripcion = e.target.value; });
        row.querySelector('.oc-item-qty').addEventListener('input', e => {
          itemRows[idx].cantidad = parseFloat(e.target.value) || 0;
          row.querySelector('.oc-item-subtotal').textContent = UI.formatCOP(itemRows[idx].cantidad * itemRows[idx].precioUnitario);
          calcTotal();
        });
        row.querySelector('.oc-item-price').addEventListener('input', e => {
          itemRows[idx].precioUnitario = parseFloat(e.target.value) || 0;
          row.querySelector('.oc-item-subtotal').textContent = UI.formatCOP(itemRows[idx].cantidad * itemRows[idx].precioUnitario);
          calcTotal();
        });
        row.querySelector('.oc-item-del').addEventListener('click', () => {
          itemRows.splice(idx, 1);
          renderItems();
        });
      });
    }

    function calcTotal() {
      const total = itemRows.reduce((s, it) => s + (it.cantidad || 0) * (it.precioUnitario || 0), 0);
      document.getElementById('oc-total-display').textContent = UI.formatCOP(total);
      return total;
    }

    document.getElementById('oc-add-item').addEventListener('click', () => {
      itemRows.push({ descripcion: '', cantidad: 1, precioUnitario: 0 });
      renderItems();
    });

    renderItems();

    document.getElementById('modal-save-oc').addEventListener('click', () => {
      const numero = document.getElementById('oc-numero').value.trim();
      if (!numero) { UI.toast('El número es obligatorio', 'error'); return; }
      if (itemRows.length === 0) { UI.toast('Agrega al menos un ítem', 'error'); return; }
      if (!itemRows.every(it => it.descripcion && it.cantidad > 0)) { UI.toast('Todos los ítems necesitan descripción y cantidad', 'error'); return; }

      const proveedorId = document.getElementById('oc-proveedor').value;
      const prov = Store.findById('proveedores', proveedorId);
      const estado = document.getElementById('oc-estado').value;
      const data = {
        numero,
        fecha: document.getElementById('oc-fecha').value,
        proveedorId,
        proveedorNombre: prov?.nombre || '',
        estado,
        notas: document.getElementById('oc-notas').value.trim(),
      };

      if (isEdit) {
        Store.update('ordenesCompra', ocId, data);
        // Replace items
        (Store.get('itemsOrdenCompra') || []).filter(i => i.ordenId === ocId).forEach(i => Store.remove('itemsOrdenCompra', i.id));
        itemRows.forEach(it => Store.insert('itemsOrdenCompra', { ordenId: ocId, ...it }));
        Store.log(Auth.getCurrentUser()?.nombre, 'Editó OC', 'ordenesCompra', `OC ${numero} actualizada`);
        UI.toast('Orden actualizada', 'success');
      } else {
        const newOC = Store.insert('ordenesCompra', data);
        itemRows.forEach(it => Store.insert('itemsOrdenCompra', { ordenId: newOC.id, ...it }));
        Store.log(Auth.getCurrentUser()?.nombre, 'Creó OC', 'ordenesCompra', `OC ${numero} creada`);
        UI.toast('Orden creada', 'success');
      }
      UI.closeModal();
      App.renderCurrentPage();
    });
  }

  // ── PDF Generation ────────────────────────────────────
  function generatePDF(ocId) {
    const oc = Store.findById('ordenesCompra', ocId);
    if (!oc) return;
    const prov = Store.findById('proveedores', oc.proveedorId);
    const emp = Store.get('empresa');
    const items = (Store.get('itemsOrdenCompra') || []).filter(i => i.ordenId === ocId);
    const total = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);

    const w = window.open('', '_blank');
    w.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>OC ${oc.numero}</title>
      <style>
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; padding: 40px; color: #111827; }
        .header { display: flex; justify-content: space-between; margin-bottom: 32px; }
        .header h1 { font-size: 1.6rem; }
        .header .meta { text-align: right; font-size: 0.85rem; color: #6b7280; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
        .info-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
        .info-box h3 { font-size: 0.8rem; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #f0f4f1; padding: 10px 12px; text-align: left; font-size: 0.85rem; }
        td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 0.9rem; }
        .total-row { font-weight: 800; font-size: 1.1rem; }
        .total-row td { border-top: 2px solid #1a2e2a; }
        .estado { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; background: #dcfce7; color: #16a34a; }
        .footer { margin-top: 48px; display: flex; gap: 48px; }
        .firma { flex: 1; text-align: center; }
        .firma-line { border-top: 1px solid #333; padding-top: 8px; margin-top: 48px; font-size: 0.8rem; color: #6b7280; }
      </style></head><body>
      <div class="header">
        <div>
          <h1>${emp?.nombre || 'Empresa'}</h1>
          <p style="color:#6b7280;font-size:0.85rem;">NIT: ${emp?.nit || '—'}</p>
        </div>
        <div class="meta">
          <h2>Orden de Compra</h2>
          <p><strong>${oc.numero}</strong></p>
          <p>Fecha: ${new Date(oc.fecha).toLocaleDateString('es-CO')}</p>
          <p class="estado">${oc.estado.toUpperCase()}</p>
        </div>
      </div>
      <div class="info-grid">
        <div class="info-box">
          <h3>Proveedor</h3>
          <p><strong>${prov?.nombre || oc.proveedorNombre || '—'}</strong></p>
          <p>NIT: ${prov?.nit || '—'}</p>
          <p>${prov?.email || ''} ${prov?.telefono || ''}</p>
        </div>
        <div class="info-box">
          <h3>Entrega y notas</h3>
          <p>${oc.notas || 'Sin notas especiales.'}</p>
        </div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Descripción</th><th>Cant.</th><th>Precio Unit.</th><th>Subtotal</th></tr></thead>
        <tbody>
          ${items.map((it, idx) => `<tr>
            <td>${idx + 1}</td>
            <td>${it.descripcion}</td>
            <td>${it.cantidad}</td>
            <td>${UI.formatCOP(it.precioUnitario)}</td>
            <td>${UI.formatCOP(it.cantidad * it.precioUnitario)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr class="total-row"><td colspan="4" style="text-align:right;">TOTAL</td><td>${UI.formatCOP(total)}</td></tr></tfoot>
      </table>
      ${oc.aprobadoPor ? `<p style="margin-top:16px;">Aprobado por: <strong>${oc.aprobadoPor}</strong> — ${new Date(oc.fechaAprobacion).toLocaleDateString('es-CO')}</p>` : ''}
      <div class="footer">
        <div class="firma"><div class="firma-line">Solicita</div></div>
        <div class="firma"><div class="firma-line">Aprobó</div></div>
        <div class="firma"><div class="firma-line">Recibí conforme</div></div>
      </div>
      <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    w.document.close();
  }

  return { render, bind };
})();
