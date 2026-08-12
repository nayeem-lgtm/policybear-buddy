# Finish the CallTools connection with your live IDs

Yes — that's everything I needed. The connector button ID (27177) was the missing piece; with the campaign, queue, caller ID and test seat I can wire dialing end to end.

## What's already in place

The two-way engine, Agent Desk, Live Floor, Admin → CallTools screen, retry queue and webhook receiver are all built. They authenticate exactly as you described (`Authorization: Token …` against `west-2.calltools.io/api`). What's missing is the account-specific configuration: the connector button, campaign, queue and caller ID were never filled in, and today's settings row has no place to store a queue or caller ID at all.

## What gets done

### 1. Store the real account configuration
Add queue and caller-ID fields to the telephony settings, and seed the row with your values:

| Setting | Value |
| --- | --- |
| Connector button | CRM Live Dial Button — 27177 |
| Default campaign | Final Expense Inbound — 86036 |
| Default queue | FE Inbound Queue — 10051 (ext 110) |
| Default caller ID | Agent — 728509 / +1 702 628 8148 |

The Admin → CallTools screen gets inputs for the queue and caller ID next to the existing connector/campaign fields, so you can change them later without me.

### 2. Link the test seat
Map CallTools seat `Test CRM` (user ID 402349b3-…ded32, ext 987, support@policybear.com) to a CRM employee, so status changes and calls made from the desk are attributed correctly.

### 3. Click-to-call carrying the full context
Dial requests now send phone number + agent seat + campaign + queue + caller ID through connector button 27177, instead of just number + campaign. Call buttons across the CRM (contact rows, Agent Desk, callbacks) all route through this one path.

### 4. Verify each API function against the live account
Run a real request per checklist item and report exactly what your key is allowed to do:
- authentication and seat lookup
- agent status set (available / break / offline)
- live-call read: call UUID, active number, campaign, queue, agent, duration
- disposition post (UUID + agent + disposition + notes + result)
- webhook subscription registration for call started / answered / ended, disposition completed, agent status changed

Anything the key rejects, I report back with the exact endpoint and response so you can widen its scope — I won't leave a silent failure behind a switch.

### 5. Turn it on
With verification passing, enable writes, dialing, status sync and real-time updates, then run one live test call from the CRM on the Test CRM seat and confirm the call, disposition and status all land on both sides.

## Technical notes

- Migration adds `default_queue_id`, `default_caller_id`, `default_caller_number` to `telephony_settings` and updates the `calltools` row with the values above (grants/RLS unchanged, existing policies cover it).
- `triggerCall` in `src/lib/calltools.server.ts` extends its `connectorbuttonevents` payload with queue and caller-ID fields, falling back to settings when the caller omits them.
- Seat mapping written through the existing agent-map table on the Admin → CallTools screen.
- API key stays in the server-side secret; nothing new is exposed to the browser. Please rotate the portal password you pasted earlier — the integration never uses it.
