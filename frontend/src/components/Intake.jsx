import { useState } from 'react';
import { formatDate, todayIso } from '../format.js';

const BLANK = { name: '', email: '', address: '', dateOfBirth: '', registeredDate: todayIso() };

/** Mirrors PatientRequestDTO so the form catches what the server would reject. */
function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Name is required';
  else if (form.name.length > 100) errors.name = 'Name must be less than 100 characters';
  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email should be valid';
  if (!form.address.trim()) errors.address = 'Address is required';
  if (!form.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
  if (!form.registeredDate) errors.registeredDate = 'Registered date is required';
  return errors;
}

export default function Intake({ onCreate, onOpenRecord }) {
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filed, setFiled] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setGeneral(null);

    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const created = await onCreate({ ...form });
      setFiled({ ...form, ...created });
      setForm(BLANK);
      setErrors({});
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length && !err.fields.message) {
        setErrors(err.fields);
      } else if (/email/i.test(err.message ?? '')) {
        setErrors({ email: 'That email is already on file' });
        setGeneral('That email is already on file. Search the roster for it, or use another address.');
      } else {
        setGeneral(err.message ?? 'The intake could not be filed.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (filed) {
    return (
      <section className="receipt">
        <div className="intake-head">
          <div className="inst muted">Intake filed</div>
          <h1 className="intake-title">Three copies, three services.</h1>
          <p className="intake-sub">
            The white copy is what <span className="machine">POST /api/patients</span> returned.
            The other two are what patient-service dispatched on create — billing over gRPC, and a
            <span className="machine"> PatientEvent</span> onto Kafka for analytics.
          </p>
        </div>

        <div className="copies">
          <article className="copy copy-white">
            <header className="copy-head">
              <span className="inst copy-dest">Patient</span>
              <span className="copy-n">1 of 3</span>
            </header>
            <dl>
              <div className="copy-line">
                <dt className="inst">Record no.</dt>
                <dd className="machine">{filed.id}</dd>
              </div>
              <div className="copy-line">
                <dt className="inst">Name</dt>
                <dd className="human" style={{ fontSize: 17 }}>{filed.name}</dd>
              </div>
              <div className="copy-line">
                <dt className="inst">Registered</dt>
                <dd className="machine">{formatDate(filed.registeredDate)}</dd>
              </div>
            </dl>
            <p className="copy-foot">
              Row written to the <span className="machine">patient</span> table and returned by the
              gateway.
            </p>
          </article>

          <article className="copy copy-canary">
            <header className="copy-head">
              <span className="inst copy-dest">Billing</span>
              <span className="copy-n">2 of 3</span>
            </header>
            <dl>
              <div className="copy-line">
                <dt className="inst">Called</dt>
                <dd className="machine">BillingService.CreateBillingAccount</dd>
              </div>
              <div className="copy-line">
                <dt className="inst">Replies</dt>
                <dd className="machine">accountId 12345</dd>
              </div>
              <div className="copy-line">
                <dt className="inst">Status</dt>
                <dd><span className="inst copy-status">Active</span></dd>
              </div>
            </dl>
            <p className="copy-foot">
              BillingGrpcService returns these same values for every patient — its business logic is
              still a stub, and the create response does not carry them back.
            </p>
          </article>

          <article className="copy copy-rose">
            <header className="copy-head">
              <span className="inst copy-dest">Event log</span>
              <span className="copy-n">3 of 3</span>
            </header>
            <dl>
              <div className="copy-line">
                <dt className="inst">Topic</dt>
                <dd className="machine">patient</dd>
              </div>
              <div className="copy-line">
                <dt className="inst">Event type</dt>
                <dd className="machine">PATIENT_CREATED</dd>
              </div>
              <div className="copy-line">
                <dt className="inst">Carries</dt>
                <dd className="machine">patientId · name · email</dd>
              </div>
            </dl>
            <p className="copy-foot">
              Published as a protobuf <span className="machine">PatientEvent</span>.
              analytics-service consumes the topic.
            </p>
          </article>
        </div>

        <div className="record-actions">
          <button className="btn btn-primary" type="button" onClick={() => setFiled(null)}>
            Register another
          </button>
          <button className="btn" type="button" onClick={() => onOpenRecord(filed.id)}>
            Open the record
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="intake">
      <div className="intake-head">
        <div className="inst muted">Intake</div>
        <h1 className="intake-title">Register a patient.</h1>
        <p className="intake-sub">
          Filed in triplicate: the record itself, a billing account, and an event on the log.
        </p>
      </div>

      <div className="stack">
        <div className="stack-copy stack-canary" aria-hidden="true">
          <span className="inst">Billing · copy 2</span>
        </div>
        <div className="stack-copy stack-rose" aria-hidden="true">
          <span className="inst">Event log · copy 3</span>
        </div>

        <form className="stack-form" onSubmit={submit} noValidate>
          {general && <div className="alert">{general}</div>}

          <div className="form-grid">
            <div className="form-field form-row-wide">
              <label className="inst" htmlFor="in-name">Full name</label>
              <input
                id="in-name"
                className={`input ${errors.name ? 'input-invalid' : ''}`}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Jane Smith"
                maxLength={100}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            <div className="form-field">
              <label className="inst" htmlFor="in-email">Email</label>
              <input
                id="in-email"
                className={`input ${errors.email ? 'input-invalid' : ''}`}
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="jane.smith@example.com"
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="form-field">
              <label className="inst" htmlFor="in-dob">Date of birth</label>
              <input
                id="in-dob"
                className={`input input-date ${errors.dateOfBirth ? 'input-invalid' : ''}`}
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set('dateOfBirth', e.target.value)}
              />
              {errors.dateOfBirth && <span className="field-error">{errors.dateOfBirth}</span>}
            </div>

            <div className="form-field form-row-wide">
              <label className="inst" htmlFor="in-address">Address</label>
              <input
                id="in-address"
                className={`input ${errors.address ? 'input-invalid' : ''}`}
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="456 Elm St, Shelbyville"
              />
              {errors.address && <span className="field-error">{errors.address}</span>}
            </div>

            <div className="form-field">
              <label className="inst" htmlFor="in-registered">Registered</label>
              <input
                id="in-registered"
                className={`input input-date ${errors.registeredDate ? 'input-invalid' : ''}`}
                type="date"
                value={form.registeredDate}
                onChange={(e) => set('registeredDate', e.target.value)}
              />
              {errors.registeredDate && (
                <span className="field-error">{errors.registeredDate}</span>
              )}
            </div>
          </div>

          <div className="form-foot">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Filing' : 'File intake'}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => { setForm(BLANK); setErrors({}); setGeneral(null); }}
              disabled={busy}
            >
              Clear form
            </button>
            <p className="form-note">Email must be unique across the registry.</p>
          </div>
        </form>
      </div>
    </section>
  );
}
