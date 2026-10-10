// GET /api/version — the id of the deploy that is live right now (the git commit on Vercel).
// The installed app asks this when it comes back to the front and shows "update available" if it differs
// from the id it was built with (components/UpdateBanner.tsx). Never cached, never touched by the service worker (/api/*).

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(
    { id: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
