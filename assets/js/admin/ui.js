/* ==========================================================
   UI — Reusable UI components
   ========================================================== */

const UI = (() => {

  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => { el.remove(); }, 4000);
  }

  function modal(title, bodyHTML, footerHTML) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-footer').innerHTML = footerHTML || '';
    document.getElementById('modal-overlay').style.display = 'flex';
  }

  function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
  }

  function confirm(message, onConfirm) {
    modal(
      'Confirmar',
      `<p>${message}</p>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
       <button class="btn btn-danger" id="confirm-yes">Confirmar</button>`
    );
    document.getElementById('confirm-yes').onclick = () => {
      closeModal();
      onConfirm();
    };
  }

  function formatCOP(value) {
    if (value == null || isNaN(value)) return '$0';
    return '$' + Math.round(value).toLocaleString('es-CO');
  }

  function formatPct(value) {
    if (value == null || isNaN(value)) return '0%';
    return (value >= 0 ? '+' : '') + Number(value).toFixed(1) + '%';
  }

  function semaphore(value, threshold) {
    if (!threshold || value == null || isNaN(value)) return 'gray';
    const { verde, amarillo, tipo } = threshold;
    if (tipo === 'min') {
      if (value >= verde) return 'green';
      if (value >= amarillo) return 'yellow';
      return 'red';
    } else {
      if (value <= verde) return 'green';
      if (value <= amarillo) return 'yellow';
      return 'red';
    }
  }

  function kpiCard(label, value, sub, status, infoText) {
    const semClass = `sem-${status || 'gray'}`;
    const badgeClass = `badge-${status || 'gray'}`;
    const infoIcon = infoText
      ? `<span class="kpi-info" title="${infoText}">ℹ</span>`
      : '';
    const subHTML = sub
      ? `<div class="kpi-sub"><span class="${sub.startsWith('↑') ? 'arrow-up' : sub.startsWith('↓') ? 'arrow-down' : ''}">${sub}</span></div>`
      : '';
    return `<div class="kpi-card ${semClass}">
      ${infoIcon}
      <div class="kpi-label">${label} <span class="badge ${badgeClass}">${status === 'green' ? '✓' : status === 'yellow' ? '⚠' : status === 'red' ? '✗' : '—'}</span></div>
      <div class="kpi-value">${value}</div>
      ${subHTML}
    </div>`;
  }

  function table(headers, rows, options = {}) {
    const ths = headers.map(h => `<th>${h}</th>`).join('');
    if (rows.length === 0) {
      return `<div class="empty-state"><div class="empty-icon">📭</div><h3>Sin datos</h3><p>${options.emptyText || 'No hay registros aún.'}</p></div>`;
    }
    const trs = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
    return `<div class="table-wrap"><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
  }

  function formField(label, name, type = 'text', value = '', options = {}) {
    const opts = options.options
      ? options.options.map(o => `<option value="${o.value}" ${o.value == value ? 'selected' : ''}>${o.label}</option>`).join('')
      : '';
    const input = type === 'select'
      ? `<select name="${name}" id="${name}">${opts}</select>`
      : type === 'textarea'
      ? `<textarea name="${name}" id="${name}" rows="${options.rows || 3}">${value}</textarea>`
      : `<input type="${type}" name="${name}" id="${name}" value="${value}" ${options.step ? `step="${options.step}"` : ''} ${options.min ? `min="${options.min}"` : ''}>`;
    const hint = options.hint ? `<div class="form-hint">${options.hint}</div>` : '';
    return `<div class="form-group"><label for="${name}">${label}</label>${input}${hint}</div>`;
  }

  function alertBox(type, message) {
    const icons = { warning: '⚠️', danger: '🚨', info: 'ℹ️' };
    return `<div class="alert-box alert-${type}"><span>${icons[type] || ''}</span><span>${message}</span></div>`;
  }

  return { toast, modal, closeModal, confirm, formatCOP, formatPct, semaphore, kpiCard, table, formField, alertBox };
})();
