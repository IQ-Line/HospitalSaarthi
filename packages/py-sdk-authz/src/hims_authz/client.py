from __future__ import annotations

from cerbos.sdk.client import CerbosClient
from cerbos.sdk.model import Principal, Resource, ResourceAction, ResourceList

from hims_authz.types import EnrichedPrincipal


class AuthzClient:
    def __init__(self, host: str) -> None:
        self._host = host

    def check(
        self,
        principal: EnrichedPrincipal,
        kind: str,
        action: str,
        resource_id: str,
        resource_attr: dict | None = None,
    ) -> bool:
        cerbos_principal = Principal(
            principal.id,
            roles=principal.role_codes or principal.roles,
            attr={
                "iq_tenant_id": principal.iq_tenant_id,
                "capabilities": principal.capabilities,
                "delegated_capabilities": principal.delegated_capabilities,
                "role_codes": principal.role_codes or principal.roles,
                **({"department": principal.department} if principal.department else {}),
                **({"org_id": principal.org_id} if principal.org_id else {}),
            },
        )
        cerbos_resource = Resource(
            resource_id,
            kind,
            attr=resource_attr or {"iq_tenant_id": principal.iq_tenant_id},
        )
        with CerbosClient(host=self._host) as c:
            resp = c.check_resources(
                principal=cerbos_principal,
                resources=ResourceList(
                    resources=[
                        ResourceAction(cerbos_resource, actions=[action]),
                    ],
                ),
            )
            resp.raise_if_failed()
            result = resp.to_dict()
            actions_map = (
                result.get("results", [{}])[0]
                .get("actions", {})
            )
            return actions_map.get(action, False) is True
