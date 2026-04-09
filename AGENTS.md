# Hare - Implementation Context

Read `SPEC.md` for the full platform design. This file covers decisions, constraints, and gotchas that came up during design but aren't in the spec.

## What This Is

A credit-based recruiter email sharing platform for CS/tech students. Students share verified recruiter work emails to earn credits, spend credits to unlock emails others shared. Glassdoor's "give to get" model applied to recruiter contacts.

## Key Design Decisions (and why)

**Per-email unlock, not per-company.** The user explicitly chose this for monetization. 1 credit = 1 recruiter email revealed. Don't change this to per-company.

**MVP quality controls are intentionally minimal.** Automated verification on submit (format + domain + provider check) plus a manual "Report" button that goes to an admin panel. No automated flag thresholds, no reputation scores, no credit penalties. The user said the full flagging system was "too complex for MVP." These are listed as post-MVP in the spec.

**No passwords.** Google OAuth only, restricted to .edu email domains. First login auto-creates the account. Don't add a password-based auth flow.

**Blurred display strategy.** On company pages, show title and department in clear text but blur/mask the recruiter name and email. This lets students decide WHICH contact to unlock based on role relevance. e.g., "S***** Tech Recruiter | New Grad Team" is enough to decide.

**Credit economics are final for regular users.** +5 per verified submission, -1 per unlock. Admin accounts are the exception: admin unlocks do not deduct credits (enforced server-side in `/api/unlock`). Don't change this without asking.

## Things NOT in the Spec That Matter

**Cold start:** Admin bulk import is implemented. Use `/admin/bulk-upload` (API: `/api/admin/bulk-upload`) or `npm run seed:import` for scripted imports.

**Legal stance:** The user accepts the legal risk of sharing personal recruiter work emails. Still recommended to build a simple recruiter opt-out page (a basic form where a recruiter can request their email be removed). Low effort, good protection.

**Target audience:** CS/tech students at one university initially. The .edu restriction handles this, but the UI/copy should speak to tech recruiting specifically (not generic career advice).

**Monetization:** Stripe for credit purchases. The user wants this in the MVP. Example pricing: 10 credits/$3, 25/$5, 50/$8. These are starting points, not final.

## Technical Gotchas

**Email verification provider:** Abstract Email Reputation API is the default verification provider for user credit-earning submissions. `EMAIL_VERIFICATION_PROVIDER=smtp` is available as an operational fallback.

**SMTP verification has limits (fallback mode).** Google Workspace and other catch-all mail servers accept all addresses - you can't confirm the specific mailbox exists. For these, mark as "domain verified, mailbox unconfirmed" and move on.

**Rate-limit SMTP checks (fallback mode).** If you hammer corporate mail servers with verification requests, the app's IP gets blacklisted. Implement rate limiting per domain.

**Company name normalization matters.** "Apple", "Apple Inc", "Apple Inc." should all resolve to the same company. Build this into the company creation/search flow from the start.

**Duplicate detection is by exact email match only.** Don't try fuzzy matching on recruiter names or similar emails. Exact email string match = duplicate.

## Scope Boundaries

**Build these (MVP):**
- Core pages: Landing, Dashboard, Company Page, Submit Form, Admin Panel
- Support/admin pages: Opt-out page, Admin bulk CSV upload page
- Google OAuth with .edu restriction
- Credit system (earn, spend, purchase)
- Email verification pipeline (format + domain + provider validation)
- Company search with autocomplete
- Per-email unlock with blur/reveal
- Report button (sends to admin panel)
- Stripe integration for buying credits
- Admin panel for reviewing reports and managing emails
- Admin bulk CSV upload for recruiter contacts

**Don't build these (post-MVP):**
- Automated flag thresholds
- Submitter reputation scores
- Credit penalties for bad submissions
- Periodic re-verification
- Automated credit refunds
- Leaderboards, notifications, company pages with stats
- Mobile app

## Style & Frontend

The user emphasized "VERY SIMPLE AND TO THE POINT PLATFORM" multiple times. Keep the UI minimal. Don't over-design. The core loop is: search -> unlock -> submit -> repeat.

**Frontend redesign complete.** Design system at a glance:
- Color palette: blue primary, slate neutrals, amber credit accent
- Typography: Inter via `next/font/google`
- Component library: Tailwind CSS v4 + shadcn/ui (New York variant)
- Layout: `max-w-4xl` content container, sticky top nav, no footer

**Visual style: tasteful glassmorphism.** The landing logo marquee and dashboard search are the signature surfaces — keep them glassy. Signature patterns:
- Frosted container: `rounded-[2.5rem] border border-white/60 bg-white/55 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)]`
- Nested pill: `rounded-full border border-white/70 bg-white/80 backdrop-blur shadow-inner`
- Ambient glow: `pointer-events-none absolute -inset-6 rounded-[3rem] bg-gradient-to-r from-primary/15 via-sky-300/10 to-amber-200/10 blur-2xl`
- Chip affordance: `rounded-full border border-white/70 bg-white/70 backdrop-blur`
- Marquee edges fade via `mask-image: linear-gradient(...)`; track duplicates + `animate-marquee` keyframe in `globals.css`

This coexists with "VERY SIMPLE AND TO THE POINT" — glassmorphism applies to the *surface treatment*, not the information density. Don't pile on extra chrome, animations, or decorative elements. If you add a new primary surface, match these exact class strings so the look stays coherent.

**Critical implementation notes:**
- The previous "UI-only changes" rule was specific to the redesign phase and is no longer global. API/lib updates are allowed when required by product changes.
- Existing prop contracts between server and client components must be preserved.
- Auth pattern: `getServerSession(authOptions)` in server components, `signIn`/`signOut` from `next-auth/react` in client components. No `SessionProvider` wrapper.
- Nav needs `creditBalance` and `isAdmin` — fetch in `layout.tsx`, pass as props.
- Tailwind v4 uses CSS-based config (not `tailwind.config.js`). shadcn init handles this.

**Admin/Bulk upload details:**
- Admin access is controlled by `ADMIN_EMAILS` (comma-separated).
- Bulk upload CSV required headers: `company,domain,email,recruiter_name,title,department`
- Required fields per row: `company`, `domain`, `email`, `recruiter_name`
- Duplicate handling: exact email match is skipped.

## Deployment

**Platform:** Vercel (migrated from Cloudflare Workers — bundle size exceeded 3 MiB limit)
**Production URL:** https://hare.vishnuvardhanbr.com
**DNS:** Cloudflare A record `hare.vishnuvardhanbr.com` → `76.76.21.21` (DNS only, not proxied)

**Database:** Supabase PostgreSQL (project: `iqnphwkwnzdsjhlofyjx`)
**Auth:** NextAuth v4, Google OAuth, `.edu` emails only

**Deploy:** Push to `main` → GitHub Actions → Vercel CLI → production.
Required GitHub Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

**Key env vars (set in Vercel dashboard):**
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL`, `DIRECT_URL` (Supabase pooled + direct connection strings)
- `ADMIN_EMAILS` (comma-separated admin emails, e.g. `vbheemreddy@umass.edu,jerinthomas@umass.edu`)
- `ENABLE_CREDIT_PURCHASES`
- Stripe vars when purchases are enabled: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_10`, `STRIPE_PRICE_25`, `STRIPE_PRICE_50`
