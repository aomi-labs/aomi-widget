# Aomi Widget Showcase

This mini Vite application lives under `examples/widget-landing/` and demonstrates the `@aomi-labs/widget-lib`
package with a live, theme-switching hero widget. Use it as a marketing landing page or as a
sandbox while wiring the library into your own product.

## Develop locally

```bash
cd examples/widget-landing
npm install
npm run dev
```

The demo reads the backend URL from `VITE_AOMI_BACKEND_URL`. Provide a `.env` file or export the variable
before starting the dev server. If unset, the app falls back to `http://localhost:8080`. You can also override
it on the fly by appending `?backend=https://api.example.com` to the preview URL.

## Build & preview

```bash
npm run build
npm run preview
```

When deploying on Vercel, set the build command to `npm run vercel-build`. This installs and builds the
root library (`@aomi-labs/widget-lib`) before running the Vite build, ensuring the bundled package resolves
correctly.

## Deploy to Vercel

1. Set the project root to `examples/widget-landing`.
2. Configure the build command `npm run build` and the output directory `dist`.
3. Define the `VITE_AOMI_BACKEND_URL` environment variable (e.g. `https://api.aomi.dev`).
4. Deploy — the widget will connect to the configured backend at runtime.

The frontend consumes `createChatWidget` straight from `@aomi-labs/widget-lib`, matching how downstream integrators
install it via npm.
