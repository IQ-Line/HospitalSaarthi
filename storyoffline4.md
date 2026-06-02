**Depends on:** Story 1 (Instant Consultation Canvas), Story 3 (Offline Local Draft / Session Persistence)\
\
As a Doctor,\
I want everything I write to be saved automatically as I write and restored exactly as I left it if the application closes or crashes,\
so that I never lose a single stroke of a prescription and never have to manually recover my work.

## Context

**Stories 1 to 3** open the canvas instantly, fetch patient metadata in the background, and define the local store. This story defines when canvas work is written to that local store (autosave) and how a consultation is brought back after an unexpected close or crash (recovery). The governing principle here is the strictest one in this feature: no stroke loss is tolerable. A doctor's prescription is a clinical and legal record, so the design favors saving too often over saving too little, and recovery must be automatic and complete.

Autosave writes to the local consultation record defined in **Story 3**.\
The AI-extracted prescription is generated only when the server and AI layer are reachable (online-only generation). However, when the AI prescription is generated online, the system shall store that AI output locally as part of the consultation record and sync it to the server when online. This means the AI prescription is part of autosave and recovery whenever it exists locally. A fully offline consultation has no AI output until it syncs, at which point the AI layer runs server-side.\
Recovery restores raw canvas strokes, locally persisted patient fields, and any locally stored AI prescription, and re-fetches any non-persisted data from the server.

## Autosave Behavior

i. **Primary trigger — pen-lift:** the system shall persist canvas strokes to the local store on each pen-lift (each completed stroke). A stroke is considered saved once the pen is lifted and the write commits. ii. **Safety-net triggers:** in addition to pen-lift, the system shall persist current canvas state on tab blur, page hide/visibility change, navigation away, and end-of-consultation, so that work in progress is captured even if a final stroke is interrupted. iii. **No-loss objective:** the autosave design shall ensure that no completed stroke can be lost. Once a stroke is completed (pen lifted), it shall be durably written before the doctor can lose it to a close, reload, or crash. iv. **Incremental writes:** autosave shall append or update strokes incrementally in the local record (per Story 3) rather than rewriting the full stroke set on every save, so per-save cost stays low and does not introduce writing latency. v. **AI prescription generation is online-only, but is autosaved when it exists:** the AI-extracted prescription is generated only when the server and AI layer are reachable. When it is generated online, it shall be stored in the local consultation record and is therefore covered by autosave and recovery, and shall be synced to the server when online. Autosave of canvas strokes remains independent of, and is never weakened by, the AI ingest/canvas-capture cadence; pen-lift stroke saving continues to apply in all connectivity states. vi. **Debounce only within a stroke:** the system may debounce intra-stroke sampling for performance, but shall not debounce across pen-lifts in a way that leaves a completed stroke unsaved.

## Save Indicator (Acknowledgment)

i. The system shall display a subtle, non-intrusive save-status badge to the doctor reflecting autosave state, with at least the states "Saving…" and "Saved".\
ii. The badge shall update to "Saved" only after the local write for the current strokes has committed, giving the doctor a true acknowledgment that work is safe locally.\
iii. If a local write fails, the badge shall reflect an unsaved/error state and the system shall retry the write; the doctor shall not be left believing work is saved when it is not.\
iv. The save badge reflects local save status only. It is distinct from sync status (Story 5); "Saved" means saved on the device, not synced to the server.\
v. The badge shall not block, overlay, or interrupt the writing canvas.

## Crash Recovery Behavior

i. **Automatic restore:** When the doctor reopens or reloads Smart Parcha and an un-synced local draft exists, the system shall automatically restore the last saved state into the canvas. No manual recovery action shall be required.\
ii. **Most-recent draft into the canvas:** If multiple un-synced drafts exist (e.g., several patients seen offline), the system shall restore the most recent draft into the canvas. The other un-synced drafts remain preserved in the local store and pending-sync queue (Stories 3 and 5) and are not lost. Selection or switching among them is written in **Story 6.**\
iii. **Recovered notice:** Restoration is silent and automatic, the save badge shall settle to "Saved" once the restored state is loaded.\
iv. **What is restored:** Visit ID, locally persisted patient fields (UHID, Patient Name, Age, Gender, Vitals), Consultation Start Date and Time, Device Time at open, all persisted canvas strokes, and any locally stored AI-extracted prescription (present only if it was generated online and saved locally), restored to the exact last-saved state.\
v. **What is re-fetched, not restored:** Medical History and Previous Prescriptions are not persisted locally (Story 3) and shall be re-fetched from the server in the background after recovery. If no AI-extracted prescription was generated and stored locally (e.g., the consultation was conducted offline), no AI output is restored. It is produced server-side only after the consultation syncs **(Story 5).**\
vi. **Continuity:** After restore, the consultation continues from the last saved state in the same session for that Visit ID. No duplicate consultation or duplicate local record shall be created on recovery.\
vii. **Partial or incomplete saved state:** if the last saved state is incomplete (e.g., a crash mid-write), the system shall restore up to the last completed stroke that was durably written. Because saving occurs on each pen-lift, the maximum exposure is an in-progress stroke that was never completed, which by definition has no pen-lift and is not a completed stroke.

## State Interaction

i. Recovery operates on records in **Draft Local** or **Pending Sync** status (Story 3) that have not yet **Synced**.\
ii. A record already **Synced** to the server is not a recovery candidate for the canvas (its authoritative copy is on the server). Pressure-based cleanup of Synced records (Story 3) does not affect recovery of un-synced work.\
iii. Recovery does not change a record's sync status. It only loads it into the canvas for continuation. Sync is triggered by the rules in **Story 5.**

## Functional Requirements

i. The system shall persist canvas strokes to the local consultation record on each pen-lift.\
ii. The system shall additionally persist current canvas state on tab blur, page hide, navigation away, and end-of-consultation.\
iii. The system shall guarantee that no completed (pen-lifted) stroke is lost across reload, close, or crash.\
iv. The system shall display a save-status badge with at least "Saving…" and "Saved" states, updating to "Saved" only after the local write commits.\
v. On reopening Smart Parcha with un-synced drafts present, the system shall automatically restore the most recent un-synced draft into the canvas without requiring manual action.\
vi. The system shall preserve all other un-synced drafts in the local store and pending-sync queue when restoring the most recent one.\
vii. The system shall restore the exact last-saved canvas strokes, locally persisted patient fields, and any locally stored AI-extracted prescription, and shall re-fetch Medical History and Previous Prescriptions from the server, when no AI prescription was generated and stored locally, AI output is produced server-side only after sync rather than restored locally.\
viii. The system shall not create a duplicate consultation or duplicate local record during recovery.\
ix. On a failed local write, the system shall reflect an unsaved/error state in the badge and retry the write.

## Non-Functional Requirements

i. **No stroke loss:** The maximum tolerated loss is zero completed strokes; the only acceptable unsaved content is a stroke still in progress (pen not yet lifted).\
ii. **Write latency:** Autosave writes shall be asynchronous and shall not introduce perceptible lag to handwriting, per-pen-lift save cost shall remain low via incremental writes.\
iii. **Recovery time:** Automatic restore of the most recent draft shall complete quickly on reopening, within the same order of magnitude as the canvas-open performance target in Story 1.\
iv. **Resilience:** Recovery shall not crash or hang if a draft is large or if one draft is corrupt. A corrupt draft shall be isolated (Story 3) and shall not block recovery of other drafts.\
v. **Offline correctness:** Autosave and recovery shall function with zero connectivity, since both operate solely on the local store.

## Acceptance Criteria

**Autosave on pen-lift**

* Given the doctor is writing on the canvas

* When the doctor lifts the pen at the end of a stroke

* Then that stroke is durably written to the local store

* And the save badge shows "Saved" once the write commits

* And the doctor is not required to take any manual save action.

**No stroke loss on reload**

* Given the doctor has completed several strokes

* When the tab is reloaded

* Then every completed stroke is present in the restored canvas

* And no completed stroke is missing.

**Automatic restore after crash**

* Given the application closed unexpectedly while a consultation was in progress

* When the doctor reopens Smart Parcha

* Then the system automatically restores the last saved state into the canvas without any manual recovery step

* And the consultation continues from the last saved state for the same Visit ID.

**Most recent draft restored, others preserved**

* Given multiple un-synced drafts exist after a crash

* When the doctor reopens Smart Parcha

* Then the most recent un-synced draft is restored into the canvas

* And the other un-synced drafts remain available in the local store and pending-sync queue

* And none of the other drafts is lost.

**Restored fields vs re-fetched fields**

* Given a draft is being recovered

* When restore completes

* Then Visit ID, UHID, Patient Name, Age, Gender, Vitals, start date/time, device time at open, and canvas strokes are restored from local storage

* And any AI-extracted prescription that was generated online and stored locally is also restored

* And Medical History and Previous Prescriptions are re-fetched from the server in the background

* And if no AI prescription was generated and stored locally, no AI output is restored and it is produced server-side only after sync.

**No duplicate on recovery**

* Given a draft is recovered into the canvas

* When the consultation continues

* Then no duplicate consultation or duplicate local record is created.

**Save indicator truthfulness**

* Given a local write is in progress

* When the write has not yet committed

* Then the badge shows "Saving…"

* And it changes to "Saved" only after the write commits

* And if the write fails, the badge reflects an unsaved/error state and the system retries.

**Interrupted final stroke**

* Given the application crashes while the doctor is mid-stroke (pen not yet lifted)

* When the consultation is recovered

* Then all previously completed strokes are present

* And only the single in-progress, never-completed stroke is absent, consistent with the zero-completed-stroke-loss objective.

## Edge Cases

i. **Crash during a save write:** if the crash occurs while a pen-lift write is committing, recovery shall restore the last fully committed state; the write mechanism shall be designed so a partial write cannot corrupt previously saved strokes.\
ii. **Reopen with no un-synced drafts:** if no un-synced draft exists on reopening, the system shall not restore anything and shall present a normal empty Smart Parcha state awaiting a scan.\
iii. **Reopen with a single synced draft only:** a draft already Synced is not auto-loaded into the canvas; the doctor starts fresh on the next scan.\
iv. **Corrupt most-recent draft:** if the most recent draft is corrupt and cannot be restored, the system shall isolate it (Story 3), surface a non-blocking notice, and fall back to restoring the next most recent valid un-synced draft rather than failing recovery entirely.\
v. **Large stroke set:** recovery of a long consultation shall not freeze the UI; strokes shall be loaded efficiently so the canvas becomes usable promptly.\
vi. **Rapid pen-lifts:** a burst of quick strokes shall each be saved without dropping any; the incremental-write design shall keep up without losing a completed stroke or blocking input.\
vii. **Save badge during offline:** offline status shall not change autosave behavior or the meaning of the "Saved" badge, which always denotes locally saved, never synced.
