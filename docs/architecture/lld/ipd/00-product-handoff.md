**HIMS Lite IPD Engineering Handoff**

*Screen reuse and scope guidance for clinic, day-care, and small-IPD
implementation*

| **Prepared for**   | **Product, Engineering, QA, Implementation, and Sales Enablement teams**                             |
|--------------------|------------------------------------------------------------------------------------------------------|
| Source application | GitHub repo: sheivin/himsPlatform; module inspected: services/ipd/web                                |
| Primary evidence   | IPD routes in services/ipd/web/src/App.tsx and episode navigation in services/ipd/web/src/layout.tsx |
| Product boundary   | HIMS Lite for clinics, day-care centers, and small nursing homes with limited IPD capability         |

# 1. Executive Summary

The current IPD module in himsPlatform is much larger than HIMS Lite
needs. For Lite, engineering should not copy the whole module. The
correct approach is to lift a focused set of IPD screens that complete
the small-hospital cycle: admission, bed allocation, census, charting,
nursing tasks, medication administration, orders, transfers, discharge,
billing, reports, and basic configuration.

This document identifies the screen packet to share with engineering,
explains how each screen should be reused, and separates core Lite scope
from optional and enterprise-only IPD capabilities.

# 2. Product Boundary For IPD Lite

Target customer: clinics, day-care facilities, and small nursing homes
that need up to modest IPD/day-care operations without enterprise
customization.

Primary goal: provide a complete, opinionated IPD workflow with minimal
configuration and nominal pricing.

Scope principle: reuse proven himsPlatform IPD screens, but simplify
copy, fields, statuses, dashboards, and configuration so the product
feels lightweight.

Do not position Lite as a general enterprise IPD command center.
Advanced AI, research, infection-control, MRD, complex operations, and
deep administration should stay outside V1.

# 3. Reuse Decision Definitions

| **Decision** | **Meaning for engineering**                                                                                                        | **Example in this handoff**                                               |
|--------------|------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------|
| Lift         | Reuse the existing screen and core workflow. Change labels, permissions, navigation, and configuration only where needed for Lite. | Admission Queue, Bed Board, Patient Census, Vitals Chart.                 |
| Adapt        | Reuse the concept, components, and API pattern, but simplify workflow, data captured, status model, or integrations.               | Dashboard, New Admission, Episode Billing, Reports, System Configuration. |
| Exclude      | Do not migrate into Lite V1. Keep out of navigation, permissions, command palette, QA scope, and sales demos.                      | AI queues, research exports, KPI catalog, advanced operations dashboards. |

# 4. End-To-End Workflow Covered

Patient is registered or selected from existing records.

Doctor or frontdesk initiates IPD/day-care admission.

Frontdesk completes admission details and collects deposit if
applicable.

Bed or day-care chair is allocated.

Patient appears in census and doctor/nurse workbench. (Patient Census is
optional)

Doctor and nurse record notes, vitals, orders, ~~medication~~
administration, and tasks. (Notes – same, vitals – trends skip)

Patient can be transferred if bed/ward changes are needed.

Running IPD billing captures bed, consultation, procedure, medicine,
consumable, and manual charges.

Discharge readiness, checklist, summary, and final discharge are
completed.

Reports provide admission/discharge, occupancy, and collection
visibility.

# 5. Workflow Grouping

| **Workflow**              | **Business outcome**                                                         | **Core screens**                                                          | **Lite simplification**                                                                       |
|---------------------------|------------------------------------------------------------------------------|---------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| Admission intake          | Move patient from OPD/direct/emergency into IPD/day-care episode.            | Registration, Admission Queue, New/Edit Admission.                        | One intake path with source selector; avoid multi-level approval unless enabled.              |
| Bed and census management | Allocate bed/chair and keep active census accurate.                          | Bed Board, Patient Census, Reservations/Waiting List optional.            | Small facilities need availability and transfer clarity, not enterprise capacity forecasting. |
| Clinical workbench        | Give doctor/nurse one patient-action surface.                                | Workbench, Episode Summary, Notes, Vitals, eMAR, Nursing Tasks.           | Role-specific defaults; keep clinical context visible.                                        |
| Orders and fulfillment    | Capture medicines, procedures, investigations, consumables and track status. | New Order, Order Tracker, eMAR, pharmacy dependency.                      | Route fulfillment to owning module; do not expose store/batch complexity inside IPD.          |
| Transfers                 | Move patient between beds/wards with billing impact.                         | Transfer Manager, Bed Board, Episode Summary.                             | Keep ward/bed transfer; defer complex transport workflows.                                    |
| Discharge                 | Complete medical discharge, clearances, summary and final exit.              | Discharge Readiness, Discharge Planner, Discharge Checklist.              | Single visible journey: medical, billing, pharmacy, final discharge.                          |
| Billing                   | Maintain running bill and support final settlement.                          | Episode Billing plus billing module dependency.                           | Keep deposit, running charges, final bill, refund/cancellation if required.                   |
| Reports and setup         | Operate and configure Lite without custom implementation.                    | Reports, System Configuration, Note Templates, Financial Config optional. | Keep only masters and reports needed for go-live.                                             |

# 6. Core Screen Packet To Lift

| **S no**                        | **Workflow**                                   | **Screen**                                     | **Route**                                       | **Role**                                | **Decision**                       | **Priority**                       | **Engineering remarks**                                                                                                                         |
|---------------------------------|------------------------------------------------|------------------------------------------------|-------------------------------------------------|-----------------------------------------|------------------------------------|------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| 1                               | Admission intake                               | IPD Dashboard / Command Center                 | /ipd/                                           | Owner/Manager                           | Adapt                              | Must                               | Keep occupancy, admissions today, discharges today, available beds and collection/clearance indicators. Remove enterprise command-center depth. |
| <span class="mark">~~2~~</span> | <span class="mark">~~Admission intake~~</span> | <span class="mark">~~IPD Registration~~</span> | <span class="mark">~~/ipd/registration~~</span> | <span class="mark">~~Frontdesk~~</span> | <span class="mark">~~Lift~~</span> | <span class="mark">~~Must~~</span> | <span class="mark">~~Use for IPD-specific registration/admission intake where OPD registration is not already available.~~</span>               |
| 3                               | Admission intake                               | Admission Queue                                | /ipd/admissions                                 | Frontdesk                               | Lift                               | Must                               | Use as the admission desk queue for pending and active admission work.                                                                          |
| 4                               | Admission intake                               | New Admission                                  | /ipd/admissions/new                             | Frontdesk                               | Adapt                              | Must                               | Use for OPD-to-IPD, emergency-to-IPD, direct IPD, baby/cradle if retained, and day-care admission. Remove enterprise-only fields.               |
| 5                               | Admission intake                               | Edit Admission                                 | /ipd/admissions/:id/edit                        | Frontdesk                               | Lift                               | Must                               | Use for correcting admission details before or during stay.                                                                                     |
| 6                               | Bed and census                                 | Bed Board                                      | /ipd/beds                                       | Frontdesk/Nurse                         | Lift                               | Must                               | Use for ward/room/bed or chair occupancy, allocation, reservation, cleaning, and simple bed status actions.                                     |
| 7                               | Bed and census                                 | Patient Census                                 | /ipd/patients                                   | Doctor/Nurse                            | Lift                               | Must                               | Use as active in-house patient list. Keep admitted, discharge-planning, and pending-clearance views.                                            |
| ~~8~~                           | ~~Clinical workbench~~                         | ~~Doctor/Nurse Workbench~~                     | ~~/ipd/workbench~~                              | ~~Doctor/Nurse~~                        | ~~Adapt~~                          | ~~Must~~                           | ~~Main working surface. Use role permissions to show doctor or nurse defaults.~~                                                                |
| ~~9~~                           | ~~Clinical workbench~~                         | ~~Nursing Task Board~~                         | ~~/ipd/workbench/nursing/tasks~~                | ~~Nurse~~                               | ~~Lift~~                           | ~~Must~~                           | ~~Use for vitals due, medication tasks, nursing notes, discharge checklist items, and pending orders.~~                                         |
| ~~10~~                          | ~~Clinical chart~~                             | ~~Episode Summary~~                            | ~~/ipd/episodes/:id~~                           | ~~Doctor/Nurse~~                        | ~~Lift~~                           | ~~Must~~                           | ~~Patient chart landing page with admission, bed, clinical, and financial context.~~                                                            |
| 11                              | Clinical chart                                 | Clinical Note Editor                           | /ipd/episodes/:episodeId/notes/new              | Doctor/Nurse                            | Lift                               | Must                               | Use for admission notes, progress notes, nursing notes, and discharge summary draft inputs.                                                     |
| 12                              | Clinical chart                                 | Vitals Chart                                   | /ipd/episodes/:episodeId/vitals                 | Nurse/Doctor                            | Lift                               | Must                               | Use for tabular and trend-based daily monitoring.                                                                                               |
| 13                              | Orders                                         | New Order                                      | /ipd/episodes/:episodeId/orders/new             | Doctor/Nurse                            | Adapt                              | Must                               | Use for medicines, investigations, procedures, consumables, and service orders. Hide store/batch details.                                       |
| 14                              | Orders                                         | Order Tracker                                  | /ipd/episodes/:episodeId/orders                 | Doctor/Nurse/Pharmacy                   | Lift                               | Must                               | Use for tracking order status and billing/pharmacy handoff.                                                                                     |
| ~~15~~                          | ~~Medication~~                                 | ~~eMAR~~                                       | ~~/ipd/episodes/:episodeId/emar~~               | ~~Nurse~~                               | ~~Lift~~                           | ~~Should~~                         | ~~Recommended for medication safety. Can defer only if Lite V1 starts with dispense-only medication tracking.~~                                 |
| 16                              | Transfers                                      | Transfer Manager                               | /ipd/transfers                                  | Frontdesk/Nurse                         | Adapt                              | Should                             | Keep bed/ward transfer with billing impact. Defer complex transport operations.                                                                 |
| 17                              | Discharge                                      | Discharge Readiness                            | /ipd/discharge                                  | Doctor/Billing/Nurse                    | Adapt                              | Must                               | Use as discharge board. Keep medical, billing, pharmacy, summary, and final discharge status.                                                   |
| 18                              | Discharge                                      | Discharge Planner                              | /ipd/episodes/:episodeId/discharge              | Doctor/Billing                          | Lift                               | Must                               | Use for patient-level discharge summary, medicines at discharge, clearances, and final discharge.                                               |
| 19                              | Billing                                        | Episode Billing                                | /ipd/episodes/:episodeId/billing                | Billing                                 | Adapt                              | Must                               | Use as running IPD bill panel. Integrate with Lite billing/tariff/payment flows.                                                                |
| 20                              | ~~Reports~~                                    | ~~Reports~~                                    | ~~/ipd/reports~~                                | ~~Owner/Manager~~                       | ~~Adapt~~                          | ~~Should~~                         | ~~Keep admission/discharge, occupancy, and collection reports only.~~                                                                           |
| 21                              | ~~Setup~~                                      | ~~System Configuration~~                       | ~~/ipd/config~~                                 | ~~Admin~~                               | ~~Adapt~~                          | ~~Must~~                           | ~~Keep minimum config required for mandatory fields, discharge packet, and simple reason capture.~~                                             |

# 7. Episode Shell: Treat These As Separate Screens

The IPD episode is not one page. The layout exposes multiple
route-backed sub-screens under the same patient context. For handoff and
QA, treat each sub-screen as independently testable.

| **Episode sub-screen** | **Route pattern**                  | **Lite usage**                          |
|------------------------|------------------------------------|-----------------------------------------|
| Summary                | /ipd/episodes/:id                  | Chart landing page and patient context. |
| Notes                  | /ipd/episodes/:episodeId/notes/new | Clinical and nursing documentation.     |
| Vitals                 | /ipd/episodes/:episodeId/vitals    | Daily monitoring and trends.            |
| Medications            | /ipd/episodes/:episodeId/emar      | Medication administration record.       |
| Orders                 | /ipd/episodes/:episodeId/orders    | Order status and fulfillment tracking.  |
| Billing                | /ipd/episodes/:episodeId/billing   | Running bill and charge visibility.     |
| Discharge              | /ipd/episodes/:episodeId/discharge | Patient-level discharge workflow.       |

# 8. Optional Screens For Lite

| **Screen**              | **Route**                      | **When to include**                                               | **Recommendation**                                                     |
|-------------------------|--------------------------------|-------------------------------------------------------------------|------------------------------------------------------------------------|
| Approval Inbox          | /ipd/admissions/approval-inbox | If admission approval is required before bed allocation.          | Keep optional; many Lite customers may not need this.                  |
| Bed Reservations        | /ipd/beds/reservations         | If OPD-to-IPD admission commonly reserves a bed before admission. | Useful but not mandatory.                                              |
| Waiting List            | /ipd/beds/waiting-list         | If bed scarcity needs a queue.                                    | Optional for small facilities.                                         |
| Shift Transfer          | /ipd/workbench/shift-transfer  | If nursing handover is part of the package.                       | Optional for 24x7 IPD, less needed for day-care.                       |
| Ward Rounds             | /ipd/ward-rounds               | If round management is explicitly required.                       | Optional; can be added after core charting.                            |
| Note Templates          | /ipd/config/note-templates     | If discharge/clinical templates need admin control.               | Include if ABDM/discharge summary standardization is a differentiator. |
| Financial Configuration | /ipd/config/financial          | If holds, sponsor rules, or payment categories are needed.        | Keep admin-only; simplify heavily.                                     |

# 9. Dependencies Outside The IPD Module

IPD Lite should call or integrate with the owning modules for OPD,
Billing, Pharmacy, Admin, and ABDM rather than duplicating their
responsibilities inside IPD. For a first implementation, these can be
implemented as required modules, thin adapters, or mocked/demo adapters
depending on commercial packaging, but the workflow contracts must be
clear.

| **Dependency**                             | **Why it is required**                                                                 | **Source module / screen family**                  | **Handoff note**                                                                                            |
|--------------------------------------------|----------------------------------------------------------------------------------------|----------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| OPD admission advice                       | Doctor must be able to advise or initiate IPD from OPD.                                | Outpatient consultation / doctor workstation       | Required for V1 if OPD is included. Add an Advise Admission action that lands in IPD admissions.            |
| Patient registration / UHID / ABHA         | IPD cannot start without patient identity.                                             | Patient registry / frontdesk registration          | Required for V1. Reuse identity and ABDM creation/verification flow.                                        |
| Deposit and final payment                  | Small hospitals need deposit, running bill, final settlement.                          | Billing                                            | Required for V1. Episode Billing must integrate with deposits, invoices, refunds, and cashier flow.         |
| Price / tariff master                      | Bed, consultation, procedures, medicines, consumables, and taxes need standard prices. | Billing tariff/config                              | Required for V1. Keep one simple tariff master for Lite.                                                    |
| Pharmacy issue / dispense                  | IPD medication orders need pharmacy fulfillment and billing handoff.                   | Pharmacy prescription queue, dispense, ward supply | Required for medicine workflows. If pharmacy is disabled, orders should remain trackable but not dispensed. |
| Admin masters                              | Users, roles, departments, doctors, wards, beds and permissions are required.          | Admin / platform configuration                     | Required for V1. Expose only setup screens required for go-live.                                            |
| ABDM consent and discharge summary linking | ABDM is a differentiator and compliance driver.                                        | ABDM / consent / document flow                     | Recommended for V1. If disabled, discharge summary should still be generated and linkable later.            |

# 10. Role Access Matrix

| **Screen family**       | **Frontdesk** | **Doctor**       | **Nurse**        | **Billing**     | **Pharmacy**       | **Admin/Owner** |
|-------------------------|---------------|------------------|------------------|-----------------|--------------------|-----------------|
| Dashboard               | View          | View             | View             | View            | \-                 | View            |
| Registration/admissions | Create/Edit   | Advise/View      | View             | Deposit view    | \-                 | View            |
| Bed board/census        | Allocate/View | View             | Update/View      | \-              | \-                 | Configure/View  |
| Episode chart           | View          | Full clinical    | Nursing clinical | Billing tab     | Medication status  | Audit view      |
| Orders/eMAR             | \-            | Order/View       | Order/Administer | Charge view     | Issue/Update       | Config view     |
| Transfers               | Create/View   | View             | Create/View      | Charge impact   | \-                 | View            |
| Discharge               | View          | Initiate/Summary | Checklist        | Clearance       | Medicine pending   | View            |
| Billing                 | Deposit view  | View             | View             | Full            | Medicine bill link | Reports         |
| Reports/config          | \-            | \-               | \-               | Billing reports | \-                 | Full            |

# 11. Minimum Master Data Before Go-Live

| **Master data**           | **Why it matters**                                                                           | **Lite rule**                                                               |
|---------------------------|----------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| Facility / branch         | Defines facility identity, address, and billing/ABDM context.                                | Prefer single facility for Lite unless multi-branch is explicitly packaged. |
| Departments and doctors   | Admission, consultation, rounds, orders and discharge summary require clinical ownership.    | Keep only active departments/doctors.                                       |
| Wards, rooms, beds/chairs | Required for occupancy, bed allocation, transfers and bed charges.                           | Support simple ward-room-bed or day-care chair setup.                       |
| Users and roles           | Controls access for frontdesk, doctor, nurse, billing, pharmacy, admin.                      | Use fixed Lite roles with minimal customization.                            |
| Services and tariff       | Billing requires prices for bed, consultation, procedures, consumables, medicines and taxes. | Use one standard tariff master; avoid sponsor complexity unless confirmed.  |
| Medicines/items           | Medication orders, pharmacy dispense and charge posting need item identity.                  | Keep medicine/item master minimal if stock management is out of scope.      |
| Discharge/note templates  | Standardizes clinical documents and ABDM-ready discharge summary.                            | Provide default templates; admin edit is optional.                          |
| Sequences                 | Admission number, IPD visit ID, bill number and receipt number need predictable numbering.   | Configure once at setup.                                                    |

# 12. Enterprise Screens To Exclude From Lite V1

Do not include these in the screen packet for the first Lite build. They
make the implementation look larger, more customizable, and more
manpower-heavy than the target market requires.

| **Exclude from Lite V1**                                         | **Reason**                                                               | **Future packaging**                |
|------------------------------------------------------------------|--------------------------------------------------------------------------|-------------------------------------|
| AI note draft, discharge prediction, missed charges, risk queue  | Not necessary for nominal-priced Lite package.                           | Advanced / enterprise upsell.       |
| Research exports, break-glass logs, KPI catalog                  | Governance-heavy features for larger institutions.                       | Enterprise edition.                 |
| Mortality dashboard, infection-control dashboard, MRD completion | Specialized hospital operations beyond small-IPD need.                   | Advanced clinical operations.       |
| OT movements, transport queue, capacity forecast                 | Operationally heavy and integration-dependent.                           | Larger hospital package.            |
| Advanced SLA, notification, sponsor, and RBAC configuration      | Creates customization and implementation burden.                         | Admin advanced pack.                |
| Full pharmacy stock management                                   | Earlier PPT scope places pharmacy stock management outside HIMS Lite V1. | HIMS Advance V2 or pharmacy add-on. |

# 13. Implementation Guidance

Create a Lite route/menu that exposes only the approved screens. Do not
expose hidden enterprise routes through navigation, command palette, or
role permissions.

Preserve the patient context bar across all episode actions: patient
name, UHID, bed/chair, and admission number must stay visible.

Reduce configuration to default templates and minimal masters. Lite
should be opinionated, not custom-built per hospital.

For day-care use, allow chair/bed terminology to be configured in labels
without changing the workflow.

Keep discharge as a single operational journey: medical discharge,
billing clearance, pharmacy pending, discharge summary, final discharge.

Route pharmacy and billing fulfillment through their owning modules or
APIs; do not make IPD write directly into those schemas.

QA should verify one complete journey rather than isolated pages only.

# 14. QA Journey Matrix

| **Journey**                   | **Screens involved**                                                                | **Expected proof**                                                         | **Priority** |
|-------------------------------|-------------------------------------------------------------------------------------|----------------------------------------------------------------------------|--------------|
| Direct admission to discharge | Registration, New Admission, Bed Board, Episode Summary, Billing, Discharge Planner | Patient admitted, billed, discharged, bed released.                        | P0           |
| OPD-to-IPD admission          | OPD consultation dependency, Admission Queue, Admission Form, Bed Board             | Admission advice becomes IPD admission without duplicate patient entry.    | P0           |
| Nursing daily care            | Workbench, Nursing Task Board, Vitals, Notes, eMAR                                  | Vitals and medication administration appear in patient chart.              | P0           |
| Orders and billing            | New Order, Order Tracker, Episode Billing, Pharmacy dependency                      | Ordered items appear for fulfillment and billing.                          | P0           |
| Transfer                      | Bed Board, Transfer Manager, Episode Summary, Billing                               | Bed changes update census and billing impact.                              | P1           |
| Discharge summary and ABDM    | Discharge Readiness, Discharge Planner, ABDM dependency                             | Summary generated/signed and ready for ABHA linking.                       | P1           |
| Reports                       | Dashboard, Reports                                                                  | Occupancy, admission/discharge, and collection reports match transactions. | P1           |

# 15. Open Product Decisions

| **Decision**                                           | **Why it matters**                                                            | **Default recommendation**                                                  |
|--------------------------------------------------------|-------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| Single clinic or multi-branch Lite?                    | Affects facility master, user scope, numbering, reports and pricing.          | Start single-clinic; sell multi-branch as add-on.                           |
| Is ABDM mandatory in V1?                               | Affects registration, consent, document linking and implementation checklist. | Yes, if this is the go-to-market differentiator.                            |
| Is pharmacy internal or only order tracking?           | Affects eMAR, dispense, billing and item master scope.                        | Include pharmacy issue/dispense; exclude full stock management.             |
| Do day-care cases use IPD episode model?               | Affects bed/chair terminology, billing duration, discharge flow.              | Yes, use same episode model with day-care labels and shorter stay defaults. |
| Is billing clearance mandatory before final discharge? | Affects discharge workflow and customer operating discipline.                 | Yes for IPD; configurable advisory only for day-care if needed.             |
| Are deposits required in V1?                           | Affects admission form and billing dependency.                                | Yes, but allow zero deposit.                                                |
| Do we include approval workflow?                       | Affects admission queue complexity and role setup.                            | No by default; optional toggle for larger clinics.                          |

# 16. Recommended Handoff Package

For engineering execution, share the following artifacts:

Screenshots or short clips for the 21 core IPD routes listed in Section
6.

Screenshots for only the optional screens that product confirms for V1.

One workflow diagram from admission to discharge.

A dependency note for OPD, patient registration, billing, pharmacy,
admin masters, and ABDM.

A clear out-of-scope list so the team does not accidentally build the
enterprise module.

# 17. Decision Summary

Yes, the selected IPD screen set covers the IPD Lite module end-to-end.
It becomes a complete HIMS Lite product only when stitched with OPD
admission advice, patient registration/ABHA, billing and tariff,
pharmacy dispense, admin masters, and ABDM discharge summary linking.

The guiding engineering instruction is: lift the proven IPD surfaces,
hide enterprise screens, simplify configuration, and validate one
complete small-hospital patient journey.

# Appendix A: Source Traceability

| **Evidence**              | **Path**                                                                                                            | **What it proves**                                                                                                                                      |
|---------------------------|---------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| IPD route inventory       | services/ipd/web/src/App.tsx                                                                                        | Confirms all route-backed IPD screens and optional/enterprise route groups.                                                                             |
| Episode sub-navigation    | services/ipd/web/src/layout.tsx                                                                                     | Confirms Summary, Notes, Vitals, Medications, Orders, Billing, Discharge, and Exit are separate episode sub-screens.                                    |
| Page labels               | services/ipd/web/src/pages/\*.tsx                                                                                   | Confirms screen titles such as Admission Queue, Bed Board, eMAR, Vitals Chart, Episode Billing, Discharge Readiness, Reports, and System Configuration. |
| Cross-module dependencies | services/billing/web/src/App.tsx; services/pharmacy/web/src/App.tsx; services/outpatient-management/web/src/App.tsx | Confirms billing, pharmacy, and outpatient workflows are separate module surfaces that IPD Lite must stitch to.                                         |
