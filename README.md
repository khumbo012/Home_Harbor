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

The SQL also creates a private `documents` storage bucket. Uploaded document files are saved under the signed-in user's id, and storage policies restrict each user to their own files.

The SQL also creates first-party beta tables for `feedback` and `analytics_events`. Feedback reports and usage events are stored in your own Supabase project with row-level security.

## Current Cloud Model

The beta foundation uses a single JSON portfolio record per user:

- `profile`: name, email, portfolio name
- `data`: properties, tenants, maintenance, tasks, documents
- `onboarded`: first-run setup status

This is fast for beta setup. As the product grows, the next step is splitting those JSON sections into relational tables for properties, tenants, leases, documents, and maintenance events.

## File Uploads

Documents can now include an attached file. File metadata stays in the user's cloud portfolio JSON, while the file itself is stored privately in Supabase Storage.

To enable uploads, make sure `supabase/schema.sql` has been run after this update so the `documents` bucket and storage policies exist.

## Notifications And Reminders

The app includes an in-app reminder center on the dashboard. It surfaces:

- high-priority open maintenance
- pending high-priority or upcoming tasks
- expired or soon-expiring leases

Users can enable browser notifications from the dashboard reminder panel or Settings. Browser notifications work while the app is open; production push notifications for background mobile delivery would require a later native/PWA push service.

## Privacy, Legal, Feedback, And Analytics

Settings includes beta-draft Privacy Policy and Terms of Use pages, a feedback form, and a small analytics screen.

Analytics is first-party only: no third-party tracking SDK is included. Events are saved to Supabase when analytics is enabled, and users can turn it off in Settings.

Before inviting beta testers, run the latest `supabase/schema.sql` in Supabase so feedback and analytics submissions have their secured tables.
