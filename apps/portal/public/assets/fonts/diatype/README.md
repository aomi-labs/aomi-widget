# ABC Diatype (portal-only)

Licensed **ABC Diatype** webfonts are **not** committed to this repo.

Drop files here (portal-scoped only — do not put Diatype into
`apps/shadcn-registry` / widget-lib defaults):

```
apps/portal/public/assets/fonts/diatype/
```

## Expected filenames (Dinamo / ABC export names)

Prefer `.woff2`; `.otf` / `.ttf` also work with the `@font-face` block in
`apps/portal/src/app/globals.css` (uncomment after drop).

### Sans (UI / body / titles) — family name `"ABC Diatype"`

| Weight | Expected file |
| --- | --- |
| 400 Regular | `ABCDiatype-Regular.woff2` (or `.otf`) |
| 500 Medium | `ABCDiatype-Medium.woff2` |
| 700 Bold | `ABCDiatype-Bold.woff2` |

Optional extras if your license includes them:

- `ABCDiatype-Light.woff2` (300)
- `ABCDiatype-RegularItalic.woff2`
- Variable: `ABCDiatypeVariable.woff2` (wire separately)

### Mono (IDs / amounts) — only if licensed

| Weight | Expected file |
| --- | --- |
| 400 Regular | `ABCDiatypeMono-Regular.woff2` |
| 500 Medium | `ABCDiatypeMono-Medium.woff2` |
| 700 Bold | `ABCDiatypeMono-Bold.woff2` |

If **no** Diatype Mono files: keep **Geist Mono** via `next/font/google` in
`apps/portal/src/app/layout.tsx` (`--font-geist-mono` / `.aomi-numeric`).

## After dropping files

1. Uncomment the `@font-face` block for `"ABC Diatype"` in
   `apps/portal/src/app/globals.css`.
2. Optionally switch `layout.tsx` to `next/font/local` pointing at these paths
   (see comments there) for preload / size-adjust.
3. If Mono files exist: add matching `@font-face` for `"ABC Diatype Mono"` and
   point `--font-geist-mono` / `.aomi-numeric` at that family.
4. Restart `pnpm --filter portal dev`.

Do **not** pirate or download commercial fonts without a license.
