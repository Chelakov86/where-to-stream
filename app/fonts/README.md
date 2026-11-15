# Bundled fonts

These Latin variable fonts are vendored from Fontsource so production builds do not need to contact Google Fonts:

- Manrope: `@fontsource-variable/manrope@5.3.0`, `files/manrope-latin-wght-normal.woff2`, weights 200–800.
- Sora: `@fontsource-variable/sora@5.3.0`, `files/sora-latin-wght-normal.woff2`, weights 100–800.

Both fonts use the SIL Open Font License 1.1; the complete notices are included alongside the font files. `app/layout.tsx` loads them through `next/font/local`, retaining the display/body CSS variables and `font-display: swap`.

To update, download the pinned Fontsource packages with `npm pack`, copy the corresponding files and license notices, and update the versions above. No Fontsource runtime dependency is required.
