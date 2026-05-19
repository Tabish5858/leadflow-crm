# Contributing to LeadFlow

Thank you for your interest in contributing to LeadFlow! We welcome all contributions, big and small.

## Quick Start

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
   ```bash
   git clone https://github.com/YOUR_USERNAME/leadflow-crm.git
   cd leadflow-crm
   ```
3. **Set up** the project
   ```bash
   npm install
   cp .env.example .env.local
   # Fill in your Firebase credentials in .env.local
   npm run dev
   ```
4. **Create a branch** from `develop`
   ```bash
   git checkout develop
   git checkout -b feature/your-feature-name
   ```
5. **Make your changes** and commit using [Conventional Commits](https://www.conventionalcommits.org/)
   ```bash
   git commit -m "feat: add lead export to CSV"
   ```
6. **Push** to your fork and **open a PR** against the `develop` branch

## Branch Naming

| Type | Format | Example |
|------|--------|---------|
| Feature | `feature/description` | `feature/lead-export-csv` |
| Bug Fix | `fix/description` | `fix/kanban-drag-drop` |
| Chore | `chore/description` | `chore/update-dependencies` |
| Docs | `docs/description` | `docs/add-setup-guide` |
| Refactor | `refactor/description` | `refactor/firestore-service` |

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

**Examples:**
- `feat(leads): add bulk delete action`
- `fix(pipeline): resolve drag-drop state sync`
- `docs(readme): update installation steps`

## Code Style

- **TypeScript strict mode** — no `any` types
- **ESLint + Prettier** — run `npm run lint` and `npm run format` before committing
- **Components** — PascalCase, one component per file
- **Hooks** — camelCase with `use` prefix
- **Server Components** by default — use `"use client"` only when needed

## Pull Request Process

1. Ensure your branch is up to date with `develop`
2. Run `npm run lint`, `npm run typecheck`, and `npm run build` — all must pass
3. Open a PR against `develop` (not `main`)
4. Fill out the PR template completely
5. Wait for review — at least 1 approval required before merge
6. Address review comments and push updates
7. Once approved, a maintainer will merge your PR

## Reporting Issues

- Use the **Bug Report** template for bugs
- Use the **Feature Request** template for new ideas
- Search existing issues before creating a new one
- Include reproduction steps, screenshots, and environment details

## Development Workflow

```
main (stable releases)
  ↑
develop (integration branch)
  ↑
feature/*  fix/*  chore/*  (work branches)
```

1. All features branch from `develop`
2. PRs target `develop`
3. Releases merge `develop` → `main` with version tags

## Questions?

- Open a [Discussion](https://github.com/Tabish5858/leadflow-crm/discussions) for general questions
- Tag `@Tabish5858` in issues for maintainer attention

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
