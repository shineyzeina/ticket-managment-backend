# Ticket assignment backend

Node.js + TypeScript + Fastify + Prisma. Creates tickets, classifies them with AI (optional), and assigns to team members by speciality (round-robin).

## Requirements

- Node.js 18+
- npm (or yarn/pnpm)

## Setup

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:push
```

**Environment:**

- `DATABASE_URL` — SQLite: `file:./dev.db`. PostgreSQL: `postgresql://user:pass@host:5432/dbname`
- `OPENAI_API_KEY` — Optional. Enables AI classification when category/speciality are omitted on ticket create.
- `OPENAI_MODEL` — Optional. Default `gpt-4o-mini`.
- `DEFAULT_ASSIGNEE_ID` — Optional. Team member id used when no one matches the ticket’s speciality.
- `PORT` — Default `3000`.

## Run

```bash
npm run dev
```

API base: `http://localhost:3000`

**Other scripts:**

- `npm run build` — Compile TypeScript to `dist/`
- `npm start` — Run `dist/index.js` (run `npm run build` first)
- `npm run db:studio` — Open Prisma Studio to browse data

## Seed data (manual)

Create at least one category, specialities under it, and team members with those specialities so assignment can run:

1. `POST /categories` — e.g. `{"name":"Technical","description":"Tech support"}`
2. `POST /specialities` — e.g. `{"name":"Backend","categoryId":"<id>"}`
3. `POST /team-members` — e.g. `{"name":"Alice","email":"alice@example.com","specialityIds":["<id>"]}`
4. `POST /tickets` — e.g. `{"title":"Login fails","description":"User cannot log in after password reset"}` (AI will suggest category/speciality if key is set)

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /tickets | Create ticket (AI + assignment when category/speciality omitted) |
| GET | /tickets | List (query: status, categoryId, assignedToId, fromDate, toDate) |
| GET | /tickets/:id | Get one |
| PATCH | /tickets/:id | Update status, priority, category, speciality, assignee |
| POST | /tickets/:id/assign | Body: `{"teamMemberId":"..."}` |
| GET/POST/PATCH | /categories | CRUD |
| GET/POST/PATCH | /specialities | CRUD |
| GET/POST/PATCH | /team-members | CRUD (query: specialityId, isActive) |
| GET/PATCH | /assignment/rules | Strategy and default assignee |
