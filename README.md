# FIFO Live — Farmley Cold Storage

A real, standalone website version of the FIFO compliance tracker: real email/password login,
a shared Postgres database, live updates across everyone's browser, and real approval-alert emails.
No dependency on Claude for anyone using it day-to-day.

## What's already done for you
- All the React code (`src/`) — same UI and FIFO logic as the Claude version, rewired to Supabase
- Database schema + Row Level Security rules (`supabase/schema.sql`)
- Your 233 historical lots from the original Excel sheet, ready to import (`supabase/seed_historical_data.sql`)
- The email-sending Edge Function (`supabase/functions/send-approval-email/index.ts`)

## What you still need to do (in order)

### 1. Create accounts (all free to start)
- [Supabase](https://supabase.com) — sign up, create a new project. Pick a strong database password and save it somewhere.
- [Vercel](https://vercel.com) — sign up (can use your GitHub login).
- [Resend](https://resend.com) — sign up, this sends your approval-alert emails.
- [GitHub](https://github.com) — if you don't already have an account, to hold the code.

### 2. Set up the database
1. In your Supabase project, open **SQL Editor > New query**.
2. Paste in the entire contents of `supabase/schema.sql` and run it.
3. Open a new query, paste in `supabase/seed_historical_data.sql`, and run it. This loads your 233 existing lots.
4. Go to **Database > Replication** and confirm `lots`, `approvals`, and `profiles` are enabled for Realtime (the schema script does this automatically, but it's worth checking).

### 3. Get your Supabase keys
1. In Supabase, go to **Project Settings > API**.
2. Copy the **Project URL** and the **anon / public** key (not the service_role key — never expose that one).

### 4. Set up the project locally
```bash
cd fifo-website
npm install
cp .env.example .env
# edit .env and paste in your Project URL and anon key
npm run dev
```
Open the local URL it prints — you should see the sign-up screen. Create your own account first
(sign up as **Karan Sirohi** — you'll automatically get Admin access; see the trigger in schema.sql).

### 5. Set up the approval-alert email
1. In Resend, verify a sending domain (or use their default test sender to start).
2. Get your Resend API key from Resend's dashboard.
3. Install the Supabase CLI if you don't have it: `npm install -g supabase`
4. Log in and link your project:
   ```bash
   supabase login
   supabase link --project-ref your-project-ref
   ```
5. Set the secret and deploy the function:
   ```bash
   supabase secrets set RESEND_API_KEY=your_resend_key
   supabase functions deploy send-approval-email
   ```

### 6. Push to GitHub
```bash
git init
git add .
git commit -m "Initial FIFO Live website"
gh repo create fifo-live --private --source=. --push
```
(Or create the repo on github.com and follow its "push an existing repo" instructions.)

### 7. Deploy to Vercel
1. Go to vercel.com, click **Add New Project**, and import your GitHub repo.
2. In the import screen, add the two environment variables from your `.env` file
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. Click **Deploy**. You'll get a real URL like `fifo-live.vercel.app` — share that with your team.

### 8. Get your team signed up
- Everyone signs up with their own email + password.
- Anyone who signs up as exactly "Karan Sirohi" or "Yogesh Kumar" is automatically made Admin
  (see the `handle_new_user` trigger in schema.sql). Everyone else defaults to Team Member.
- If you ever need to promote/demote someone manually, run this in the Supabase SQL editor:
  ```sql
  update profiles set role = 'Admin' where name = 'Some Person';
  ```

## Notes and known limitations
- The dispatch-quantity update on a lot is a simple read-then-write from the client, not an atomic
  database increment. Fine for a small team; if two people dispatch from the exact same lot within
  the same second, a future improvement would be a Postgres RPC function to make that atomic.
- The Resend free tier sender (`onboarding@resend.dev`) works immediately but looks like a test address.
  Once you verify your own domain in Resend, update the `from` address in
  `supabase/functions/send-approval-email/index.ts` and redeploy the function.
- Row Level Security in `schema.sql` is the real enforcement layer — only accounts with
  `role = 'Admin'` in the `profiles` table can update approvals or delete lots, checked by Postgres
  itself, not just the UI.
