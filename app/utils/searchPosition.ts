const KEY = 'wts.searchPosition';
const MAX_AGE = 30 * 60 * 1000;

/** A single tab-scoped record avoids unbounded storage as searches change. */
export function saveSearchPosition(href: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ href, y: window.scrollY, at: Date.now() }));
  } catch {
    // Navigation still works when storage is unavailable.
  }
}

export function restoreSearchPosition(href: string): void {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    const record = JSON.parse(raw);
    if (record.href !== href) return;
    sessionStorage.removeItem(KEY);
    if (
      !Number.isFinite(record.y) ||
      record.y < 0 ||
      record.y > 1000000 ||
      !Number.isFinite(record.at) ||
      Date.now() - record.at > MAX_AGE
    )
      return;
    window.scrollTo({
      top: Math.min(
        record.y,
        Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      ),
      behavior: 'instant',
    });
  } catch {
    // Missing or corrupt position data must not block the search page.
  }
}
