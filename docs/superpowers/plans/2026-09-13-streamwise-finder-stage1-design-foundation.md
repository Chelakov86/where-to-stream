# Stage 1: Design-System Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace this app's ad hoc dark+amber palette with the reference app's "Cinema
Ember" design tokens (CSS variables + Tailwind config), load Sora/Manrope fonts, and
introduce a minimal shadcn-ui primitive layer (Button, Input, Label, Dialog, Popover,
Command, Switch) — with zero behavior change to any existing feature.

**Architecture:** Cinema Ember's tokens are authored as raw oklch component triplets in
CSS custom properties (`app/globals.css`), each surfaced as a Tailwind color via
`oklch(var(--x) / <alpha-value>)` so opacity modifiers (`bg-primary/15`) keep working —
the same technique shadcn uses with `hsl(var(--x) / <alpha-value>)`, just swapped to
oklch to match the reference app's `src/styles.css` exactly. Every existing component's
Tailwind color classes are then mechanically renamed from the old custom keys
(`background`/`text`/`accent`) onto the new semantic ones, so the whole app repaints in
one pass instead of leaving two token systems live side by side. shadcn primitives are
hand-ported (not scaffolded via the CLI, since we're only taking 7 of ~40) into
`app/components/ui/`, backed by a `cn()` helper and a `components.json` so `npx shadcn
add <x>` still works cleanly for any primitive stage 2+ needs later.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS 3.4 (not upgrading to v4), Radix UI
primitives, `class-variance-authority`, `cmdk`, `lucide-react`, `tailwindcss-animate`,
`next/font/google` (Sora, Manrope).

**Spec:** [docs/superpowers/specs/2026-09-13-streamwise-finder-parity-design.md](../specs/2026-09-13-streamwise-finder-parity-design.md)
— this plan implements Rollout item 1 only ("Design-system foundation — tokens, fonts,
shadcn init + base primitives. Visual only, no behavior change").

## Global Constraints

- **Stay on Tailwind 3** — no `@tailwindcss/postcss` v4 migration. `postcss.config.js`
  already uses the classic `tailwindcss` plugin; the `@tailwindcss/postcss` package
  present in `package.json` devDependencies is unused dead weight from a prior audit —
  do not touch it, it's out of scope for this plan.
- **Only the 7 named shadcn primitives** — Button, Input, Label, Dialog, Popover,
  Command, Switch. Do not scaffold the other ~33 shadcn components.
- **shadcn `ui/` files keep shadcn's own lowercase filename convention**
  (`button.tsx`, not `Button.tsx`) — a deliberate, documented exception to this repo's
  "Components: PascalCase" rule (CLAUDE.md), because these files are meant to stay
  re-generatable via `npx shadcn add <name>`, which always emits lowercase filenames.
- **No page-level hardcoded colors going forward** — every color introduced or touched
  by this plan must be a semantic token (`bg-primary`, `text-muted-foreground`, etc.),
  never a raw hex/rgba. Pre-existing hardcoded colors that this plan's mechanical rename
  doesn't touch (e.g. decorative `shadow-[...rgba(246,185,75,...)]` glows, the search
  input's inverted cream styling, the rating-star gold) are **explicitly out of scope**
  — they don't reference a token this plan removes, so leaving them alone causes no
  regression. Don't "clean them up" opportunistically; that's stage 7 (Polish) territory.
- **This is a visual-diff stage.** Per the spec's Risks section, re-baselining the
  Playwright visual-regression suite after this stage is expected to produce a large,
  pixel-level diff reviewed by manual inspection, not line-by-line.
- Every step that edits a `.tsx`/`.ts`/`.css` file must leave `npm run lint` and
  `npm run format:check` clean before that task's commit.

---

## Task 1: Add shadcn/Radix dependencies

**Files:**

- Modify: `package.json`

**Interfaces:**

- Produces: the npm packages every later task in this plan imports (`clsx`,
  `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-slot`,
  `@radix-ui/react-label`, `@radix-ui/react-dialog`, `@radix-ui/react-popover`,
  `@radix-ui/react-switch`, `cmdk`, `lucide-react`, `tailwindcss-animate`).

- [ ] **Step 1: Add the runtime dependencies**

Run:

```bash
npm install --save \
  clsx@^2.1.1 \
  tailwind-merge@^3.5.0 \
  class-variance-authority@^0.7.1 \
  @radix-ui/react-slot@^1.2.4 \
  @radix-ui/react-label@^2.1.8 \
  @radix-ui/react-dialog@^1.1.15 \
  @radix-ui/react-popover@^1.1.15 \
  @radix-ui/react-switch@^1.2.6 \
  cmdk@^1.1.1 \
  lucide-react@^0.575.0
```

- [ ] **Step 2: Add the Tailwind animation plugin as a dev dependency**

Run:

```bash
npm install --save-dev tailwindcss-animate@^1.0.7
```

- [ ] **Step 3: Verify install**

Run: `npm ls clsx tailwind-merge class-variance-authority tailwindcss-animate cmdk lucide-react`
Expected: every package listed with no `UNMET DEPENDENCY` / `invalid` errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add shadcn/Radix dependencies for design-system foundation"
```

---

## Task 2: Cinema Ember tokens (Tailwind config + globals.css)

**Files:**

- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

**Interfaces:**

- Produces: the semantic color classes every later task and every existing component
  relies on: `background, foreground, card(+foreground), popover(+foreground),
primary(+foreground), secondary(+foreground), muted(+foreground), accent(+foreground),
destructive(+foreground), success(+foreground), warning(+foreground), border, input,
ring`; `font-display` / `font-body` font-family utilities; `borderRadius` scale driven
  by `--radius`; `tailwindcss-animate`'s `animate-in`/`animate-out`/`fade-in-0`/
  `zoom-in-95`/etc. utilities.

- [ ] **Step 1: Rewrite `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

const withAlpha = (variable: string) => `oklch(var(${variable}) / <alpha-value>)`;

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: withAlpha('--background'),
        foreground: withAlpha('--foreground'),
        card: {
          DEFAULT: withAlpha('--card'),
          foreground: withAlpha('--card-foreground'),
        },
        popover: {
          DEFAULT: withAlpha('--popover'),
          foreground: withAlpha('--popover-foreground'),
        },
        primary: {
          DEFAULT: withAlpha('--primary'),
          foreground: withAlpha('--primary-foreground'),
        },
        secondary: {
          DEFAULT: withAlpha('--secondary'),
          foreground: withAlpha('--secondary-foreground'),
        },
        muted: {
          DEFAULT: withAlpha('--muted'),
          foreground: withAlpha('--muted-foreground'),
        },
        accent: {
          DEFAULT: withAlpha('--accent'),
          foreground: withAlpha('--accent-foreground'),
        },
        destructive: {
          DEFAULT: withAlpha('--destructive'),
          foreground: withAlpha('--destructive-foreground'),
        },
        success: {
          DEFAULT: withAlpha('--success'),
          foreground: withAlpha('--success-foreground'),
        },
        warning: {
          DEFAULT: withAlpha('--warning'),
          foreground: withAlpha('--warning-foreground'),
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: withAlpha('--ring'),
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 4px)',
        DEFAULT: 'calc(var(--radius) - 2px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        sans: ['var(--font-body)'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
```

Note: `--background`, `--foreground`, `--primary`, etc. hold raw `L C H` oklch
components (no `oklch(...)` wrapper) so the `<alpha-value>` substitution works for
opacity modifiers like `bg-primary/15`. `--border` and `--input` are the two exceptions
— they carry a fixed baked-in alpha (matching the reference app) and are used with no
opacity modifier anywhere in this codebase, so they're wired as plain `var(--x)`.

- [ ] **Step 2: Rewrite `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --radius: 0.625rem;

    --background: 0.18 0.006 70;
    --foreground: 0.96 0.015 85;
    --card: 0.25 0.007 70;
    --card-foreground: 0.96 0.015 85;
    --popover: 0.22 0.007 70;
    --popover-foreground: 0.96 0.015 85;
    --primary: 0.79 0.14 71;
    --primary-foreground: 0.19 0.012 68;
    --secondary: 0.3 0.008 70;
    --secondary-foreground: 0.94 0.012 85;
    --muted: 0.28 0.007 70;
    --muted-foreground: 0.72 0.012 80;
    --accent: 0.34 0.025 71;
    --accent-foreground: 0.97 0.012 85;
    --destructive: 0.65 0.18 25;
    --destructive-foreground: 0.98 0.008 85;
    --success: 0.74 0.14 151;
    --success-foreground: 0.18 0.025 151;
    --warning: 0.8 0.14 80;
    --warning-foreground: 0.2 0.025 75;
    --ring: 0.79 0.14 71;
    --border: oklch(0.96 0.015 85 / 13%);
    --input: oklch(0.96 0.015 85 / 18%);
  }

  body {
    @apply bg-background text-foreground;
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
  }

  h1,
  h2,
  h3,
  .font-display {
    font-family: var(--font-display);
  }

  ::selection {
    background-color: oklch(var(--primary) / 32%);
    color: oklch(var(--foreground));
  }

  :focus-visible {
    outline: 2px solid oklch(var(--ring));
    outline-offset: 2px;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: oklch(var(--muted-foreground) / 50%);
    border-radius: 2px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: oklch(var(--foreground) / 40%);
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This drops the old ambient radial-gradient vignette on `body::before` and the fixed
`html { background: #090b10; }` — the reference app's Cinema Ember design uses a flat
charcoal background with no ambient glow, and this plan follows it exactly rather than
inventing an untested hybrid.

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds. It will render with unstyled/default-colored elements
wherever a component still references the now-deleted `text-text`, `bg-accent-primary`,
etc. classes — that's expected and fixed in Task 6. `npm run lint` may also flag
nothing new yet since no `.tsx` files changed in this task.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts app/globals.css
git commit -m "feat(design-system): add Cinema Ember token system"
```

---

## Task 3: Sora/Manrope fonts

**Files:**

- Modify: `app/layout.tsx`

**Interfaces:**

- Consumes: `font-body` utility class from Task 2's `tailwind.config.ts`.
- Produces: the `--font-display`/`--font-body` CSS variables (populated by
  `next/font/google`, referenced by `app/globals.css`'s `h1,h2,h3,.font-display` rule
  and by `tailwind.config.ts`'s `fontFamily.display`/`fontFamily.body`).

- [ ] **Step 1: Replace the Inter font with Sora + Manrope**

```tsx
import type { Metadata } from 'next';
import { Sora, Manrope } from 'next/font/google';
import './globals.css';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';

const sora = Sora({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: 'WhereToStream',
  description: 'Find where movies and TV shows are streaming',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable}`}>
      <body className="bg-background font-body text-foreground antialiased">
        <ErrorBoundary>
          <div className="flex min-h-screen flex-col">
            <Header />
            <div className="flex-grow">{children}</div>
            <Footer />
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify existing layout test still passes**

Run: `npx jest __tests__ -t "Layout" --passWithNoTests`
Expected: PASS (or "no tests found" — this repo has no dedicated layout test file; if
one turns up, it must still pass).

- [ ] **Step 3: Run the full Jest suite as a smoke check**

Run: `npm test`
Expected: PASS, except any test asserting the literal old Tailwind color class names
(`AutocompleteList.test.tsx` — fixed in Task 6, not this one). No other regressions.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(design-system): load Sora and Manrope via next/font/google"
```

---

## Task 4: `cn()` utility + shadcn `components.json`

**Files:**

- Create: `app/utils/cn.ts`
- Create: `components.json`

**Interfaces:**

- Produces: `cn(...inputs: ClassValue[]): string` — imported by every primitive in
  Task 5 as `import { cn } from '@/app/utils/cn'`.

- [ ] **Step 1: Create `app/utils/cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Create `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/app/components",
    "utils": "@/app/utils/cn",
    "ui": "@/app/components/ui",
    "hooks": "@/app/hooks",
    "lib": "@/app/utils"
  }
}
```

`rsc: true` (unlike the reference app's `false`) because this is a real Next.js App
Router project with Server Components, where the reference's Vite/TanStack Start stack
has none.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from `app/utils/cn.ts`.

- [ ] **Step 4: Commit**

```bash
git add app/utils/cn.ts components.json
git commit -m "chore(design-system): add cn() helper and shadcn components.json"
```

---

## Task 5: shadcn primitives (Button, Input, Label, Dialog, Popover, Command, Switch)

**Files:**

- Create: `app/components/ui/button.tsx`
- Create: `app/components/ui/input.tsx`
- Create: `app/components/ui/label.tsx`
- Create: `app/components/ui/dialog.tsx`
- Create: `app/components/ui/popover.tsx`
- Create: `app/components/ui/command.tsx`
- Create: `app/components/ui/switch.tsx`
- Test: `__tests__/components/ui/primitives.test.tsx`

**Interfaces:**

- Consumes: `cn()` from Task 4 (`@/app/utils/cn`); the semantic Tailwind classes from
  Task 2 (`bg-primary`, `text-popover-foreground`, `ring-ring`, etc.).
- Produces: `Button` (+ `buttonVariants`, `ButtonProps`), `Input`, `Label`,
  `Dialog`/`DialogTrigger`/`DialogPortal`/`DialogClose`/`DialogOverlay`/`DialogContent`/
  `DialogHeader`/`DialogFooter`/`DialogTitle`/`DialogDescription`,
  `Popover`/`PopoverTrigger`/`PopoverContent`/`PopoverAnchor`,
  `Command`/`CommandDialog`/`CommandInput`/`CommandList`/`CommandEmpty`/`CommandGroup`/
  `CommandItem`/`CommandShortcut`/`CommandSeparator`, `Switch` — consumed by stage 2+
  components (`SearchBox`, `FiltersBar`, `ServicesDialog`, `CountryPicker`, etc., per the
  spec's Components table). Nothing in this codebase imports these yet; that's expected.

These are direct ports of the reference app's `src/components/ui/*.tsx`, adjusted for
Tailwind 3 (the reference is on Tailwind v4) and this repo's import aliases.

- [ ] **Step 1: Create `app/components/ui/button.tsx`**

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/app/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold cursor-pointer transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:translate-y-px',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-card shadow-sm hover:border-primary/35 hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

- [ ] **Step 2: Create `app/components/ui/input.tsx`**

```tsx
import * as React from 'react';

import { cn } from '@/app/utils/cn';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
```

- [ ] **Step 3: Create `app/components/ui/label.tsx`**

```tsx
'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/app/utils/cn';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
```

- [ ] **Step 4: Create `app/components/ui/dialog.tsx`**

```tsx
'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/app/utils/cn';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-background/85 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-5 rounded-lg border border-border bg-popover p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/60 disabled:pointer-events-none data-[state=open]:bg-accent">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
```

- [ ] **Step 5: Create `app/components/ui/popover.tsx`**

```tsx
import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/app/utils/cn';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[var(--radix-popover-content-transform-origin)]',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
```

Note the `origin-[var(--radix-popover-content-transform-origin)]` class: the reference
app uses Tailwind v4's `origin-(--radix-popover-content-transform-origin)` shorthand,
which doesn't exist in Tailwind 3. The bracket form with an explicit `var()` is the
v3-compatible equivalent.

- [ ] **Step 6: Create `app/components/ui/command.tsx`**

```tsx
'use client';

import * as React from 'react';
import { type DialogProps } from '@radix-ui/react-dialog';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';

import { cn } from '@/app/utils/cn';
import { Dialog, DialogContent } from '@/app/components/ui/dialog';

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground',
      className
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

const CommandDialog = ({ children, ...props }: DialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm" {...props} />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      'overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
      className
    )}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 h-px bg-border', className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex min-h-10 cursor-default gap-2 select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      className
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  );
};
CommandShortcut.displayName = 'CommandShortcut';

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
```

- [ ] **Step 7: Create `app/components/ui/switch.tsx`**

```tsx
import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';

import { cn } from '@/app/utils/cn';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
```

- [ ] **Step 8: Write the smoke test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from '@/app/components/ui/command';

describe('shadcn ui primitives', () => {
  it('renders a Button', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('renders a labeled Input', () => {
    render(
      <>
        <Label htmlFor="q">Query</Label>
        <Input id="q" />
      </>
    );
    expect(screen.getByLabelText('Query')).toBeInTheDocument();
  });

  it('renders a Switch', () => {
    render(<Switch aria-label="Toggle" />);
    expect(screen.getByRole('switch', { name: 'Toggle' })).toBeInTheDocument();
  });

  it('opens a Dialog', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>My dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog', { name: 'My dialog' })).toBeInTheDocument();
  });

  it('opens a Popover', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Filters</Button>
        </PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>
    );
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByText('Popover body')).toBeInTheDocument();
  });

  it('renders a Command list', () => {
    render(
      <Command>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandItem>Fight Club</CommandItem>
        </CommandList>
      </Command>
    );
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    expect(screen.getByText('Fight Club')).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run the new test**

Run: `npx jest __tests__/components/ui/primitives.test.tsx`
Expected: 6 passed.

- [ ] **Step 10: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add app/components/ui __tests__/components/ui/primitives.test.tsx
git commit -m "feat(design-system): port Button, Input, Label, Dialog, Popover, Command, Switch"
```

---

## Task 6: Migrate existing components off the legacy color tokens

**Files:**

- Modify: `app/components/AutocompleteList.tsx`
- Modify: `app/components/ErrorBoundary.tsx`
- Modify: `app/components/Footer.tsx`
- Modify: `app/components/Header.tsx`
- Modify: `app/components/ProviderChips.tsx`
- Modify: `app/components/ResultDetails.tsx`
- Modify: `app/components/ResultItem.tsx`
- Modify: `app/components/ResultsList.tsx`
- Modify: `app/components/SearchForm.tsx`
- Modify: `app/components/SearchHistory.tsx`
- Modify: `app/components/Skeleton.tsx`
- Modify: `app/page.tsx`
- Modify: `__tests__/components/AutocompleteList.test.tsx`

**Interfaces:**

- Consumes: the semantic tokens from Task 2 (`primary`, `foreground`,
  `muted-foreground`, `success`, `secondary`, etc.).

This is the mechanical part: every one of these files references the three custom color
keys this plan deletes from `tailwind.config.ts` (`background`/`background-secondary`,
`text`/`text-secondary`, `accent-primary`/`accent-secondary`). Two renames are pure
substring substitutions everywhere they appear (including with opacity modifiers like
`/40` or `/[0.14]`); `accent-secondary` needs a real color decision since Cinema Ember
has no second decorative hue, so those 3 call sites are hand-edited instead.

- [ ] **Step 1: Run the mechanical rename across all 13 files**

```bash
FILES="app/components/AutocompleteList.tsx app/components/ErrorBoundary.tsx \
app/components/Footer.tsx app/components/Header.tsx app/components/ProviderChips.tsx \
app/components/ResultDetails.tsx app/components/ResultItem.tsx \
app/components/ResultsList.tsx app/components/SearchForm.tsx \
app/components/SearchHistory.tsx app/components/Skeleton.tsx app/page.tsx \
__tests__/components/AutocompleteList.test.tsx"

sed -i \
  -e 's/text-secondary/muted-foreground/g' \
  -e 's/text-text/text-foreground/g' \
  -e 's/accent-primary/primary/g' \
  $FILES
```

Order matters: `text-secondary` must run before `text-text` (otherwise
`text-text-secondary` would wrongly become `text-foreground-secondary`, since the bare
rule's pattern is a prefix of the compound one).

- [ ] **Step 2: Fix the "live availability" pulse dot in `app/components/Header.tsx`**

The old teal `accent-secondary` isn't touched by the sed pass (distinct token). Find:

```tsx
<span className="h-2 w-2 rounded-full bg-accent-secondary shadow-[0_0_12px_rgba(83,210,198,0.8)]" />
```

Replace with:

```tsx
<span className="h-2 w-2 rounded-full bg-success shadow-[0_0_12px_oklch(var(--success)/0.8)]" />
```

(The glow's rgba is hardcoded to the old teal hue, so it must move with the token —
unlike the untouched amber glows elsewhere in the app, which stay visually correct
since Cinema Ember's primary is the same ember/amber family, just re-expressed as a
token.)

- [ ] **Step 3: Fix the movie/series type badge in `app/components/ResultItem.tsx`**

Find:

```tsx
            className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
              type === 'movie'
                ? 'bg-accent-secondary/[0.16] text-accent-secondary'
                : 'bg-[#b28cff]/[0.18] text-[#d8c6ff]'
            }`}
```

Replace with:

```tsx
            className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
              type === 'movie'
                ? 'bg-success/15 text-success'
                : 'bg-secondary text-secondary-foreground'
            }`}
```

(Both branches move together: leaving the "Series" branch on its old hardcoded purple
hex while "Movie" switches to a token would leave one badge off-system.)

- [ ] **Step 4: Fix the active-filter-count badge in `app/components/SearchForm.tsx`**

Find:

```tsx
<span className="rounded-full bg-accent-secondary/[0.18] px-2.5 py-1 text-xs font-black text-accent-secondary">
  {activeFilterCount} active
</span>
```

Replace with:

```tsx
<span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-black text-success">
  {activeFilterCount} active
</span>
```

- [ ] **Step 5: Confirm no legacy token references remain**

Run:

```bash
grep -rnE "text-text|bg-accent-|text-accent-|border-accent-|ring-accent-|accent-accent-" app __tests__ --include="*.tsx"
```

Expected: no output.

- [ ] **Step 6: Format**

Run: `npm run format`
Expected: exits clean (fixes any quote/width drift from the sed pass or hand edits).

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: all suites pass, including `AutocompleteList.test.tsx` (now asserting
`bg-primary/[0.14]`) and the new `primitives.test.tsx` from Task 5.

- [ ] **Step 8: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add app/components __tests__/components/AutocompleteList.test.tsx app/page.tsx
git commit -m "refactor(design-system): migrate components onto Cinema Ember tokens"
```

---

## Task 7: Re-baseline visual regression + final verification

**Files:**

- Modify: Playwright snapshot files under `e2e/tests/visual-regression.e2e.spec.ts-snapshots/`
  (regenerated, not hand-edited)

- [ ] **Step 1: Build the production bundle Playwright serves**

Run: `npm run build`
Expected: succeeds with no type or lint errors surfaced during build.

- [ ] **Step 2: Regenerate visual-regression snapshots**

Run: `npx playwright test visual-regression --update-snapshots`
Expected: the run completes and rewrites the snapshot PNGs. Per CLAUDE.md, these
snapshots are OS-independent; run this on the same platform CI uses if unsure.

- [ ] **Step 3: Run the rest of the Playwright suite**

Run: `npx playwright test --project=chromium`
Expected: all specs pass against the new visuals — this only re-baselines pixels, no
behavior changed, so no spec assertion should need editing. If any spec asserts a
specific Tailwind class name (none currently do, per this plan's audit), fix it here.

- [ ] **Step 4: Manually review the snapshot diff**

Run: `git diff --stat -- 'e2e/tests/visual-regression.e2e.spec.ts-snapshots/*'`
Expected: every changed file is a snapshot PNG; skim a handful open in an image viewer
to confirm they show the Cinema Ember palette (charcoal background, ember primary,
Sora/Manrope fonts) and not a broken/unstyled page.

- [ ] **Step 5: Final full-suite check**

Run: `npm run test:all`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add e2e/tests/visual-regression.e2e.spec.ts-snapshots
git commit -m "test(e2e): re-baseline visual regression snapshots for Cinema Ember"
```
