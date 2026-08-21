import { useState } from 'react';
import { api, GATEWAY_LABEL, ApiError, OfflineError } from '../api.js';
import { SEED_LOGIN } from '../seed.js';

export default function SignIn({ onSignedIn }) {
  const [email, setEmail] = useState(SEED_LOGIN.email);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [gatewayDown, setGatewayDown] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const token = await api.login(email, password);
      onSignedIn({ token, email, offline: false });
    } catch (err) {
      if (err instanceof OfflineError) {
        setGatewayDown(true);
        setError(null);
      } else if (err instanceof ApiError) {
        setError('Email or password does not match.');
      } else {
        setError('Sign-in failed. Check the browser console for details.');
      }
    } finally {
      setBusy(false);
    }
  }

  function enterDemo() {
    try {
      api.demoLogin(email, password);
      onSignedIn({ token: 'demo', email, offline: true });
    } catch {
      setError(`Demo mode accepts the seeded user only: ${SEED_LOGIN.email} / ${SEED_LOGIN.password}`);
    }
  }

  return (
    <main className="gate">
      <div className="sheet-card perf gate-card">
        <div className="gate-mark">Records Console</div>
        <p className="gate-sub">Sign in to open the patient registry.</p>

        {error && <div className="alert">{error}</div>}

        {gatewayDown && (
          <div className="alert">
            <div className="inst" style={{ marginBottom: 6 }}>Gateway not responding</div>
            Nothing answered at <span className="machine">{GATEWAY_LABEL}</span>. Start the stack with{' '}
            <span className="machine">docker-compose up -d</span>, or work against the seeded
            registry in demo mode.
          </div>
        )}

        <form onSubmit={submit} noValidate>
          <div className="gate-fields">
            <div className="form-field">
              <label className="inst" htmlFor="gate-email">Email</label>
              <input
                id="gate-email"
                className="input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label className="inst" htmlFor="gate-password">Password</label>
              <input
                id="gate-password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="gate-foot">
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'Signing in' : 'Sign in'}
              </button>
              {gatewayDown && (
                <button className="btn" type="button" onClick={enterDemo}>
                  Work in demo mode
                </button>
              )}
            </div>

            <p className="gate-hint machine">
              Seeded user: <code>{SEED_LOGIN.email}</code> / <code>{SEED_LOGIN.password}</code>
              <br />
              Gateway: <code>{GATEWAY_LABEL}</code>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
