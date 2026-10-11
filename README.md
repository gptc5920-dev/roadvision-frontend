# RoadVision React frontend

React lives at `https://roadsense.site`; Django is deployed separately at
`https://api.roadsense.site`.

## Local development

```sh
npm ci
npm run dev
```

Start Django on port 8000. Vite forwards `/api`, `/media`, and protected download
requests there. Run `npm test` for the frontend tests.

## Coolify deployment

Use this repository as a Nixpacks application with Base Directory `/`,
Static Site **No**, exposed port **80**, and health path **`/frontend-healthz/`**
on port **80**. Leave Install, Build, Start, and Publish Directory overrides
empty. Set runtime variables:

```dotenv
PORT=80
API_UPSTREAM=https://api.roadsense.site
```

Nixpacks installs dependencies, runs `npm run build`, and starts Caddy. Caddy
serves `dist/` with React route fallback and proxies backend requests to Django.
Do not serve the source directory or raw `index.html` with Nginx: `/src/main.jsx`
needs Vite compilation before a production browser can run it.

Set Django's runtime variables:

```dotenv
DJANGO_ALLOWED_HOSTS=api.roadsense.site
DJANGO_CSRF_TRUSTED_ORIGINS=https://roadsense.site,https://api.roadsense.site
```

Keep session and CSRF cookies host-only. The frontend proxy forwards cookies
and preserves the frontend Origin while using the API hostname upstream.
