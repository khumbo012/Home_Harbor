# Home Harbor

Mobile-first rental management app for properties, tenants, maintenance, tasks, and documents.

## Local Setup

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Supabase Accounts + Cloud Database

The app is wired for Supabase email/password accounts and a cloud portfolio table.

1. Create a Supabase project.
2. Copy `.env.example` to `.env`.
3. Add your project URL and anon key:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

4. Open the Supabase SQL editor.
5. Run `supabase/schema.sql`.
6. Restart the dev server.

Each signed-in user gets one private `user_portfolios` row protected by row-level security. The current app stores the profile, onboarding state, and rental portfolio data in that row.

## Current Cloud Model

The beta foundation uses a single JSON portfolio record per user:

- `profile`: name, email, portfolio name
- `data`: properties, tenants, maintenance, tasks, documents
- `onboarded`: first-run setup status

This is fast for beta setup. As the product grows, the next step is splitting those JSON sections into relational tables for properties, tenants, leases, documents, and maintenance events.
