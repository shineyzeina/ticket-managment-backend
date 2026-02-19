# Ticket Assignment System

A Jira-like backend for receiving customer problems, classifying them with AI, and automatically assigning tickets to the right team members by category and speciality.

## What it does

- **Tickets** — Create and manage support tickets (title, description, status, priority).
- **Taxonomy** — Categories and specialities (e.g. Technical → Backend, Frontend) so tickets can be routed correctly.
- **Team & specialities** — Team members are linked to one or more specialities.
- **AI classification** — Optional: when you create a ticket without a category/speciality, an LLM suggests them from the ticket content (requires OpenAI API key).
- **Auto-assignment** — Round-robin assignment by speciality so tickets go to the right people.

## Tech stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **API:** Fastify (REST)
- **Database:** SQLite (dev) or PostgreSQL (production via Prisma)
- **ORM:** Prisma
- **AI:** OpenAI API (optional, for ticket classification)

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm (or yarn/pnpm)

### 1. Clone the repo

```bash
git clone https://github.com/shineyzeina/ticket-managment-backend.git
cd ticket-managment-backend
```

### 2. Install and set up

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:push
```

### 3. Configure environment

Edit `.env`:

- **DATABASE_URL** — Default `file:./dev.db` (SQLite). For PostgreSQL: `postgresql://user:pass@host:5432/dbname`
- **OPENAI_API_KEY** — Optional. If set, tickets can be created with only `title` and `description`; AI will suggest category and speciality. Without it, you must send `categoryId` and `specialityId` when creating tickets.
- **PORT** — API port (default `3000`)

### 4. Run the API

```bash
npm run dev
```

API base URL: **http://localhost:3000**

### 5. Create initial data

Create at least one category, a speciality, and a team member so assignment works:

```bash
# Create a category
curl -X POST http://localhost:3000/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Technical","description":"Tech support"}'

# Create a speciality (use the category id from the response)
curl -X POST http://localhost:3000/specialities \
  -H "Content-Type: application/json" \
  -d '{"name":"Backend","categoryId":"<CATEGORY_ID>"}'

# Create a team member (use the speciality id from the response)
curl -X POST http://localhost:3000/team-members \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","specialityIds":["<SPECIALITY_ID>"]}'

# Create a ticket (AI will classify if OPENAI_API_KEY is set)
curl -X POST http://localhost:3000/tickets \
  -H "Content-Type: application/json" \
  -d '{"title":"Login fails","description":"User cannot log in after password reset"}'
```

## Project structure

```
├── README.md
├── BACKEND_PLAN.md           # Design and implementation plan
├── package.json
├── .env.example
├── prisma/
│   └── schema.prisma         # Data model
└── src/
    ├── index.ts              # App entry
    ├── lib/prisma.ts
    ├── routes/               # REST endpoints
    └── services/             # Business logic (tickets, AI, assignment)
```

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | /tickets | Create ticket (optional AI classification + auto-assign) |
| GET    | /tickets | List tickets (filter by status, category, assignee, dates) |
| GET    | /tickets/:id | Get one ticket |
| PATCH  | /tickets/:id | Update ticket |
| POST   | /tickets/:id/assign | Manually assign to a team member |
| GET/POST/PATCH | /categories | Categories CRUD |
| GET/POST/PATCH | /specialities | Specialities CRUD |
| GET/POST/PATCH | /team-members | Team members CRUD |
| GET/PATCH | /assignment/rules | View or set default assignee |

Query params for `GET /tickets`: `status`, `categoryId`, `assignedToId`, `fromDate`, `toDate`. For `GET /team-members`: `specialityId`, `isActive`.

