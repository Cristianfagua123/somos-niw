/* ==========================================================
   FINANZAS PAGE — Utilidad Real, Finanzas, Flujo de Caja (Fase 4)
   ========================================================== */

const FinanzasPage = (() => {

  function render(tabId) {
    if (tabId === 'utilidad') return renderUtilidad();
    if (tabId === 'finanzas') return renderFinanzas();
    if (tabId === 'flujo_caja') return renderFlujoCaja();
    return '';
  }

  // ── Date range filter ─────────────────────────────────
  function getDateRange() {
    const now = new Date();
    let from, to;
    const range = App._dateRange || 'this_month';
    if (range === 'this_month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (range === 'last_month') {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (range === 'this_quarter') {
      const q = Math.floor(now.getMonth() / 3);
      from = new Date(now.getFullYear(), q * 3, 1);
      to = new Date(now.getFullYear(), q * 3 + 3, 0);
    } else if (range === 'this_year') {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31);
    } else {
      from = App._customFrom ? new Date(App._customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
      to = App._customTo ? new Date(App._customTo) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    return { from, to: new Date(to.getTime() + 86400000) };
  }

  function inRange(dateStr, range) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= range.from && d < range.to;
  }

  // ── Aggregate data ─────────────────────────────────────
  function getFinancialData() {
    const range = getDateRange();
    const facturas = Store.get('facturas') || [];
    const gastos = Store.get('gastos') || [];
    const ingresos = Store.get('ingresos') || [];
    const emp = Store.get('empresa');

    // Revenue from sales invoices
    const facturasVenta = facturas.filter(f => f.tipo === 'venta' && f.estado !== 'anulada' && f.estado !== 'borrador' && inRange(f.fechaEmision, range));
    const ingresosFacturados = facturasVenta.reduce((s, f) => s + f.subtotal, 0);
    const ivaCobrado = facturasVenta.reduce((s, f) => s + (f.iva || 0), 0);
    const retencionesVenta = facturasVenta.reduce((s, f) => {
      return s + (f.subtotal * (f.retFuentePct || 0) / 100) + (f.subtotal * (f.retIcaPct || 0) / 100) + ((f.iva || 0) * (f.retIvaPct || 0) / 100);
    }, 0);

    // Non-invoiced income
    const ingresosNoFact = ingresos.filter(i => inRange(i.fecha, range));
    const totalIngresosNoFact = ingresosNoFact.reduce((s, i) => s + i.monto, 0);

    // Purchases (cost of goods/services)
    const facturasCompra = facturas.filter(f => f.tipo === 'compra' && f.estado !== 'anulada' && f.estado !== 'borrador' && inRange(f.fechaEmision, range));
    const costosDirectos = facturasCompra.reduce((s, f) => s + f.subtotal, 0);

    // Operating expenses
    const gastosPeriodo = gastos.filter(g => inRange(g.fecha, range));
    const gastosFijos = gastosPeriodo.filter(g => g.tipo === 'fijo').reduce((s, g) => s + g.monto, 0);
    const gastosVariables = gastosPeriodo.filter(g => g.tipo === 'variable').reduce((s, g) => s + g.monto, 0);
    const totalGastos = gastosFijos + gastosVariables;

    // IVA paid on purchases
    const ivaPagado = facturasCompra.reduce((s, f) => s + (f.iva || 0), 0);

    // Calculations
    const ingresosTotales = ingresosFacturados + totalIngresosNoFact;
    const margenBruto = ingresosTotales - costosDirectos;
    const margenBrutoPct = ingresosTotales > 0 ? (margenBruto / ingresosTotales) * 100 : 0;
    const utilidadOperacional = margenBruto - totalGastos;
    const utilidadOperacionalPct = ingresosTotales > 0 ? (utilidadOperacional / ingresosTotales) * 100 : 0;

    // Taxes
    const rentaPct = emp?.rentaPct || 35;
    const icaPct = emp?.icaPct || 1.1;
    const impuestoRenta = utilidadOperacional > 0 ? utilidadOperacional * rentaPct / 100 : 0;
    const impuestoICA = ingresosTotales * icaPct / 100;
    const utilidadNeta = utilidadOperacional - impuestoRenta - impuestoICA;
    const utilidadNetaPct = ingresosTotales > 0 ? (utilidadNeta / ingresosTotales) * 100 : 0;

    // IVA net (to pay)
    const ivaNeto = ivaCobrado - ivaPagado;

    return {
      range, emp,
      facturasVenta, facturasCompra, ingresosNoFact, gastosPeriodo,
      ingresosFacturados, totalIngresosNoFact, ingresosTotales,
      costosDirectos, margenBruto, margenBrutoPct,
      gastosFijos, gastosVariables, totalGastos,
      utilidadOperacional, utilidadOperacionalPct,
      ivaCobrado, ivaPagado, ivaNeto,
      retencionesVenta,
      impuestoRenta, impuestoICA, utilidadNeta, utilidadNetaPct,
      rentaPct, icaPct,
    };
  }

  // ── Utilidad Real (Neto Neto Neto) ────────────────────
  function renderUtilidad() {
    const d = getFinancialData();
    const umbrales = Store.get('umbralesKPI');
    const canEdit = Auth.canWrite('utilidad');

    const semMargenBruto = UI.semaphore(d.margenBrutoPct, umbrales.margenBruto);
    const semMargenNeto = UI.semaphore(d.utilidadNetaPct, umbrales.margenNeto);

    const kpis = `
      <div class="grid grid-4">
        ${UI.kpiCard('Ingresos Totales', UI.formatCOP(d.ingresosTotales), `Facturado: ${UI.formatCOP(d.ingresosFacturados)}`, 'gray', 'Ingresos facturados + no facturados del período')}
        ${UI.kpiCard('Margen Bruto', UI.formatCOP(d.margenBruto), `${d.margenBrutoPct.toFixed(1)}% del ingreso`, semMargenBruto, 'Ingresos - costo directo')}
        ${UI.kpiCard('Utilidad Operacional', UI.formatCOP(d.utilidadOperacional), `${d.utilidadOperacionalPct.toFixed(1)}% del ingreso`, semMargenBruto, 'Margen bruto - gastos operacionales')}
        ${UI.kpiCard('Utilidad Neta (Neto Neto Neto)', UI.formatCOP(d.utilidadNeta), `${d.utilidadNetaPct.toFixed(1)}% del ingreso`, semMargenNeto, 'Después de impuesto de renta e ICA')}
      </div>`;

    // Waterfall / breakdown table
    const breakdown = `
      <div class="card">
        <div class="card-header"><div class="card-title">Desglose de Utilidad Real (Neto Neto Neto)</div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Concepto</th><th class="text-right">Monto</th><th>% del Ingreso</th></tr></thead>
            <tbody>
              <tr><td>Ingresos facturados (sin IVA)</td><td class="text-right">${UI.formatCOP(d.ingresosFacturados)}</td><td>—</td></tr>
              <tr><td>(+) Ingresos no facturados</td><td class="text-right">${UI.formatCOP(d.totalIngresosNoFact)}</td><td>—</td></tr>
              <tr style="font-weight:700;"><td>= Ingresos totales</td><td class="text-right">${UI.formatCOP(d.ingresosTotales)}</td><td>100%</td></tr>
              <tr><td>(−) Costo directo (compras)</td><td class="text-right" style="color:var(--danger);">(${UI.formatCOP(d.costosDirectos)})</td><td>${d.ingresosTotales > 0 ? (d.costosDirectos / d.ingresosTotales * 100).toFixed(1) : 0}%</td></tr>
              <tr style="font-weight:700;background:var(--accent-light);"><td>= Margen bruto</td><td class="text-right">${UI.formatCOP(d.margenBruto)}</td><td>${d.margenBrutoPct.toFixed(1)}%</td></tr>
              <tr><td>(−) Gastos fijos</td><td class="text-right" style="color:var(--danger);">(${UI.formatCOP(d.gastosFijos)})</td><td>—</td></tr>
              <tr><td>(−) Gastos variables</td><td class="text-right" style="color:var(--danger);">(${UI.formatCOP(d.gastosVariables)})</td><td>—</td></tr>
              <tr style="font-weight:700;"><td>= Utilidad operacional</td><td class="text-right">${UI.formatCOP(d.utilidadOperacional)}</td><td>${d.utilidadOperacionalPct.toFixed(1)}%</td></tr>
              <tr><td>(−) Impuesto de renta (${d.rentaPct}%)</td><td class="text-right" style="color:var(--danger);">(${UI.formatCOP(d.impuestoRenta)})</td><td>—</td></tr>
              <tr><td>(−) ICA (${d.icaPct}%)</td><td class="text-right" style="color:var(--danger);">(${UI.formatCOP(d.impuestoICA)})</td><td>—</td></tr>
              <tr style="font-weight:800;font-size:1.05rem;background:var(--accent-light);"><td>= Utilidad neta real</td><td class="text-right">${UI.formatCOP(d.utilidadNeta)}</td><td>${d.utilidadNetaPct.toFixed(1)}%</td></tr>
            </tbody>
          </table>
        </div>
      </div>`;

    // IVA and retentions
    const ivaSection = `
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">IVA del Período</div></div>
          <div class="table-wrap">
            <table>
              <tbody>
                <tr><td>IVA cobrado en ventas</td><td class="text-right">${UI.formatCOP(d.ivaCobrado)}</td></tr>
                <tr><td>IVA pagado en compras</td><td class="text-right">${UI.formatCOP(d.ivaPagado)}</td></tr>
                <tr style="font-weight:700;"><td>IVA por pagar / a favor</td><td class="text-right" style="color:${d.ivaNeto >= 0 ? 'var(--danger)' : 'var(--success)'};">${UI.formatCOP(d.ivaNeto)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Retenciones Practicadas</div></div>
          <div class="table-wrap">
            <table>
              <tbody>
                <tr><td>Total retenciones en ventas</td><td class="text-right">${UI.formatCOP(d.retencionesVenta)}</td></tr>
                <tr><td>Impuesto de renta estimado</td><td class="text-right">${UI.formatCOP(d.impuestoRenta)}</td></tr>
                <tr><td>ICA estimado</td><td class="text-right">${UI.formatCOP(d.impuestoICA)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>`;

    // Gastos management
    const gastosSection = renderGastosSection(canEdit);

    // Ingresos no facturados
    const ingresosSection = renderIngresosSection(canEdit);

    return `
      <div class="page-header">
        <h1>Utilidad Real (Neto Neto Neto)</h1>
        <p>Utilidad después de todos los costos, gastos e impuestos. Período: ${d.range.from.toLocaleDateString('es-CO')} — ${new Date(d.range.to - 86400000).toLocaleDateString('es-CO')}</p>
      </div>
      ${kpis}
      ${breakdown}
      ${ivaSection}
      ${gastosSection}
      ${ingresosSection}
    `;
  }

  // ── Gastos section ────────────────────────────────────
  function renderGastosSection(canEdit) {
    const gastos = Store.get('gastos') || [];
    const categorias = Store.get('categoriasGasto') || [];
    const range = getDateRange();
    const gastosPeriodo = gastos.filter(g => inRange(g.fecha, range));

    const rows = gastosPeriodo.map(g => {
      const cat = categorias.find(c => c.id === g.categoriaId);
      return [
        new Date(g.fecha).toLocaleDateString('es-CO'),
        g.descripcion,
        cat?.nombre || 'Sin categoría',
        `<span class="badge badge-${g.tipo === 'fijo' ? 'blue' : 'gray'}">${g.tipo}</span>`,
        g.recurrencia ? `<span class="badge badge-gray">${g.recurrencia}</span>` : '—',
        UI.formatCOP(g.monto),
        canEdit ? `<td class="table-actions">
          <button class="btn-icon" data-edit-gasto="${g.id}" title="Editar">✏️</button>
          <button class="btn-icon" data-del-gasto="${g.id}" title="Eliminar">🗑</button>
        </td>` : ''
      ];
    });

    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">Gastos del Período (${gastosPeriodo.length})</div>
          ${canEdit ? '<button class="btn btn-primary btn-sm" id="btn-add-gasto">+ Registrar gasto</button>' : ''}
        </div>
        ${UI.table(['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Recurrencia', 'Monto', canEdit ? 'Acciones' : ''], rows, { emptyText: 'No hay gastos en este período.' })}
      </div>`;
  }

  // ── Ingresos no facturados ─────────────────────────────
  function renderIngresosSection(canEdit) {
    const ingresos = Store.get('ingresos') || [];
    const range = getDateRange();
    const ingresosPeriodo = ingresos.filter(i => inRange(i.fecha, range));

    const rows = ingresosPeriodo.map(i => [
      new Date(i.fecha).toLocaleDateString('es-CO'),
      i.descripcion,
      UI.formatCOP(i.monto),
      canEdit ? `<td class="table-actions">
        <button class="btn-icon" data-edit-ing="${i.id}" title="Editar">✏️</button>
        <button class="btn-icon" data-del-ing="${i.id}" title="Eliminar">🗑</button>
      </td>` : ''
    ]);

    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">Ingresos No Facturados (${ingresosPeriodo.length})</div>
          ${canEdit ? '<button class="btn btn-primary btn-sm" id="btn-add-ing">+ Registrar ingreso</button>' : ''}
        </div>
        ${UI.table(['Fecha', 'Descripción', 'Monto', canEdit ? 'Acciones' : ''], rows, { emptyText: 'No hay ingresos no facturados en este período.' })}
      </div>`;
  }

  // ── Finanzas y Rentabilidad ────────────────────────────
  function renderFinanzas() {
    const d = getFinancialData();
    const umbrales = Store.get('umbralesKPI');
    const facturas = Store.get('facturas') || [];
    const pagos = Store.get('pagosFactura') || [];

    // DSO (Days Sales Outstanding)
    const facturasVenta = d.facturasVenta;
    const totalPorCobrar = facturasVenta.reduce((s, f) => s + f.total, 0);
    const totalCobrado = pagos.filter(p => facturasVenta.some(f => f.id === p.facturaId)).reduce((s, p) => s + p.monto, 0);
    const saldoPorCobrar = totalPorCobrar - totalCobrado;
    const promedioVentasDiarias = d.ingresosTotales / 30;
    const dso = promedioVentasDiarias > 0 ? saldoPorCobrar / promedioVentasDiarias : 0;

    // ROI / ROAS placeholder
    const inversionTotal = d.costosDirectos + d.totalGastos;
    const roi = inversionTotal > 0 ? (d.utilidadNeta / inversionTotal) * 100 : 0;

    // Punto de equilibrio
    const margenContribucion = d.ingresosTotales > 0 ? d.margenBruto / d.ingresosTotales : 0;
    const puntoEquilibrio = margenContribucion > 0 ? d.gastosFijos / margenContribucion : 0;

    const semDSO = UI.semaphore(dso, umbrales.dso);

    const kpis = `
      <div class="grid grid-4">
        ${UI.kpiCard('Margen Bruto %', d.margenBrutoPct.toFixed(1) + '%', `Meta: ${umbrales.margenBruto.verde}%`, UI.semaphore(d.margenBrutoPct, umbrales.margenBruto))}
        ${UI.kpiCard('Margen Neto %', d.utilidadNetaPct.toFixed(1) + '%', `Meta: ${umbrales.margenNeto.verde}%`, UI.semaphore(d.utilidadNetaPct, umbrales.margenNeto))}
        ${UI.kpiCard('DSO (Días de Cartera)', dso.toFixed(0) + ' días', `Saldo: ${UI.formatCOP(saldoPorCobrar)}`, semDSO, 'Días promedio de cobro')}
        ${UI.kpiCard('ROI', roi.toFixed(1) + '%', `Inversión: ${UI.formatCOP(inversionTotal)}`, roi >= 0 ? 'green' : 'red', 'Retorno sobre inversión del período')}
      </div>
      <div class="grid grid-4 mt-16">
        ${UI.kpiCard('Punto de Equilibrio', UI.formatCOP(puntoEquilibrio), `Margen contrib.: ${(margenContribucion * 100).toFixed(1)}%`, 'gray', 'Ingresos mínimos para no perder')}
        ${UI.kpiCard('Por Cobrar', UI.formatCOP(saldoPorCobrar), `${facturasVenta.length} facturas`, saldoPorCobrar > 0 ? 'yellow' : 'green')}
        ${UI.kpiCard('IVA por Pagar', UI.formatCOP(d.ivaNeto), d.ivaNeto >= 0 ? 'A favor del fisco' : 'A favor de la empresa', d.ivaNeto > 0 ? 'yellow' : 'green')}
        ${UI.kpiCard('Gastos Fijos / Mes', UI.formatCOP(d.gastosFijos), `Variables: ${UI.formatCOP(d.gastosVariables)}`, 'gray')}
      </div>`;

    // Gastos by category
    const gastosPeriodo = d.gastosPeriodo;
    const categorias = Store.get('categoriasGasto') || [];
    const gastosPorCat = {};
    gastosPeriodo.forEach(g => {
      const cat = categorias.find(c => c.id === g.categoriaId)?.nombre || 'Sin categoría';
      gastosPorCat[cat] = (gastosPorCat[cat] || 0) + g.monto;
    });
    const maxGasto = Math.max(...Object.values(gastosPorCat), 1);

    const gastosChart = `
      <div class="card">
        <div class="card-header"><div class="card-title">Gastos por Categoría</div></div>
        ${Object.keys(gastosPorCat).length === 0
          ? '<p class="muted p-16">Sin gastos en el período.</p>'
          : `<div class="bar-chart">
            ${Object.entries(gastosPorCat).sort((a, b) => b[1] - a[1]).map(([cat, monto]) => `
              <div class="bar-row">
                <span class="bar-label">${cat}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${(monto / maxGasto * 100).toFixed(1)}%"></div></div>
                <span class="bar-value">${UI.formatCOP(monto)}</span>
              </div>
            `).join('')}
          </div>`}
      </div>`;

    return `
      <div class="page-header">
        <h1>Finanzas y Rentabilidad</h1>
        <p>Indicadores financieros clave del período: ${d.range.from.toLocaleDateString('es-CO')} — ${new Date(d.range.to - 86400000).toLocaleDateString('es-CO')}</p>
      </div>
      ${kpis}
      ${gastosChart}
    `;
  }

  // ── Flujo de Caja y Runway ─────────────────────────────
  function renderFlujoCaja() {
    const d = getFinancialData();
    const emp = Store.get('empresa');
    const umbrales = Store.get('umbralesKPI');
    const facturas = Store.get('facturas') || [];
    const pagos = Store.get('pagosFactura') || [];
    const range = getDateRange();

    // Cash inflows (payments received)
    const facturasVentaIds = facturas.filter(f => f.tipo === 'venta').map(f => f.id);
    const cobros = pagos.filter(p => facturasVentaIds.includes(p.facturaId) && inRange(p.fecha, range));
    const totalCobros = cobros.reduce((s, p) => s + p.monto, 0);

    // Cash outflows (payments made)
    const facturasCompraIds = facturas.filter(f => f.tipo === 'compra').map(f => f.id);
    const pagosHechos = pagos.filter(p => facturasCompraIds.includes(p.facturaId) && inRange(p.fecha, range));
    const totalPagos = pagosHechos.reduce((s, p) => s + p.monto, 0);

    // Other income/expenses in cash
    const ingresosNoFact = (Store.get('ingresos') || []).filter(i => inRange(i.fecha, range));
    const totalIngresosEfectivo = ingresosNoFact.reduce((s, i) => s + i.monto, 0);
    const gastosPeriodo = (Store.get('gastos') || []).filter(g => inRange(g.fecha, range));
    const totalGastosEfectivo = gastosPeriodo.reduce((s, g) => s + g.monto, 0);

    const flujoNeto = totalCobros + totalIngresosEfectivo - totalPagos - totalGastosEfectivo;

    // Monthly burn rate (average)
    const diasPeriodo = Math.max((range.to - range.from) / 86400000, 1);
    const burnRate = (totalPagos + totalGastosEfectivo) / diasPeriodo * 30;
    const ingresoRate = (totalCobros + totalIngresosEfectivo) / diasPeriodo * 30;
    const netBurn = burnRate - ingresoRate;

    // Runway (assume current cash = colchon * burn rate as placeholder, or let user input)
    const cajaActual = emp?.cajaActual || 0;
    const runway = netBurn > 0 ? cajaActual / netBurn : 999;
    const semRunway = UI.semaphore(runway, umbrales.runway);
    const colchon = emp?.colchonCajaMeses || 3;
    const colchonOk = cajaActual >= burnRate * colchon;

    const kpis = `
      <div class="grid grid-4">
        ${UI.kpiCard('Entradas de Efectivo', UI.formatCOP(totalCobros + totalIngresosEfectivo), `Cobros: ${UI.formatCOP(totalCobros)}`, 'green')}
        ${UI.kpiCard('Salidas de Efectivo', UI.formatCOP(totalPagos + totalGastosEfectivo), `Pagos: ${UI.formatCOP(totalPagos)}`, 'red')}
        ${UI.kpiCard('Flujo Neto del Período', UI.formatCOP(flujoNeto), flujoNeto >= 0 ? '↑ Positivo' : '↓ Negativo', flujoNeto >= 0 ? 'green' : 'red')}
        ${UI.kpiCard('Caja Actual', UI.formatCOP(cajaActual), colchonOk ? '✓ Colchón OK' : '⚠ Bajo colchón', colchonOk ? 'green' : 'yellow', 'Saldo de caja configurado en empresa')}
      </div>
      <div class="grid grid-4 mt-16">
        ${UI.kpiCard('Burn Rate / Mes', UI.formatCOP(burnRate), `Ingresos/mes: ${UI.formatCOP(ingresoRate)}`, netBurn > 0 ? 'red' : 'green')}
        ${UI.kpiCard('Net Burn / Mes', UI.formatCOP(netBurn), netBurn > 0 ? 'Quemando caja' : 'Generando caja', netBurn > 0 ? 'red' : 'green')}
        ${UI.kpiCard('Runway', runway >= 999 ? '∞' : runway.toFixed(1) + ' meses', `Meta: ${umbrales.runway.verde} meses`, semRunway, 'Meses de operación con caja actual')}
        ${UI.kpiCard('Colchón de Caja', UI.formatCOP(burnRate * colchon), `${colchon} meses de gastos`, colchonOk ? 'green' : 'yellow')}
      </div>`;

    // Monthly cash flow chart
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      const mCobros = pagos.filter(p => facturasVentaIds.includes(p.facturaId) && new Date(p.fecha) >= m && new Date(p.fecha) <= mEnd).reduce((s, p) => s + p.monto, 0);
      const mPagos = pagos.filter(p => facturasCompraIds.includes(p.facturaId) && new Date(p.fecha) >= m && new Date(p.fecha) <= mEnd).reduce((s, p) => s + p.monto, 0);
      const mGastos = (Store.get('gastos') || []).filter(g => { const dg = new Date(g.fecha); return dg >= m && dg <= mEnd; }).reduce((s, g) => s + g.monto, 0);
      const mIng = (Store.get('ingresos') || []).filter(ing => { const di = new Date(ing.fecha); return di >= m && di <= mEnd; }).reduce((s, ing) => s + ing.monto, 0);
      months.push({ label: m.toLocaleDateString('es-CO', { month: 'short' }), entradas: mCobros + mIng, salidas: mPagos + mGastos, neto: mCobros + mIng - mPagos - mGastos });
    }
    const maxBar = Math.max(...months.flatMap(m => [m.entradas, m.salidas]), 1);

    const chart = `
      <div class="card">
        <div class="card-header"><div class="card-title">Flujo de Caja — Últimos 6 meses</div></div>
        <div class="bar-chart-grouped">
          ${months.map(m => `
            <div class="bar-group">
              <div class="bar-pair">
                <div class="bar-col"><div class="bar bar-green" style="height:${(m.entradas / maxBar * 100).toFixed(1)}%" title="Entradas: ${UI.formatCOP(m.entradas)}"></div></div>
                <div class="bar-col"><div class="bar bar-red" style="height:${(m.salidas / maxBar * 100).toFixed(1)}%" title="Salidas: ${UI.formatCOP(m.salidas)}"></div></div>
              </div>
              <span class="bar-group-label">${m.label}</span>
              <span class="bar-group-net ${m.neto >= 0 ? 'arrow-up' : 'arrow-down'}">${m.neto >= 0 ? '+' : ''}${UI.formatCOP(m.neto)}</span>
            </div>
          `).join('')}
        </div>
        <div class="flex gap-16 mt-16" style="justify-content:center;">
          <span class="badge badge-green">Entradas</span>
          <span class="badge badge-red">Salidas</span>
        </div>
      </div>`;

    // Cash flow detail
    const detalle = `
      <div class="card">
        <div class="card-header"><div class="card-title">Detalle del Flujo del Período</div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Concepto</th><th class="text-right">Monto</th></tr></thead>
            <tbody>
              <tr><td>Cobros de facturas de venta</td><td class="text-right" style="color:var(--success);">+${UI.formatCOP(totalCobros)}</td></tr>
              <tr><td>Ingresos no facturados</td><td class="text-right" style="color:var(--success);">+${UI.formatCOP(totalIngresosEfectivo)}</td></tr>
              <tr><td>Pagos a proveedores</td><td class="text-right" style="color:var(--danger);">−${UI.formatCOP(totalPagos)}</td></tr>
              <tr><td>Gastos pagados</td><td class="text-right" style="color:var(--danger);">−${UI.formatCOP(totalGastosEfectivo)}</td></tr>
              <tr style="font-weight:800;font-size:1.05rem;background:var(--accent-light);"><td>Flujo neto</td><td class="text-right" style="color:${flujoNeto >= 0 ? 'var(--success)' : 'var(--danger)'};">${flujoNeto >= 0 ? '+' : ''}${UI.formatCOP(flujoNeto)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>`;

    // Caja actual input
    const cajaSection = `
      <div class="card">
        <div class="card-header"><div class="card-title">Saldo de Caja Actual</div></div>
        <p class="muted mb-16">Configura el saldo de caja actual para calcular el runway. Este valor se guarda en la configuración de la empresa.</p>
        <div class="form-row">
          ${UI.formField('Caja actual (COP)', 'flujo-caja', 'number', cajaActual, { step: '0.01' })}
        </div>
        <button class="btn btn-primary" id="btn-save-caja">Guardar caja</button>
      </div>`;

    return `
      <div class="page-header">
        <h1>Flujo de Caja y Runway</h1>
        <p>Entradas y salidas de efectivo, burn rate y meses de operación restantes. Período: ${d.range.from.toLocaleDateString('es-CO')} — ${new Date(d.range.to - 86400000).toLocaleDateString('es-CO')}</p>
      </div>
      ${kpis}
      ${chart}
      ${detalle}
      ${cajaSection}
    `;
  }

  // ── Bind ──────────────────────────────────────────────
  function bind(tabId) {
    if (tabId === 'utilidad') bindUtilidad();
    if (tabId === 'flujo_caja') bindFlujoCaja();
  }

  function bindUtilidad() {
    const canEdit = Auth.canWrite('utilidad');
    if (!canEdit) return;

    // Gasto CRUD
    document.getElementById('btn-add-gasto')?.addEventListener('click', () => showGastoModal());
    document.querySelectorAll('[data-edit-gasto]').forEach(b => b.addEventListener('click', () => showGastoModal(b.dataset.editGasto)));
    document.querySelectorAll('[data-del-gasto]').forEach(b => b.addEventListener('click', () => {
      UI.confirm('¿Eliminar este gasto?', () => {
        Store.remove('gastos', b.dataset.delGasto);
        UI.toast('Gasto eliminado', 'success');
        App.renderCurrentPage();
      });
    }));

    // Ingreso CRUD
    document.getElementById('btn-add-ing')?.addEventListener('click', () => showIngresoModal());
    document.querySelectorAll('[data-edit-ing]').forEach(b => b.addEventListener('click', () => showIngresoModal(b.dataset.editIng)));
    document.querySelectorAll('[data-del-ing]').forEach(b => b.addEventListener('click', () => {
      UI.confirm('¿Eliminar este ingreso?', () => {
        Store.remove('ingresos', b.dataset.delIng);
        UI.toast('Ingreso eliminado', 'success');
        App.renderCurrentPage();
      });
    }));
  }

  function bindFlujoCaja() {
    document.getElementById('btn-save-caja')?.addEventListener('click', () => {
      const emp = Store.get('empresa');
      const caja = parseFloat(document.getElementById('flujo-caja').value) || 0;
      Store.set('empresa', { ...emp, cajaActual: caja });
      Store.log(Auth.getCurrentUser()?.nombre, 'Actualizó caja', 'empresa', `Caja actual: ${UI.formatCOP(caja)}`);
      UI.toast('Caja actual guardada', 'success');
      App.renderCurrentPage();
    });
  }

  function showGastoModal(gastoId) {
    const isEdit = !!gastoId;
    const g = isEdit ? Store.findById('gastos', gastoId) : null;
    const categorias = Store.get('categoriasGasto') || [];
    const catOpts = [{ value: '', label: 'Sin categoría' }, ...categorias.map(c => ({ value: c.id, label: c.nombre }))];

    UI.modal(isEdit ? 'Editar gasto' : 'Registrar gasto', `
      <div class="form-row">
        ${UI.formField('Fecha', 'g-fecha', 'date', g?.fecha || new Date().toISOString().slice(0, 10))}
        ${UI.formField('Monto', 'g-monto', 'number', g?.monto || '', { step: '0.01' })}
      </div>
      ${UI.formField('Descripción', 'g-desc', 'text', g?.descripcion || '')}
      <div class="form-row">
        ${UI.formField('Categoría', 'g-cat', 'select', g?.categoriaId || '', { options: catOpts })}
        ${UI.formField('Tipo', 'g-tipo', 'select', g?.tipo || 'variable', { options: [{ value: 'fijo', label: 'Fijo' }, { value: 'variable', label: 'Variable' }] })}
      </div>
      ${UI.formField('Recurrencia', 'g-rec', 'select', g?.recurrencia || 'único', { options: [
        { value: 'único', label: 'Único' }, { value: 'mensual', label: 'Mensual' },
        { value: 'trimestral', label: 'Trimestral' }, { value: 'anual', label: 'Anual' }
      ]})}
    `, `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="modal-save-gasto">Guardar</button>`);

    document.getElementById('modal-save-gasto').addEventListener('click', () => {
      const monto = parseFloat(document.getElementById('g-monto').value) || 0;
      const desc = document.getElementById('g-desc').value.trim();
      if (monto <= 0) { UI.toast('El monto debe ser mayor a 0', 'error'); return; }
      if (!desc) { UI.toast('La descripción es obligatoria', 'error'); return; }
      const data = {
        fecha: document.getElementById('g-fecha').value,
        monto,
        descripcion: desc,
        categoriaId: document.getElementById('g-cat').value,
        tipo: document.getElementById('g-tipo').value,
        recurrencia: document.getElementById('g-rec').value,
      };
      if (isEdit) {
        Store.update('gastos', gastoId, data);
        UI.toast('Gasto actualizado', 'success');
      } else {
        Store.insert('gastos', data);
        Store.log(Auth.getCurrentUser()?.nombre, 'Registró gasto', 'gastos', `${desc}: ${UI.formatCOP(monto)}`);
        UI.toast('Gasto registrado', 'success');
      }
      UI.closeModal();
      App.renderCurrentPage();
    });
  }

  function showIngresoModal(ingresoId) {
    const isEdit = !!ingresoId;
    const ing = isEdit ? Store.findById('ingresos', ingresoId) : null;

    UI.modal(isEdit ? 'Editar ingreso' : 'Registrar ingreso', `
      <div class="form-row">
        ${UI.formField('Fecha', 'i-fecha', 'date', ing?.fecha || new Date().toISOString().slice(0, 10))}
        ${UI.formField('Monto', 'i-monto', 'number', ing?.monto || '', { step: '0.01' })}
      </div>
      ${UI.formField('Descripción', 'i-desc', 'text', ing?.descripcion || '')}
    `, `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="modal-save-ing">Guardar</button>`);

    document.getElementById('modal-save-ing').addEventListener('click', () => {
      const monto = parseFloat(document.getElementById('i-monto').value) || 0;
      const desc = document.getElementById('i-desc').value.trim();
      if (monto <= 0) { UI.toast('El monto debe ser mayor a 0', 'error'); return; }
      if (!desc) { UI.toast('La descripción es obligatoria', 'error'); return; }
      const data = { fecha: document.getElementById('i-fecha').value, monto, descripcion: desc };
      if (isEdit) {
        Store.update('ingresos', ingresoId, data);
        UI.toast('Ingreso actualizado', 'success');
      } else {
        Store.insert('ingresos', data);
        Store.log(Auth.getCurrentUser()?.nombre, 'Registró ingreso', 'ingresos', `${desc}: ${UI.formatCOP(monto)}`);
        UI.toast('Ingreso registrado', 'success');
      }
      UI.closeModal();
      App.renderCurrentPage();
    });
  }

  return { render, bind };
})();
