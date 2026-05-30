# LeadFlow CRM

Open-source customer relationship management and time tracking platform for freelancers, small teams, and agencies. Built with Next.js 15 on Firebase.

Manage leads, track outreach, schedule meetings, automate follow-ups, and analyze sales performance without vendor lock-in or expense.

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" />
  <img src="https://img.shields.io/badge/Next.js-15-black" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-blue" alt="TypeScript 5.8" />
  <img src="https://img.shields.io/badge/Firebase-BaaS-orange" alt="Firebase" />
  <img src="https://img.shields.io/badge/React-19-61DAFB" alt="React 19" />
</p>

## Features

| Module | Capabilities |
|--------|-------------|
| **Lead Management** | CRUD with real-time sync, Kanban board, advanced filters, lead scoring (0-100), CSV import, bulk operations, duplicate detection, custom fields |
| **Pipeline** | Drag-and-drop Kanban with customizable stages, colors, probabilities, and WIP limits |
| **Meetings & Scheduling** | Public booking pages with timezone-aware slot selection, meeting types (30/45/60 min), calendar sync, Google Meet creation, conflict detection, booking questions, confirmation redirect |
| **Calendar** | Month/week/day views integrated into Meetings page, create/edit/delete events, Google Calendar OAuth, upcoming events on dashboard |
| **Notifications** | Real-time in-app notification bell with unread count badge, mark all read, delete individual notifications, color-coded icons by type (meeting, message, system) |
| **Analytics** | KPI cards, time-series charts, pipeline/revenue/source distributions, conversion funnel, industry breakdown, PDF export |
| **Time Tracking** | Live stopwatch, manual entries, per-lead association, billable tracking, daily grouped view, real-time Firestore sync |
| **Messaging** | Real-time chat (lead + team), reply threading, read receipts (double checkmarks), reactions, file attachments, Google Meet integration, auto-open last conversation, sidebar unread badge |
| **Automation** | Trigger/action engine (5 triggers, 5 actions), enable/disable per rule, full CRUD |
| **Documents** | Cloudinary upload, preview, type icons, 10MB limit, per-lead/per-workspace organization |
| **Email** | Resend integration, open/click tracking (pixel + link rewrite), email history, draft management |
| **Workspaces** | Multi-workspace with membership, roles (Owner/Admin/Member/Viewer), email invite system, audit logging |
| **User Profile** | Editable display name and photo URL, synced across workspace member views |
| **Customization** | 18 accent colors, dark/light mode, custom pipeline stages, custom lead fields |
| **Auth** | Email/password, Google, GitHub (Firebase Auth), auth guard on all routes, custom password reset with Firestore tokens |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.8 (strict) |
| UI | React 19, Tailwind CSS 4, shadcn/ui (20+ primitives) |
| State | Zustand 5, TanStack Query 5 |
| Database | Firestore (Firebase) — real-time listeners |
| Auth | Firebase Auth (Email, Google, GitHub) + Firebase Admin SDK |
| Storage | Cloudinary (documents), Firebase Storage (fallback) |
| Email | Resend (transactional) |
| Calendar | Google Calendar API / Google Meet |
| Scheduling | n8n Workflow SDK (meeting booking workflows) |
| Charts | Recharts 2 (line, bar, pie, donut, funnel) |
| Drag/Drop | @dnd-kit (core, sortable, utilities) |
| Tables | TanStack Table 8 |
| Forms | React Hook Form 7 + Zod 3 |
| Testing | Vitest 4 + Testing Library |
| CI/CD | GitHub Actions (lint, typecheck, build, Firestore deploy) |
| Deploy | Vercel (frontend + serverless functions) |

---

## Quick Start

### Prerequisites

- Node.js 22+, npm 10+
- Firebase project (free Spark plan)
- Resend, Cloudinary, Google Cloud accounts (for full features)

### Installation

```bash
git clone https://github.com/Tabish5858/leadflow-crm.git
cd leadflow-crm/leadflow
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Configure `.env.local` with these values (see `.env.example` for the full template):

| Variable | Required For |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_*` (6 vars) | Firebase Auth, Firestore, Storage |
| `FIREBASE_ADMIN_*` (3 vars) | Admin SDK for API routes |
| `NEXT_PUBLIC_APP_URL` | OAuth redirects, invite links |
| `RESEND_API_KEY` | Email sending |
| `CLOUDINARY_*` (3 vars) | Document/file storage |
| `GOOGLE_*` (4 vars) | Calendar integration, Google Meet |

### Firebase Setup

1. Enable Authentication (Email/Password, Google, GitHub)
2. Create Firestore database (production mode)
3. Enable Storage
4. Deploy security rules: `firestore.rules`
5. Deploy indexes: `firestore.indexes.json`

---

## Project Structure

```
leadflow/
├── src/app/                  # Next.js App Router
│   ├── (auth)/               # Login, Register, Forgot/Reset Password
│   ├── (dashboard)/          # Dashboard, Leads, Pipeline, Analytics,
│   │                         # Time Tracker, Messages, Meetings, Automations, Settings
│   ├── b/[token]/            # Public meeting booking pages
│   ├── invite/accept/        # Workspace invite acceptance
│   └── api/                  # API routes (email, documents, calendar, meetings, auth, workspace)
├── src/components/
│   ├── ui/                   # shadcn/ui primitives
│   ├── leads/                # Lead form, detail, filters, score badge, CSV import,
│   │                         #   documents, email composer, activity timeline
│   ├── pipeline/             # Kanban board, column, card
│   ├── meetings/             # Meeting type dialog, calendar tab, booking questions,
│   │                         #   public booking page client
│   ├── messages/             # Conversation list, message thread, input, reply threading,
│   │                         #   read receipt indicators, sidebar unread badge
│   ├── notifications/        # Notification bell with dropdown, real-time listener
│   ├── automations/          # Automation builder
│   ├── settings/             # Pipeline editor, custom fields editor, calendar connection
│   ├── shared/               # Page header, stat card, status badge, export button, empty state
│   ├── skeletons/            # Loading placeholders (card, chart, table, list)
│   └── workspace/            # Workspace switcher, invite dialog
├── src/lib/
│   ├── firebase/             # DB operations (leads, messages, workspaces, automations,
│   │                         #   activities, emails, meetings, notifications)
│   ├── stores/               # Zustand stores (leadStore, timeTrackingStore)
│   ├── hooks/                # useAuth hook
│   ├── schemas/              # Zod validation schemas
│   ├── constants/            # Pipeline stages, sources, niches
│   ├── utils/                # cn(), formatCurrency(), dates, etc.
│   ├── calendar.ts           # Google Calendar OAuth + API
│   ├── cloudinary.ts         # Cloudinary config
│   ├── csv.ts                # CSV parsing/generation
│   ├── email-templates.ts    # HTML email templates
│   ├── email-tracking.ts     # Tracking pixel and link rewriting
│   ├── export.ts             # CSV/Excel/PDF export
│   ├── lead-filters.ts       # Filter state with URL sync
│   ├── lead-scoring.ts       # Scoring algorithm
│   └── audit-log.ts          # Audit trail
├── src/types/                # TypeScript interfaces (User, Lead, Workspace, etc.)
├── src/contexts/             # Workspace context, Accent color context, header actions
├── firestore.rules           # Security rules with role-based access
├── firestore.indexes.json    # Composite indexes
├── .env.example              # Environment variable template
├── CONTRIBUTING.md           # Contribution guidelines
├── CODE_OF_CONDUCT.md        # Code of conduct
└── SECURITY.md               # Security policy
```

---

## API Routes

All routes are serverless functions deployed via Vercel.

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| POST | `/api/email/send` | Send email via Resend with tracking | Firebase Auth |
| GET/POST | `/api/email/test` | Test email configuration | None (dev) |
| GET | `/api/email/track/open/[id]` | Open tracking pixel (1x1 GIF) | Public |
| GET | `/api/email/track/click/[id]` | Click tracking redirect | Public |
| POST | `/api/documents/upload` | Upload to Cloudinary | Firebase Auth |
| GET/DELETE | `/api/documents/list` | List/delete documents | Firebase Auth |
| GET | `/api/auth/google` | Initiate Calendar OAuth | Firebase Auth |
| GET | `/api/auth/google/callback` | OAuth callback handler | OAuth |
| GET/POST/DELETE | `/api/calendar/events` | Calendar event CRUD | Firebase Auth |
| GET | `/api/calendar/status` | Calendar connection status | Firebase Auth |
| POST | `/api/meetings/instant` | Create Google Meet | Firebase Auth |
| GET | `/api/meetings/types` | List meeting types | Firebase Auth |
| POST | `/api/meetings/types` | Create meeting type | Firebase Auth |
| PUT | `/api/meetings/types/[id]` | Update meeting type | Firebase Auth |
| DELETE | `/api/meetings/types/[id]` | Delete meeting type | Firebase Auth |
| GET | `/api/meetings/book/[token]` | Public booking page data | Public |
| POST | `/api/meetings/book/[token]` | Book a meeting (public) | Public |
| POST | `/api/meetings/schedule` | Schedule meeting (internal) | Firebase Auth |
| POST | `/api/workspaces/invite` | Send workspace invite | Firebase Auth |
| POST | `/api/workspaces/invite/accept` | Accept invite (Admin SDK) | Firebase Auth |
| GET/POST | `/api/auth/forgot-password` | Custom password reset | Public |

---

## Firestore Collections

| Collection | Description |
|------------|-------------|
| `leads` | Lead records with pipeline status, value, source |
| `activities` | Per-lead activity timeline |
| `audit_logs` | Workspace audit trail |
| `emails` | Email history with tracking |
| `email_events` | Open/click tracking events |
| `documents` | Cloudinary document metadata |
| `automations` | Automation rule configurations |
| `timeEntries` | Time tracking records |
| `conversations` | Message conversations with unread counts |
| `messages` | Individual messages with reactions, read receipts, reply threading |
| `meetings` | Meeting records (Google Meet, internal, public booking) |
| `meeting_types` | Reusable meeting type templates (duration, questions, scheduling rules) |
| `notifications` | In-app notifications (meeting, message, system alerts) |
| `workspaces` | Workspace configuration, member roles |
| `workspace_invites` | Pending invitations |
| `users` | User profiles with displayName, photoURL |
| `password_reset_tokens` | Self-managed password reset tokens |

---

## Lead Scoring Algorithm

The scoring engine in `src/lib/lead-scoring.ts` computes a 0-100 score per lead:

| Component | Weight | Inputs |
|-----------|--------|--------|
| Deal Value | 30 pts | Normalized against workspace max |
| Activity Recency | 25 pts | Last activity timestamp |
| Pipeline Stage | 25 pts | Stage probability percentage |
| Email Engagement | 10 pts | Open/click rate |
| Notes Presence | 10 pts | Has notes or not |

---

## Security

LeadFlow follows defense-in-depth security:

| Layer | Protection |
|-------|-----------|
| **Edge** | Cloudflare WAF (OWASP Core Ruleset, rate limiting, bot management, DDoS protection) |
| **Database** | Firestore security rules with role-based access — `canWrite()`, `getWorkspaceRole()`, `canManageWorkspace()`, owner-only operations |
| **Application** | Server Action re-authorization, Admin SDK confined to API routes, `server-only` guards on data access, input validation with Zod |
| **Auth** | Firebase Auth with optional MFA, custom password reset tokens (1hr expiry), rate-limited invite acceptance |
| **Audit** | Full audit trail (who, what, when) on all mutations |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run typecheck` | TypeScript check |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Coverage report |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Workflow: Fork → Branch from `develop` → Conventional Commits → PR to `develop`.

Open issues: [github.com/Tabish5858/leadflow-crm/issues](https://github.com/Tabish5858/leadflow-crm/issues)

### Priority Areas

- Test coverage expansion
- E2E tests with Playwright
- Gmail OAuth integration
- PWA / offline mode
- Docker configuration
- Next.js 16 upgrade (pending CVEs)
- App Check enforcement
- CSP headers

---

## License

[MIT](LICENSE) — Free for personal and commercial use.
