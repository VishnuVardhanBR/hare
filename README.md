# Hare

Credit-based recruiter email sharing platform for CS/tech students.

## Stack
- Next.js (App Router, TypeScript)
- Prisma + PostgreSQL (Supabase-compatible)
- NextAuth (Google OAuth, `.edu` only)
- Stripe checkout for credit purchases
- Tailwind CSS v4 + shadcn/ui (New York, Slate)

## MVP Features
- Landing, dashboard, company, submit, admin, opt-out pages
- Google OAuth sign-in (restricted to `.edu` in auth callback)
- Credit ledger (`+1` signup, `+5` verified submit, `-1` unlock, `+purchase`)
- Verification pipeline (format + domain + MX + SMTP reachability)
- Company search with autocomplete and per-email unlock flow
- Report flow to admin panel
- Stripe checkout + webhook purchase crediting
- CSV import script for cold-start data seeding

## Local Setup
1. Install dependencies:
   - `npm install`
2. Copy env vars:
   - `cp .env.example .env`
3. Fill `.env` values.
4. Run migrations:
   - `npx prisma migrate dev --name init`
5. Seed starter data (optional):
   - `npm run prisma:seed`
6. Start app:
   - `npm run dev`

## Environment Variables
Required in production:
- `DATABASE_URL` (Supabase pooled connection for runtime)
- `DIRECT_URL` (Supabase direct connection for Prisma CLI/generate)
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ADMIN_EMAILS`
- `ENABLE_CREDIT_PURCHASES`

Stripe (required only when purchases are enabled):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_10`
- `STRIPE_PRICE_25`
- `STRIPE_PRICE_50`

Email verification tuning (optional):
- `SMTP_MIN_INTERVAL_MS` (default `5000`)
- `SMTP_CONNECT_TIMEOUT_MS` (default `4500`)
- `SMTP_MAX_MX_HOSTS` (default `3`)
- `EMAIL_DNS_CACHE_TTL_MS` (default `600000`)
- `EMAIL_DNS_NEGATIVE_CACHE_TTL_MS` (default `120000`)

## Deploy: Vercel + Supabase
1. Link Vercel project and add env vars:
   - `npx vercel link`
   - `npx vercel env add DATABASE_URL production`
   - `npx vercel env add DIRECT_URL production`
   - `npx vercel env add NEXTAUTH_URL production`
   - `npx vercel env add NEXTAUTH_SECRET production`
   - `npx vercel env add GOOGLE_CLIENT_ID production`
   - `npx vercel env add GOOGLE_CLIENT_SECRET production`
   - `npx vercel env add ADMIN_EMAILS production`
   - `npx vercel env add ENABLE_CREDIT_PURCHASES production`
2. Deploy:
   - `npm run deploy:vercel`
3. Add domain to project:
   - `npx vercel domains add hare.vishnuvardhanbr.com`
4. In Cloudflare DNS (zone: `vishnuvardhanbr.com`) add:
   - Type: `A`
   - Name: `hare`
   - IPv4: `76.76.21.21`
   - Proxy status: `DNS only`
5. After DNS verifies in Vercel:
   - Set `NEXTAUTH_URL=https://hare.vishnuvardhanbr.com`
   - Redeploy: `npm run deploy:vercel`
6. Google OAuth (Cloud Console):
   - Authorized redirect URI: `https://hare.vishnuvardhanbr.com/api/auth/callback/google`
7. Stripe webhook (if enabled):
   - Endpoint: `https://hare.vishnuvardhanbr.com/api/stripe/webhook`

## CSV Cold-Start Import
Expected CSV headers:
- `company,domain,email,recruiter_name,title,department`

Run:
- `npm run seed:import -- /absolute/path/to/recruiters.csv`

## Notes
- SMTP mailbox-level verification is intentionally conservative for MVP: if MX/domain checks pass but mailbox cannot be confidently verified, submission is accepted as domain-verified.
- Local Stripe webhook forwarding:
  - `stripe listen --forward-to localhost:3000/api/stripe/webhook`
