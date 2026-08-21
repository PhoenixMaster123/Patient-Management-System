# Records Console

The front-desk UI for the Patient Management System: sign in, work the patient
roster, open a record, and file an intake.

React + Vite. No backend changes were needed to add it.

## Run it

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The stack should be up first (`docker-compose up -d`), so the gateway is
listening on `4004`. If it isn't, sign-in offers **demo mode**: an in-memory
registry seeded from `patient-service/.../data.sql`. Demo mode is labelled in
the UI on every screen and nothing it does is saved.

Seeded user, from `auth-service/.../data.sql`:

```
testuser@test.com / password123
```

## How it reaches the gateway

The gateway sends no CORS headers, so a browser on `:5173` cannot call `:4004`
directly. The dev server proxies instead — `vite.config.js` forwards `/auth` and
`/api` to the gateway, which keeps every request same-origin.

| Variable | Default | Effect |
| --- | --- | --- |
| `VITE_GATEWAY` | `http://localhost:4004` | Where the dev proxy forwards. |
| `VITE_API_BASE` | _(unset)_ | Bypass the proxy and call a gateway directly. Only works once that gateway allows this origin. |

Routes used, all through the gateway:

- `POST /auth/login` → `auth-service:4005/login`
- `GET|POST /api/patients`, `PUT|DELETE /api/patients/{id}` → `patient-service:4000/patients`

For a real deployment, either serve `npm run build` output from the same origin
as the gateway, or add a CORS configuration to `api-gateway` and set
`VITE_API_BASE`.

## Two things the API doesn't return

Both are visible in the UI rather than papered over:

- `PatientResponseDTO` has no `registeredDate`, so the field only shows on
  records where the console already knows it (a patient it just registered, or
  demo mode).
- The create response carries nothing about billing or the Kafka event, so the
  intake receipt reports what `PatientService.createPatient` *dispatches* —
  and says plainly that `BillingGrpcService` still replies with a fixed
  `accountId 12345 / ACTIVE` for every patient.

## Design

The registry is treated as a filing system, and intake as the **carbonless
triplicate the backend actually performs**: creating a patient writes the row,
opens a billing account over gRPC, and publishes a `PatientEvent` to Kafka. One
form, three destinations — so the intake screen is three stacked sheets, and
filing it produces three copies that each report what their service did.

Colour carries that meaning and nothing else: **canary is always billing, rose
is always the event log**, which is why neither appears anywhere in the
navigation or chrome.

Type is split by what it describes — `Archivo` (expanded, uppercase) for the
institution's own voice, `Newsreader` for human data such as names and
addresses, `DM Mono` for machine data such as UUIDs, topics, and statuses.

All tokens live at the top of `src/styles.css`.
