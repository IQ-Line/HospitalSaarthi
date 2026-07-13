import { createFileRoute, Outlet } from '@tanstack/react-router';
import { PharmacyStoreBootstrap } from '@/features/pharmacy/components/pharmacy-store-bootstrap';

export const Route = createFileRoute('/_authenticated/pharmacy')({
  component: PharmacyLayout,
});

function PharmacyLayout() {
  return (
    <>
      <PharmacyStoreBootstrap />
      <Outlet />
    </>
  );
}
