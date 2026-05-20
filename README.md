# LeadFlow CRM

> Open-source CRM & Time Tracker built with Next.js 15 and Firebase

A modern, lightweight CRM for freelancers, small teams, and agencies. Manage leads, track outreach, automate follow-ups, and analyze performance — without vendor lock-in or expensive subscriptions.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Firebase](https://img.shields.io/badge/Firebase-BaaS-orange)

## Features

- **Lead Management** — Full CRUD with list, Kanban, and detail views
- **Pipeline Board** — Drag-and-drop Kanban with customizable stages
- **Time Tracking** — Per-lead timer, manual entries, billable tracking
- **Activity Timeline** — Log calls, emails, meetings, and notes
- **Analytics Dashboard** — Charts for conversion, revenue, and activity
- **Automation Rules** — Trigger actions based on lead events
- **Dark Mode** — Full dark/light theme support
- **Responsive** — Works on desktop, tablet, and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS 3.x + shadcn/ui |
| State | Zustand 4.x |
| Database | Firestore (Firebase) |
| Auth | Firebase Auth |
| Storage | Firebase Storage |
| Functions | Firebase Cloud Functions |
| Charts | Recharts 2.x |
| DnD | @dnd-kit |
| Forms | React Hook Form + Zod |

## Getting Started

### Prerequisites

- **Node.js** 22+
- **npm** 10+
- A **Firebase project** (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Tabish5858/leadflow-crm.git
   cd leadflow-crm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Firebase credentials from the [Firebase Console](https://console.firebase.google.com/).

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Firebase Setup

1. Create a new project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** (Email/Password, Google, GitHub)
3. Create a **Firestore Database** (start in production mode)
4. Enable **Storage** for file uploads
5. Copy your config into `.env.local`
6. Deploy the security rules from `firestore.rules`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run test` | Run tests |

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

### Quick Start for Contributors

1. Fork the repo
2. Create a branch from `develop`: `git checkout -b feature/your-feature`
3. Make changes and commit with [Conventional Commits](https://www.conventionalcommits.org/)
4. Push and open a PR against `develop`

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/              # Firebase, utils, hooks, stores
├── types/            # TypeScript definitions
└── styles/           # Global styles
```

## Roadmap

- [x] PRD & Architecture
- [ ] Phase 1: MVP (Lead CRUD, Kanban, Time Tracking, Dashboard)
- [ ] Phase 2: Automation, Email Integration, Advanced Analytics
- [ ] Phase 3: Multi-workspace, API, Mobile App

See [PRD.md](PRD.md) for the full product requirements.

## License

[MIT](LICENSE) — Free for personal and commercial use.

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Firebase](https://firebase.google.com/) for the backend infrastructure
- [Next.js](https://nextjs.org/) for the framework

---

Built for freelancers and small teams everywhere.
