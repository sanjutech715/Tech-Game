# Tech-Game

## Run locally

1. Install Node.js.
2. Create a local `.admin-pin` file containing the admin PIN on one line. This file is ignored by Git; do not commit it.
3. Start the server with `node server.js`.
4. Open `http://localhost:3001/` for students or `http://localhost:3001/admin` for the admin dashboard.

Student records are saved locally in `data.json`, which is ignored by Git.

## Deploy to Vercel

Vercel runs the API as serverless functions, so it needs a hosted database; its function filesystem cannot store student records. This project uses Supabase and polls the API for scoreboard updates instead of keeping a server-sent event connection open.

1. Create a Supabase project.
2. In Supabase **SQL Editor**, run [`supabase/schema.sql`](./supabase/schema.sql) to create the private student-records table.
3. In the Vercel project settings, add these **server-side environment variables** for Production (and Preview if needed):
   - `SUPABASE_URL`: the Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: the Supabase service-role secret. Never put this key in browser code or commit it.
   - `ADMIN_PIN`: a new private admin PIN. Do not reuse a PIN that was previously committed to Git; store this one only in Vercel's environment-variable settings.
4. Deploy the latest `main` branch again. Vercel serves the student page at `/` and the PIN-protected admin page at `/admin`.

The API will return a configuration error until the Supabase values are set and the schema has been created. Existing local `data.json` records are not migrated automatically.

## Automatic push in VS Code

The workspace pushes to the configured `origin` after a commit made in VS Code. Review and commit changes from Source Control as usual; command-line commits do not trigger VS Code's post-commit push setting.
