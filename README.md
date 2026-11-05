# Alforqan - Studio

Next.js 15 (App Router) + Prisma + NextAuth + Neon PostgreSQL. The Studio (15 games), the Portal (class records, group builder, quiz arena, PPTX/media viewer) and the login shell behave and look like the original; the data layer is now your own Next.js API and database.

The package ships with an EMPTY database schema and no data, no passwords, no keys.

## Already-initialized database (your current Neon)

Your Neon database for this project is ALREADY set up: tables created, the school "Al-Furqan Private School", your two accounts (teacher "Ashraf Elsayed" and admin "Ashraf Elsayed (Admin)", same PIN) and the class lists 6A, 6B, 6C, 7C, 7G. Do NOT run the import script or the "create a school" step again. Just put your own `DATABASE_URL` / `DIRECT_URL` in `.env` (steps 1, 2, 4 below), skip steps 3 and 5, and sign in with school name + your name + your PIN.

## Setup on a NEW empty database (about 5 minutes)

1. Install: `npm ci`
2. Create a Neon project (or use an existing empty one). Copy `.env.example` to `.env` and fill it:
   - `DATABASE_URL` - Neon pooled connection (host contains `-pooler`).
   - `DIRECT_URL` - the same string with the host WITHOUT `-pooler` (used only for migrations).
   - `NEXTAUTH_SECRET` - run `openssl rand -base64 32`.
   - `NEXTAUTH_URL` - `http://localhost:3000` locally, your real URL when deployed.
   - `ENROLL_KEY` - a code you choose; it is asked when you create a school from the login screen.
3. Create the tables: `npx prisma migrate deploy` (only adds the Alforqan tables; use an empty database, or one whose table names do not collide: schools, accounts, login_fail, portal_data, studio_data, decks, deck_files).
4. Run: `npm run build && npm start` (or `npm run dev`), open http://localhost:3000.
5. First start (new database only): on the login screen choose "create a school", enter the school name, the setup code (`ENROLL_KEY`), and the admin name + 5-digit PIN. The admin then creates teacher accounts.

## Behavior (same as the original)

- Login = school + name + 5-digit PIN. Roles: admin, management, counselor, teacher. Only teachers write teaching data.
- 5 wrong PINs lock the account for 5 minutes. Sessions last 12 hours; resetting a PIN or deleting an account ends that account's sessions at once.
- Studio and Portal documents are saved per teacher with version checks (no silent overwrite).
- Uploaded decks are stored in the database (table `deck_files`), up to 5 per teacher. Note: on Vercel the request body limit is about 4.5 MB, and decks count against your Neon storage.

## Daily content

`/content/*` is served from the `./content` folder (`content/index.json`, `<day>/pack.json`, deck files). It ships empty (`{"days":[]}`), so the Studio simply shows no daily packs. Put your own packs there, or set `CONTENT_PROXY_BASE` to a web folder with the same layout.

## Load class rosters (optional)

`scripts/import-roster.mjs` creates a school, an admin and a teacher account (same PIN) and loads class lists (names only) into the teacher's Portal and Studio data. It is safe to re-run.

```
DATABASE_URL=... ROSTER_FILE=./roster.json PIN_FILE=./pin.txt node scripts/import-roster.mjs
```
`roster.json` is `{"6A":["Student one","Student two"],"6B":[...]}`. Keep roster.json and pin.txt out of git.

## Tests

`BASE=http://localhost:3000 ENROLL_KEY=... node scripts/smoke-test.mjs` - API checks (auth, roles, lockout, quotas, decks). Run it only on an empty or throwaway database; it creates a fictional school.

## Layout

- `src/app/page.tsx` + `src/components/Shell.tsx` - login shell (NextAuth sign-in), hosts Studio and Portal.
- `src/app/(studio)/studio`, `src/app/(portal)/portal` - the two screens (markup, scripts).
- `public/legacy/` - the Studio and Portal engines, styles and vendor libraries (xlsx, mammoth, jszip, three), served as static files.
- `src/app/api/**`, `src/lib/**` - API routes, auth, accounts, documents. `prisma/` - schema and migration.

The Studio and Portal game/class engines are the original scripts running unchanged inside the Next.js pages (not rewritten into React state), which is what keeps the 15 games identical.
