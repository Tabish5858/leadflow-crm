/**
 * Checks whether a given email is allowed to create workspaces.
 * Uses server-only env var ALLOWED_WORKSPACE_CREATORS (comma-separated emails).
 * Only emails in this list can create workspaces.
 *
 * ⚠️  This function is server-only and must NOT be imported in client components.
 * The env var is never exposed to the browser bundle.
 */
export function canCreateWorkspace(email: string | null | undefined): boolean {
  if (!email) return false;

  // Server-only env var (NOT prefixed with NEXT_PUBLIC_, never leaks to client)
  const raw = process.env.ALLOWED_WORKSPACE_CREATORS;

  if (!raw) return false;

  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.toLowerCase());
}
