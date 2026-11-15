# NoteHub — Next.js

Homework 6: migration of NoteHub to Next.js App Router with TypeScript and CSS Modules.

## Run locally

```sh
npm install
```

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_NOTEHUB_TOKEN` to your NoteHub API token. Then run:

```sh
npm run dev
```

Open http://localhost:3000.

## Features

- `/`: introduction to NoteHub.
- `/notes`: server-rendered notes with TanStack Query prefetch and hydration, debounced search, pagination, creation and deletion.
- `/notes/[id]`: server-rendered note details, hydrated into a client component using `useParams` and `refetchOnMount: false`.
- Shared header, footer, query provider, route loading UI, and separate error boundaries for the notes list and details.
- Formik and Yup validation; accessible modal with focus trapping, Escape/backdrop dismissal, and scroll locking.

API functions are in `lib/api.ts`. Domain types (`Note`, `NoteTag`, and `CreateNoteParams`) are in `types/note.ts`; API query parameters and pagination responses are in `lib/api.types.ts`. Each reusable component is in its own folder under `components`.

## Checks

```sh
npm run build
npm run typecheck
npm run lint
npm run format:check
npm run test:e2e
```

The default end-to-end suite uses an isolated local API on port 4010 and the production build on port 3000. It covers SSR, hydration, search, pagination, mutation failures, validation, responsive layouts, and recovery from server errors. It does not modify real notes. Chrome must be installed.

To verify the real backend, run `npm run test:e2e:live`. Set `PLAYWRIGHT_BASE_URL` to the production URL to test Vercel instead of a local server. The live CRUD test creates and removes a temporary note. Run live suites sequentially to avoid the backend's request limit.

## Vercel

Import the GitHub repository, choose the Next.js preset, and set `NEXT_PUBLIC_NOTEHUB_TOKEN` in Vercel's environment variables before building. The token is required at build time because Next.js includes `NEXT_PUBLIC_*` values in the browser bundle. Submit the stable production domain shown under **Domains**, together with the GitHub repository URL.

## Credits

Styles adapted from [GoIT NoteHub styles, hw-06](https://github.com/goitacademy/react-notehub-styles/tree/hw-06), with responsive and accessibility adjustments. The MIT license is included in `THIRD-PARTY-NOTICES.txt`.
