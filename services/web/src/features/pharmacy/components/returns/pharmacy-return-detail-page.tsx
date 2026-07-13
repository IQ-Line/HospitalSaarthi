import { Link } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@pulse/ui/card';
import { useDispenseReturn } from '../../api/dispense-returns';
import {
  formatDispenseDate,
  formatMoney,
  formatReturnReason,
} from '../../lib/return-display';
import { PharmacyPageShell } from '../pharmacy-page-shell';

type PharmacyReturnDetailPageProps = {
  returnId: string;
};

export function PharmacyReturnDetailPage({ returnId }: PharmacyReturnDetailPageProps) {
  const { data, isLoading, isError } = useDispenseReturn(returnId);

  if (isLoading) {
    return (
      <PharmacyPageShell title="Return" breadcrumbTrail={[{ label: 'Returns', href: '/pharmacy/returns' }]}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading return…
        </div>
      </PharmacyPageShell>
    );
  }

  if (isError || !data) {
    return (
      <PharmacyPageShell title="Return" breadcrumbTrail={[{ label: 'Returns', href: '/pharmacy/returns' }]}>
        <p className="text-sm text-destructive">Return not found.</p>
      </PharmacyPageShell>
    );
  }

  return (
    <PharmacyPageShell
      title={data.return_number}
      description="Return processed — amount stored for reporting (no billing refund in this phase)."
      breadcrumbTrail={[{ label: 'Returns', href: '/pharmacy/returns' }]}
      breadcrumbLabel={data.return_number}
      actions={
        <Button variant="outline" asChild>
          <Link to="/pharmacy/returns/new">New Return</Link>
        </Button>
      }
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Return summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Patient" value={data.patient_name ?? '—'} />
            <Field label="UHID" value={data.uhid ?? '—'} />
            <Field label="Visit" value={data.formatted_visit_id ?? '—'} />
            <Field label="Dispense #" value={data.dispense_number} />
            <Field label="Processed" value={formatDispenseDate(data.processed_at)} />
            <Field label="Processed by" value={data.processed_by_name ?? '—'} />
            <Field label="Reason" value={formatReturnReason(data.return_reason)} />
            <Field label="Remarks" value={data.remarks ?? '—'} />
            <Field label="Total return amount" value={formatMoney(data.total_return_amount)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant={data.verification.unopened ? 'default' : 'outline'}>Unopened</Badge>
            <Badge variant={data.verification.packaging_intact ? 'default' : 'outline'}>
              Packaging intact
            </Badge>
            <Badge variant={data.verification.expiry_verified ? 'default' : 'outline'}>
              Expiry verified
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Returned medicines</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-2 py-2">Medicine</th>
                  <th className="px-2 py-2">Returned qty</th>
                  <th className="px-2 py-2">Unit price</th>
                  <th className="px-2 py-2">Return amount</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line) => (
                  <tr key={line.id} className="border-b">
                    <td className="px-2 py-3 font-medium">{line.medicine_display_name}</td>
                    <td className="px-2 py-3">{line.return_qty}</td>
                    <td className="px-2 py-3">{formatMoney(line.unit_amount)}</td>
                    <td className="px-2 py-3">{formatMoney(line.return_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </PharmacyPageShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
