const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "John Doe" -> "Doe, John". The order the drawer is filed in. */
export function filingName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name.trim();
  return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`;
}

export function filingLetter(name = '') {
  const first = filingName(name).charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
}

/** "1985-06-15" -> "15 Jun 1985". Falls back to the raw string. */
export function formatDate(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${Number(d)} ${MONTHS[Number(mo) - 1] ?? mo} ${y}`;
}

/** Last block of the UUID — enough to tell two records apart at a glance. */
export function shortId(id = '') {
  return id.slice(-6);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
