# AGENTS.md — somos-niw

## Project overview
Static HTML/CSS/JS marketing site (Spanish) for "Niw" — a web design service.
Three pages: `index.html`, `demo.html`, `referidos.html`. Assets in `assets/`
(css, js, images). No build step, no backend, no dependencies.

## Running in the sandbox
```bash
docker compose -f docker-compose.base44.yml up -d
```
Served by nginx:alpine on host port 3000. Source is bind-mounted read-only,
so edits to HTML/CSS/JS appear immediately on refresh — no rebuild needed.

## Admin Panel
`admin.html` is a SPA-style admin panel (vanilla JS, localStorage persistence).
- Login: `admin@niw.co` / `admin123`
- JS modules in `assets/js/admin/`: store.js (data layer), auth.js (roles),
  ui.js (components), app.js (router + pages)
- CSS: `assets/css/admin.css` (dark/light themes via `data-theme` attribute)
- Data stored in localStorage key `niw_admin_data`; session in sessionStorage
- All phases complete: Resumen Ejecutivo, Utilidad Real, Finanzas, Flujo de Caja,
  Cartera, Compras/OC, Ventas/CAC/LTV/NPS, Meta Ads, Ingeniería (DORA), Proyectos,
  Configuración.

## Notes
- The repo directory has restrictive (700) permissions, so nginx runs as
  `root` via a custom `nginx.conf` (mounted read-only). This is sandbox-only
  plumbing; it does not affect the app's behavior.
- No external credentials or secrets are required.
