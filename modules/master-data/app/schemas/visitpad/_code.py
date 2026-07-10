"""Shared Visitpad catalog code validation."""

VISITPAD_CATALOG_CODE_PATTERN = r"^[A-Za-z0-9_]{3,9}$"
# Units use short, standard codes (e.g. "g", "kg", "ml", "lb"), so they allow
# 1-9 chars rather than the 3-9 the other catalogs standardize on. (The unit
# conversion schema already references unit codes with min_length=1.)
VISITPAD_UNIT_CODE_PATTERN = r"^[A-Za-z0-9_]{1,9}$"
