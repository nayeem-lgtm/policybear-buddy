# CallTools two-way integration: dial and work entirely inside the CRM

Goal: agents dial, talk, set their status, and disposition calls without leaving Policy Bear. Managers monitor the floor live. CallTools and the CRM stay in sync both directions.

## What you send me first

1. **The swagger/openapi JSON file** — the whole spec. Everything below is built against the real field names in it.
2. **Answers to two things CallTools support must confirm:**
   - Is **WebRTC / browser dialing** enabled on our account? (needed for "talk inside the CRM")
   - What are the **rate limits** (requests per minute) and is there a **webhook / event subscription** feature?
3. Confirmation that `west-2.calltools.io/api` is the right base URL for our account.

If browser audio turns out not to be available on the plan, the same build still ships — agents keep the CallTools softphone open only for audio, and every other action stays in the CRM. Nothing in the plan below is wasted.

## What gets built

### 1. Agent Workspace (the agent's one screen)
A single screen replacing the need to open CallTools:
- **Dial pad and click-to-dial** — call any contact or typed number; in-browser audio when WebRTC is available, otherwise the call is placed and the agent's headset rings.
- **Live call panel** — who's on the line, timer, mute/hold/hangup, the CallTools **script** for the campaign shown beside the call.
- **Disposition on hangup** — a required picker using the real CallTools disposition list; saved to both systems.
- **Status control** — Available / Break / Lunch / Meeting / ACW as one control that writes to CallTools *and* the CRM shift clock at the same time, so break tracking and dialer state can never disagree.
- **My queue** — callbacks and assigned lists pulled from CallTools, worked from here.
- Contact details, notes and history inline; edits push back to CallTools.

### 2. Manager Floor View
- Live roster: every agent's status, current call, time in status, today's dials / contacts / talk minutes.
- Leaderboard and performance pulled from CallTools' own reporting endpoints.
- Campaign / bucket health.
- Barge / listen / whisper if the spec exposes it.
- Mismatch alerts (e.g. "on break in CRM but dialing in CallTools").

### 3. Sync engine (both directions)
- **Pull**: calls, recordings, contacts, dispositions, agent statuses, campaigns, buckets, SMS — incremental, every couple of minutes, plus instant updates via webhook if CallTools supports it.
- **Push**: status changes, dispositions, new/updated contacts, callbacks scheduled in the CRM, contacts added to dialer lists.
- **Conflict rule**: last write wins per field, with every push and pull recorded so any disagreement is traceable.
- **Sync health screen**: last run, records moved, failures, retry and backfill buttons.

### 4. Safety rails
- Writes to CallTools are behind a master switch, off until you've watched the first test calls.
- Every outbound write is logged with what was sent and what came back.
- Retry with backoff, and a queue so a CallTools outage never loses an agent's disposition.

## Rollout order

1. Read the spec, map every endpoint we need, confirm write endpoints against a test agent account.
2. Status control + disposition writing (highest daily value, lowest risk).
3. Click-to-dial and the live call panel.
4. Manager floor view.
5. Contacts, callbacks and list pushes.
6. Turn on full two-way, remove the CallTools tab from agents' daily routine.

## Technical notes

- New tables: `telephony_action_log` (every outbound write + response), `telephony_status_map` (CRM status ↔ CallTools status), `telephony_dispositions` (synced list), `telephony_queue_items` (callbacks/list assignments), plus columns on `telephony_calls` for script id and CRM-originated flag. All with row-level security scoped to the agent for their own rows, Operations and above for everything.
- Server functions in `src/lib/calltools.functions.ts` gain write operations (`setAgentStatus`, `dial`, `hangup`, `setDisposition`, `upsertContact`, `pushCallback`), each behind a role check and the master write switch.
- Webhook receiver at `src/routes/api/public/hooks/calltools.ts`, signature-verified, so CallTools can push events instantly instead of us polling.
- The existing provider capability layer stays: any endpoint CallTools doesn't expose renders as a disabled control with a plain-English tooltip rather than a broken button.
- CallGrid scrubbing and attribution continue unchanged on top of the richer CallTools data.
- Browser audio, if enabled, runs through CallTools' WebRTC client loaded only in the browser; credentials are minted server-side per session so no API key reaches the page.

## After this

Once CallTools is fully wired, we do the simplification the CEO asked for — Agent / Publisher / Cashflow workspaces — and the Agent Workspace above becomes the agent's single front door.
