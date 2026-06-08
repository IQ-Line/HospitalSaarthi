# Walk-in pharmacy dispense — UI design (Phase 1)

Counter sale for patients **not registered** in EMPI / without an OPD visit. Backend is **out of scope** for this document; UI prototype only.

## Entry point

**Prescription Queue** (`/pharmacy/queue`) gets a primary **Dispense** button (top-right, next to page title).

| Action | Route | Audience |
|--------|-------|----------|
| Row action **Issue medicines** / **View dispense** | `/pharmacy/visits/$visitId` | OPD completed visit (existing) |
| Header **Dispense** | `/pharmacy/dispense/new` | Walk-in / unregistered patient (new) |

## Page layout — walk-in dispense

Mirrors the existing dispense page shell: grey page background, white cards, sticky bottom save bar.

```
┌─────────────────────────────────────────────────────────────┐
│ ← Prescription Queue                                        │
├─────────────────────────────────────────────────────────────┤
│ Walk-in dispense                                            │
│ Counter sale · patient not linked to OPD visit              │
├──────────────────────────────┬──────────────────────────────┤
│ PATIENT DETAILS (card)       │  SIDEBAR (card)              │
│ [First][Last][Phone][Gender] │  Walk-in sale                │
│ [Date of birth]              │  No OPD prescription.        │
│                              │  Enter medicines manually.   │
├──────────────────────────────┴──────────────────────────────┤
│ DISPENSE LINES (same table as visit dispense)               │
│ Medicine | Prescribed | Dispensed | Unit | Disc | Tax | Tot │
│ Bill discount · Notes · Subtotal / Discount / Total         │
├─────────────────────────────────────────────────────────────┤
│ FIXED FOOTER: total · line count · [Save dispense]          │
└─────────────────────────────────────────────────────────────┘
```

On **lg** breakpoints the main column is ~1fr and sidebar ~320px (same grid as visit dispense). Patient fields sit **above** dispense lines in the main column on smaller screens.

## Patient fields (from reference screenshot)

| Field | Control | Required (UI) | Notes |
|-------|---------|---------------|-------|
| First name | Text | Yes | Trimmed, min 1 char |
| Last name | Text | No | |
| Phone | Text + fixed `+91` prefix | No | Digits only, max 10 |
| Gender | Select (`male` / `female` / `other`) | Yes | Placeholder “Select” |
| Date of birth | `type="date"` | No | Stored as `YYYY-MM-DD` |

Row layout (desktop):

- **Row 1:** First name · Last name · Phone · Gender (4 columns on `md+`)
- **Row 2:** Date of birth (narrow column)

Labels above inputs, same spacing as frontdesk registration (`text-sm` label, `h-10` inputs).

## Reused from visit dispense (unchanged UX)

- `PharmacyDispenseLinesTable` — medicine search, line discount %, tax %, line totals
- Bill-level discount (₹), notes, subtotal / discount / total
- Sticky footer with **Save dispense**
- `computeDispenseTotals` / `DispenseLineDraft` types

## Not shown on walk-in page

- OPD prescription sidebar (replaced with static “Walk-in sale” info)
- Visit ID / RX # header (no visit yet)
- EMPI patient fetch

## Save behaviour (prototype)

Until backend exists:

1. Validate patient + at least one medicine line client-side
2. Show toast: *Walk-in dispense save is not connected yet — backend pending*

## Backend planning (next phase — not implemented)

Open questions for implementation planning:

1. **Patient identity** — Create ephemeral EMPI patient on save, or store walk-in demographics only on `dispense_records`?
2. **Visit linkage** — `visit_id` nullable on dispense record, or synthetic “walk-in visit” entity?
3. **API shape** — `POST /api/pharmacy/v1/walk-in-dispense` vs extend `PUT .../dispense-order` with optional patient payload?
4. **Queue listing** — Should completed walk-in sales appear in prescription queue, or a separate “Walk-in history” list?
5. **Billing / invoice** — Same bill document as OPD-linked dispense?

Suggested direction (for discussion):

- New `dispense_records.dispense_kind = 'walk_in' | 'opd_visit'`
- Walk-in patient snapshot columns on record (name, phone, gender, dob) until EMPI registration
- Dedicated save endpoint; no OPD prescription required

## Files (frontend prototype)

| File | Purpose |
|------|---------|
| `walk-in-patient-fields.tsx` | Patient form matching screenshot |
| `pharmacy-walk-in-dispense-page.tsx` | Full page composition |
| `routes/.../pharmacy/dispense/new.tsx` | Route |
| `pharmacy-queue-page.tsx` | Header **Dispense** button |
