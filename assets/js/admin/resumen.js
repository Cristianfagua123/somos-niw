/* ==========================================================
   RESUMEN PAGE — Resumen Ejecutivo (Fase 8)
   ========================================================== */

const ResumenPage = (() => {

  function render() {
    const umbrales = Store.get('umbralesKPI');
    const emp = Store.get('empresa');
    const facturas = Store.get('facturas') || [];
    const gastos = Store.get('gastos') || [];
    const ingresos = Store.get('ingresos') || [];
    const leads = Store.get('leads') || [];
    const ventas = Store.get('ventas') || [];
    const nps = Store.get('encuestasNPS') || [];
    const proyectos = Store.get('proyectos') || [];
    const despliegues = Store.get('despliegues') || [];
    const incidentes = Store.get('incidentes') || [];

    const range = getDateRange();

    // Financial summary
    const facturasVenta = facturas.filter(f => f.tipo === 'venta' && f.estado !== 'anulada' && f.estado !== 'borrador' && inRange(f.fechaEmision, range));
    const ingresosFacturados = facturasVenta.reduce((s, f) => s + f.subtotal, 0);
    const ingresosNoFact = ingresos.filter(i => inRange(i.fecha, range)).reduce((s, i) => s + i.monto, 0);
    const ingresosTotales = ingresosFacturados + ingresosNoFact;

    const facturasCompra = facturas.filter(f => f.tipo === 'compra' && f.estado !== 'anulada' && f.estado !== 'borrador' && inRange(f.fechaEmision, range));
    const costosDirectos = facturasCompra.reduce((s, f) => s + f.subtotal, 0);
    const totalGastos = gastos.filter(g => inRange(g.fecha, range)).reduce((s, g) => s + g.monto, 0);

    const margenBruto = ingresosTotales - costosDirectos;
    const margenBrutoPct = ingresosTotales > 0 ? (margenBruto / ingresosTotales * 100) : 0;
    const utilidadOperacional = margenBruto - totalGastos;
    const utilidadOperacionalPct = ingresosTotales > 0 ? (utilidadOperacional / ingresosTotales * 100) : 0;
    const impuestoRenta = utilidadOperacional > 0 ? utilidadOperacional * (emp?.rentaPct || 35) / 100 : 0;
    const impuestoICA = ingresosTotales * (emp?.icaPct || 1.1) / 100;
    const utilidadNeta = utilidadOperacional - impuestoRenta - impuestoICA;
    const utilidadNetaPct = ingresosTotales > 0 ? (utilidadNeta / ingresosTotales * 100) : 0;

    // Cartera
    const saldoPorCobrar = facturas.filter(f => f.tipo === 'venta' && f.estado !== 'anulada').reduce((s, f) => {
      const pagos = (Store.get('pagosFactura') || []).filter(p => p.facturaId === f.id).reduce((s2, p) => s2 + p.monto, 0);
      return s + (f.total - pagos);
    }, 0);
    const saldoPorPagar = facturas.filter(f => f.tipo === 'compra' && f.estado !== 'anulada').reduce((s, f) => {
      const pagos = (Store.get('pagosFactura') || []).filter(p => p.facturaId === f.id).reduce((s2, p) => s2 + p.monto, 0);
      return s + (f.total - pagos);
    }, 0);

    // Sales
    const ventasPeriodo = ventas.filter(v => inRange(v.fecha, range));
    const leadsActivos = leads.filter(l => !['ganado', 'perdido'].includes(l.etapa));
    const conversionRate = leads.length > 0 ? (leads.filter(l => l.etapa === 'ganado').length / leads.length * 100) : 0;

    // NPS
    const promotores = nps.filter(n => n.score >= 9).length;
    const detractores = nps.filter(n => n.score <= 6).length;
    const npsScore = nps.length > 0 ? Math.round((promotores - detractores) / nps.length * 100) : 0;

    // Meta Ads
    const metricasMeta = (Store.get('metricasMetaDiaria') || []).filter(m => inRange(m.fecha, range));
    const inversionMeta = metricasMeta.reduce((s, m) => s + (m.inversion || 0), 0);
    const ingresosMeta = metricasMeta.reduce((s, m) => s + (m.ingresos || 0), 0);
    const roas = inversionMeta > 0 ? ingresosMeta / inversionMeta : 0;

    // Engineering
    const desplieguesPeriodo = despliegues.filter(d => inRange(d.fecha, range));
    const incidentesPeriodo = incidentes.filter(i => inRange(i.fechaInicio, range));

    // Projects
    const proyectosActivos = proyectos.filter(p => p.estado === 'en_progreso').length;

    // Build KPI grid
    const semMargenBruto = UI.semaphore(margenBrutoPct, umbrales.margenBruto);
    const semMargenNeto = UI.semaphore(utilidadNetaPct, umbrales.margenNeto);
    const semNPS = UI.semaphore(npsScore, umbrales.nps);
    const semRoas = UI.semaphore(roas, umbrales.roas);

    const kpis = `
      <div class="grid grid-4">
        ${UI.kpiCard('Ingresos del Período', UI.formatCOP(ingresosTotales), `${facturasVenta.length} facturas`, 'gray')}
        ${UI.kpiCard('Margen Bruto', margenBrutoPct.toFixed(1) + '%', UI.formatCOP(margenBruto), semMargenBruto)}
        ${UI.kpiCard('Utilidad Neta', utilidadNetaPct.toFixed(1) + '%', UI.formatCOP(utilidadNeta), semMargenNeto, 'Neto Neto Neto')}
        ${UI.kpiCard('Por Cobrar', UI.formatCOP(saldoPorCobrar), `Por pagar: ${UI.formatCOP(saldoPorPagar)}`, saldoPorCobrar > 0 ? 'yellow' : 'green')}
      </div>
      <div class="grid grid-4 mt-16">
        ${UI.kpiCard('Leads Activos', leadsActivos.length, `Conv: ${conversionRate.toFixed(0)}%`, 'gray')}
        ${UI.kpiCard('Ventas del Período', ventasPeriodo.length, UI.formatCOP(ventasPeriodo.reduce((s, v) => s + v.monto, 0)), 'green')}
        ${UI.kpiCard('NPS', npsScore, `${nps.length} respuestas`, semNPS)}
        ${UI.kpiCard('ROAS Meta', roas > 0 ? roas.toFixed(2) + 'x' : '—', inversionMeta > 0 ? UI.formatCOP(inversionMeta) : 'Sin datos', semRoas)}
      </div>
      <div class="grid grid-4 mt-16">
        ${UI.kpiCard('Proyectos Activos', proyectosActivos, `de ${proyectos.length} totales`, 'gray')}
        ${UI.kpiCard('Despliegues', desplieguesPeriodo.length, `${incidentesPeriodo.length} incidentes`, 'gray')}
        ${UI.kpiCard('Gastos del Período', UI.formatCOP(totalGastos), `Fijos+Variables`, 'gray')}
        ${UI.kpiCard('Costos Directos', UI.formatCOP(costosDirectos), `Compras`, 'gray')}
      </div>`;

    // Alerts
    const alerts = buildAlerts(facturas, incidentes, leads);

    // Recent activity
    const logs = (Store.get('logsAuditoria') || []).slice(-10).reverse();
    const logRows = logs.map(l => [
      new Date(l.fecha).toLocaleString('es-CO'),
      l.usuario,
      l.accion,
      l.detalle || '—'
    ]);

    const activity = `
      <div class="card mt-16">
        <div class="card-header"><div class="card-title">Actividad Reciente</div></div>
        ${UI.table(['Fecha', 'Usuario', 'Acción', 'Detalle'], logRows, { emptyText: 'Sin actividad registrada.' })}
      </div>`;

    return `
      <div class="page-header">
        <h1>Resumen Ejecutivo</h1>
        <p>Vista general de todos los indicadores del negocio. Período: ${range.from.toLocaleDateString('es-CO')} — ${new Date(range.to - 86400000).toLocaleDateString('es-CO')}</p>
      </div>
      ${alerts}
      ${kpis}
      ${activity}
    `;
  }

  function buildAlerts(facturas, incidentes, leads) {
    const hoy = new Date();
    let html = '';

    // Facturas vencidas
    const vencidas = facturas.filter(f => f.tipo === 'venta' && f.estado !== 'pagada' && f.estado !== 'anulada' && f.fechaVencimiento && new Date(f.fechaVencimiento) < hoy);
    if (vencidas.length) html += UI.alertBox('danger', `<strong>${vencidas.length}</strong> factura(s) vencida(s) por cobrar`);

    // Incidentes abiertos
    const incAbiertos = incidentes.filter(i => !i.fechaResolucion);
    if (incAbiertos.length) html += UI.alertBox('warning', `<strong>${incAbiertos.length}</strong> incidente(s) sin resolver`);

    // Leads sin contactar
    const leadsNuevos = leads.filter(l => l.etapa === 'nuevo');
    if (leadsNuevos.length > 3) html += UI.alertBox('info', `<strong>${leadsNuevos.length}</strong> leads nuevos sin contactar`);

    return html;
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

  function bind() {
    // No interactive elements beyond standard
  }

  return { render, bind };
})();
