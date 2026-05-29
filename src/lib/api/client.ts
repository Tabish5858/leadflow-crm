/**
 * Client-side helper: builds auth headers for server API requests.
 *
 * Fetches a fresh Firebase ID token and returns the headers needed
 * by the server-side `requireAuth()` middleware.
 *
 * Usage:
 * ```ts
 * const headers = await getApiAuthHeaders(workspaceId);
 * const res = await fetch("/api/...", {
 *   headers: { ...headers, "Content-Type": "application/json" },
 * });
 * ```
 *
 * For file uploads (XHR), set headers individually:
 * ```ts
 * xhr.setRequestHeader("Authorization", `Bearer ${await getIdToken()}`);
 * xhr.setRequestHeader("x-workspace-id", workspaceId);
 * ```
 */

/**
 * Returns authenticated headers for fetch requests.
 * Throws if user is not signed in.
 */
export async function getApiAuthHeaders(
  workspaceId?: string
): Promise<Record<string, string>> {
  const { getAuth } = await import("firebase/auth");
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Not authenticated. User must sign in first.");
  }

  const token = await user.getIdToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (workspaceId) {
    headers["x-workspace-id"] = workspaceId;
  }

  return headers;
}
