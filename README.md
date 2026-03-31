# gitlaw

Git-native tooling for legal documents in a TypeScript monorepo.

## Overview

`gitlaw` is organized into three workspace packages:

- `@gitlaw/core`: document model, schema validation, parsing, diffing, workflow, and audit utilities
- `@gitlaw/cli`: command-line interface built with oclif
- `@gitlaw/web`: Next.js web UI for browsing documents

## Repository Layout

```text
.
├── packages/
│   ├── core/
│   ├── cli/
│   └── web/
├── docs/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Prerequisites

- Node.js
- pnpm `9.15.4` (via Corepack)

## Getting Started

```bash
corepack enable
pnpm install
```

## Workspace Commands (root)

```bash
pnpm build     # turbo build
pnpm test      # turbo test
pnpm lint      # turbo lint
pnpm clean     # turbo clean
```

## Package-level Commands

### Core

```bash
pnpm --filter @gitlaw/core build
pnpm --filter @gitlaw/core test
```

### CLI

```bash
pnpm --filter @gitlaw/cli build
pnpm --filter @gitlaw/cli test
```

### Web

```bash
pnpm --filter @gitlaw/web dev
pnpm --filter @gitlaw/web build
pnpm --filter @gitlaw/web start
```

## CLI Command Surface

Implemented command topics under `packages/cli/src/commands` include:

- `init`
- `new`
- `status`
- `diff`
- `redline`
- `review request`
- `review approve`
- `review reject`
- `review status`
- `audit log`
- `audit verify`
- `audit export`
- `clause add`
- `clause list`

## Web App Data Source

The web package reads documents from the current working directory by default.

To point it at a specific repository path, set:

```bash
GITLAW_REPO_DIR=/absolute/path/to/repo
```

## License

See [`LICENSE`](./LICENSE).
