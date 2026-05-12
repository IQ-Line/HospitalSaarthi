# Master Data — Visitpad package layout (`app/.../visitpad/`)

## Purpose

Visitpad catalog code is grouped under a **`visitpad/`** subpackage in each layer so filenames drop the redundant `visitpad_` prefix and imports read as `app.<layer>.visitpad.<domain>`.

## Current layout (implemented)

| Layer | Path pattern | Examples |
|-------|----------------|----------|
| Repositories | `app/repositories/visitpad/` | `unit.py`, `conversion.py`, `vital.py`, `chief_complaint.py`, `diagnosis.py`, `allergen.py`, `allergy_reaction.py`, `rx_column.py`, `medicine.py`, `chronic_illness.py`, `procedure.py`, `integrity.py` |
| Services | `app/services/visitpad/` | `units.py`, `vitals.py`, `chief_complaints.py`, `diagnoses.py`, `allergies.py`, `rx_columns.py`, `medicines.py`, `chronic_illnesses.py`, `procedures.py` |
| Models | `app/models/visitpad/` | `unit.py`, `conversion.py`, … (same domain stems as repositories where 1:1) |
| Schemas | `app/schemas/visitpad/` | `unit.py`, `vital.py`, … |
| Catalog factories | `app/catalog/visitpad/` | `table_models.py` (`visitpad_*_model` factory functions unchanged for now) |
| HTTP | `app/api/v1/visitpad/` | `units.py`, `allergies.py`, `vitals.py`, … |

Class names (e.g. `VisitpadUnitRepository`, `VisitpadUnitPublicModel`) stay prefixed with **`Visitpad`** for clarity in stack traces and OpenAPI until a broader rename is agreed.

## Relation to ADRs

- [ADR-0020](../../adr/0020-master-data-catalog-dual-schema.md) — dual schema `public` vs `tenant_master`.
- [ADR-0021](../../adr/0021-master-data-catalog-tenant-key-type.md) — UUID `iq_tenant_id`.
