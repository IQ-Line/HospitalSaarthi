import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Loader2, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@pulse/ui/alert';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@pulse/ui/card';
import { Checkbox } from '@pulse/ui/checkbox';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Textarea } from '@pulse/ui/textarea';
import {
  useDispenseReturnEligibility,
  useDispenseReturnSearch,
  useProcessDispenseReturn,
} from '../../api/dispense-returns';
import {
  computeClientReturnAmount,
  formatDispenseDate,
  formatMoney,
  formatReturnReason,
} from '../../lib/return-display';
import type {
  DispenseReturnEligibleLine,
  DispenseReturnReason,
  DispenseReturnSearchHit,
  ReturnLineDraft,
} from '../../types/returns-ui.types';
import { PharmacyPageShell } from '../pharmacy-page-shell';

const RETURN_REASONS: DispenseReturnReason[] = [
  'wrong_medicine_dispensed',
  'doctor_discontinued_medication',
  'duplicate_dispensing',
  'excess_quantity_dispensed',
  'patient_refused_medicine',
  'other',
];

function initialLineDrafts(lines: DispenseReturnEligibleLine[]): Record<string, ReturnLineDraft> {
  return Object.fromEntries(
    lines.map((line) => [
      line.dispense_line_item_id,
      { selected: false, return_qty: line.eligible_return_qty },
    ]),
  );
}

export function PharmacyNewReturnPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedDispenseId, setSelectedDispenseId] = useState<string | null>(null);
  const [lineDrafts, setLineDrafts] = useState<Record<string, ReturnLineDraft>>({});
  const [returnReason, setReturnReason] = useState<DispenseReturnReason | ''>('');
  const [remarks, setRemarks] = useState('');
  const [verification, setVerification] = useState({
    unopened: false,
    packaging_intact: false,
    expiry_verified: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const searchEnabled = submittedQuery.trim().length > 0;
  const searchQueryResult = useDispenseReturnSearch({ q: submittedQuery.trim() }, searchEnabled);
  const eligibilityQuery = useDispenseReturnEligibility(selectedDispenseId);
  const processMutation = useProcessDispenseReturn();

  const eligibility = eligibilityQuery.data;

  useEffect(() => {
    if (eligibility) {
      setLineDrafts(initialLineDrafts(eligibility.lines));
    }
  }, [eligibility?.dispense_id]);

  const handleSearch = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setFormError('Enter at least one search criterion.');
      return;
    }
    setFormError(null);
    setSubmittedQuery(trimmed);
    setSelectedDispenseId(null);
    setLineDrafts({});
  };

  const handleSelectDispense = (hit: DispenseReturnSearchHit) => {
    setSelectedDispenseId(hit.dispense_id);
    setFormError(null);
  };

  const selectedLines = useMemo(() => {
    if (!eligibility) return [];
    return eligibility.lines.filter((line) => lineDrafts[line.dispense_line_item_id]?.selected);
  }, [eligibility, lineDrafts]);

  const totalReturnAmount = useMemo(() => {
    if (!eligibility) return '0.0000';
    let sum = 0;
    for (const line of selectedLines) {
      const draft = lineDrafts[line.dispense_line_item_id];
      const qty = Number(draft?.return_qty ?? 0);
      if (Number.isFinite(qty) && qty > 0) {
        sum += Number(computeClientReturnAmount(line, qty));
      }
    }
    return sum.toFixed(4);
  }, [eligibility, lineDrafts, selectedLines]);

  const handleProcessReturn = async () => {
    if (!eligibility || !returnReason) {
      setFormError('Select a return reason before processing.');
      return;
    }
    if (returnReason === 'other' && !remarks.trim()) {
      setFormError('Remarks are required when reason is Other.');
      return;
    }
    if (selectedLines.length === 0) {
      setFormError('Select at least one medicine to return.');
      return;
    }

    for (const line of selectedLines) {
      const draft = lineDrafts[line.dispense_line_item_id];
      const qty = Number(draft.return_qty);
      const eligible = Number(line.eligible_return_qty);
      if (!Number.isFinite(qty) || qty <= 0) {
        setFormError(`Enter a valid return quantity for ${line.medicine_display_name}.`);
        return;
      }
      if (qty > eligible) {
        setFormError(`${line.medicine_display_name}: return quantity exceeds eligible quantity.`);
        return;
      }
    }

    setFormError(null);
    try {
      const result = await processMutation.mutateAsync({
        idempotencyKey: crypto.randomUUID(),
        body: {
          dispense_id: eligibility.dispense_id,
          return_reason: returnReason,
          remarks: remarks.trim() || null,
          verification,
          lines: selectedLines.map((line) => ({
            dispense_line_item_id: line.dispense_line_item_id,
            return_qty: lineDrafts[line.dispense_line_item_id].return_qty,
            stock_batch_id: line.stock_batch_id,
          })),
        },
      });
      await navigate({ to: '/pharmacy/returns/$returnId', params: { returnId: result.id } });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to process return.');
    }
  };

  return (
    <PharmacyPageShell
      title="New Return"
      description="Search a dispense transaction, select medicines, verify, and process the return."
      breadcrumbTrail={[{ label: 'Returns', href: '/pharmacy/returns' }]}
      breadcrumbLabel="New Return"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Search dispense transaction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Bill / dispense / Rx / UHID / patient name / mobile"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch();
                }}
              />
              <Button type="button" onClick={handleSearch} disabled={searchQueryResult.isFetching}>
                {searchQueryResult.isFetching ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Search className="mr-2 size-4" />
                )}
                Search
              </Button>
            </div>

            {searchEnabled && searchQueryResult.data?.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No eligible dispense transactions found.</p>
            ) : null}

            {searchQueryResult.data?.items.length ? (
              <div className="space-y-2">
                {searchQueryResult.data.items.map((hit) => (
                  <button
                    key={hit.dispense_id}
                    type="button"
                    onClick={() => handleSelectDispense(hit)}
                    className={`flex w-full items-start justify-between rounded-lg border p-4 text-left transition hover:bg-muted/40 ${
                      selectedDispenseId === hit.dispense_id ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div>
                      <p className="font-medium">{hit.patient_name ?? 'Unknown patient'}</p>
                      <p className="text-sm text-muted-foreground">
                        {hit.uhid ?? '—'} · Visit {hit.formatted_visit_id ?? hit.visit_id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Dispense {hit.dispense_number} · {formatDispenseDate(hit.dispense_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{hit.dispense_status}</Badge>
                      <p className="mt-2 text-sm font-medium">{formatMoney(hit.total_amount)}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {eligibilityQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading dispense details…
          </div>
        ) : null}

        {eligibility ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Dispense details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailField label="Patient" value={eligibility.patient_name ?? '—'} />
                <DetailField label="UHID" value={eligibility.uhid ?? '—'} />
                <DetailField label="Visit" value={eligibility.formatted_visit_id ?? '—'} />
                <DetailField label="Dispense #" value={eligibility.dispense_number} />
                <DetailField label="Dispense date" value={formatDispenseDate(eligibility.dispense_date)} />
                <DetailField label="Pharmacist" value={eligibility.pharmacist_name ?? '—'} />
                <DetailField label="Bill amount" value={formatMoney(eligibility.total_amount)} />
                <DetailField label="Status" value={eligibility.dispense_status} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medicines to return</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-2 py-2">Select</th>
                      <th className="px-2 py-2">Medicine</th>
                      <th className="px-2 py-2">Batch</th>
                      <th className="px-2 py-2">Dispensed</th>
                      <th className="px-2 py-2">Returned</th>
                      <th className="px-2 py-2">Eligible</th>
                      <th className="px-2 py-2">Return qty</th>
                      <th className="px-2 py-2">Unit price</th>
                      <th className="px-2 py-2">Return amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibility.lines.map((line) => {
                      const draft =
                        lineDrafts[line.dispense_line_item_id] ??
                        initialLineDrafts([line])[line.dispense_line_item_id];
                      const returnQty = Number(draft.return_qty);
                      const returnAmount = computeClientReturnAmount(line, returnQty);
                      return (
                        <tr key={line.dispense_line_item_id} className="border-b">
                          <td className="px-2 py-3">
                            <Checkbox
                              checked={draft.selected}
                              onCheckedChange={(checked) => {
                                setLineDrafts((current) => ({
                                  ...current,
                                  [line.dispense_line_item_id]: {
                                    ...draft,
                                    selected: checked === true,
                                  },
                                }));
                              }}
                            />
                          </td>
                          <td className="px-2 py-3 font-medium">{line.medicine_display_name}</td>
                          <td className="px-2 py-3">{line.batch_number ?? '—'}</td>
                          <td className="px-2 py-3">{line.quantity_dispensed}</td>
                          <td className="px-2 py-3">{line.quantity_returned}</td>
                          <td className="px-2 py-3">{line.eligible_return_qty}</td>
                          <td className="px-2 py-3">
                            <Input
                              type="number"
                              min={0}
                              max={line.eligible_return_qty}
                              step="any"
                              value={draft.return_qty}
                              disabled={!draft.selected}
                              className="w-24"
                              onChange={(event) => {
                                setLineDrafts((current) => ({
                                  ...current,
                                  [line.dispense_line_item_id]: {
                                    ...draft,
                                    return_qty: event.target.value,
                                  },
                                }));
                              }}
                            />
                          </td>
                          <td className="px-2 py-3">{formatMoney(line.unit_amount)}</td>
                          <td className="px-2 py-3">{formatMoney(returnAmount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Physical verification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <VerificationField
                    id="verify-unopened"
                    label="Medicine is unopened"
                    checked={verification.unopened}
                    onCheckedChange={(checked) =>
                      setVerification((current) => ({ ...current, unopened: checked }))
                    }
                  />
                  <VerificationField
                    id="verify-packaging"
                    label="Packaging is intact"
                    checked={verification.packaging_intact}
                    onCheckedChange={(checked) =>
                      setVerification((current) => ({ ...current, packaging_intact: checked }))
                    }
                  />
                  <VerificationField
                    id="verify-expiry"
                    label="Expiry verified"
                    checked={verification.expiry_verified}
                    onCheckedChange={(checked) =>
                      setVerification((current) => ({ ...current, expiry_verified: checked }))
                    }
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Return details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Return reason</Label>
                    <Select
                      value={returnReason}
                      onValueChange={(value) => setReturnReason(value as DispenseReturnReason)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {RETURN_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {formatReturnReason(reason)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Remarks{returnReason === 'other' ? ' *' : ''}</Label>
                    <Textarea
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                      placeholder="Additional notes"
                    />
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">Total return amount</p>
                    <p className="text-2xl font-semibold">{formatMoney(totalReturnAmount)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-end gap-3">
              <Button variant="outline" asChild>
                <Link to="/pharmacy/returns">Cancel</Link>
              </Button>
              <Button onClick={handleProcessReturn} disabled={processMutation.isPending}>
                {processMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  'Process Return'
                )}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </PharmacyPageShell>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function VerificationField({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
