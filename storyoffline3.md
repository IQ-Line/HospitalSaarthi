**Depends on:** Story 1 (Instant Consultation Canvas), Story 2 (Background Patient Metadata Load)\
\
As a Doctor,\
I want my consultation, the Visit ID, the patient identity and vitals, and everything I write on the canvas to be stored safely on my device as I work, so that my work is never lost when the internet is slow or unavailable and can be synced to the server later.

## Context

Smart Parcha is a tab in the HIMS web-based SaaS application. Stories 1 and 2 open the canvas instantly and fetch patient metadata in the background. This story defines where and how the consultation is persisted locally so that an offline-first workflow is durable: the consultation must survive low or no connectivity, page reloads, and (with Story 4) unexpected crashes. The AI-extracted prescription is generated only when the server and AI layer are reachable; when it is generated online it is stored in the local record (and synced to the server), but a fully offline consultation stores raw canvas strokes and is enriched with AI output server-side after it syncs (Story 5).

This story owns the local storage design that the feedback flagged as vague (gap 8). Autosave cadence and crash recovery (gaps 9 and 10) are owned by Story 4 and only referenced here.\
\
**Local Consultation Record (Persisted Fields)**

The system shall persist the following per consultation, keyed by Visit ID:

i. Visit ID (primary local key)\
ii. UHID\
iii. Patient Name\
iv. Age\
v. Gender\
vi. Consultation Start Date and Time\
vii. Device Time at canvas open\
viii. Canvas Strokes (raw handwriting)\
ix. Vitals\
x. Sync Status\
xi. AI-extracted prescription (conditionally persisted; stored only when generated online, see below)

**Conditionally persisted:**

i. **AI-extracted prescription** is generated only when the server and AI layer are reachable (online-only generation). When it is generated online, it shall be stored in the local consultation record so that it is covered by autosave and crash recovery (Story 4) and is synced to the server when online (Story 5).\
A consultation conducted fully offline has no AI output stored locally, in that case the AI prescription is produced server-side only after the consultation syncs.

**Explicitly not persisted locally:**

i. **Medical History** and **Previous Prescriptions** are fetched for on-screen display in **Story 2&#x20;**&#x62;ut not stored in the local record, on recovery they are re-fetched from the server rather than restored from local storage.\
\
**Storage Technology**

i. The recommended local store is **IndexedDB**, chosen for its capacity, asynchronous non-blocking API, and suitability for offline-first web applications storing both structured data and large stroke payloads. Final selection rests with Engineering.\
ii. The store shall hold one record per Visit ID, with canvas strokes stored in a form that supports incremental append/update so autosave (Story 4) does not rewrite the entire stroke set on every save.\
iii. The stored data shall be queryable by Visit ID and by Sync Status (to support the pending-sync queue in Story 5).\
\
**Security and PHI Protection at Rest**

i. The local consultation record contains Protected Health Information (UHID, name, age, gender, vitals) and shall be protected at rest. **Protecting PHI at rest is a hard requirement.** The exact mechanism is an open engineering question. ii. **Product-suggested approach:** Encrypt the sensitive fields client-side using a key derived from the authenticated HIMS session, so that PHI is not readable in the browser store without an active, authorized session. Engineering may propose an alternative that meets the at-rest protection requirement.\
iii. Access to the local store shall be scoped to the authenticated doctor session, on session logout or expiry, access to decrypt local PHI shall no longer be available without re-authentication.\
\
**Retention and Cleanup**

i. A local consultation record shall be retained until **storage pressure** forces cleanup. There is no fixed time-based deletion window in this version.\
ii. Cleanup eligibility shall prioritize records already in **Synced** status, un-synced records (Pending Sync, Sync In Progress, Sync Failed) shall be preserved as long as possible and shall not be evicted to make room ahead of already-synced records.\
iii. When the store approaches its capacity limit, the system shall evict the oldest **Synced** records first.\
iv. If storage pressure cannot be relieved by evicting Synced records alone i.e., the remaining records are all un-synced, the system shall surface a non-blocking warning to the doctor that the device is low on local storage and consultations should be synced, and shall not silently discard un-synced PHI.\
v. Successful sync (Story 5) marks a record Synced and thereby makes it eligible for pressure-based cleanup, sync does not by itself delete the local copy.\
\
**Functional Requirements**

i. On creation of a Local Consultation Session (Story 1), the system shall create a local record keyed by Visit ID containing the fields available at that moment (Visit ID, Consultation Start Date and Time, Device Time at open, initial empty canvas strokes, Sync Status = Draft Local).\
ii. As patient metadata is fetched (Story 2), the system shall write UHID, Patient Name, Age, Gender, and Vitals into the same local record.\
iii. As the doctor writes, canvas strokes shall be persisted to the local record (cadence and triggers defined in Story 4).\
iv. Each record shall carry a Sync Status reflecting its lifecycle (the full set is defined in Story 5; this story uses at minimum Draft Local, Pending Sync, and Synced).\
v. The local record shall be self-contained for offline continuation of the consultation: the doctor shall be able to keep writing using only locally stored data with zero connectivity. AI prescription output is the one element that requires online processing to be generated; once generated online it is stored locally like other persisted fields.\
vi. The system shall store canvas strokes in a way that supports incremental persistence and recovery without requiring the full payload to be rewritten on each save.\
vii. The system shall keep separate, independent local records per Visit ID; no fields from one consultation shall leak into another (supports Story 6 multi-patient handling).\
viii. The system shall not persist Medical History or Previous Prescriptions in the local record. The AI-extracted prescription shall be persisted only when it was generated online; it shall not be present in the local record for consultations conducted fully offline.\
ix. On a successful fetch refresh (Story 2 retry returning fuller metadata), the system shall update the persisted metadata fields to the latest values without altering persisted canvas strokes.

## Local Persistence State (subset of session state model)

This story contributes the following local-record states, the complete sync lifecycle is **defined in Story 5:**

i. **Draft Local** - record created, consultation in progress locally, not yet queued for sync.\
ii. **Pending Sync** - consultation marked ready to sync (e.g., on end-of-consultation, **Story 4/Story 5**) but not yet uploaded.\
iii. **Synced** - server confirmed receipt, record is now eligible for pressure-based cleanup.

## Non-Functional Requirements

i. **Durability:** A write to the local store shall be committed such that a reload of the tab restores the consultation from local storage without server access (subject to PHI decryption with an active session).\
ii. **Non-blocking:** local writes shall be asynchronous and shall not introduce perceptible latency to canvas writing.\
iii. **Capacity awareness:** the system shall monitor available local-store quota and trigger the cleanup and warning behavior defined above before hitting hard browser limits.\
iv. **Corruption resilience:** if a local record is detected as corrupt or unreadable, the system shall isolate that record, avoid crashing the application, and surface a non-blocking notice; recovery behavior for partial data is detailed in **Story 4.**\
v. **Security:** PHI at rest protected per the Security section.\
vi. **Isolation:** the local store shall be partitioned per authenticated doctor/session so a shared device does not expose one doctor's local PHI to another.

## Acceptance Criteria

**Record created on scan**

* Given a valid Visit ID has opened a canvas (Story 1)

* When the Local Consultation Session is created

* Then a local record keyed by Visit ID exists containing Visit ID, Consultation Start Date and Time, Device Time at open, an initial canvas-stroke container, and Sync Status = Draft Local.

**Metadata persisted on fetch**

* Given the background fetch returns patient metadata (Story 2)

* When the metadata is processed

* Then UHID, Patient Name, Age, Gender, and Vitals are written into the same local record

* And Medical History and Previous Prescriptions are not written to the local record

* And the AI-extracted prescription is written to the local record only if it was generated online.

**Offline durability across reload**

* Given a consultation is in progress with the device offline

* When the Smart Parcha tab is reloaded

* Then the consultation is restored from local storage with its Visit ID, persisted patient fields, vitals, and canvas strokes intact

* And no server call is required to restore it

* And Medical History and Previous Prescriptions are shown as re-fetch-pending rather than restored.

**PHI protected at rest**

* Given a local record containing PHI exists

* When the local store is inspected outside an active authorized session

* Then the PHI is not readable in plain form

* And PHI does not appear in any telemetry or log output.

**Retention until storage pressure**

* Given multiple consultations exist locally, some Synced and some un-synced

* When the local store approaches its capacity limit

* Then the system evicts the oldest Synced records first

* And does not evict any un-synced record while Synced records remain to be cleaned.

**Low-storage warning protects un-synced data**

* Given the store is under pressure and only un-synced records remain

* When cleanup cannot free space by evicting Synced records

* Then the system shows a non-blocking low-storage warning prompting the doctor to sync

* And no un-synced PHI is silently discarded.

**Per-Visit-ID isolation**

* Given two consultations for different Visit IDs exist locally

* When either is read or updated

* Then no field from one record appears in or overwrites the other.

**AI output persistence depends on connectivity**

* Given a consultation is completed fully offline

* When the local record is examined

* Then it contains canvas strokes but no AI-extracted prescription

* And the AI output is expected only after the consultation syncs (Story 5)

* Given instead the consultation ran online and the AI prescription was generated

* When the local record is examined

* Then the AI-extracted prescription is present in the local record and is queued to sync to the server.

## Edge Cases

i. **Local store unavailable or blocked:** if IndexedDB is disabled or quota is zero (e.g., private browsing or browser policy), the system shall provide non blocking warning to the doctor that "System space is unavailable" and shall not silently proceed as if data were safe.\
System should still capture and save the data locally after removing the oldest record.\
ii. **Corrupt stroke payload:** a single corrupt record shall not block access to other local records, the corrupt record is isolated and flagged (**recovery detailed in Story 4).**\
iii. **Quota exceeded mid-write:** if a local write fails due to quota during an active consultation, the system shall trigger Synced-record eviction and retry, if still failing, it shall warn the doctor immediately rather than losing strokes.\
iv. **Logout with un-synced records present:** if the doctor logs out while un-synced records exist, the system shall warn before logout and define whether records persist for re-login or are blocked from deletion.\
v. **Shared device, second doctor logs in:** the new session shall not be able to read the previous doctor's un-synced PHI, partitioning per session must enforces this.\
vi. **Same Visit ID re-scanned:** handling of a re-scan resolves to the existing local record rather than creating a second one. Full duplicate-scan rules are owned by **Story 6.**
