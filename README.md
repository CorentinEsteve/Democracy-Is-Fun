## Votons Fun! (democracy-is-fun)

A web platform that helps communities make collective decisions in a fun, fair, and interactive way. Users can join multiple communities to propose, discuss, vote, and coordinate activities, with a clean Apple-inspired UI and a Node/Prisma backend.

---

### Features

- **Communities & Roles**
  - Create and manage multiple communities
  - Roles: **Admin** (manage community) and **Member** (participate)
  - Community settings: name, description, image

- **Chat**
  - Community-level chat feed
  - Auto-generated posts when proposals or events are created
  - Designed for future upgrade to real-time WebSockets

- **Proposals & Voting**
  - Create activity proposals with title, description, location, date/time, tags
  - Dynamic voting with 👍 / 👎 / ✋ (For / Against / Neutral)
  - Users can update their vote until the deadline
  - Quorum percentage & majority rules
  - Status: Active / Approved / Rejected / Tied
  - Edit & revision flow, plus oppositions (alternative proposals)
  - Archived proposals for history

- **Notes**
  - Community notes with collaborative editing
  - Simple list of shared notes per community

- **Events & Calendar**
  - Approved proposals become events
  - Event cards with title, date/time, location
  - ICS export endpoint ready for calendar sync (Google/Outlook/iCloud)

- **Gamification**
  - Points per approved proposal
  - Basis for leaderboards and playful competition

- **UX & Accessibility**
  - Clean, modern React UI (Radix UI + shadcn + Tailwind)
  - Responsive layout with three main panels (Communities / Center tools / Proposals)
  - Keyboard and ARIA-friendly components (where supported by libraries)

---

### Tech Stack

- **Frontend (`web/`)**
  - React 18, Vite, TypeScript
  - React Router
  - Tailwind CSS, shadcn/ui, Radix UI
  - React Hook Form + Zod
  - TanStack React Query
  - Testing: Vitest, Testing Library

- **Backend (`api/`)**
  - Node.js + Express
  - Prisma ORM with SQLite
  - JSON Web Tokens (JWT) for auth
  - Swagger UI for API docs
  - Testing: Jest + Supertest

---

### Project Structure

- **Root**
  - `web/` – React SPA frontend
  - `api/` – Node/Express REST API with Prisma
  - `.cursor/` – Cursor AI configuration and rules

- **Frontend (`web/`)**
  - `src/features/` – Feature-based slices (communities, chat, proposals, notes, events, etc.)
  - `src/features/[slice]/components` – Feature components
  - `src/features/[slice]/hooks` – Feature hooks
  - `src/features/[slice]/api` – API hooks and clients
  - `src/features/[slice]/pages` – Route-level pages
  - `src/features/[slice]/ui` – UI elements related to that slice

- **Backend (`api/`)**
  - `src/server.ts` – Express app bootstrap, route wiring, Swagger setup
  - `src/modules/[module]/controllers` – HTTP controllers
  - `src/modules/[module]/services` – Business logic
  - `src/modules/[module]/models` – Domain models (if any)
  - `src/modules/auth` – Authentication & JWT handling
  - `src/modules/community` – Communities & memberships
  - `src/modules/proposal` – Proposals, votes, oppositions
  - `src/modules/event` – Events from approved proposals
  - `src/modules/note` – Notes per community
  - `src/modules/chat` – Community chat routes
  - `prisma/schema.prisma` – Database schema & relations

---

### Prerequisites

- **Node.js**: v18+ (recommended)
- **npm** (or another Node package manager)
- **SQLite**: no separate server required; Prisma uses a local `dev.db` file

---

### Quick Start

#### 1. Clone the repository

```bash
git clone <your-repo-url> democracy-is-fun
cd democracy-is-fun
```

#### 2. Install dependencies

```bash
# Backend
cd api
npm install

# Frontend
cd ../web
npm install
```

#### 3. Configure environment variables

- **Backend (`api/.env`)**

The project already includes a minimal `.env`:

```env
DATABASE_URL="file:./dev.db"
```

For better security in development and production, add:

```env
JWT_SECRET="a-strong-random-secret"
PORT=3001
```

- **Frontend (`web/.env`)**

Already configured as:

```env
VITE_API_URL=http://localhost:3001
```

Adjust if you run the API on a different host or port.

#### 4. Run database migrations

From `api/`:

```bash
cd api
npm run migrate:dev
```

This will create/update the SQLite database according to `schema.prisma`.

(Optional) Inspect data with Prisma Studio:

```bash
npm run studio
```

#### 5. Start the backend (API)

From `api/`:

```bash
npm run dev
```

- Default URL: `http://localhost:3001`
- Health check: `GET /health`
- Swagger docs: `http://localhost:3001/docs`

#### 6. Start the frontend (Web)

In a separate terminal, from `web/`:

```bash
npm run dev
```

- Default URL: `http://localhost:5173`
- The app will communicate with the API using `VITE_API_URL`.

---

### Core Workflows

#### Authentication & Membership

- Users can sign up and log in via the backend `/auth` module.
- JWT tokens are issued and validated using a shared `JWT_SECRET`.
- Communities track memberships, roles (Admin/Member), and points.

#### Proposals & Voting

- Create proposals within a community (title, description, date/time, location, tags, deadline, quorum).
- Votes are stored per user & proposal, with vote type as a string (`For` / `Against` / `Neutral` or similar).
- Status computation is based on:
  - Quorum percentage
  - Majority (> 50% for approval vs rejection)
  - Special handling for ties and early-close conditions (logic can be extended).

#### Oppositions & Revisions

- **Edit** flow creates a new proposal linked as a revision of the original.
- **Oppose** flow creates alternative proposals, linked via the `Opposition` model.
- This allows multiple competing options to be voted on in parallel.

#### Events & Calendar

- Once a proposal is approved, a corresponding `Event` is created.
- Events are attached to both a proposal and a community.
- Calendar views in the UI show upcoming events and allow export to external calendars (via ICS).

#### Notes & Chat

- Notes: community-wide, editable entries for shared context or minutes.
- Chat: message stream per community; proposals and events can auto-post updates.

---

### Running Tests

#### Backend tests (API)

From `api/`:

```bash
npm test
```

- Runs TypeScript build then Jest tests.
- Uses Supertest for HTTP endpoint testing.

#### Frontend tests (Web)

From `web/`:

```bash
npm test
```

- Runs Vitest test suite.
- Uses React Testing Library for component behavior and DOM testing.

---

### API Overview

The Express server exposes (non-exhaustive):

- **General**
  - `GET /health` – simple liveness check
  - `GET /docs` – Swagger UI for API exploration

- **Auth**
  - `POST /auth/register`
  - `POST /auth/login`

- **Communities**
  - `GET /communities`
  - `POST /communities`
  - `GET /communities/:communityId`
  - Membership, roles, and points handled under community modules

- **Proposals**
  - `GET /communities/:communityId/proposals`
  - `POST /communities/:communityId/proposals`
  - `GET /proposals/:proposalId`
  - Voting, oppositions, revisions

- **Events**
  - `GET /communities/:communityId/events`
  - `GET /events/:eventId`

- **Notes**
  - `GET /communities/:communityId/notes`
  - `POST /communities/:communityId/notes`
  - `GET /notes/:noteId`

- **Chat**
  - Community chat routes under the chat module (mounted at root)

For full details, refer to the Swagger docs at `/docs`.

---

### Development Tips

- **CORS**: The backend enables CORS so the Vite dev server can call the API locally.
- **JWT secret**: For local development, you can keep a simple secret, but always use a strong, unique secret in production.
- **Database**: The project uses SQLite initially for convenience; switching to Postgres or another database only requires updating `schema.prisma` and `DATABASE_URL`, then re-running migrations.

---

### Roadmap / Next Steps

- Deadline visualization on proposal cards
- Full tie and early-close logic (backend + UI)
- Archived & oppositions tabs in the UI
- Real-time chat via WebSockets
- Leaderboards UI per community
- Advanced validations and empty states
- Calendar sync UX improvements
- Vote delegation and richer gamification

---

### License

- **Backend (`api/`)**: ISC (see `package.json`)
- **Frontend (`web/`)**: Private; intended for this project’s use  
Adjust or add a dedicated `LICENSE` file as needed for your deployment.
