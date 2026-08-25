# V3 reference build

The `/v3` homepage is served directly by `route.ts` from the optimized files
under `public/assets/v3/reference/`. It deliberately does not use the V3 Next
layout; product, solution, pricing, and resource subpages continue to use that
layout normally.

The checked-in reference build contains:

- `index.html` — readable page markup and styles with no embedded executable
  JavaScript;
- `component-source.js` — the small interactive state machine from the design
  export;
- `resources.js` — semantic asset-name mappings used by the state machine;
- `assets/` — cacheable fonts, images, logos, and the 69 KB rendering runtime.

Regenerate it from a newer design export with:

```bash
pnpm --filter landing v3:extract -- /absolute/path/to/Aomi-Landing-v3.html
```

The extractor preserves the export's markup and behavior while removing its
self-unpacking wrapper and embedded base64 manifest. After regeneration,
compare the design export and `/v3` at the same viewport before committing.
