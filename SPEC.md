# Hare - Recruiter Email Sharing Platform for Students

## Context

CS/tech students constantly collect recruiter emails through career fairs, LinkedIn, and networking - but this information stays siloed in personal inboxes, group chats, and scattered notes. Hare centralizes it into a searchable, credit-gated marketplace. Students contribute recruiter contacts they've collected and in return gain access to contacts others have shared. The credit system creates a self-sustaining growth loop: the more students contribute, the more valuable the platform becomes.

The platform launches at one university, targets CS/tech students, and aims for eventual monetization through direct credit purchases.

---

## Core Concept

A credit-based recruiter email exchange. Students share verified recruiter emails to earn credits, and spend credits to unlock emails shared by others. Think Glassdoor's "give to get" model, but for recruiter contact info.

---

## User Flow

### First-time User
1. **Land** on homepage → see pitch + "Sign in with .edu email" button
2. **Auth** via Google OAuth (restricted to .edu domains) → account auto-created with 1 free credit
3. **Dashboard** → search bar (center), credit balance (top), "Submit an Email" button
4. **Search** → type company name → see matching companies with contact count
5. **Company page** → see blurred recruiter entries showing title/department but hiding name/email → "Unlock for 1 credit" per entry
6. **Unlock** → credit deducted → reveals full entry (email, name, title, dept, submitter, last verified date)
7. **0 credits** → unlock buttons disabled, prominent "Submit an email to earn 5 credits" and "Buy credits" CTAs

### Returning User
Dashboard → search → unlock or submit. Minimal friction.

---

## Pages (5 total)

1. **Landing/Login** - One-line pitch, Google sign-in button
2. **Dashboard** - Search bar, credit balance, submit CTA
3. **Company Page** - List of blurred recruiter entries with per-email unlock buttons
4. **Submit Form** - Add a recruiter email (company, email, name, title, dept)
5. **Admin Panel** - View reports, manage emails, platform stats (maintainers only)

---

## Data Model

### Users
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | primary key |
| email | string | .edu email, unique |
| university | string | extracted from email domain |
| display_name | string | anonymous, e.g. @student_4a8f |
| credit_balance | integer | starts at 1 |
| status | enum | active, restricted, banned |
| created_at | timestamp | |

### Companies
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | primary key |
| name | string | canonical name (e.g., "Apple") |
| domain | string | primary domain (apple.com) |
| logo_url | string | nullable |
| aliases | string[] | alternate names for search |

### Recruiter Emails
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | primary key |
| company_id | fk | references companies |
| email | string | the recruiter's work email |
| recruiter_name | string | full name |
| title | string | nullable (e.g., "Senior Tech Recruiter") |
| department | string | nullable (e.g., "New Grad Engineering") |
| submitted_by | fk | references users |
| verification_status | enum | pending, verified, failed |
| last_verified_at | timestamp | last SMTP check |
| submitted_at | timestamp | |

### Unlocks
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | primary key |
| user_id | fk | references users |
| email_id | fk | references recruiter_emails |
| unlocked_at | timestamp | |
| unique constraint | | (user_id, email_id) |

### Transactions (credit ledger)
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | primary key |
| user_id | fk | references users |
| amount | integer | +5, -1, +20, etc. |
| type | enum | signup_bonus, submission, unlock, purchase, refund |
| reference_id | uuid | nullable, points to email/payment |
| created_at | timestamp | |

### Reports
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | primary key |
| reporter_id | fk | references users |
| email_id | fk | references recruiter_emails |
| reason | enum | bounced, wrong_person, not_recruiter, other |
| notes | text | nullable |
| status | enum | pending, resolved, dismissed |
| created_at | timestamp | |

---

## Credit System

### Earning & Spending
| Action | Credits |
|--------|---------|
| Sign up | +1 |
| Submit a verified recruiter email | +5 |
| Unlock one recruiter email | -1 |
| Purchase credits | varies |

### Paid Credits (monetization)
- Stripe integration for payments
- Example tiers: 10 credits / $3, 25 credits / $5, 50 credits / $8
- Students are price-sensitive - keep it cheap, aim for volume

### Economics
- 1 valid submission = 5 unlocks. Generous enough to drive submissions.
- Students with lots of recruiter contacts self-fund through submissions.
- Students without contacts to share (freshmen, career-switchers) are the paying customers.
- No cap on earning. Heavy contributors grow the database.

---

## Email Verification Pipeline

Runs on submission, 3 stages:

### Stage 1: Format Check (instant)
- Valid RFC 5322 email format
- Reject personal domains (gmail.com, yahoo.com, outlook.com, hotmail.com, etc.)
- Must be a corporate/organization domain

### Stage 2: Domain Check (instant)
- Domain has valid MX records
- Domain matches or is associated with the selected company
- Maintain a company → known domains mapping
- Unknown domains: accept with lower confidence, flag for admin review

### Stage 3: SMTP Deliverability Check (~1-3s)
- Connect to mail server, verify mailbox exists (without sending)
- Some servers (Google Workspace, catch-all) accept all addresses - mark as "domain verified, mailbox unconfirmed"
- Rate-limit checks to avoid IP blacklisting

### New Company Handling
- Submit form has company autocomplete from existing database
- If company doesn't exist, student can type a new company name + provide its domain
- New companies are auto-created and available for future searches immediately

### Duplicate Detection
- Exact email match → reject ("already in our database")
- Award no credits for duplicates

---

## Quality Controls (MVP)

**Automated (on submission):** Format + domain + SMTP verification as described above.

**Manual (post-submission):** Simple "Report" button on each recruiter entry. Reports go to admin panel for manual review. No automated thresholds, no reputation system, no credit penalties for MVP.

**Post-MVP additions (when volume demands it):**
- Automated flag thresholds (3 flags → review, 5 flags → removal)
- Submitter reputation scores & credit penalties
- Periodic re-verification (monthly SMTP re-check)
- Automated credit refunds for removed emails

---

## Authentication

- Google OAuth 2.0, restricted to .edu email domains
- On sign-in: check email ends with .edu → allow. Otherwise → reject with message.
- No passwords, no custom email verification flow
- Session-based auth with secure HTTP-only cookies
- First login auto-creates account with 1 credit

---

## Search

- Full-text search on company name + aliases
- Autocomplete dropdown as user types
- Results show: company name, number of contacts, company logo (if available)
- Click company → company page with individual recruiter entries

### Company Page Display (before unlock)
```
[Apple Logo]  Apple Inc.  -  23 recruiter contacts

J*** S****   |  Senior Tech Recruiter  |  New Grad Team    [Unlock - 1 credit]
M*** J****   |  University Recruiter   |  iOS Engineering   [Unlock - 1 credit]
R*** P****   |  Campus Recruiter       |  ML/AI Team        [Unlock - 1 credit]
...
```

Title and department visible. Name and email blurred. Enough info to choose which contact is most relevant.

### After Unlock
```
Jane Smith  |  Senior Tech Recruiter  |  New Grad Team
jane.smith@apple.com
Last verified: Mar 2026  |  Submitted by: @student_4a8f
```

---

## Legal Considerations

- Accepting risk of sharing personal recruiter work emails without consent
- Recommended safety valve: include a simple opt-out page where recruiters can request removal of their email (low effort, high protection)
- Terms of service should state: emails are user-submitted, platform doesn't guarantee accuracy, users agree not to spam

---

## Verification Plan

### How to test end-to-end:
1. **Auth flow:** Sign in with a .edu Google account, verify account creation + 1 credit
2. **Submit flow:** Submit a test recruiter email, verify all 3 verification stages run, verify +5 credits
3. **Search flow:** Search for the company, verify it appears with contact count
4. **Unlock flow:** Click unlock on a blurred entry, verify -1 credit, verify full details revealed
5. **Duplicate flow:** Submit the same email again, verify rejection
6. **0 credit state:** Spend all credits, verify unlock buttons are disabled, CTAs appear
7. **Report flow:** Click report on an entry, verify it appears in admin panel
8. **Payment flow:** Purchase credits via Stripe test mode, verify credit balance updates
