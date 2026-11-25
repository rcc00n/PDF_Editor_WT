# Frontend

See the [root README](../README.md) for the product, source map and both run modes.

```bash
npm ci
VITE_DEMO_MODE=true npm run dev
VITE_DEMO_MODE=true npm run test:run
VITE_DEMO_MODE=true npm run build
```

For the real API set `VITE_DEMO_MODE=false` and `VITE_API_BASE_URL` explicitly.
Demo queue completion is simulated, not server acceptance. Missing configuration
never opts into a demo implicitly.
