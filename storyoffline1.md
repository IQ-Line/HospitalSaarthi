**Module:** HIMS - Smart Parcha (Doctor Module) **-The** foundational story

#### User Story

As a Doctor,\
I want a blank prescription canvas to open immediately when I scan a patient's Visit ID barcode,\
so that I can begin writing without waiting for patient data to load, even when internet connectivity is slow or unavailable.

#### Context

Smart Parcha is a tab in the HIMS web application's Doctor module. When Smart Parcha is enabled for a doctor in system configuration, the doctor lands directly on the Smart Parcha tab at login; otherwise they land on the patient list. The doctor is issued a device with an attached scanner and writing pad. When the doctor places the patient's parcha on the device, the scanner reads the Visit ID barcode, types it into the Smart Parcha search field, and submits it automatically. The canvas-open flow is triggered by that submitted Visit ID.

The system is rarely fully offline. Most of the time it is online but on low or fluctuating bandwidth, which makes server-driven patient loading slow. The delay the doctor experiences today comes from waiting on that server fetch. This story removes that wait by adopting an **offline-first approach keyed on the Visit ID**: the canvas opens on the Visit ID alone, and all server interaction (patient details, sync) happens in the background and never gates the canvas.\
\
**Core Principle (One Path for All Connectivity States)**

Regardless of connectivity (offline, online with low bandwidth, or online with good bandwidth), the system behaves identically:

i. Validate the Visit ID locally by matching its embedded date against the current system date.\
ii. If valid, open a blank writable canvas immediately.\
iii. Create a Local Consultation Session keyed to the Visit ID and store it locally.\
iv. Capture canvas strokes locally against that Visit ID.\
v. Fetch patient details and sync to the server in the background, never as a precondition to opening or writing.

There is no separate "wait for the server to confirm the Visit ID" path. The server is never on the critical path to opening the canvas.

#### Scope

**In scope:**

i. Receiving the auto-submitted Visit ID from the scanner into the Smart Parcha search field.\
ii. Local validation of the Visit ID format and date, applied uniformly in all connectivity states.\
iii. Creating a Local Consultation Session keyed to the Visit ID.\
iv. Opening a blank, writable canvas with the Visit ID shown in the header.\
v. Showing a "loading icon…" in the Patient Name, Age, Gender placeholder and UHID: placeholder until data arrives.\
vi. Recording the device-time context so a skewed device clock can be reconciled on reconnect.

**Out of scope (covered in later stories):**

i. Background fetch of patient details -**Story 2.**\
ii. Local persistence of strokes, autosave, and crash recovery -**&#x20;Stories 3 and 4.**\
iii. Pending-sync queue, reconnect sync, FHIR, ABDM, SMS, WhatsApp - **Stories 5 and 6.**\
iv. Duplicate scan and next-patient handling -**Story 6.**

#### Visit ID Validation Rules

Visit ID format is currently hardcoded (not configurable). Reference value: `OP2605310000002`, shall be interpreted as:

i. Characters 1–2: patient-type code (`OP` = Outpatient).\
ii. Characters 3–4: year (YY).\
iii. Characters 5–6: month (MM).\
iv. Characters 7–8: date (DD).\
v. Remaining characters: daily running sequence number.

**Validation behavior:**(identical in all connectivity states):

a. The system checks the type code with **Visit ID format stored locally** and matches the embedded YYMMDD against the device's current system date.\
b. If the embedded date equals the device's current date, the parcha is treated as valid and the canvas opens. c. If the date does not match, the type code is unrecognized, or the string does not match the format, no session is created and the system shows "Please scan Today's Parcha".

The system does not perform a blocking server check on the Visit ID. Any server-side validation, if needed, is reconciled in the background during sync (Story 5) and never delays the canvas.

#### Functional Requirements

i. On receiving an auto-submitted Visit ID, the system shall extract and validate it against the current system date per the rules above, without contacting the server.\
ii. On successful validation, the system shall create a Local Consultation Session containing the Visit ID, Consultation Start Time, a unique local session reference, and the device system time captured at creation.\
iii. The system shall open a blank Smart Parcha canvas that is immediately writable.\
iv. The system shall display the scanned Visit ID in the canvas header as the primary reference.\
v. The system shall display a non-blocking "loading…" placeholder in the patient-info area, UHID and Medical History until details are populated by the background fetch (Story 2).\
vi. The system shall capture canvas activity locally against the Visit ID from the moment the canvas opens, in every connectivity state and sync to server when reconnect to server.\
vii. The system shall not block or delay writing on any network activity, in any connectivity state.\
viii. On validation failure, the system shall not create a session and shall show "Please scan Today's Parcha". ix. The system shall persist, with the session, the device system time at canvas open so that a later reconnect can compare it against server time and flag the session if the device clock was skewed (the comparison and flagging itself is performed in the sync story).\
\
**Note-** This story owns immediate capture start

* [SPS-91](https://app.plane.so/iq-line-projects/browse/SPS-91/) owns local persistence model

* [SPS-92](https://app.plane.so/iq-line-projects/browse/SPS-92/) owns autosave cadence and recovery

#### Non-Functional Requirements

i. **Performance:** From the scan submit event to an editable canvas, the canvas shall be editable in under 1 second at p95 on the standard issued device and baseline browser, independent of connectivity.\
ii. **Connectivity independence:** The open-and-write path shall produce identical behavior whether offline, on low bandwidth, or on good bandwidth.\
iii. **Non-blocking design:** Validation and any background network activity shall run off the main writing path; canvas interactivity shall never be gated on a network response.\
iv. **Offline capability:** Local validation logic and the hardcoded format shall be available entirely client-side so the canvas can open with zero connectivity.\
v. **Resilience:** A failed or slow background call shall not affect canvas behavior in any way. .\
vi. **Security:** The Local Consultation Session shall be created with only the Visit ID and timing metadata at this stage. Patient PHI handling is specified in Stories 2 and 3.

### Acceptance Criteria

**Instant canvas, any connectivity state**

* Given Smart Parcha is open in any connectivity state (offline, low bandwidth, or good bandwidth)

* When the doctor scans a barcode whose embedded date matches the device's current system date

* Then a blank writable canvas opens with the Visit ID in the header

* And the doctor can write immediately without waiting for patient data

* And a "loading…" placeholder is shown in the patient-info area and in Medical History Tab.

**No server gating**

* Given the device is online but on low or fluctuating bandwidth

* When the doctor scans a valid Visit ID

* Then the canvas opens within the performance target regardless of whether the patient fetch has completed

* And the canvas does not wait for any server response before becoming writable.

**Wrong-day parcha**

* Given any connectivity state

* When the doctor scans a barcode whose embedded date does not match the device's current date

* Then no canvas opens

* And the system shows "Please scan Today's Parcha".

**Malformed barcode**

* Given any connectivity state

* When the scanned string does not match the hardcoded Visit ID format

* Then no session is created

* And the system shows "Please scan Today's Parcha".

**Local capture against Visit ID**

* Given a valid scan has opened a canvas

* When the doctor writes on the canvas

* Then the canvas activity is captured locally against the scanned Visit ID from the moment writing begins, in every connectivity state.

**Device-time captured for reconciliation**

* Given a valid scan opens a canvas

* When the Local Consultation Session is created

* Then the device system time at creation is stored with the session

* So that it can be compared against server time when connectivity is restored.

**Canvas open performance**

* Given a valid barcode is scanned

* When measured from the scan submit event to the canvas being editable

* Then the canvas shall be editable in under 1 second at p95 on the Canvas area on baseline browser (Crome and Microsoft Edge)

## Edge Cases

i. **Empty or partial scan:** The search field receives an empty or truncated string (mis-scan). The system shall treat it as malformed and show "Please scan Today's Parcha" and no session shall be created.\
ii. **Rapid re-scan of the same Visit ID while a canvas is open:** Deferred to Story 6. This story shall not crash or open a second canvas; behavior is deferred, not undefined (cross-referenced to Story 6).\
iii. **Skewed device clock (wrong-day false negative):** If the device clock is wrong, a genuinely valid today's parcha may be rejected and the doctor sees "Please scan Today's Parcha". This is an accepted limitation of offline validation. The reconcile-on-reconnect mechanism (FR ix) addresses the inverse case where a skewed clock lets an invalid date through.\
iv. **Type code other than OP:** A non-OP but otherwise format-valid code is currently unrecognized and rejected because the target area is Outpatient department.\
This is not intended to work for IP or Emergency Ids.\
v. **Scanner double-enter:** The scanner emits the Visit ID followed by more than one Enter or whitespace. The system shall trim and submit once, not trigger two validations.
