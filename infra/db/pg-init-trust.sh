#!/bin/bash
# Configure pg_hba.conf for trust auth (dev only)
set -e

PG_HBA="$PGDATA/pg_hba.conf"
sed -i 's/scram-sha-256/trust/g; s/md5/trust/g' "$PG_HBA"
pg_ctl reload
