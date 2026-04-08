# Hare Frontend Redesign Plan

## Context

Hare's current frontend is functional but visually minimal — raw CSS with custom utility classes, no component library, and a plain green/teal color scheme. The goal is a professional, trustworthy redesign using **Tailwind CSS + shadcn/ui** that works well on both desktop and mobile. The app name "Hare" calls for subtle rabbit-themed branding — professional, not cutesy.

---

## Phase 1: Infrastructure Setup

### 1.1 Install Tailwind CSS v4

```bash
npm install -D tailwindcss @tailwindcss/postcss postcss
```

Create `postcss.config.mjs`:
```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

### 1.2 Install shadcn/ui

```bash
npx shadcn@latest init
```

Config: **New York** style, **Slate** base color, CSS variables enabled, components at `src/components/ui`, utils at `src/lib/utils.ts`.

### 1.3 Install shadcn components

```bash
npx shadcn@latest add button card input label badge table select separator alert avatar dropdown-menu command dialog popover sheet skeleton sonner
```

### 1.4 Add Inter font

In `layout.tsx`, import `Inter` from `next/font/google` and apply to `<body>`.

### 1.5 Verify build

Run `npm run deploy:build` to confirm Cloudflare Workers compatibility. Tailwind + shadcn are build-time only — no runtime impact.

---

## Phase 2: Design System (DESIGN.md)

Create `DESIGN.md` at project root with the full design specification.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#1e40af` (blue-800) | CTAs, links, brand |
| Primary hover | `#1e3a8a` (blue-900) | Hover states |
| Primary light | `#dbeafe` (blue-100) | Badge backgrounds |
| Background | `#f8fafc` (slate-50) | Page background |
| Surface | `#ffffff` | Cards |
| Text | `#0f172a` (slate-900) | Primary text |
| Muted | `#64748b` (slate-500) | Secondary text |
| Border | `#e2e8f0` (slate-200) | Borders |
| Destructive | `#dc2626` (red-600) | Errors, delete |
| Success | `#16a34a` (green-600) | Verified states |
| Accent | `#f59e0b` (amber-500) | Credit indicators |

**Rationale**: Blue conveys trust (LinkedIn, banking). Slate neutrals are modern. Amber for credits suggests currency without gamification.

### Typography

- **Font**: Inter (via `next/font/google`, self-hosted)
- **Scale**: Tailwind defaults — `text-sm` through `text-4xl`
- **Weights**: 400 (body), 500 (medium labels), 600 (semibold headings), 700 (bold hero)

### Rabbit Branding

- Professional minimal rabbit silhouette SVG — a mark, not a mascot
- Appears in nav logo (24px) and landing page (48px) only
- Favicon: rabbit mark only
- Think Puma's cat or Lacoste's alligator — clean lines, no cartoon features

---

## Phase 3: Layout + Navigation

### Files to modify/create:
- `src/app/layout.tsx` — restructure with new nav, footer, Inter font, Sonner
- `src/components/Navbar.tsx` — new: desktop nav bar
- `src/components/MobileNav.tsx` — new: hamburger + Sheet slide-out
- `src/components/Footer.tsx` — new: simple footer with opt-out link

### Desktop Nav:
```
[Rabbit icon + "Hare"]    [Dashboard] [Submit]    [12 credits] [Avatar ▾]
```
- Sticky header with `backdrop-blur`
- Credit count as amber `Badge`
- Avatar `DropdownMenu`: Dashboard, Submit, Admin (conditional), Sign Out

### Mobile Nav:
- Hamburger icon triggers `Sheet` from left
- Full nav links + credit badge vertically stacked
- Breakpoint: `md:` (768px)

### Footer:
- Simple: Recruiter Opt-Out link, copyright
- `Separator` above

---

## Phase 4: Page-by-Page Redesign

### 4.1 Landing Page (`src/app/page.tsx`)

```
        Recruiter contacts for tech students.

   Share one verified recruiter email, earn 5 credits.
   Spend 1 credit to unlock a contact.

        [ Sign in with Google (.edu only) ]

        No passwords. University email required.

                  How it works
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ 1. Share  │  │ 2. Earn  │  │ 3.Unlock │
   └──────────┘  └──────────┘  └──────────┘
```

- Hero: centered text, no card wrapper. `text-4xl font-bold` heading.
- CTA: `Button size="lg"`
- How it works: three `Card` in `grid md:grid-cols-3`
- Components: `Button`, `Card`

### 4.2 Dashboard (`src/app/dashboard/page.tsx`)

```
┌─ Welcome, @student_4a8f ──── 12 credits ── [Submit email (+5)] ─┐

┌─ Search recruiter contacts ─────────────────────────────────────┐
│ [Search companies...]                                            │
│ Google ─── 23 contacts ──── Open →                               │
└──────────────────────────────────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐
│ 10 cr $3 │ │ 25 cr $5 │ │ 50 cr $8 │
└──────────┘ └──────────┘ └──────────┘

┌─ Popular companies ─────────────────────────────────────────────┐
│ Google 23  ·  Meta 18  ·  Apple 15  ·  Stripe 12  ·  Amazon 9  │
└─────────────────────────────────────────────────────────────────┘
```

- User panel: `Card` with flex layout, credit `Badge`, submit `Button`
- Search: `Card` with `Input`, results as hover rows with `Badge` for count
- Credits: three `Card` in `grid sm:grid-cols-3`
- Popular: `Card` with link list
- Components: `Card`, `Input`, `Button`, `Badge`, `Skeleton`

### 4.3 Submit Page (`src/app/submit/page.tsx`)

- Header: h1 + subtitle (no card)
- Form: single `Card` with `Label` + `Input` pairs
- Company autocomplete: `Popover` + `Command` combobox
- Two-col layout for domain/name and title/department: `grid sm:grid-cols-2`
- Feedback: `Alert` for success/error
- Components: `Card`, `Input`, `Label`, `Button`, `Command`, `Popover`, `Alert`

### 4.4 Company Detail (`src/app/company/[companyId]/page.tsx`)

- Back link at top
- Company name `text-2xl font-bold` + contact count
- Stats bar: credit `Badge` + unlock progress text
- Each entry: `Card`
  - Locked: masked name/email, title/department visible, `Button` for unlock
  - Unlocked: full details, green check, verification date, submitter
- Report: `Select` + small `Button` in `Popover` (collapsed by default)
- Zero credits: `Alert variant="destructive"` with submit link
- Components: `Card`, `Button`, `Badge`, `Alert`, `Select`, `Popover`

### 4.5 Admin Page (`src/app/admin/page.tsx`)

- Stats: five `Card` in `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`
- Reports: `Table` with resolve/dismiss `Button`s, delete via `Dialog`
- Submissions: `Table` with status `Badge`, delete via `Dialog`
- Components: `Card`, `Table`, `Button`, `Badge`, `Dialog`

### 4.6 Opt-Out Page (`src/app/opt-out/page.tsx`)

- Single `Card` with centered text
- `mailto:` link styled with `font-medium text-primary`

---

## Phase 5: Component Migration

### Existing components to rewrite:

| Component | Key Changes |
|-----------|-------------|
| `AuthButtons.tsx` | Use shadcn `Button`, keep onClick logic |
| `CompanySearch.tsx` | Use `Input` + styled result rows + `Skeleton` for loading |
| `CompanyEntries.tsx` | Use `Card`, `Button`, `Select`, `Dialog` for report. Most complex rewrite. |
| `SubmitRecruiterForm.tsx` | Use `Label`+`Input`, `Popover`+`Command` for autocomplete, `Alert` for feedback |
| `AdminActions.tsx` | Use `Button`, replace `window.confirm()` with `Dialog` |
| `PurchaseCredits.tsx` | Use `Card`-based pricing tiles with `Button` |

### New components to create:

| Component | Purpose |
|-----------|---------|
| `Navbar.tsx` | Desktop navigation bar |
| `MobileNav.tsx` | Mobile Sheet navigation |
| `Footer.tsx` | Page footer |
| `CreditBadge.tsx` | Reusable amber credit badge |
| `CompanySearchCombobox.tsx` | Shared combobox for company autocomplete (used in search + submit) |

---

## Phase 6: Cleanup + Replace globals.css

- Replace all 265 lines of `src/app/globals.css` with Tailwind directives + shadcn CSS variables + custom theme overrides
- Remove all old CSS class references from every page/component
- No old classes should remain

---

## Complete File List

### New files:
- `DESIGN.md` — design system document
- `postcss.config.mjs` — PostCSS config
- `components.json` — shadcn config (auto-generated)
- `src/lib/utils.ts` — `cn()` helper (auto-generated)
- `src/components/ui/*.tsx` — ~20 shadcn components (auto-generated)
- `src/components/Navbar.tsx`
- `src/components/MobileNav.tsx`
- `src/components/Footer.tsx`
- `src/components/CreditBadge.tsx`
- `src/components/CompanySearchCombobox.tsx`

### Modified files:
- `package.json` — add tailwind, shadcn deps, lucide-react, cmdk, radix packages
- `src/app/globals.css` — complete replacement
- `src/app/layout.tsx` — Inter font, new nav/footer, Sonner
- `src/app/page.tsx` — landing redesign
- `src/app/dashboard/page.tsx` — dashboard redesign
- `src/app/submit/page.tsx` — submit redesign
- `src/app/company/[companyId]/page.tsx` — company detail redesign
- `src/app/admin/page.tsx` — admin redesign
- `src/app/opt-out/page.tsx` — opt-out redesign
- `src/components/AuthButtons.tsx` — shadcn Button
- `src/components/CompanySearch.tsx` — Input + styled rows
- `src/components/CompanyEntries.tsx` — Card + Button + Select + Dialog
- `src/components/SubmitRecruiterForm.tsx` — Label + Input + Command + Alert
- `src/components/AdminActions.tsx` — Button + Dialog
- `src/components/PurchaseCredits.tsx` — Card pricing tiles

### Unchanged:
- All `src/lib/` files (auth, credits, masking, prisma, etc.)
- All `src/app/api/` routes
- `prisma/schema.prisma`
- `wrangler.jsonc`, `open-next.config.ts`

---

## Verification

1. `npm run dev` — verify all 6 pages render correctly
2. Test responsive at 375px (mobile), 768px (tablet), 1280px (desktop)
3. Test auth flow: sign in → dashboard → search → company → unlock
4. Test submit flow: autocomplete → fill form → submit → success message
5. Test admin: stats visible, report resolve/dismiss, delete with dialog
6. `npm run deploy:build` — verify Cloudflare Workers build succeeds
7. `npx wrangler deploy` — deploy and verify production

---

## Implementation Notes (for coding agent)

- **Do NOT modify** any files in `src/app/api/`, `src/lib/`, or `prisma/`. Only UI files change.
- **Tailwind v4** uses CSS-based config, not `tailwind.config.js`. shadcn's latest init handles this.
- **Cloudflare Workers**: Tailwind + shadcn are build-time only. Run `npm run deploy:build` to verify. The build command is `npx @opennextjs/cloudflare build`.
- **Existing prop contracts must be preserved**. Server components pass data to client components — the shape of props (e.g., `RecruiterEntry` type in `CompanyEntries`, `CompanySearchResult` in `CompanySearch`) must not change.
- **`next/font/google`**: Import `Inter` in `layout.tsx`, assign to a variable, apply `className` to `<body>`. This self-hosts the font for edge compatibility.
- **Auth pattern**: Pages use `getServerSession(authOptions)` for server-side auth. Client components use `signIn`/`signOut` from `next-auth/react`. No `SessionProvider` wrapper exists or is needed — pass session data via props if the nav needs it.
- **Path alias**: `@/*` maps to `./src/*` (defined in `tsconfig.json`). shadcn init should detect this.
- The nav needs `creditBalance` and `isAdmin` — fetch these in `layout.tsx` via `getServerSession` + prisma query, pass to `Navbar`/`MobileNav` as props.



**Note**: The full design system is in `DESIGN.md` at the project root.
