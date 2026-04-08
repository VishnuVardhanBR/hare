# Hare Design System

## Brand Identity

**Hare** is a credit-based recruiter email sharing platform for CS/tech students. The name references the animal — fast, resourceful, always moving — qualities that mirror students navigating the recruiting process.

### Brand Voice
- **Professional**: This is a career tool, not a social app
- **Direct**: No fluff, no marketing speak — students value efficiency
- **Trustworthy**: Handles sensitive contact data, must feel secure

### Logo
- **Mark**: Minimal rabbit silhouette in profile — clean geometric lines, no cartoon features
- **Style**: Think Puma's leaping cat or Lacoste's alligator — a professional brand mark
- **Wordmark**: "Hare" in Inter SemiBold, paired with the mark
- **Usage**: Nav bar (24px mark + wordmark), landing page (48px mark), favicon (mark only)
- **Color**: Primary blue on light backgrounds, white on dark backgrounds

---

## Color Palette

### Primary Colors

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Primary | `#1e40af` | `blue-800` | Buttons, links, brand accents |
| Primary Hover | `#1e3a8a` | `blue-900` | Button hover states |
| Primary Light | `#dbeafe` | `blue-100` | Subtle highlights, badge backgrounds |
| Primary Foreground | `#ffffff` | `white` | Text on primary backgrounds |

### Neutral Colors

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Background | `#f8fafc` | `slate-50` | Page background |
| Surface | `#ffffff` | `white` | Card backgrounds |
| Foreground | `#0f172a` | `slate-900` | Primary text |
| Muted | `#64748b` | `slate-500` | Secondary text, labels, placeholders |
| Muted Light | `#f1f5f9` | `slate-100` | Hover backgrounds, subtle fills |
| Border | `#e2e8f0` | `slate-200` | Card borders, dividers, input borders |

### Semantic Colors

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Destructive | `#dc2626` | `red-600` | Delete actions, errors, bounced status |
| Destructive Light | `#fef2f2` | `red-50` | Error alert backgrounds |
| Success | `#16a34a` | `green-600` | Verified status, success messages |
| Success Light | `#f0fdf4` | `green-50` | Success alert backgrounds |
| Accent | `#f59e0b` | `amber-500` | Credit count badges |
| Accent Light | `#fffbeb` | `amber-50` | Credit badge backgrounds |

### Design Rationale
- **Blue primary**: Universal trust color. LinkedIn, banking, enterprise SaaS all use blue because it communicates reliability and professionalism.
- **Slate neutrals**: Modern and clean. More refined than pure gray — the slight blue undertone adds warmth without feeling informal.
- **Amber for credits**: Creates a natural "currency" association (gold/coin) without explicit gamification. Distinct from all other semantic colors.

---

## Typography

### Font Family
- **Primary**: Inter (loaded via `next/font/google`, self-hosted for performance)
- **Fallback**: `ui-sans-serif, system-ui, -apple-system, sans-serif`
- **Monospace** (for emails): `ui-monospace, SFMono-Regular, Menlo, monospace`

### Type Scale

| Element | Size | Weight | Tailwind Class |
|---------|------|--------|----------------|
| Hero heading | 36px / 2.25rem | 700 Bold | `text-4xl font-bold` |
| Page heading | 24px / 1.5rem | 600 SemiBold | `text-2xl font-semibold` |
| Section heading | 18px / 1.125rem | 600 SemiBold | `text-lg font-semibold` |
| Body text | 16px / 1rem | 400 Regular | `text-base` |
| Small text | 14px / 0.875rem | 400 Regular | `text-sm` |
| Caption / Label | 14px / 0.875rem | 500 Medium | `text-sm font-medium` |
| Stat number | 24px / 1.5rem | 700 Bold | `text-2xl font-bold` |
| Email display | 14px / 0.875rem | 400 Regular | `text-sm font-mono` |

### Line Heights
- Headings: `leading-tight` (1.25)
- Body: `leading-normal` (1.5)
- UI elements: `leading-none` (1.0) for badges, buttons

---

## Component Library

### Framework
- **Tailwind CSS v4** for utility-first styling
- **shadcn/ui** (New York variant) for pre-built accessible components
- **Radix UI** primitives (installed via shadcn) for headless behavior
- **Lucide React** for icons

### shadcn Components Used

| Component | Where Used |
|-----------|------------|
| `Button` | CTAs, nav actions, form submits, unlock, report |
| `Card` | Content panels on every page |
| `Input` | Search bars, form text fields |
| `Label` | Form field labels |
| `Badge` | Credit count, contact count, verification status |
| `Table` | Admin reports and submissions lists |
| `Select` | Report reason dropdown |
| `Separator` | Footer divider, section breaks |
| `Alert` | Form success/error messages, zero credits warning |
| `Avatar` | User avatar in nav dropdown |
| `DropdownMenu` | User menu in nav (Dashboard, Submit, Admin, Sign Out) |
| `Command` | Company autocomplete combobox |
| `Dialog` | Delete confirmation modals |
| `Popover` | Autocomplete container, report form |
| `Sheet` | Mobile navigation slide-out |
| `Skeleton` | Search results loading state |
| `Sonner` | Toast notifications for async actions |

### Custom Components

| Component | Purpose |
|-----------|---------|
| `Navbar` | Desktop navigation bar with logo, links, credit badge, avatar menu |
| `MobileNav` | Hamburger trigger + Sheet with nav links |
| `Footer` | Simple footer with opt-out link and copyright |
| `CreditBadge` | Reusable amber badge showing credit count |
| `CompanySearchCombobox` | Shared autocomplete for company search (dashboard + submit form) |

---

## Layout System

### Container
- Max width: `max-w-4xl` (896px) for content pages
- Centering: `mx-auto`
- Horizontal padding: `px-4` (16px) on mobile, `px-6` (24px) on desktop

### Spacing Scale
- Section gaps: `space-y-8` (32px) between major sections
- Card internal: `p-6` (24px) padding
- Form field groups: `space-y-4` (16px)
- Label to input: `space-y-2` (8px)
- Tight groups: `space-y-1` (4px)

### Grid Patterns
- **Stats grid**: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4`
- **Pricing cards**: `grid grid-cols-1 sm:grid-cols-3 gap-4`
- **How it works**: `grid grid-cols-1 md:grid-cols-3 gap-6`
- **Form two-col**: `grid grid-cols-1 sm:grid-cols-2 gap-4`

### Responsive Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Default | 0-639px | Mobile: single column, hamburger nav, full-width cards |
| `sm` | 640px | Form fields go two-col, pricing cards go 3-col |
| `md` | 768px | Desktop nav replaces hamburger, "How it works" goes 3-col |
| `lg` | 1024px | Admin stats go 5-col |

---

## Navigation

### Desktop (md and up)
```
┌──────────────────────────────────────────────────────────────┐
│  [🐇 Hare]          [Dashboard] [Submit]   [12 ●] [JD ▾]   │
└──────────────────────────────────────────────────────────────┘
```
- Sticky: `sticky top-0 z-50`
- Background: `bg-white/95 backdrop-blur border-b`
- Left: Logo mark + "Hare" wordmark
- Center-right: Nav links as `text-sm font-medium text-slate-600 hover:text-slate-900`
- Right: Credit `Badge` (amber), `Avatar` with `DropdownMenu`
- Dropdown items: Dashboard, Submit, Admin (if admin), separator, Sign Out

### Mobile (below md)
- Left: Hamburger icon (Menu from lucide-react)
- Center: Logo
- Right: Credit `Badge`
- Hamburger opens `Sheet` from left with:
  - User name + email
  - Nav links (Dashboard, Submit, Admin)
  - Sign Out button at bottom

### Unauthenticated State
- Desktop: Logo left, "Sign in" `Button` right
- Mobile: Logo center, "Sign in" `Button` right

---

## Page Specifications

### Landing Page
- **Hero section**: Centered, no card wrapper
  - Heading: `text-4xl font-bold tracking-tight text-slate-900`
  - Subtitle: `text-lg text-slate-500 max-w-lg mx-auto`
  - CTA: `Button size="lg"` with Google icon
  - Note: `text-sm text-slate-400`
- **How it works**: Three `Card` components
  - Step number in `text-sm font-medium text-primary`
  - Title in `font-semibold`
  - Description in `text-sm text-muted-foreground`
- **Layout**: `text-center`, `space-y-16` between hero and how-it-works

### Dashboard
- **User panel**: `Card` with `flex justify-between items-center`
  - Left: greeting text + `CreditBadge`
  - Right: Submit `Button variant="default"`
- **Search section**: `Card` with padded content
  - `Input` with search icon (lucide `Search`)
  - Results: `div` with `divide-y`, each row is `flex justify-between items-center py-3 hover:bg-slate-50 rounded-lg px-3 cursor-pointer`
  - Company name: `font-medium`, Count: `Badge variant="secondary"`
  - Loading: `Skeleton` rows
- **Credit purchase**: Conditional on feature flag
  - Three `Card` with `text-center`, amount in `text-2xl font-bold`, price in `text-muted-foreground`, `Button` CTA
- **Popular companies**: `Card` with horizontal list of company links

### Submit Page
- **Header**: Outside card, `text-2xl font-semibold` + `text-muted-foreground`
- **Form card**: `Card` wrapping a `form` element
  - Company name: `Popover` + `Command` combobox
  - Two-col grid: company domain + recruiter name
  - Full-width: work email
  - Two-col grid: title + department (optional)
  - Submit `Button` with `w-full sm:w-auto`
- **Feedback**: `Alert` below form

### Company Detail
- **Back link**: `text-sm text-muted-foreground hover:text-foreground` with `ArrowLeft` icon
- **Header**: `text-2xl font-bold` company name, `text-muted-foreground` contact count
- **Stats row**: `CreditBadge` + unlock progress
- **Entry cards**: `Card` per entry
  - Locked: blur effect on name/email, unlock `Button`
  - Unlocked: full details with green check, verification date, report `Popover`
- **Zero credits**: `Alert` with submit link

### Admin Page
- **Stats grid**: Five `Card` components with number + label
- **Reports**: `Table` with action `Button`s, delete `Dialog`
- **Submissions**: `Table` with status `Badge`, delete `Dialog`

### Opt-Out Page
- Single centered `Card`, `max-w-lg mx-auto`
- `mailto:` link in `font-medium text-primary`

---

## Interaction Patterns

### Buttons
- **Default**: Blue background, white text. Hover: darker blue.
- **Secondary**: Slate-100 background, slate-900 text. Hover: slate-200.
- **Ghost**: Transparent, slate-600 text. Hover: slate-100 background.
- **Destructive**: Red-600 background, white text. For delete only.
- **Disabled**: `opacity-50 cursor-not-allowed`
- **Loading**: `Loader2` icon spinning + text

### Forms
- Labels above inputs, `text-sm font-medium`
- Required fields: validate on submit, no asterisks
- Optional fields: labeled "(optional)" in muted text
- Error state: `border-red-500` on input, `text-sm text-red-600` below

### Search
- Debounced input (250ms)
- Loading: `Skeleton` rows
- Empty: centered muted text
- Results: hover effect, click navigates

### Unlock Flow
1. Click "Unlock · 1 credit"
2. Button shows loading spinner
3. Success: card updates with full data
4. Error: `toast.error()` via Sonner
5. Credit count updates locally

### Toasts (Sonner)
- Position: bottom-right
- Auto-dismiss: 4 seconds
- Used for: unlock success, report success, API errors

---

## Accessibility

- All interactive elements keyboard-navigable (shadcn/Radix)
- Focus visible rings: `ring-2 ring-primary/50`
- Color contrast: WCAG AA compliant
- Form labels properly associated via `htmlFor`
- Command combobox: arrow-key navigation, escape to close
- Dialog/Sheet: focus trap, escape to close
- Semantic HTML: `<nav>`, `<main>`, `<header>`, `<footer>`, heading hierarchy
- `aria-label` on icon-only buttons
