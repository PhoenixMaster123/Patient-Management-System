import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, GATEWAY_LABEL } from './api.js';
import SignIn from './components/SignIn.jsx';
import Drawer from './components/Drawer.jsx';
import Record from './components/Record.jsx';
import Intake from './components/Intake.jsx';

const SESSION_KEY = 'pms.session';

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState(readSession);
  const [view, setView] = useState('roster');
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    try {
      if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch { /* private mode — the session just won't survive a refresh */ }
  }, [session]);

  const signOut = useCallback(() => {
    setSession(null);
    setPatients([]);
    setSelectedId(null);
    setQuery('');
    setView('roster');
    setLoadError(null);
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    setLoading(true);
    setLoadError(null);
    api
      .listPatients(session.token, session.offline)
      .then((rows) => { if (!cancelled) setPatients(rows); })
      .catch((err) => {
        if (cancelled) return;
        if (err.name === 'OfflineError') {
          setLoadError(`The gateway at ${GATEWAY_LABEL} stopped responding. Sign in again to retry.`);
        } else {
          setLoadError(err.message);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [session]);

  const selected = useMemo(
    () => patients.find((p) => p.id === selectedId) ?? null,
    [patients, selectedId],
  );

  async function handleCreate(body) {
    const created = await api.createPatient(session.token, body, session.offline);
    // PatientResponseDTO omits registeredDate, so keep what was submitted.
    const row = { ...body, ...created };
    setPatients((rows) => [...rows, row]);
    return row;
  }

  async function handleSave(id, body) {
    const updated = await api.updatePatient(session.token, id, body, session.offline);
    setPatients((rows) => rows.map((p) => (p.id === id ? { ...p, ...body, ...updated } : p)));
  }

  async function handleRemove(id) {
    await api.deletePatient(session.token, id, session.offline);
    setPatients((rows) => rows.filter((p) => p.id !== id));
    setSelectedId(null);
  }

  function openRecord(id) {
    setSelectedId(id);
    setView('roster');
  }

  if (!session) return <SignIn onSignedIn={setSession} />;

  return (
    <>
      <header className="rail">
        <div className="rail-mark">
          Records <span>Patient Management System</span>
        </div>

        <nav className="rail-nav" aria-label="Sections">
          <button
            type="button"
            className="rail-tab"
            aria-current={view === 'roster' ? 'true' : undefined}
            onClick={() => setView('roster')}
          >
            Roster
          </button>
          <button
            type="button"
            className="rail-tab"
            aria-current={view === 'intake' ? 'true' : undefined}
            onClick={() => setView('intake')}
          >
            Intake
          </button>
        </nav>

        <div className="rail-end">
          <span className="rail-session machine">{session.email}</span>
          <button className="rail-signout" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {session.offline && (
        <div className="demo-strip">
          <span className="inst">Demo mode</span>
          <span className="machine">
            In-memory registry seeded from data.sql. Changes are not saved.
          </span>
        </div>
      )}

      <div className={`workspace ${view === 'intake' || selected ? 'is-detail' : ''}`}>
        <Drawer
          patients={patients}
          selectedId={selectedId}
          onSelect={openRecord}
          query={query}
          onQuery={setQuery}
          loading={loading}
        />

        <main className="stage">
          {(view === 'intake' || selected) && (
            <button
              className="btn back-btn"
              type="button"
              onClick={() => { setSelectedId(null); setView('roster'); }}
            >
              Back to roster
            </button>
          )}

          {loadError && <div className="alert" style={{ maxWidth: 660 }}>{loadError}</div>}

          {view === 'intake' ? (
            <Intake onCreate={handleCreate} onOpenRecord={openRecord} />
          ) : selected ? (
            <Record patient={selected} onSave={handleSave} onRemove={handleRemove} />
          ) : (
            <div className="blank">
              <div className="inst">No record open</div>
              <h2>Pick a name from the drawer.</h2>
              <p>
                The roster is filed surname-first. Search by name, email, address, or record id —
                or start a new intake.
              </p>
              <button className="btn btn-primary" type="button" onClick={() => setView('intake')}>
                New intake
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
