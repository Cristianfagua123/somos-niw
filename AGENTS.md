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

## Notes
- The repo directory has restrictive (700) permissions, so nginx runs as
  `root` via a custom `nginx.conf` (mounted read-only). This is sandbox-only
  plumbing; it does not affect the app's behavior.
- No external credentials or secrets are required.
