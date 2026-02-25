# Design System: WhereToStream Redesign
**Project ID:** 7551561512130658058

## 1. Visual Theme & Atmosphere
A mysterious, rich cinematic feel reminiscent of a high-end arthouse cinema. Deep, saturated midnight plum gradients provide an immersive, theater-like backdrop, while all active interactions and primary focal points are highlighted with a warm, glowing cinematic gold. The UI employs sleek, translucent frosted-glass panels to establish depth and hierarchy without distracting from the content.

## 2. Color Palette & Roles
* **Warm Arthouse Gold (#F5B041)**: Used for primary actions, active genre toggles, icons, and glowing focal accents.
* **Midnight Plum Start (#1A0F1F)**: Used for the lighter, top section of the global background gradient and header overlays.
* **Midnight Plum End (#0A050F)**: Used for the darker, bottom section of the global background gradient and deep backgrounds for inactive pills.
* **Deep Muted Violet (#2A1B38)**: Used for the semi-transparent backgrounds of frosted glass panels and secondary content areas.
* **Golden Bronze (#4A3B28)**: Used for subtle, elegant 1px borders surrounding glass panels, form inputs, and chips.
* **Warm Cream Text (#F5F5DC)**: Used for secondary text, inactive options, labels, and placeholders.
* **Pure White (#FFFFFF)**: Used for primary headings, active text, and high-contrast readability.

## 3. Typography Rules
* **Font Family**: Spline Sans for all display and body text, providing a clean, modern, yet welcoming geometric look.
* **Headers**: Crisp white, bold tracking for primary titles.
* **Microcopy & Labels**: Form labels and small hints use heavily tracked (letter-spacing: 0.1em), uppercase Warm Cream text for an elegant, editorial feel.

## 4. Component Stylings
* **Buttons & Toggles:** Pill-shaped (fully rounded edges). Active toggles use the solid Arthouse Gold background with dark text, while primary action buttons feature a soft golden dropshadow for elevation.
* **Cards/Glass Panels:** Generously rounded corners (16px / `rounded-xl`). They use a dark, semi-transparent Muted Violet background with an aggressive 16px background blur, outlined by a 1px Golden Bronze border.
* **Inputs/Forms:** Deep Muted Violet backgrounds with no internal borders. They expand seamlessly within their parent containers and emit a soft Gold Glow when housing primary actions (like the main search bar).

## 5. Layout Principles
* **Spacing & Layering**: Generous internal padding (p-5, py-4) to let the typography and interactive elements breathe. Stacked elements are visually separated by border outlines rather than solid backgrounds, using the heavy background blur to separate foreground components from scrolling content.
* **Fluid Grids**: Filters and layout items are grouped tightly into flexible flexbox and grid layouts, keeping the visual UI extremely compact to allow maximum space for the background media and cinematic art below.
