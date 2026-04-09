# Navbar Hybrid Redesign Spec

Date: 2026-04-09
Owner: Codex + Vishnu
Status: Approved for implementation (pending written-spec review)

## 1. Goal
Redesign desktop and mobile navigation to match Hare's current hybrid visual language while preserving existing auth/data behavior.

The redesign must:
- Remove the old Aceternity-style button treatment.
- Keep the information architecture simple and unchanged where not explicitly approved.
- Reuse a small shared primitive layer for consistency across desktop and mobile nav.

## 2. Confirmed Product Decisions
These decisions are final for this task:
- Desktop logged-in navbar always shows: `Search + Submit + Credits + Avatar`.
- Navbar visual direction: hybrid (solid top bar + glass treatment on key pills/surfaces).
- Mobile nav is included in the same redesign pass.
- Admin remains menu-only (not a top-level nav link).
- Unauthenticated sign-in action gets restyled to the new nav button language now.
- `Search` is the only top-level primary accent pill.
- Credit display is restyled to match hybrid visuals while preserving current credit semantics.

## 3. Scope
### In scope
- `src/components/Navbar.tsx`
- `src/components/MobileNav.tsx`
- New nav primitive file(s) under `src/components/nav/`

### Out of scope
- `src/app/api/**`, `src/lib/**`, `prisma/**`
- Session/auth logic and prop contracts from `layout.tsx`
- Any non-navbar page content/layout
- Changing nav routing behavior

## 4. Architecture
### 4.1 Shared primitive layer
Add `src/components/nav/NavPrimitives.tsx` with reusable presentation components:
- `NavPrimaryPill`
- `NavTextLink`
- `NavCreditPill`
- `NavGhostButton`

Purpose:
- Centralize class vocabulary and interaction states.
- Avoid desktop/mobile style drift.
- Keep top-level nav components focused on behavior and routing.

### 4.2 Desktop navbar (`Navbar.tsx`)
- Keep existing layout structure and data props.
- Replace top-link/button styling with primitives:
  - `Search` -> `NavPrimaryPill`
  - `Submit` -> `NavTextLink`
  - credits -> `NavCreditPill`
  - avatar trigger -> `NavGhostButton`
- Keep dropdown menu structure and actions unchanged.
- Keep admin item menu-only.

### 4.3 Mobile navbar (`MobileNav.tsx`)
- Keep sticky header + sheet interaction.
- Apply same primitive language:
  - top-right sign-in/credit trigger style aligned with primitives
  - sheet links: `Search` gets primary emphasis, `Submit` stays secondary
- Keep admin in sheet list only for admins.
- Keep sign-out flow unchanged.

## 5. Visual + Interaction Specification
### 5.1 Navbar shell
- Keep readable shell: sticky with subtle border and backdrop blur.
- No heavy decorative effects on the full bar.

### 5.2 Primary link (`Search`)
- Glass-accent pill style with subtle depth.
- Active state: stronger contrast + subtle ring.
- Hover state: small contrast lift, no motion-heavy effect.

### 5.3 Secondary link (`Submit`)
- Text-forward style.
- Active state: foreground emphasis (weight/color), not a filled pill.

### 5.4 Credit surface
- Compact glass pill with amber accent emphasis for numeric value.
- Preserve current logic:
  - standard numeric credits for regular users
  - unlimited/admin semantics unchanged

### 5.5 Non-auth sign-in CTA
- Restyled to match nav primitives.
- Must stay visually distinct as the action button without looking disconnected from nav.

## 6. Accessibility Requirements
- Keep semantic elements (`<nav>`, `<button>`, `<a>`).
- Maintain visible focus states on all interactive controls.
- Preserve existing screen-reader labels (for menu triggers).
- Ensure touch targets on mobile remain at least current size.

## 7. Data/Behavior Contracts (must not change)
- `Navbar` and `MobileNav` prop shapes remain unchanged.
- `layout.tsx` data flow remains unchanged.
- Existing routes remain unchanged:
  - `/dashboard`
  - `/submit`
  - `/admin` (menu-only when admin)
- Sign-out callback remains `/`.

## 8. Verification Plan
After implementation:
1. `npm run lint`
2. `npm run build`
3. Manual check:
- Desktop logged-in: `Search + Submit + Credits + Avatar` visible.
- Desktop admin: admin appears only in dropdown.
- Desktop non-auth non-landing: sign-in CTA uses new style.
- Mobile logged-in: hybrid styling applied; search emphasized; submit secondary.
- Mobile admin: admin appears only in sheet list.
- No behavior regressions for navigation and sign-out.

## 9. Risks and Mitigations
- Risk: visual inconsistency between desktop and mobile.
  - Mitigation: shared primitives in one module.
- Risk: accidental behavior changes while restyling.
  - Mitigation: keep route/action handlers untouched and only replace presentational wrappers/classes.
- Risk: over-designed nav conflicting with "simple and to the point".
  - Mitigation: hybrid approach limits glass emphasis to key pills and keeps information density unchanged.

## 10. Implementation Readiness
This spec is implementation-ready for a single development pass.
