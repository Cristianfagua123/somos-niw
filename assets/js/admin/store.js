/* ==========================================================
   STORE — Data persistence layer (localStorage)
   ========================================================== */

const Store = (() => {
  const KEY = 'niw_admin_data';
  const SESSION_KEY = 'niw_admin_session';

  const defaultCategoriasGasto = [
    { id: 'cat-1', nombre: 'Arriendo', tipo: 'fijo' },
    { id: 'cat-2', nombre: 'Nómina y honorarios', tipo: 'fijo' },
    { id: 'cat-3', nombre: 'Servicios públicos', tipo: 'fijo' },
    { id: 'cat-4', nombre: 'Software y suscripciones', tipo: 'fijo' },
    { id: 'cat-5', nombre: 'Marketing y publicidad', tipo: 'variable' },
    { id: 'cat-6', nombre: 'Comisiones', tipo: 'variable' },
    { id: 'cat-7', nombre: 'Impuestos', tipo: 'variable' },
    { id: 'cat-8', nombre: 'Costo de producto/servicio', tipo: 'variable' },
    { id: 'cat-9', nombre: 'Otros gastos', tipo: 'variable' },
  ];

  const defaultUmbrales = {
    margenBruto:   { verde: 60, amarillo: 40, tipo: 'min' },
    margenNeto:    { verde: 20, amarillo: 10, tipo: 'min' },
    runway:        { verde: 6, amarillo: 3, tipo: 'min' },
    dso:           { verde: 30, amarillo: 45, tipo: 'max' },
    ltvCac:        { verde: 3, amarillo: 1.5, tipo: 'min' },
    roas:          { verde: 2, amarillo: 1, tipo: 'min' },
    nps:           { verde: 50, amarillo: 0, tipo: 'min' },
  };

  function defaultData() {
    return {
      _version: 1,
      empresa: {
        nombre: 'Mi Empresa SAS',
        nit: '',
        logo: '',
        moneda: 'COP',
        simbolo: '$',
        ivaPct: 19,
        rentaPct: 35,
        icaPct: 1.1,
        colchonCajaMeses: 3,
        ingenieriaActiva: false,
      },
      usuarios: [
        {
          id: 'usr-admin',
          nombre: 'Administrador',
          email: 'admin@niw.co',
          password: 'admin123',
          rol: 'admin',
          activo: true,
          fechaCreacion: new Date().toISOString(),
        }
      ],
      clientes: [],
      proveedores: [],
      proyectos: [],
      facturas: [],
      pagosFactura: [],
      ordenesCompra: [],
      itemsOrdenCompra: [],
      gastos: [],
      ingresos: [],
      leads: [],
      ventas: [],
      encuestasNPS: [],
      campanasMeta: [],
      metricasMetaDiaria: [],
      despliegues: [],
      incidentes: [],
      metasKPI: [],
      logsAuditoria: [],
      categoriasGasto: [...defaultCategoriasGasto],
      umbralesKPI: { ...defaultUmbrales },
      esDemo: false,
    };
  }

  let cache = null;

  function load() {
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        cache = JSON.parse(raw);
        // Merge missing keys from defaults (forward-compat)
        const defs = defaultData();
        for (const k of Object.keys(defs)) {
          if (cache[k] === undefined) cache[k] = defs[k];
        }
        // Ensure default admin user always exists and is active
        if (!cache.usuarios || cache.usuarios.length === 0) {
          cache.usuarios = defs.usuarios;
          save();
        } else {
          const admin = cache.usuarios.find(u => u.email === 'admin@niw.co');
          if (!admin) {
            cache.usuarios.push(defs.usuarios[0]);
            save();
          } else if (!admin.activo || !admin.password) {
            admin.activo = true;
            if (!admin.password) admin.password = 'admin123';
            save();
          }
        }
      } else {
        cache = defaultData();
        save();
      }
    } catch {
      cache = defaultData();
      save();
    }
    return cache;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(cache));
  }

  function get(key) {
    const d = load();
    return d[key];
  }

  function set(key, value) {
    const d = load();
    d[key] = value;
    save();
  }

  function genId(prefix) {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function insert(collection, entity) {
    const d = load();
    if (!d[collection]) d[collection] = [];
    entity.id = entity.id || genId(collection.slice(0, 3));
    d[collection].push(entity);
    save();
    return entity;
  }

  function update(collection, id, updates) {
    const d = load();
    const arr = d[collection] || [];
    const idx = arr.findIndex(e => e.id === id);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...updates };
      save();
      return arr[idx];
    }
    return null;
  }

  function remove(collection, id) {
    const d = load();
    d[collection] = (d[collection] || []).filter(e => e.id !== id);
    save();
  }

  function findById(collection, id) {
    const d = load();
    return (d[collection] || []).find(e => e.id === id);
  }

  function log(usuario, accion, entidad, detalle) {
    insert('logsAuditoria', {
      fecha: new Date().toISOString(),
      usuario: usuario || 'sistema',
      accion,
      entidad,
      detalle,
    });
  }

  function reset() {
    cache = defaultData();
    save();
  }

  function exportJSON() {
    return JSON.stringify(load(), null, 2);
  }

  function importJSON(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    cache = { ...defaultData(), ...parsed };
    save();
  }

  return { load, save, get, set, insert, update, remove, findById, log, reset, exportJSON, importJSON, genId };
})();
