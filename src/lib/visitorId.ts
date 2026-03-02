// ─── Persistent visitor ID ────────────────────────────────────────────────────
// Stored in localStorage so it persists across page refreshes.
// Uses the Web Crypto API (available in all modern browsers) for UUID generation.

const KEY = 'nexus_vid';

export function getVisitorId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function clearVisitorId() {
  localStorage.removeItem(KEY);
}
