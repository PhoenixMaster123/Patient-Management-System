import { SEED_PATIENTS, SEED_LOGIN } from './seed.js';

// api-gateway/src/main/resources/application.yml: gateway listens on 4004,
// routes /auth/** -> auth-service:4005 and /api/patients/** -> patient-service:4000.
// The gateway sends no CORS headers, so by default requests go same-origin and
// the Vite dev server proxies them (see vite.config.js). Set VITE_API_BASE to
// call a gateway directly once it allows this origin.
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

/** What to show a human when the gateway is unreachable. */
export const GATEWAY_LABEL =
  import.meta.env.VITE_API_BASE || import.meta.env.VITE_GATEWAY || 'http://localhost:4004';

/** A request the gateway answered, but rejected. Carries the field map from GlobalExceptionHandler. */
export class ApiError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.name = 'ApiError';
    this.fields = fields;
  }
}

/** The gateway never answered — wrong host, or the stack isn't running. */
export class OfflineError extends Error {
  constructor() {
    super('The API gateway did not respond.');
    this.name = 'OfflineError';
  }
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { message: text }; }
}

async function request(path, { method = 'GET', token, body } = {}) {
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new OfflineError();
  }

  if (res.status === 401 || res.status === 403) {
    throw new ApiError('That session is no longer valid. Sign in again.');
  }

  const payload = await parseBody(res);

  if (!res.ok) {
    // GlobalExceptionHandler returns either {message} or {field: message}.
    if (payload && typeof payload === 'object' && !payload.message) {
      const first = Object.values(payload)[0];
      throw new ApiError(first ?? `Request failed (${res.status}).`, payload);
    }
    throw new ApiError(payload?.message ?? `Request failed (${res.status}).`);
  }

  return payload;
}

/* ------------------------------------------------------------------ *
 * Demo mode: an in-memory registry seeded from data.sql, so the console
 * runs without docker-compose. Every screen labels it.
 * ------------------------------------------------------------------ */
let demoRegistry = null;

const demo = {
  reset() { demoRegistry = SEED_PATIENTS.map((p) => ({ ...p })); },
  list() {
    if (!demoRegistry) demo.reset();
    return demoRegistry.map((p) => ({ ...p }));
  },
  create(body) {
    if (!demoRegistry) demo.reset();
    if (demoRegistry.some((p) => p.email.toLowerCase() === body.email.toLowerCase())) {
      throw new ApiError('Email address already exists', { email: 'Email address already exists' });
    }
    const created = { ...body, id: crypto.randomUUID() };
    demoRegistry = [created, ...demoRegistry];
    return { ...created };
  },
  update(id, body) {
    if (!demoRegistry) demo.reset();
    const i = demoRegistry.findIndex((p) => p.id === id);
    if (i === -1) throw new ApiError('Patient not found');
    demoRegistry[i] = { ...demoRegistry[i], ...body };
    return { ...demoRegistry[i] };
  },
  remove(id) {
    if (!demoRegistry) demo.reset();
    demoRegistry = demoRegistry.filter((p) => p.id !== id);
  },
};

/* ------------------------------------------------------------------ */

export const api = {
  async login(email, password) {
    const payload = await request('/auth/login', { method: 'POST', body: { email, password } });
    if (!payload?.token) throw new ApiError('The gateway returned no token.');
    return payload.token;
  },

  demoLogin(email, password) {
    if (email !== SEED_LOGIN.email || password !== SEED_LOGIN.password) {
      throw new ApiError('Email or password does not match the seeded user.');
    }
    demo.reset();
  },

  listPatients(token, offline) {
    return offline ? Promise.resolve(demo.list()) : request('/api/patients', { token });
  },

  createPatient(token, body, offline) {
    if (offline) return Promise.resolve(demo.create(body));
    return request('/api/patients', { method: 'POST', token, body });
  },

  updatePatient(token, id, body, offline) {
    if (offline) return Promise.resolve(demo.update(id, body));
    return request(`/api/patients/${id}`, { method: 'PUT', token, body });
  },

  async deletePatient(token, id, offline) {
    if (offline) return demo.remove(id);
    await request(`/api/patients/${id}`, { method: 'DELETE', token });
  },
};
