from __future__ import annotations

from typing import Any

from opd.schemas.prescription.prescription import PrescriptionVitalObservationPayload


def _text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _norm_code(code: Any) -> str:
    return _text(code).lower()


def _catalog_index(visitpad_vitals: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    for row in visitpad_vitals:
        code = _norm_code(row.get("code"))
        if code:
            index[code] = row
    return index


def _parse_normal_range(
    row: dict[str, Any],
) -> tuple[float | None, float | None, float | None, float | None]:
    adult = row.get("normal_range_adult")
    if not isinstance(adult, dict):
        return None, None, None, None
    low = adult.get("min")
    high = adult.get("max")
    crit_low = row.get("critical_low")
    crit_high = row.get("critical_high")
    try:
        n_min = float(low) if low is not None and _text(low) else None
    except (TypeError, ValueError):
        n_min = None
    try:
        n_max = float(high) if high is not None and _text(high) else None
    except (TypeError, ValueError):
        n_max = None
    try:
        c_low = float(crit_low) if crit_low is not None else None
    except (TypeError, ValueError):
        c_low = None
    try:
        c_high = float(crit_high) if crit_high is not None else None
    except (TypeError, ValueError):
        c_high = None
    return n_min, n_max, c_low, c_high


def _vital_meta_entry(code: str, catalog: dict[str, dict[str, Any]]) -> dict[str, Any]:
    row = catalog.get(_norm_code(code))
    if not row:
        return {}
    label = _text(row.get("name")) or _text(row.get("short_name"))
    unit = _text(row.get("unit")) or _text(row.get("default_unit_code"))
    meta: dict[str, Any] = {}
    if label:
        meta["label"] = label
    if unit:
        meta["unit"] = unit
    n_min, n_max, c_low, c_high = _parse_normal_range(row)
    if n_min is not None:
        meta["normalRangeMin"] = n_min
    if n_max is not None:
        meta["normalRangeMax"] = n_max
    if c_low is not None:
        meta["criticalLowValue"] = c_low
    if c_high is not None:
        meta["criticalHighValue"] = c_high
    return meta


def build_vitals_master_display_plan(
    visitpad_vitals: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Master-driven labels/order for OP report vitals (matches visitpad catalog)."""
    active = [
        row
        for row in visitpad_vitals
        if row.get("is_active", True)
        and not row.get("is_deleted", False)
        and _text(row.get("code"))
    ]
    if not active:
        return None

    active.sort(key=lambda row: (row.get("display_order", 0), _text(row.get("code"))))
    by_code = _catalog_index(active)

    ordered_codes: list[str] = []
    ordered_display_slots: list[dict[str, Any]] = []
    labels_by_code: dict[str, str] = {}
    units_by_code: dict[str, str] = {}
    sort_keys_by_code: dict[str, int] = {}
    blood_pressure_group_label: str | None = None
    consumed_pairs: set[tuple[str, str]] = set()

    for row in active:
        code = _norm_code(row.get("code"))
        if not code:
            continue
        sort_key = int(row.get("display_order") or 0)
        unit = _text(row.get("unit"))
        display_name = _text(row.get("name")) or _text(row.get("short_name")) or code

        if row.get("is_paired") and _text(row.get("pair_code")):
            pair_code = _norm_code(row.get("pair_code"))
            first_code, second_code = sorted((code, pair_code))
            pair_key = (first_code, second_code)
            if pair_key in consumed_pairs:
                continue
            partner = by_code.get(pair_code)
            if partner is None:
                continue
            consumed_pairs.add(pair_key)
            partner_name = (
                _text(partner.get("name")) or _text(partner.get("short_name")) or pair_code
            )
            group_label = display_name
            pair_unit = unit or _text(partner.get("unit")) or None
            ordered_codes.extend([code, pair_code])
            slot: dict[str, Any] = {
                "kind": "pair",
                "codes": [code, pair_code],
                "groupLabel": group_label,
            }
            if pair_unit:
                slot["rightAddon"] = pair_unit
            ordered_display_slots.append(slot)
            labels_by_code[code] = _text(row.get("short_name")) or display_name
            labels_by_code[pair_code] = _text(partner.get("short_name")) or partner_name
            if pair_unit:
                units_by_code[code] = pair_unit
                units_by_code[pair_code] = pair_unit
            sort_keys_by_code[code] = sort_key
            sort_keys_by_code[pair_code] = sort_key
            if {"bp_systolic", "bp_diastolic", "systolic_bp", "diastolic_bp"} & {code, pair_code}:
                blood_pressure_group_label = group_label
            continue

        ordered_codes.append(code)
        ordered_display_slots.append({"kind": "single", "code": code})
        labels_by_code[code] = display_name
        if unit:
            units_by_code[code] = unit
        sort_keys_by_code[code] = sort_key

    if not ordered_codes:
        return None

    plan: dict[str, Any] = {
        "orderedCodes": ordered_codes,
        "orderedDisplaySlots": ordered_display_slots,
        "labelsByCode": labels_by_code,
        "unitsByCode": units_by_code,
        "sortKeysByCode": sort_keys_by_code,
    }
    if blood_pressure_group_label:
        plan["bloodPressureGroupLabel"] = blood_pressure_group_label
    return plan


def _build_vitals_v2_from_observations(
    observations: list[PrescriptionVitalObservationPayload],
    catalog: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    for observation in observations:
        code = _text(observation.vital_code)
        value = _text(observation.value_text)
        if not code or not value:
            continue
        dedupe = _norm_code(code)
        if dedupe in seen:
            continue
        seen.add(dedupe)
        entry: dict[str, Any] = {"code": code, "value": value}
        entry.update(_vital_meta_entry(code, catalog))
        unit_code = _text(observation.unit_code)
        if unit_code:
            entry["unit"] = unit_code
        rows.append(entry)
    return rows


def _build_vitals_v2_from_form(
    form_vitals: dict[str, Any],
    catalog: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()

    catalog_order = sorted(
        catalog.values(),
        key=lambda row: (row.get("display_order", 0), _text(row.get("code"))),
    )
    ordered_codes = [_text(row.get("code")) for row in catalog_order if _text(row.get("code"))]
    extra_codes = [code for code in form_vitals if _text(form_vitals.get(code))]
    walk_codes = ordered_codes + [code for code in extra_codes if code not in ordered_codes]

    for code in walk_codes:
        value = _text(form_vitals.get(code))
        if not value:
            continue
        dedupe = _norm_code(code)
        if dedupe in seen:
            continue
        seen.add(dedupe)
        entry: dict[str, Any] = {"code": code, "value": value}
        entry.update(_vital_meta_entry(code, catalog))
        rows.append(entry)

    if rows:
        return rows

    for code, raw in form_vitals.items():
        value = _text(raw)
        if not value:
            continue
        dedupe = _norm_code(code)
        if dedupe in seen:
            continue
        seen.add(dedupe)
        entry = {"code": _text(code), "value": value}
        entry.update(_vital_meta_entry(code, catalog))
        rows.append(entry)
    return rows


def build_vitals_report_bundle(
    *,
    form_vitals: dict[str, Any] | None,
    vital_observations: list[PrescriptionVitalObservationPayload] | None,
    visitpad_vitals: list[dict[str, Any]] | None,
) -> dict[str, Any]:
    """Build pdf-platform vitals payload.

    Uses admin-configured visitpad codes (vitalsV2 + master plan).
    Falls back to legacy vitals object only when V2 rows cannot be built.
    """
    catalog = _catalog_index(visitpad_vitals or [])
    observations = vital_observations or []
    vitals_dict = form_vitals if isinstance(form_vitals, dict) else {}

    vitals_v2 = (
        _build_vitals_v2_from_observations(observations, catalog)
        if observations
        else _build_vitals_v2_from_form(vitals_dict, catalog)
    )
    master_plan = build_vitals_master_display_plan(visitpad_vitals or [])

    if vitals_v2:
        bundle: dict[str, Any] = {
            "vitalsV2": vitals_v2,
            "vitalsSchemaVersion": 2,
        }
        if master_plan:
            bundle["vitalsMasterDisplay"] = master_plan
        return bundle

    legacy_vitals = {key: value for key, value in vitals_dict.items() if _text(value)} or None
    bundle = {"vitals": legacy_vitals}
    if master_plan:
        bundle["vitalsMasterDisplay"] = master_plan
    return bundle
