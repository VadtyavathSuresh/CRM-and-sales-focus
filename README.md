# LeadFlow CRM

A full-stack lead management platform built for small sales teams. Features a public lead capture form, authenticated multi-role dashboard, full lead lifecycle pipeline, notes, activity trail, and a JSON REST API.

**Live application:** [https://your-bolt-deployment-url.com](https://your-bolt-deployment-url.com)

**Built for Digital Heroes Training Task** — [digitalheroesco.com](https://digitalheroesco.com)

---

## Demo Credentials

| Role   | Email                     | Password     |
|--------|---------------------------|--------------|
| Admin  | admin@leadflow.demo       | demo1234     |
| Member | member@leadflow.demo      | demo1234     |

> Create accounts via the `/signup` page. Set role to **Admin** or **Member** during registration.

---

## Features

- **Public capture form** at `/` — no auth required, creates a `new` lead
- **Role-based access control**: admin and member, enforced on client and server (Supabase RLS + API)
- **Lead pipeline**: new → contacted → qualified → proposal → negotiation → closed_won / closed_lost
- **Assignment**: admins assign leads to team members; members see only their assigned leads
- **Notes** with timestamps and author attribution
- **Activity trail**: immutable log of status changes, assignments, note events
- **JSON API** with pagination and filtering (see below)
- **33 automated tests** covering routing, auth rules, validation, and activity logic

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Supabase (PostgreSQL, Row Level Security, Auth, Edge Functions)
- **Tests**: Vitest (33 tests, all passing)
- **Deployment**: Bolt.new

---

## Project Structure

```
src/
├── components/       # Router, Navbar, Modal, Badges
├── context/          # AuthContext (session + profile)
├── lib/              # supabase client, leads API, profiles API, utils
├── pages/            # CaptureFormPage, LoginPage, SignupPage, DashboardPage,
│                     # LeadDetailPage, NewLeadPage, TeamPage, ProfilePage
├── tests/            # app.test.ts — 33 unit tests
└── types/            # TypeScript interfaces
supabase/
└── functions/
    └── leads-api/    # Edge Function REST API
```

---

## Running Locally

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm test          # run 33 unit tests
npm run build     # production build
```

---

## API Documentation

Base URL: `https://fvofpbzblxvmnrziuezh.supabase.co/functions/v1/leads-api`

All endpoints return `Content-Type: application/json`. Authenticated endpoints require a Supabase JWT in the `Authorization: Bearer <token>` header.

---

### Authentication

Obtain a JWT by signing in:

```bash
curl -X POST https://fvofpbzblxvmnrziuezh.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@leadflow.demo","password":"demo1234"}'
```

The response includes `access_token` — pass it as `Authorization: Bearer <access_token>`.

---

### Endpoints

#### `GET /leads-api/leads` — List leads

Public endpoint (no auth required). Returns paginated leads with optional filtering.

**Query parameters:**

| Parameter    | Type   | Description |
|-------------|--------|-------------|
| `page`       | int    | Page number (default: 1) |
| `page_size`  | int    | Results per page (default: 20, max: 100) |
| `status`     | string | Filter by pipeline status |
| `priority`   | string | Filter by priority (`low`, `medium`, `high`) |
| `source`     | string | Filter by lead source |
| `assigned_to`| uuid   | Filter by assigned user ID |
| `search`     | string | Full-text search on name, email, company |

**Status values:** `new` `contacted` `qualified` `proposal` `negotiation` `closed_won` `closed_lost`

**Source values:** `web_form` `referral` `cold_outreach` `social` `other`

**Example:**
```bash
curl "https://fvofpbzblxvmnrziuezh.supabase.co/functions/v1/leads-api/leads?status=new&page=1&page_size=10"
```

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane@acme.com",
      "phone": "+1 555-0000",
      "company": "Acme Corp",
      "source": "web_form",
      "status": "new",
      "priority": "medium",
      "assigned_to": null,
      "value": null,
      "notes_count": 0,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z",
      "assignee": null
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 10,
    "total": 42,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

---

#### `GET /leads-api/leads/:id` — Get a single lead

**Example:**
```bash
curl "https://fvofpbzblxvmnrziuezh.supabase.co/functions/v1/leads-api/leads/uuid-here"
```

**Response `200 OK`:** Lead object (same shape as above, with `assignee` populated).

**Response `404 Not Found`:**
```json
{ "error": "Lead not found" }
```

---

#### `POST /leads-api/leads` — Create a lead (public)

No authentication required. Used by the public capture form.

**Request body:**
```json
{
  "first_name": "Jane",      // required
  "last_name": "Smith",      // required
  "email": "jane@acme.com",  // required
  "phone": "+1 555-0000",    // optional
  "company": "Acme Corp",    // optional
  "source": "web_form",      // optional, defaults to "other"
  "status": "new",           // optional, defaults to "new"
  "priority": "medium",      // optional, defaults to "medium"
  "value": 500000,           // optional, integer cents (e.g. 500000 = $5,000)
  "message": "Tell me more…" // optional
}
```

**Response `201 Created`:** Created lead object.

**Response `422 Unprocessable Entity`:**
```json
{ "error": "Missing required field: email" }
```

---

#### `PATCH /leads-api/leads/:id` — Update a lead

**Authentication required.** Admins can update any lead. Members can only update leads assigned to them. Members cannot change `assigned_to`.

**Request body** (all fields optional):
```json
{
  "status": "contacted",
  "priority": "high",
  "assigned_to": "user-uuid",
  "value": 750000,
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@newcompany.com",
  "phone": "+1 555-9999",
  "company": "New Corp",
  "message": "Updated context"
}
```

**Response `200 OK`:** Updated lead object.

**Response `401 Unauthorized`:**
```json
{ "error": "Unauthorized" }
```

**Response `403 Forbidden`:**
```json
{ "error": "Forbidden: you can only update leads assigned to you" }
```

**Response `404 Not Found`:**
```json
{ "error": "Lead not found" }
```

---

#### `DELETE /leads-api/leads/:id` — Delete a lead

**Authentication required. Admin role only.**

**Response `204 No Content`** — empty body on success.

**Response `403 Forbidden`:**
```json
{ "error": "Forbidden: only admins can delete leads" }
```

---

### HTTP Status Code Summary

| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Created |
| 204  | Deleted (no content) |
| 400  | Bad request / invalid JSON |
| 401  | Missing or invalid auth token |
| 403  | Insufficient permissions |
| 404  | Resource not found |
| 405  | Method not allowed |
| 422  | Validation error (missing required field) |
| 500  | Internal server error |

---

## Database Schema

### `profiles`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Matches `auth.users.id` |
| email | text | User email |
| full_name | text | Display name |
| role | text | `admin` or `member` |
| created_at | timestamptz | — |
| updated_at | timestamptz | — |

### `leads`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| first_name / last_name | text | Contact name |
| email | text | Contact email |
| phone | text | Optional phone |
| company | text | Optional company |
| source | text | Lead origin |
| status | text | Pipeline stage |
| priority | text | `low`, `medium`, `high` |
| assigned_to | uuid FK | Assigned team member |
| value | int | Deal value in cents |
| message | text | Original inquiry |
| notes_count | int | Denormalized count |
| created_at / updated_at | timestamptz | — |

### `lead_notes`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| lead_id | uuid FK | Parent lead |
| author_id | uuid FK | Note author |
| content | text | Note body |
| created_at | timestamptz | — |

### `lead_activities`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| lead_id | uuid FK | Parent lead |
| actor_id | uuid FK | Who triggered it |
| activity_type | text | Event type |
| metadata | jsonb | Event context (before/after values) |
| created_at | timestamptz | — |

**Activity types:** `lead_created` `status_changed` `assigned` `note_added` `note_deleted` `field_updated`

---

## Permission Model

| Action | Admin | Member |
|--------|-------|--------|
| View all leads | ✅ | ❌ (own only) |
| Create lead (internal) | ✅ | ❌ |
| Edit any lead | ✅ | ❌ (own only) |
| Delete lead | ✅ | ❌ |
| Assign leads | ✅ | ❌ |
| Manage team roles | ✅ | ❌ |
| Add notes | ✅ | ✅ (own leads) |
| View activity trail | ✅ | ✅ (own leads) |

Permissions are enforced at both the client (UI gating) and server (Supabase Row Level Security + Edge Function auth checks).

---

## Tests

```bash
npm test
```

33 tests across 5 suites:
1. **Router** — URL pattern matching and param extraction (9 tests)
2. **Utility functions** — `formatCurrency`, `getInitials`, pipeline stages (5 tests)
3. **STATUS_CONFIG** — coverage for all 7 pipeline stages (1 test)
4. **Auth permission rules** — admin vs member access logic (6 tests)
5. **Lead API validation** — required fields, status/source sanitization (5 tests)
6. **Activity description logic** — readable activity trail generation (4 tests)
7. **Lead pipeline integrity** — stage count and ordering (3 tests)

---

*Built for Digital Heroes Training Task — [digitalheroesco.com](https://digitalheroesco.com)*
