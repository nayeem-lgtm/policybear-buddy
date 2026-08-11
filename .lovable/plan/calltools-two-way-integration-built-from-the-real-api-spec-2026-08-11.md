# CallTools two-way integration — built from the real API spec

I retrieved the full CallTools spec directly (282 endpoints, 117 models). No documentation needed from you. Everything below maps to endpoints that actually exist.

## What the spec confirms we can do

| Capability | How |
| --- | --- |
| Trigger a call from the CRM | Connector buttons + button-click events with auto-call |
| Set agent Available / Break / Lunch | Agent status and clicker-agent status are writable |
| Save a disposition | Historical call dispositions accept new records |
| Real-time events (no polling delay) | Rest hook subscriptions push events to us |
| End / transfer a live call | Live phone call hangup and hangup-transfer |
| Send SMS from the CRM | SMS create endpoint |
| Contacts, notes, history, tags, do-not-call | Full create/update/delete |
| Callbacks | Callback queues and web callback requests |
| Scripts shown to agents | Agent scripts |
| Floor metrics | Agent / campaign / team / queue / state performance, leaderboard, live calls |
| Cross-check attendance | CallTools login shifts vs our shift clock |
| Call transcripts and recordings | Call transcripts and call detail |

Agent audio runs on CallTools' web phone (the spec tracks its registration state per agent). One question for CallTools support: whether that web phone can be embedded in our app, or whether agents keep it open in a small companion window. Either way every action below happens in Policy Bear.

## What gets built

### 1. Agent Workspace — one screen, replaces the CallTools tab
- **Status control**: Available / Break / Lunch / Meeting / After-call — one click writes to CallTools *and* our shift clock together, so break tracking and dialer state can never disagree.
- **Click-to-dial**: call any contact or typed number from anywhere in the CRM.
- **Live call panel**: caller details, timer, the campaign script beside the call, hang up or transfer.
- **Disposition prompt** on hangup using the real CallTools disposition list, written back instantly.
- **My queue**: callbacks and assigned work pulled from CallTools, worked from here.
- Contact details, notes, tags, SMS and full call history inline — all edits push back.

### 2. Manager Floor View
- Live roster: each agent's status, current call, time in status, dials / connects / talk minutes today.
- Live calls in progress with the ability to end or transfer.
- Leaderboard and performance straight from CallTools' reporting endpoints.
- Campaign, queue and bucket health.
- Mismatch alerts, e.g. "on break in the CRM but dialing in CallTools", and CallTools login shifts compared to our attendance records.

### 3. Two-way sync engine
- **Instant inbound**: we register webhook subscriptions with CallTools for calls, dispositions, agent status and contacts, so the CRM updates within seconds.
- **Scheduled sweep**: a periodic catch-up pass reconciles anything a webhook missed, using incremental cursors.
- **Outbound queue**: every CRM-originated write (status, disposition, contact, callback, SMS) goes through a retrying queue, so a CallTools hiccup never loses an agent's work.
- **Sync health screen**: last event received, queue depth, failures with the exact request and response, retry and backfill buttons.

### 4. Safety rails
- A master write switch, off until you've watched the first live test calls.
- Every outbound write logged with payload and response.
- Role-gated: agents can only act on their own status and calls; Operations and above see everything.

## Rollout order

1. **Mapping and connection**: register our webhook receiver, map CallTools users to CRM users, sync the disposition and campaign lists. Verify each write endpoint against one test agent.
2. **Status + disposition** — highest daily value, lowest risk.
3. **Click-to-dial and the live call panel.**
4. **Manager floor view.**
5. **Contacts, callbacks, SMS and list pushes.**
6. **Full two-way on**, agents stop opening CallTools.

Then we do the CEO's simplification — Agent / Publisher / Cashflow workspaces — with this Agent Workspace as the agent's front door.

## Technical notes

- Store the spec-derived endpoint map in a typed client module so field names come from the spec, not guesses.
- New tables: `telephony_action_log` (outbound write + response), `telephony_status_map` (CRM status ↔ CallTools status), `telephony_dispositions`, `telephony_queue_items`, `telephony_outbox` (retrying write queue), plus columns on `telephony_calls` for script, transcript and CRM-originated flag. RLS: agents see their own rows, Operations and above see all.
- Write operations added to `src/lib/calltools.functions.ts` (`setAgentStatus`, `triggerCall`, `hangup`, `transfer`, `saveDisposition`, `upsertContact`, `pushCallback`, `sendSms`), each role-checked and gated by the master write switch.
- Webhook receiver at `src/routes/api/public/hooks/calltools.ts` with a shared-secret path token, registered through the rest hook subscription endpoint; every payload logged to `integration_events`.
- Outbox drained by the existing scheduled sync route, with exponential backoff and a dead-letter view on the sync health screen.
- Existing CallGrid scrubbing and attribution continue on top of the richer CallTools data; first-touch attribution unchanged.
- API key stays server-side only. If the web phone is embeddable, its per-session credentials are minted server-side and never exposed as the account key.
