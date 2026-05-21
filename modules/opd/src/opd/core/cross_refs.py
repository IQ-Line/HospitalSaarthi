"""Cross-module UUID references owned by other HIMS modules.

Per platform database principles, OPD does not declare PostgreSQL foreign keys
across schemas. These constants document where ``prescriptions.visit_id`` and
related columns point.
"""

# Registration — encounter identity (see modules/registration/src/schema/tables.ts).
# ``registration.registration.visit_id`` is the visit/encounter UUID used at check-in.
# ``opd.prescriptions.visit_id`` is UNIQUE and must match that same identifier (1:1).
REGISTRATION_SCHEMA = "registration"
REGISTRATION_TABLE = "registration"
REGISTRATION_VISIT_ID_COLUMN = "visit_id"
