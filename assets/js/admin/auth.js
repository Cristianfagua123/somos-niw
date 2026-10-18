/* ==========================================================
   AUTH — Authentication, roles & permissions
   ========================================================== */

const Auth = (() => {
  const SESSION_KEY = 'niw_admin_session';

  const ROLES = {
    admin: {
      id: 'admin',
      nombre: 'Administrador',
      descripcion: 'Acceso total al sistema',
      permisos: ['*'],
      soloLectura: false,
    },
    finanzas: {
      id: 'finanzas',
      nombre: 'Contador / Finanzas',
      descripcion: 'Finanzas, utilidad, flujo de caja, cartera y configuración',
      permisos: ['resumen', 'utilidad', 'finanzas', 'flujo_caja', 'cartera', 'configuracion'],
      soloLectura: false,
    },
    operaciones: {
      id: 'operaciones',
      nombre: 'Operaciones',
      descripcion: 'Compras, órdenes de compra, facturas y proyectos',
      permisos: ['compras', 'cartera', 'proyectos'],
      soloLectura: false,
    },
    lectura: {
      id: 'lectura',
      nombre: 'Solo Lectura',
      descripcion: 'Ver todos los paneles sin editar',
      permisos: ['resumen', 'utilidad', 'finanzas', 'flujo_caja', 'cartera', 'compras', 'ventas', 'meta_ads', 'ingenieria', 'proyectos'],
      soloLectura: true,
    },
  };

  function login(email, password) {
    const usuarios = Store.get('usuarios') || [];
    const user = usuarios.find(u => u.email === email && u.password === password && u.activo);
    if (!user) return null;
    const session = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    Store.log(user.nombre, 'Inicio de sesión', 'auth', `Usuario ${user.email} inició sesión`);
    return session;
  }

  function logout() {
    const user = getCurrentUser();
    if (user) Store.log(user.nombre, 'Cierre de sesión', 'auth', `Usuario ${user.email} cerró sesión`);
    sessionStorage.removeItem(SESSION_KEY);
  }

  function getCurrentUser() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function getRole(rolId) {
    return ROLES[rolId] || ROLES.lectura;
  }

  function hasPermission(tabId) {
    const user = getCurrentUser();
    if (!user) return false;
    const role = getRole(user.rol);
    return role.permisos.includes('*') || role.permisos.includes(tabId);
  }

  function canWrite(tabId) {
    const user = getCurrentUser();
    if (!user) return false;
    const role = getRole(user.rol);
    if (role.soloLectura) return false;
    return role.permisos.includes('*') || role.permisos.includes(tabId);
  }

  function isAdmin() {
    const user = getCurrentUser();
    return user && user.rol === 'admin';
  }

  // User CRUD
  function createUser(data) {
    const user = Store.insert('usuarios', {
      nombre: data.nombre,
      email: data.email,
      password: data.password,
      rol: data.rol,
      activo: data.activo !== false,
      fechaCreacion: new Date().toISOString(),
    });
    const currentUser = getCurrentUser();
    Store.log(currentUser?.nombre, 'Creó usuario', 'usuarios', `Creó usuario ${user.email} con rol ${user.rol}`);
    return user;
  }

  function updateUser(id, updates) {
    const user = Store.update('usuarios', id, updates);
    const currentUser = getCurrentUser();
    Store.log(currentUser?.nombre, 'Editó usuario', 'usuarios', `Editó usuario ${id}: ${JSON.stringify(updates)}`);
    return user;
  }

  function deleteUser(id) {
    // Prevent deleting the last admin
    const usuarios = Store.get('usuarios') || [];
    const adminCount = usuarios.filter(u => u.rol === 'admin' && u.activo).length;
    const target = usuarios.find(u => u.id === id);
    if (target && target.rol === 'admin' && adminCount <= 1) {
      return { error: 'No se puede eliminar el último administrador' };
    }
    Store.remove('usuarios', id);
    const currentUser = getCurrentUser();
    Store.log(currentUser?.nombre, 'Eliminó usuario', 'usuarios', `Eliminó usuario ${id}`);
    return { success: true };
  }

  return { ROLES, login, logout, getCurrentUser, getRole, hasPermission, canWrite, isAdmin, createUser, updateUser, deleteUser };
})();
