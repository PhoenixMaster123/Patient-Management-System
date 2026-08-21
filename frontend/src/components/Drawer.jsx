import { useMemo } from 'react';
import { filingLetter, filingName, shortId } from '../format.js';

function matches(patient, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    patient.name.toLowerCase().includes(q) ||
    patient.email.toLowerCase().includes(q) ||
    patient.address.toLowerCase().includes(q) ||
    patient.id.toLowerCase().includes(q)
  );
}

export default function Drawer({ patients, selectedId, onSelect, query, onQuery, loading }) {
  // Filed surname-first, A-Z. The letter dividers are the drawer tabs.
  const groups = useMemo(() => {
    const found = patients
      .filter((p) => matches(p, query))
      .sort((a, b) => filingName(a.name).localeCompare(filingName(b.name)));

    const byLetter = new Map();
    for (const patient of found) {
      const letter = filingLetter(patient.name);
      if (!byLetter.has(letter)) byLetter.set(letter, []);
      byLetter.get(letter).push(patient);
    }
    return [...byLetter.entries()];
  }, [patients, query]);

  const shown = groups.reduce((n, [, items]) => n + items.length, 0);

  return (
    <aside className="drawer" aria-label="Patient roster">
      <div className="drawer-head">
        <span className="inst">Roster</span>
        <span className="machine muted">
          {loading ? 'reading' : query ? `${shown}/${patients.length}` : `${patients.length} filed`}
        </span>
      </div>

      <input
        className="search"
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search name, email, address, id"
        aria-label="Search the roster"
      />

      {!loading && groups.length === 0 && (
        <p className="drawer-empty">
          {patients.length === 0
            ? 'The registry is empty. Open Intake to register the first patient.'
            : `Nothing filed under “${query}”.`}
        </p>
      )}

      {groups.map(([letter, items]) => (
        <section key={letter}>
          <h2 className="divider">{letter}</h2>
          <ul className="tab-list">
            {items.map((patient) => (
              <li key={patient.id}>
                <button
                  type="button"
                  className="tab"
                  aria-current={patient.id === selectedId ? 'true' : undefined}
                  onClick={() => onSelect(patient.id)}
                >
                  <span className="tab-name">{filingName(patient.name)}</span>
                  <span className="tab-meta machine">
                    {patient.dateOfBirth} · {shortId(patient.id)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  );
}
