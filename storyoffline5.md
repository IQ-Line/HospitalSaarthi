**Depends on:** Story 1 (Instant Consultation Canvas), Story 3 (Offline Local Persistence), Story 4 (Autosave and Crash Recovery), Story 6 (Duplicate Scan / End-of-Consultation, for the enqueue trigger)\
\
As a Doctor,\
I want my completed consultations to upload to the server automatically as soon as connectivity allows, without me doing anything,\
so that every prescription reaches the patient record reliably even after I worked offline or on a poor connection.

## Context

Stories 1 to 4 let the doctor open a canvas instantly, capture the consultation locally, and never lose work.\
This story defines how a completed consultation moves from the device to the server: the pending-sync queue, automatic draining on connectivity, the sync status lifecycle, idempotency, conflict resolution, and reconciliation of the device-time captured at canvas open. Once a consultation reaches the server while online, the existing downstream pipeline (FHIR bundle generation, ABDM workflows, SMS, and WhatsApp notifications) fires automatically as it does today; this story does not build that pipeline, it only ensures sync delivers the data so the existing triggers run.

## Sync Trigger and Queue Behavior

i. **Enqueue on end-of-consultation:** a consultation is placed in the pending-sync queue when it is ended (the end-of-consultation flow is owned by Story 6). In-progress consultations are not synced incrementally; they remain local drafts until ended.\
ii. **Automatic draining:** whenever connectivity is available, the queue drains automatically without any user action.\
iii. **Oldest-first processing:** the queue is processed oldest-first by enqueue time, so earlier consultations sync before later ones.\
iv. **Periodic and opportunistic retry:** while connectivity exists, the system shall periodically attempt to drain any not-yet-synced items, and shall also attempt a drain immediately when connectivity is restored after an offline period.\
v. **Non-blocking:** sync runs in the background and shall never block the doctor from scanning, writing, or ending another consultation.

## Sync Payload

The payload for a consultation is the locally persisted record (Story 3):

i. Visit ID ii. UHID iii. Patient Name, Age, Gender iv. Vitals v. Canvas Strokes (raw handwriting, the source of truth for clinical content) vi. Consultation Start Date and Time vii. Device Time at canvas open (for clock-skew reconciliation) viii. AI-extracted prescription, only if it was generated online and stored locally ix. The client-generated idempotency key and the local write timestamp (for conflict resolution)

If the AI-extracted prescription was not generated (a fully offline consultation), the server runs the AI layer on the synced canvas strokes after receipt, the device does not generate AI output offline.

## Idempotency and Conflict Resolution

i. **Idempotency key:** each local consultation carries a stable, client-generated idempotency key created once at session creation and unchanged across retries. The server treats a repeated key as the same submission and returns the original result rather than creating a duplicate.\
ii. **No duplicate from retries:** a retry sent after the server already processed the submission (for example, when the success response was lost in transit) shall not create a second server-side consultation; the idempotency key guarantees a single record.\
iii. **Conflict rule (last-write-win by timestamp):** if the server already holds a consultation for the same Visit ID, the submission with the most recent write timestamp wins and becomes the stored record. This applies universally, including to a consultation previously synced from another device.\
iv. **No manual-review path for Visit ID collisions:** Visit ID collisions are resolved automatically by the last-write-win rule and do not require manual review.\
v. **Server-rejected submissions:** if the server rejects a submission for a reason other than a Visit ID collision (for example, an authentication failure, a malformed payload, or a validation error), the consultation is marked Sync Failed and retried per the retry policy, it is not silently dropped.

## Clock-Skew Reconciliation

i. On sync, the server compares the Device Time at canvas open (captured in Story 1) against server time.\
ii. If the skew exceeds a configured threshold, the consultation is **flagged for review but not rejected**. The consultation still syncs and is stored.\
iii. The flag is informational, supporting later investigation of device clocks, it does not block sync, downstream processing, or the consultation itself.

## Sync Status Lifecycle

A consultation moves through the following sync states (extending the local-persistence states in Story 3):

i. **Pending Sync** - ended and queued, not yet uploaded.\
ii. **Sync In Progress** - upload in flight.\
iii. **Synced** -server confirmed receipt; the record becomes eligible for pressure-based cleanup (Story 3) and is no longer a recovery candidate for the canvas (Story 4).\
iv. **Sync Failed** - an attempt failed (network or server rejection); the item remains in the queue and is retried per the retry policy.

There is no separate manual-review state, because Visit ID collisions are resolved automatically by last-write-win.

## Downstream Pipeline Trigger (existing functionality)

i. Once a consultation reaches the server while online, the existing downstream pipeline fires automatically as it does today: FHIR bundle generation, ABDM workflows, SMS notifications, and WhatsApp notifications.\
ii. This story does not implement, modify, or own that pipeline. It only ensures the consultation is delivered to the server so the existing triggers execute.\
iii. The downstream pipeline is asynchronous and non-blocking with respect to sync; a downstream step failing or retrying shall not change the consultation's Synced status, which reflects only that the server received the consultation.\
iv. Because these triggers already exist server-side, no separate downstream story is required; their execution is a consequence of a successful online sync.

## Functional Requirements

i. On end-of-consultation, the system shall mark the consultation Pending Sync and place it in the pending-sync queue. ii. The system shall drain the queue automatically whenever connectivity is available, oldest-first.\
iii. The system shall periodically retry not-yet-synced items while connectivity exists, and shall attempt an immediate drain when connectivity is restored.\
iv. The system shall transition each item through Pending Sync, Sync In Progress, and then Synced on confirmed receipt, or Sync Failed on a failed attempt.\
v. The system shall attach a stable client-generated idempotency key to each consultation and send it with every attempt, so repeated submissions resolve to a single server record.\
vi. The system shall send the full locally persisted payload, including the AI prescription only when it was generated and stored locally.\
vii. The system shall resolve a Visit ID collision on the server by last-write-win using the most recent write timestamp. viii. The system shall send the Device Time at canvas open so the server can perform clock-skew reconciliation and flag (not reject) skewed consultations.\
ix. On Synced, the system shall keep the local copy but make it eligible for pressure-based cleanup (Story 3) and remove it from active recovery candidacy (Story 4).\
x. The system shall retry Sync Failed items per the retry policy and shall not drop or lose an un-synced consultation.\
xi. The system shall not block scanning, writing, or ending another consultation while sync runs.\
xii. On a successful online sync, the system shall allow the existing downstream pipeline to trigger as-is, without additional handling in this story.

## Non-Functional Requirements

i. **No data loss:** no ended consultation shall be lost before it reaches Synced; failed attempts remain queued and retried.\
ii. **Non-blocking:** sync and retries are fully background; doctor workflow latency is unaffected.\
iii. **Retry policy:** Sync Failed items shall be retried with backoff up to a configured maximum within a connectivity window, then retried again on the next connectivity restoration; the queue is never abandoned while items remain.\
iv. **Idempotency:** all sync calls shall be idempotent via the client-generated key; repeats never create duplicates.\
v. **Low-bandwidth tolerance:** sync shall function on fluctuating or low bandwidth, resuming or retrying rather than failing the queue as a whole; one item failing shall not block later items beyond the oldest-first ordering rule.\
vi. **Security:** payloads contain PHI and shall be transmitted over the existing secured, authenticated channel; PHI shall not be written to telemetry or logs.\
vii. **Observability:** the system shall emit telemetry for queue depth, time-in-queue, sync attempt count, sync success and failure rates, retry counts, clock-skew flag occurrences, and time from connectivity restoration to Synced, without including PHI.\
viii. **Ordering integrity:** oldest-first draining shall be maintained; if an older item is stuck in Sync Failed, the system shall continue retrying it while still allowing newer items to proceed so a single bad item does not freeze the entire queue (behavior boundary to confirm in Open Questions).

## Acceptance Criteria

**Enqueue on end-of-consultation**

* Given a consultation has been ended (Story 6)

* When the end-of-consultation action completes

* Then the consultation is marked Pending Sync and placed in the pending-sync queue.

**Automatic sync on connectivity**

* Given one or more consultations are Pending Sync

* When connectivity is available

* Then the system automatically uploads them oldest-first without any user action

* And each transitions to Synced on confirmed receipt.

**Auto sync on reconnect after offline work**

* Given consultations were created and ended while offline

* When connectivity is restored

* Then the system automatically synchronizes them

* And attaches each to its corresponding Visit ID

* Without requiring user intervention.

**No duplicate on retry**

* Given a consultation was actually received by the server but the success response was lost

* When the client retries with the same idempotency key

* Then the server returns the original result

* And no second server-side consultation is created.

**Last-write-win on collision**

* Given the server already holds a consultation for the same Visit ID, including one synced from another device

* When a local consultation for that Visit ID is synced

* Then the submission with the most recent write timestamp becomes the stored record

* And the resolution happens automatically without manual review.

**Sync failure is retried, not lost**

* Given a sync attempt fails due to network or server rejection

* When the attempt completes unsuccessfully

* Then the consultation is marked Sync Failed and remains in the queue

* And is retried per the retry policy

* And is not dropped.

**Clock-skew flag, not rejection**

* Given a consultation's Device Time at open differs from server time beyond the threshold

* When it syncs

* Then it is stored and flagged for review

* And it is not rejected

* And downstream processing still proceeds.

**Downstream pipeline triggers on online sync**

* Given a consultation reaches the server while online

* When receipt is confirmed

* Then the existing FHIR, ABDM, SMS, and WhatsApp triggers fire automatically as they do today

* And a downstream failure does not revert the consultation's Synced status.

**No cross-linking across patients**

* Given multiple offline consultations for different Visit IDs are pending

* When they sync

* Then each is attached only to its own Visit ID

* And no prescription is linked to the wrong patient.

**AI generation post-sync for offline consultations**

* Given a consultation was conducted fully offline with no local AI prescription

* When it syncs to the server online

* Then the server runs the AI layer on the synced canvas strokes

* And the AI prescription is produced server-side after receipt.

## Edge Cases

i. **Connectivity flaps mid-upload:** if connectivity drops during an upload, the item returns to Pending Sync or stays Sync Failed and is retried; the idempotency key prevents a partial-then-retry double from creating duplicates.\
ii. **Success response lost:** covered by idempotency; a retry resolves to the same server record.\
iii. **Server slow but reachable (low bandwidth):** the upload proceeds with retries; the item is not abandoned merely because it is slow.\
iv. **Older item stuck failing:** a persistently failing oldest item shall continue to be retried while newer items are still allowed to sync, so the queue does not freeze on one bad record (final boundary to confirm in Open Questions).\
v. **Consultation ended offline then device storage cleaned:** Synced-first cleanup (Story 3) shall never evict an un-synced (Pending Sync, Sync In Progress, Sync Failed) consultation, so cleanup cannot delete something still owed to the server.\
vi. **Same Visit ID ended on two devices:** both sync; last-write-win by timestamp determines the stored record; no error is shown to either doctor.\
vii. **Logout with pending items:** un-synced items shall be preserved (Story 3 Open Question on logout behavior), sync resumes when an authorized session and connectivity are available.\
viii. **AI generated online then edited offline later:** if a consultation had an online AI prescription and is subsequently changed, the most recent write timestamp governs which version the server stores, consistent with last-write-win.
