# Backend Plan: Ticket & Assignment System (Jira-like)

## Goal

- Receive customer-reported problems (tickets).
- Store tickets, categories, team members, and specialities.
- Automatically assign tickets to the right team member based on category/speciality.

---

## Tech Stack Recommendation

**Node.js is a good fit.** Use it unless you have strong reasons for another stack.

| Option | Pros | Cons |
|--------|------|------|
| **Node.js (recommended)** | Fast to build, rich ecosystem (Express/Fastify, Prisma), async I/O, easy to add real-time later | Single-threaded (usually fine for this scope) |
| Python (Django/FastAPI) | Great for data/ML if you add AI-based assignment later | Slightly heavier setup for a simple CRUD + rules backend |
| Go (Fiber/Gin) | Very fast, good for high throughput | More boilerplate, smaller ecosystem for rapid feature iteration |

**Suggested stack:** Node.js + TypeScript + **Fastify** (or Express) + **Prisma** + **PostgreSQL** (or SQLite for local/dev).

---

## 1. Data Model

### Core entities

```
TeamMember
├── id
├── name
├── email
├── specialityIds[]  → many-to-many with Speciality
├── isActive
└── createdAt / updatedAt

Speciality
├── id
├── name (e.g. "Billing", "Technical Support", "Onboarding")
├── description (optional)
└── categoryId → Category

Category
├── id
├── name (e.g. "Billing", "Technical", "Sales")
├── description (optional)
└── parentId (optional, for subcategories)

Ticket
├── id
├── title
├── description (customer problem)
├── categoryId → Category
├── specialityId → Speciality (optional; can be inferred from category)
├── status (e.g. New, In Progress, Resolved, Closed)
├── priority (e.g. Low, Medium, High, Critical)
├── assignedToId → TeamMember (nullable)
├── createdById / source (e.g. "customer", "api", "email")
├── createdAt / updatedAt
└── metadata (JSON, optional: channel, customerId, etc.)
```

### Relationships (summary)

- **Category** ↔ **Speciality**: one category can have several specialities (e.g. "Technical" → "Backend", "Frontend", "DevOps").
- **TeamMember** ↔ **Speciality**: many-to-many (each member has one or more specialities).
- **Ticket** → Category (required), optionally → Speciality; **Ticket** → TeamMember (assignee).

This gives you:
- Clear taxonomy: Category → Speciality → TeamMembers.
- Assignment by category and/or speciality.

---

## 2. Automatic Assignment Logic

### Rule-based (Phase 1)

1. When a ticket is created (or category/speciality set):
   - Resolve **Speciality** from **Category** if not set (e.g. default speciality per category).
2. Find **TeamMembers** that have:
   - Matching **Speciality** (and optionally **Category**).
   - `isActive === true`.
3. **Selection strategy** (pick one to start):
   - **Round-robin** among matching members (store “last assigned” per speciality or category).
   - **Least assigned** in last N days (count tickets per member, assign to minimum).
   - **Random** among matching members (simple fallback).
4. If no one matches:
   - Assign to a “default” member/queue, or leave unassigned and flag for manual assignment.

### Optional later (Phase 2)

- **Skills + seniority**: weight by skill level or seniority.
- **Workload**: use current open ticket count or capacity.

---

## 2.5 AI-Based Content Analysis (recommended)

Today we don’t “know” the content of a ticket unless the customer picks a category or we read the text. Adding AI fixes that.

### What AI does

1. **Understand the ticket** — Use the ticket **title + description** (and any attachments metadata) as input.
2. **Classify** — Infer **category** and **speciality** from that text (so assignment isn’t only manual taxonomy).
3. **Assign** — Either:
   - **A)** Use the AI-derived category/speciality → run existing rule-based assignment (round-robin / least-assigned), or  
   - **B)** Have AI also suggest or rank assignees (e.g. by matching ticket to member expertise), or  
   - **C)** Both: AI sets category/speciality and suggests assignee; you keep rules as fallback or override.

### Implementation options

| Approach | How it works | Pros | Cons |
|----------|--------------|------|------|
| **LLM classification** | Send title+description to an LLM with a prompt that lists your categories/specialities; ask for one categoryId and one specialityId (or structured JSON). | No training data; easy to add new categories; handles messy wording. | API cost and latency; need to handle rate limits and timeouts. |
| **Embeddings + similarity** | Embed ticket text and each speciality (or member expertise text); assign to speciality/member with highest similarity. | Fast, cheap after embedding; works well for “who is this ticket for?”. | Need good labels or member descriptions; threshold tuning. |
| **Hybrid** | LLM for category/speciality only; then rule-based assignment by speciality. Or: LLM suggests assignee, rules used if confidence low. | Clear taxonomy from LLM; assignment stays simple or gets a smart suggestion. | Two steps; more moving parts. |

### Recommended flow (with AI)

1. **Create ticket** — Client sends at least `title`, `description`; `categoryId` / `specialityId` optional.
2. **AI step** — Call an **AI classification service** with `title` + `description`:
   - Input: your list of categories and specialities (id + name + short description).
   - Output: suggested `categoryId`, `specialityId`, and optional `priority` (e.g. from keywords like “urgent”, “down”).
3. **Merge** — If the client didn’t send category/speciality, use AI result; otherwise you can keep client choice or blend (e.g. show AI suggestion for override).
4. **Assign** — Run existing `assignmentService.assign(ticket)` using (possibly AI-set) category/speciality.
5. **Optional** — Store AI output on the ticket (e.g. `aiSuggestedCategoryId`, `aiSuggestedSpecialityId`, `aiConfidence`) for auditing and reprocessing.

### Tech in Node.js

- **LLM (classification / suggestion):** OpenAI API (`gpt-4o-mini` or `gpt-4o`), or Azure OpenAI, or Anthropic. One prompt with your taxonomy; response parsed as JSON. Use **structured output** or a small validation step so you always get valid category/speciality ids.
- **Embeddings (optional):** OpenAI `text-embedding-3-small` (or similar). Store embeddings for each speciality (or member expertise); at ticket create, embed title+description and compare. Good for “suggest assignee” or “suggest speciality” when you don’t want to call an LLM every time.
- **Fallback** — If AI fails (timeout, rate limit, invalid response): leave category/speciality null or use a default; leave ticket unassigned or assign to default queue for manual triage.

### Data model addition (optional)

```
Ticket
├── ... (existing fields)
├── aiSuggestedCategoryId    (nullable, for audit)
├── aiSuggestedSpecialityId  (nullable, for audit)
├── aiConfidence             (optional: "high" | "medium" | "low" or 0–1)
└── aiRawResponse            (optional, JSON string for debugging)
```

### Service layout

- **`ai.service.ts`** (or `classification.service.ts`): `suggestCategoryAndSpeciality(title, description)` → `{ categoryId, specialityId, priority?, confidence? }`. Calls LLM (or embedding path) and maps response to your DB ids.
- **`assignment.service.ts`**: unchanged; takes a ticket with category/speciality set and picks assignee. Called after AI step when creating a ticket.

So: **we know the content of the ticket by running it through AI (LLM and/or embeddings) to get category/speciality and optionally assignee; then we persist that and run the same assignment logic as before.**

---

## 3. API Structure (REST)

### Tickets

- `POST   /tickets`          — Create ticket (body: title, description, categoryId?, specialityId?, priority?, source?). If category/speciality omitted, AI analyzes content and suggests them; then run assignment. Return ticket with `assignedTo` and optional `aiSuggested*` fields.
- `GET    /tickets`          — List (filter by status, category, assignedTo, date range).
- `GET    /tickets/:id`      — Get one ticket.
- `PATCH  /tickets/:id`      — Update (e.g. status, priority, reassign).
- `POST   /tickets/:id/assign` — Manual assign (body: teamMemberId); optional overwrite of auto-assignment.

### Team members

- `GET    /team-members`     — List (filter by speciality, isActive).
- `POST   /team-members`     — Create.
- `GET    /team-members/:id` — Get one (with specialities).
- `PATCH  /team-members/:id` — Update (including specialityIds).
- `DELETE /team-members/:id` — Soft-delete or set isActive = false.

### Categories & specialities

- `GET    /categories`       — List (with optional tree if using parentId).
- `POST   /categories`       — Create.
- `PATCH  /categories/:id`   — Update.
- `GET    /specialities`     — List (filter by categoryId).
- `POST   /specialities`     — Create.
- `PATCH  /specialities/:id` — Update.

### Assignment (internal or admin)

- `GET    /assignment/rules`     — Return current rule config (e.g. strategy, default assignee).
- `PATCH  /assignment/rules`     — Update strategy or default assignee (if you store it in DB or config).

Use a single **assignment service** (e.g. `assignmentService.assign(ticket)`) called from `POST /tickets` and optionally from a “reassign” action.

---

## 4. Project Structure (Node.js)

```
backend/
├── package.json
├── tsconfig.json
├── .env
├── prisma/
│   └── schema.prisma
├── src/
│   ├── index.ts              # App entry, server start
│   ├── routes/
│   │   ├── tickets.ts
│   │   ├── team-members.ts
│   │   ├── categories.ts
│   │   └── specialities.ts
│   ├── services/
│   │   ├── ticket.service.ts
│   │   ├── assignment.service.ts   # Auto-assign logic
│   │   ├── ai.service.ts            # LLM/embeddings: classify ticket content
│   │   └── ...
│   ├── db/ or lib/
│   │   └── prisma.ts         # Prisma client singleton
│   └── types/
│       └── ...
└── tests/
    └── ...
```

---

## 5. Implementation Order

1. **Setup** — Node + TypeScript + Fastify (or Express) + Prisma + DB (e.g. PostgreSQL).
2. **Schema** — Prisma models: Category, Speciality, TeamMember (with relation to Speciality), Ticket.
3. **CRUD** — Categories, Specialities, TeamMembers, Tickets (no assignment yet).
4. **AI classification** — Implement `ai.service.ts`: LLM (or embeddings) to derive category/speciality (and optional priority) from title+description. Call it in `POST /tickets` when category/speciality not provided.
5. **Assignment** — Implement `assignmentService.assign(ticket)` (round-robin or least-assigned); run after ticket has category/speciality (from client or AI).
6. **Policies** — Who can create tickets (e.g. API key, internal only); who can reassign (e.g. admin).
7. **Validation** — Request validation (e.g. Zod) for all inputs.
8. **Tests** — Unit tests for assignment and AI classification; integration tests for main flows.
9. **Docs** — OpenAPI/Swagger from route definitions (optional).

---

## 6. Configuration / Extensibility

- Store assignment strategy and “default assignee” in **config table** or env (e.g. `ASSIGNMENT_STRATEGY=round-robin`, `DEFAULT_ASSIGNEE_ID=...`).
- Keep **assignment.service** small and pluggable so you can add “least assigned” or “AI suggestion” later without changing the API.

---

## Summary

- **Stack:** Node.js + TypeScript + Fastify (or Express) + Prisma + PostgreSQL (or SQLite for dev).
- **Model:** Category → Speciality → TeamMembers; Tickets link to Category + optional Speciality and assignedTo.
- **Content understanding:** AI (LLM and/or embeddings) analyzes ticket title+description to suggest category, speciality, and optional priority when not provided by client.
- **Assignment:** After category/speciality are set (by client or AI), rule-based assignee selection (round-robin or least-assigned); optional AI-suggested assignee later.
- **API:** REST for tickets, team-members, categories, specialities; AI + assignment run inside `POST /tickets` when creating; optional reassign endpoint.

---

## Implementation Status

| Step | Status | Notes |
|------|--------|--------|
| 1. Setup (Node, TS, Fastify, Prisma) | Done | SQLite for dev |
| 2. Schema (Category, Speciality, TeamMember, Ticket) | Done | Includes AI fields |
| 3. CRUD (categories, specialities, team-members, tickets) | Done | |
| 4. AI classification (`ai.service.ts`) | Done | OpenAI; optional when no API key |
| 5. Assignment (`assignment.service.ts`) | Done | Round-robin by speciality |
| 6. Policies / auth | Pending | |
| 7. Validation (Zod) | Done | Request schemas |
| 8. Tests | Pending | |
| 9. Docs (OpenAPI) | Pending | |
