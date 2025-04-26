# Votons Fun! - API Documentation

This document provides an overview of the Node.js + Express + Prisma backend API for the Votons Fun! application.

## Table of Contents

1.  [Modules](#modules)
    *   [Health Check](#health-check)
    *   [Auth](#auth)
    *   [Community](#community)
    *   [Proposal](#proposal)
    *   [Event](#event)
    *   [Note](#note)
2.  [Prisma Schema](#prisma-schema)
3.  [Environment Variables](#environment-variables)
4.  [Running the API](#running-the-api)
    *   [Development](#development)
    *   [Database Migrations](#database-migrations)
    *   [Testing](#testing)

## Modules

The API is organized into modules, each handling a specific domain of the application.

### Health Check

*   **Purpose:** Simple endpoint to check if the API is running.
*   **Routes:**
    *   `GET /health`
*   **Controllers:** Inline handler in `server.ts`.
*   **Services:** N/A
*   **Models:** N/A

### Auth

*   **Purpose:** Handles user registration and login.
*   **Routes (`/auth`):**
    *   `POST /signup`
    *   `POST /login`
*   **Controllers (`authController.ts`):**
    *   `signup` (or `register` if the controller method name differs from route)
    *   `login`
*   **Services (`authService.ts`):**
    *   `registerUser` (or equivalent for signup)
    *   `loginUser`
*   **Models:** `User`

### Community

*   **Purpose:** Manages communities and memberships (CRUD).
*   **Routes (`/communities`):**
    *   `POST /` (Create community)
    *   `GET /` (List user's communities)
    *   `GET /:id` (Get community details)
    *   `PUT /:id` (Update community)
    *   `DELETE /:id` (Delete community)
    *   `POST /:id/members` (Add member - *assuming based on standard practice*)
    *   `DELETE /:id/members/:userId` (Remove member - *assuming based on standard practice*)
    *   `GET /:id/members` (List members - *assuming based on standard practice*)
    *   *(Nested routes for proposals, events, notes - see respective modules)*
*   **Controllers (`communityController.ts`):**
    *   `createCommunity`
    *   `listCommunities`
    *   `getCommunity`
    *   `updateCommunity`
    *   `deleteCommunity`
    *   `addMember` (*assuming*)
    *   `removeMember` (*assuming*)
    *   `listMembers` (*assuming*)
*   **Services (`communityService.ts`):**
    *   `createCommunity`
    *   `findUserCommunities`
    *   `findCommunityById`
    *   `updateCommunityDetails`
    *   `deleteCommunityById`
    *   `addMemberToCommunity` (*assuming*)
    *   `removeMemberFromCommunity` (*assuming*)
    *   `findCommunityMembers` (*assuming*)
    *   `isUserMember`
    *   `isUserAdmin`
*   **Models:** `Community`, `Membership`, `User`

### Proposal

*   **Purpose:** Manages activity proposals and voting.
*   **Routes:**
    *   Mounted on `/communities/:communityId/proposals`:
        *   `POST /` (Create proposal)
        *   `GET /` (List community proposals)
    *   Mounted on `/proposals`:
        *   `GET /:id` (Get proposal details)
        *   `POST /:id/vote` (Cast a vote on a proposal)
*   **Controllers (`proposalController.ts`):**
    *   `createProposal`
    *   `listCommunityProposals`
    *   `getProposal`
    *   `castVote`
*   **Services (`proposalService.ts`):**
    *   `createProposal`
    *   `findProposalsByCommunity`
    *   `findProposalById`
    *   `addVote`
    *   `canUserVote` (Permission check)
*   **Models:** `Proposal`, `Vote`, `User`, `Community`, `Membership`, `Event` (creation on approval), `Opposition` (*if implemented*)

### Event

*   **Purpose:** Manages events derived from approved proposals, including calendar export.
*   **Routes:**
    *   Mounted on `/communities/:communityId/events`:
        *   `GET /` (List community events)
    *   Mounted on `/events`:
        *   `GET /:id/ics` (Export event details as iCal file)
*   **Controllers (`eventController.ts`):**
    *   `listCommunityEvents`
    *   `exportEventIcs` (or `getEvent` if it handles ICS export)
*   **Services (`eventService.ts`):**
    *   `findEventsByCommunity`
    *   `findEventById`
    *   `generateIcsForEvent` (or handled within `findEventById`)
*   **Models:** `Event`, `Proposal`, `Community`

### Note

*   **Purpose:** Manages collaborative notes within a community.
*   **Routes:**
    *   Mounted on `/communities/:communityId/notes`:
        *   `POST /` (Create note)
        *   `GET /` (List community notes)
    *   Mounted on `/notes`:
        *   `PATCH /:id` (Update note content)
        *   `DELETE /:id` (Delete note)
*   **Controllers (`noteController.ts`):**
    *   `createNote`
    *   `listNotes`
    *   `updateNote`
    *   `deleteNote`
*   **Services (`noteService.ts`):**
    *   `createNote`
    *   `findNotesByCommunityId`
    *   `findNoteById`
    *   `updateNoteContent`
    *   `deleteNoteById`
    *   `canUserModifyNote` (Permission check)
*   **Models:** `Note`, `User`, `Community`, `Membership`

## Prisma Schema

```prisma
// datasource db defined with provider = "sqlite" // Or your chosen provider
// generator client defined with provider = "prisma-client-js"

model User {
  id                 Int          @id @default(autoincrement())
  name               String
  email              String       @unique
  passwordHash       String
  avatarUrl          String?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  createdCommunities Community[]  @relation("CommunityCreator")
  memberships        Membership[]
  initiatedProposals Proposal[]   @relation("ProposalInitiator")
  votes              Vote[]
  notes              Note[]
}

model Community {
  id          Int          @id @default(autoincrement())
  name        String
  description String?
  imageUrl    String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  creatorId   Int
  creator     User         @relation("CommunityCreator", fields: [creatorId], references: [id])
  memberships Membership[]
  proposals   Proposal[]
  notes       Note[]
  events      Event[]

  @@index([creatorId])
}

model Membership {
  userId      Int
  communityId Int
  role        String   @default("Member") // Consider Enum if not SQLite
  points      Int      @default(0)
  joinedAt    DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
  community   Community @relation(fields: [communityId], references: [id])

  @@id([userId, communityId])
  @@index([userId])
  @@index([communityId])
}

model Proposal {
  id                Int          @id @default(autoincrement())
  title             String
  description       String?
  location          String?
  dateTime          DateTime?
  tags              String // Stored as JSON string or separate Tag model
  deadline          DateTime
  quorumPct         Int          @default(100)
  status            String       @default("Active") // e.g., Active, Approved, Rejected - Consider Enum
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  communityId       Int
  community         Community    @relation(fields: [communityId], references: [id])
  initiatorId       Int
  initiator         User         @relation("ProposalInitiator", fields: [initiatorId], references: [id])
  votes             Vote[]
  event             Event?
  oppositions       Opposition[] @relation("OriginalProposal") // If opposition feature is implemented
  alternatives      Opposition[] @relation("AlternativeProposal") // If opposition feature is implemented
  parentProposalId  Int?         // If proposal editing/revision is implemented
  parentProposal    Proposal?    @relation("ProposalRevisions", fields: [parentProposalId], references: [id], onDelete: NoAction, onUpdate: NoAction) // If revision implemented
  revisions         Proposal[]   @relation("ProposalRevisions") // If revision implemented

  @@index([communityId])
  @@index([initiatorId])
  @@index([status])
  @@index([parentProposalId])
}

model Vote {
  id         Int      @id @default(autoincrement())
  voteType   String // e.g., For, Against, Neutral - Consider Enum
  votedAt    DateTime @default(now())
  proposalId Int
  proposal   Proposal @relation(fields: [proposalId], references: [id])
  voterId    Int
  voter      User     @relation(fields: [voterId], references: [id])

  @@unique([proposalId, voterId])
  @@index([proposalId])
  @@index([voterId])
}

// Optional: Only include if the Opposition feature is implemented
model Opposition {
  id                    Int      @id @default(autoincrement())
  createdAt             DateTime @default(now())
  originalProposalId    Int
  originalProposal      Proposal @relation("OriginalProposal", fields: [originalProposalId], references: [id])
  alternativeProposalId Int      @unique
  alternativeProposal   Proposal @relation("AlternativeProposal", fields: [alternativeProposalId], references: [id])

  @@index([originalProposalId])
  @@index([alternativeProposalId])
}

model Note {
  id          Int       @id @default(autoincrement())
  content     String
  timestamp   DateTime  @default(now()) @updatedAt // Consider renaming `timestamp` to `updatedAt`
  communityId Int
  community   Community @relation(fields: [communityId], references: [id])
  authorId    Int
  author      User      @relation(fields: [authorId], references: [id])
  createdAt   DateTime  @default(now()) // Explicit createdAt might be useful

  @@index([communityId])
  @@index([authorId])
}

model Event {
  id          Int       @id @default(autoincrement())
  title       String
  dateTime    DateTime
  location    String?
  createdAt   DateTime  @default(now())
  proposalId  Int       @unique // One event per proposal
  proposal    Proposal  @relation(fields: [proposalId], references: [id])
  communityId Int
  community   Community @relation(fields: [communityId], references: [id])

  @@index([proposalId])
  @@index([communityId])
  @@index([dateTime])
}
```

## Environment Variables

Create a `.env` file in the `api/` directory with the following variables:

*   `DATABASE_URL`: The connection string for your database. (e.g., `file:./dev.db` for SQLite, `postgresql://user:password@host:port/database` for PostgreSQL)
*   `JWT_SECRET`: A long, random, secret string used for signing authentication tokens. Generate a strong one.
*   `PORT`: The port the API server will listen on (defaults to 3001 if not set).

Example `.env` file:

```dotenv
DATABASE_URL="file:./dev.db"
JWT_SECRET="GENERATE_A_STRONG_RANDOM_SECRET_HERE"
PORT=3001
```

## Running the API

Ensure you are in the `api/` directory for these commands.

### Development

Install dependencies and start the development server with hot-reloading:

```bash
npm install
npm run dev
```

The API will typically be available at `http://localhost:3001` (or the port specified in `.env`).

### Database Migrations

Prisma manages database schema changes.

1.  **Apply Migrations:** To create and apply migrations based on changes in `schema.prisma`:
    ```bash
    # Recommended: Creates migration files
    npx prisma migrate dev --name <your-migration-name>

    # Alternative: Directly applies changes (less safe for production)
    # npx prisma db push
    ```
2.  **Generate Client:** After changing `schema.prisma` or applying migrations, regenerate the Prisma Client:
    ```bash
    npx prisma generate
    ```
3.  **Reset Database (Development only):** To completely reset the database, drop tables, and re-apply migrations:
    ```bash
    npx prisma migrate reset
    ```

### Testing

Run the integration tests (typically using Jest):

```bash
npm test
```

This will execute all `*.test.ts` files, usually configured in `package.json`. Ensure your test environment uses a separate test database or cleans up after itself.