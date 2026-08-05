# CallTools + CallGrid: what's actually possible

## Short answer

Full in-CRM dialing (agents click-to-dial, set Available/Break, and submit dispositions from Policy Bear, never opening CallTools) is **not achievable with the API surface we can see today**. The reachable CallTools endpoints on your instance are `/users/`, `/campaigns/`, `/contacts/`, `/calls/`, `/sms/` — record data. Paths for dispositions, agent status and webhooks return "not found", and CallTools' softphone/WebRTC seat is a licensed product, not an open API. So:

- Not possible now: dial from CRM, change agent CallTools status from CRM, write dispositions back into CallTools.
- Possible now: agents keep dialing in CallTools; **Policy Bear becomes the single source of truth** — continuous sync of calls, talk time, recordings, contacts and agent activity, live monitoring, and automatic scrubbing against CallGrid so every callback and sale is attributed to CallTools vs CallGrid.
- Partly possible: pushing contacts/lead lists from CRM into CallTools campaigns (the `/contacts/` endpoint accepts writes) — we build it behind a feature flag and confirm on first live write.

Recommended build: the second option, structured so the first can be dropped in later without rework (a provider layer with `dial()`, `setAgentStatus()`, `setDisposition()` that returns "unsupported" until CallTools grants those capabilities).

## What gets built

### 1. Sync engine (both providers)
- Scheduled pull every few minutes: CallTools calls/contacts/SMS/users, CallGrid calls/campaigns/buyers/publishers/tags.
- Normalized `telephony_calls` store: provider, provider call id, agent, from/to (E.164), direction, start/end, talk seconds, disposition, recording URL, campaign, buyer/publisher, revenue/payout.
- Cursor/watermark per provider so each run only pulls new records; upserts on `(provider, provider_call_id)` so re-runs are safe.
- Sync health panel: last run, records pulled, errors, backfill button with date range.

### 2. Scrubbing and attribution
- Matching on normalized phone number plus a configurable time window (default 30 days), so a CallGrid inbound call and a later CallTools outbound to the same number link into one **lead journey**.
- Auto-derived flags per lead: first touch (CallGrid inbound vs CallTools outbound), whether a callback was made through CallTools, number of attempts, days to contact.
- Sale attribution: when a sale/policy is recorded, it inherits the journey and is credited to CallGrid or CallTools by first-touch, with a manual override for edge cases.
- Attribution dashboard: sales and callbacks split by source, per agent and per campaign, with dropdown filters (date range, source, agent, campaign) — no cluttered wall of tiles.

### 3. Live monitoring
- Live Operations screen: calls in progress and just-ended per agent, talk time, current campaign, today's dials/contacts/talk minutes, refreshed on a short poll.
- Agent presence stays in Policy Bear (existing shift/break system) and is shown side by side with CallTools activity, so a "on break but dialing" mismatch is visible even though we can't push status into CallTools.

### 4. Recordings and call history
- Recording playback inline from the call record (streamed through the CRM so the provider key never reaches the browser), with agent, duration, disposition and linked contact.

### 5. Provider capability layer
- One interface for both providers with `dial`, `setAgentStatus`, `setDisposition`, `pushContact`. Unsupported actions render as disabled buttons with a "not enabled on your CallTools plan" tooltip, so the day CallTools opens those endpoints it's a config change, not a rebuild.

## Technical notes

- New tables: `telephony_calls`, `telephony_agents` (provider agent ↔ CRM user mapping), `lead_journeys`, `journey_touches`, `sync_state`, `attribution_overrides`. All in the public schema with grants and RLS scoped to Operations/Admin/CEO roles, agents limited to their own rows.
- Sync runs as a scheduled job hitting a `/api/public/*` route authenticated with the anon key, calling the existing server-function proxies. Provider keys stay server-side.
- Phone normalization to E.164 in a shared helper used by both ingest and matching, so scrubbing is deterministic.
- Ingest is idempotent; attribution is recomputed from touches rather than mutated in place, so a re-sync can't double-count sales.
- Webhooks: CallGrid has a webhook resource (197 configured). We expose a receiver endpoint so CallGrid can push call events in near real time; CallTools stays on polling until an equivalent exists.

## What I need from you to finish the last mile

- Whether CallTools has enabled an **outbound API / click-to-dial add-on** on your account (their support can confirm). If yes, in-CRM dialing becomes possible and I wire it into the same provider layer.
- Confirmation that first-touch (CallGrid inbound wins over a later CallTools callback) is the attribution rule you want, or a different rule.
