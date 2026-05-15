import { createFileRoute, Outlet } from '@tanstack/react-router';

/**
 * Layout for `/configurator/tenant` and nested `/configurator/tenant/:organizationId`.
 * Renders an {@link Outlet} so the index (list) and detail routes can mount.
 */
export const Route = createFileRoute('/_authenticated/configurator/tenant')({
  component: ConfiguratorTenantLayout,
});

function ConfiguratorTenantLayout() {
  return <Outlet />;
}
