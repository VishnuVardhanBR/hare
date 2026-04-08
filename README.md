# Hare

Credit-based recruiter email sharing platform for CS/tech students.

## Stack
- Next.js (App Router, TypeScript)
- Prisma + SQLite
- NextAuth (Google OAuth, `.edu` only)
- Stripe checkout for credit purchases

## MVP Implemented Here
- 5 core pages: landing, dashboard, company, submit, admin
- Google OAuth entrypoint (restricted to `.edu` in auth callback)
- Credit ledger (+1 signup, +5 verified submit, -1 unlock, +purchase)
- Submission verification pipeline (format + domain + MX + SMTP reachability)
- Company search endpoint and autocomplete UI
- Per-email unlock flow with masked pre-unlock display
- Report endpoint + admin pending report view
- Stripe checkout + webhook purchase crediting
- Seed script + CSV import script for cold start
- Recruiter opt-out page

## Setup
1. Install dependencies:
   - `npm install`
2. Copy env vars:
   - `cp .env.example .env`
3. Fill `.env` values for Google OAuth and Stripe.
   - Keep `ENABLE_CREDIT_PURCHASES="false"` to disable buying credits.
   - Set `ENABLE_CREDIT_PURCHASES="true"` later when you want to enable Stripe purchases.
4. Create database and Prisma client:
   - `npx prisma migrate dev --name init`
5. Seed starter data:
   - `npm run prisma:seed`
6. Start app:
   - `npm run dev`

## CSV Cold-Start Import
CSV headers expected:
- `company,domain,email,recruiter_name,title,department`

Run:
- `npm run seed:import -- /absolute/path/to/recruiters.csv`

## Notes
- SMTP mailbox-level verification is intentionally conservative for MVP: if MX/domain checks pass but mailbox cannot be confidently verified, submission is still accepted as "domain verified, mailbox unconfirmed".
- Add Stripe webhook forwarding locally when testing purchases:
  - `stripe listen --forward-to localhost:3000/api/stripe/webhook`
