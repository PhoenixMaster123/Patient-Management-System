import { useEffect, useState } from 'react';
import { formatDate, shortId } from '../format.js';


export default function Record({ patient, onSave, onRemove }) {
  const [mode, setMode] = useState('view');
  const [draft, setDraft] = useState(patient);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  // Selecting a different patient resets the card to its resting state.
  useEffect(() => {
    setDraft(patient);
    setMode('view');
    setErrors({});
    setNotice(null);
  }, [patient]);

  function set(field, value) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const body = {
        name: draft.name,
        email: draft.email,
        address: draft.address,
        dateOfBirth: draft.dateOfBirth,
        ...(draft.registeredDate ? { registeredDate: draft.registeredDate } : {}),
      };
      await onSave(patient.id, body);
      setMode('view');
      setNotice('Changes saved.');
    } catch (err) {
      setErrors(err.fields && Object.keys(err.fields).length ? err.fields : { _: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await onRemove(patient.id);
    } catch (err) {
      setErrors({ _: err.message });
      setBusy(false);
      setMode('view');
    }
  }

  const generalError = errors._;

  return (
    <article className="sheet-card perf record">
      <div className="record-top">
        <div style={{ minWidth: 0 }}>
          <div className="inst muted">Patient record</div>
          {mode === 'edit' ? (
            <div className="form-field" style={{ marginTop: 10, maxWidth: 380 }}>
              <label className="inst" htmlFor="rec-name">Full name</label>
              <input
                id="rec-name"
                className={`input ${errors.name ? 'input-invalid' : ''}`}
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                maxLength={100}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
          ) : (
            <h1 className="record-name">{patient.name}</h1>
          )}
          <div className="record-id machine">{patient.id}</div>
        </div>

        <div className="stamp-mark">
          <span className="stamp-label">Record no.</span>
          <b>{shortId(patient.id)}</b>
        </div>
      </div>

      {generalError && <div className="alert" style={{ marginTop: 20 }}>{generalError}</div>}
      {notice && (
        <div className="inst" style={{ marginTop: 20, color: 'var(--stamp)' }}>{notice}</div>
      )}

      <form onSubmit={save}>
        <dl className="fields">
          <div className="field">
            <dt className="inst">Email</dt>
            <dd>
              {mode === 'edit' ? (
                <>
                  <input
                    className={`input ${errors.email ? 'input-invalid' : ''}`}
                    type="email"
                    value={draft.email}
                    onChange={(e) => set('email', e.target.value)}
                    style={{ width: '100%' }}
                    aria-label="Email"
                  />
                  {errors.email && <span className="field-error">{errors.email}</span>}
                </>
              ) : (
                <span className="machine">{patient.email}</span>
              )}
            </dd>
          </div>

          <div className="field">
            <dt className="inst">Address</dt>
            <dd>
              {mode === 'edit' ? (
                <>
                  <input
                    className={`input ${errors.address ? 'input-invalid' : ''}`}
                    value={draft.address}
                    onChange={(e) => set('address', e.target.value)}
                    style={{ width: '100%' }}
                    aria-label="Address"
                  />
                  {errors.address && <span className="field-error">{errors.address}</span>}
                </>
              ) : (
                <span className="field-human">{patient.address}</span>
              )}
            </dd>
          </div>

          <div className="field">
            <dt className="inst">Date of birth</dt>
            <dd>
              {mode === 'edit' ? (
                <>
                  <input
                    className={`input input-date ${errors.dateOfBirth ? 'input-invalid' : ''}`}
                    type="date"
                    value={draft.dateOfBirth ?? ''}
                    onChange={(e) => set('dateOfBirth', e.target.value)}
                    aria-label="Date of birth"
                  />
                  {errors.dateOfBirth && (
                    <span className="field-error">{errors.dateOfBirth}</span>
                  )}
                </>
              ) : (
                <span className="machine">{formatDate(patient.dateOfBirth)}</span>
              )}
            </dd>
          </div>

          {patient.registeredDate && (
            <div className="field">
              <dt className="inst">Registered</dt>
              <dd className="machine">{formatDate(patient.registeredDate)}</dd>
            </div>
          )}
        </dl>

        {mode === 'edit' && (
          <div className="record-actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Saving' : 'Save changes'}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => { setDraft(patient); setErrors({}); setMode('view'); }}
            >
              Cancel
            </button>
          </div>
        )}
      </form>

      {mode === 'view' && (
        <div className="record-actions">
          <button className="btn" type="button" onClick={() => { setNotice(null); setMode('edit'); }}>
            Edit record
          </button>
          <button className="btn btn-void" type="button" onClick={() => setMode('confirm')}>
            Remove from roster
          </button>
        </div>
      )}

      {mode === 'confirm' && (
        <div className="confirm">
          <p className="confirm-q">
            Remove {patient.name} from the roster? This deletes the record.
          </p>
          <div className="record-actions">
            <button className="btn btn-void" type="button" onClick={remove} disabled={busy}>
              {busy ? 'Removing' : 'Remove'}
            </button>
            <button className="btn" type="button" onClick={() => setMode('view')} disabled={busy}>
              Keep
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
