# syntax=docker/dockerfile:1.7
# Cerbos PDP image with HIMS policies baked in.
#
# Built whenever infra/cerbos/** changes. In AKS, this image runs as a
# centralized Deployment (replicas=2) in the hims namespace — NOT as a
# per-pod sidecar (see ADR-0004 pending amendment).
#
# Build context: repo root.

FROM ghcr.io/cerbos/cerbos:0.42.0

COPY infra/cerbos/policies /policies
COPY infra/cerbos/cerbos.yaml /config/cerbos.yaml

EXPOSE 3593 3592

CMD ["server", "--config=/config/cerbos.yaml"]
