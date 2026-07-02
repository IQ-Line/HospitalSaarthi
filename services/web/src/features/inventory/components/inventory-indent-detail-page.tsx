import { Link, useNavigate } from '@tanstack/react-router';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
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
import { ToggleGroup, ToggleGroupItem } from '@pulse/ui/toggle-group';
import { OPERATIONAL_INVENTORY_API_ENABLED } from '../lib/inventory-api-enabled';
import { validateIndentDraft } from '../lib/indent-draft-validation';
import { indentStatusBadgeVariant, indentStatusLabel } from '../lib/indent-status';
import {
  useInventoryIndentApprove,
  useInventoryIndentFulfill,
  useInventoryIndentReject,
  useInventoryIndentSaveDraft,
  useInventoryIndentSubmit,
} from '../api/indent-mutations';
import { useInventoryIndentActiveChecks, useInventoryIndentDetail, useInventoryItems, useInventoryStores } from '../api/queries';
import { EMPTY_INDENT_LINE } from '../mock/fixtures';
import type { InventoryIndentLine, InventoryIndentStatus } from '../types';
import { InventoryPageShell } from './inventory-page-shell';
import { InventoryPanel } from './inventory-kpi-card';

const INDENT_TYPES = [
  { value: 'store_transfer', label: 'Store transfer' },
  { value: 'pharmacy_refill', label: 'Pharmacy refill' },
  { value: 'emergency', label: 'Emergency' },
] as const;

const FULFILLMENT_OPTIONS = [
  { value: 'stock_transfer', label: 'Stock transfer' },
  { value: 'procurement', label: 'Procurement' },
] as const;

type InventoryIndentDetailPageProps = {
  indentId: string;
};

function isEditableStatus(status: InventoryIndentStatus | undefined, isNew: boolean) {
  return isNew || status === 'draft';
}

export function InventoryIndentDetailPage({ indentId }: InventoryIndentDetailPageProps) {
  const navigate = useNavigate();
  const isNew = indentId === 'new';
  const { data: detail, isLoading, refetch } = useInventoryIndentDetail(isNew ? undefined : indentId);
  const { data: stores = [] } = useInventoryStores();
  const { data: items = [] } = useInventoryItems();

  const saveDraft = useInventoryIndentSaveDraft();
  const submitIndent = useInventoryIndentSubmit();
  const approveIndent = useInventoryIndentApprove();
  const rejectIndent = useInventoryIndentReject();
  const fulfillIndent = useInventoryIndentFulfill();

  const [indentDate, setIndentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fulfillment, setFulfillment] = useState<'stock_transfer' | 'procurement'>('stock_transfer');
  const [purchaseIndentNumber, setPurchaseIndentNumber] = useState('');
  const [fromStoreId, setFromStoreId] = useState('');
  const [toStoreId, setToStoreId] = useState('');
  const [indentType, setIndentType] = useState<'store_transfer' | 'pharmacy_refill' | 'emergency'>(
    'store_transfer',
  );
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'stat'>('normal');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<InventoryIndentLine[]>([EMPTY_INDENT_LINE()]);
  const [approvedQtyByLine, setApprovedQtyByLine] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const status = isNew ? 'draft' : detail?.status;
  const editable = isEditableStatus(status, isNew);
  const showApproval = status === 'submitted';

  useEffect(() => {
    if (!detail || isNew) return;
    setIndentDate(detail.request_date);
    setFulfillment(detail.route);
    setPurchaseIndentNumber(detail.purchase_indent_number ?? '');
    setFromStoreId(detail.from_store_id);
    setToStoreId(detail.to_store_id);
    setIndentType(detail.indent_type);
    setPriority(detail.priority);
    setRemarks(detail.remarks ?? '');
    setLines(
      detail.lines.length > 0
        ? detail.lines.map((line) => ({ ...line }))
        : [EMPTY_INDENT_LINE()],
    );
    setApprovedQtyByLine(
      Object.fromEntries(
        detail.lines.map((line) => [
          line.id,
          String(line.approved_qty ?? line.requested_qty ?? ''),
        ]),
      ),
    );
  }, [detail, isNew]);

  const draftValidation = useMemo(
    () =>
      validateIndentDraft({
        from_store_id: fromStoreId,
        to_store_id: toStoreId,
        fulfillment_route: fulfillment,
        purchase_indent_number: purchaseIndentNumber,
        lines: lines.map((line) => ({
          item_id: line.item_id ?? '',
          requested_qty: String(line.requested_qty ?? ''),
          line_remarks: line.remarks,
        })),
      }),
    [fromStoreId, toStoreId, fulfillment, purchaseIndentNumber, lines],
  );

  const totalQty = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.requested_qty) || 0), 0),
    [lines],
  );

  const activeIndentWarningsByLine = useInventoryIndentActiveChecks(
    lines,
    fromStoreId,
    toStoreId,
    indentId,
  );

  const lineTableColSpan = 6 + (showApproval ? 1 : 0) + (editable ? 1 : 0);

  const updateLine = (lineId: string, patch: Partial<InventoryIndentLine>) => {
    setLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };

  const handleItemSelect = (lineId: string, itemId: string) => {
    const duplicateOnIndent = lines.some((line) => line.id !== lineId && line.item_id === itemId);
    if (duplicateOnIndent) {
      toast.warning('This item is already on this indent.');
      return;
    }

    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;
    updateLine(lineId, {
      item_id: item.id,
      item_code: item.code,
      item_name: item.name,
      uom: item.uom,
    });
  };

  const buildPayload = () => ({
    indent_date: indentDate,
    from_store_id: fromStoreId,
    to_store_id: toStoreId,
    indent_type: indentType,
    priority,
    fulfillment_route: fulfillment,
    purchase_indent_number: fulfillment === 'procurement' ? purchaseIndentNumber : null,
    remarks: remarks || null,
    lines: lines
      .filter((line) => line.item_id)
      .map((line, index) => ({
        item_id: line.item_id!,
        requested_qty: Number(line.requested_qty),
        line_remarks: line.remarks || null,
        sort_order: index,
      })),
  });

  const handleSaveDraft = async () => {
    setSubmitAttempted(true);
    if (!draftValidation.isValid) return;

    if (!OPERATIONAL_INVENTORY_API_ENABLED) {
      toast.success('Indent draft saved (mock).');
      void navigate({ to: '/inventory/indents' });
      return;
    }

    try {
      const saved = await saveDraft.mutateAsync({
        indentId: isNew ? undefined : indentId,
        payload: buildPayload(),
      });
      toast.success('Indent draft saved');
      if (isNew) {
        void navigate({ to: '/inventory/indents/$indentId', params: { indentId: saved.id } });
      } else {
        void refetch();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save indent');
    }
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    if (!draftValidation.isValid) return;
    if (!OPERATIONAL_INVENTORY_API_ENABLED) {
      toast.success('Indent submitted (mock).');
      return;
    }
    try {
      let id = indentId;
      if (isNew || status === 'draft') {
        const saved = await saveDraft.mutateAsync({
          indentId: isNew ? undefined : indentId,
          payload: buildPayload(),
        });
        id = saved.id;
      }
      await submitIndent.mutateAsync(id);
      toast.success('Indent submitted');
      void navigate({ to: '/inventory/indents/$indentId', params: { indentId: id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit indent');
    }
  };

  const handleApprove = async () => {
    if (!OPERATIONAL_INVENTORY_API_ENABLED) {
      toast.success('Indent approved (mock).');
      return;
    }
    try {
      await approveIndent.mutateAsync({
        indentId,
        lines: lines
          .filter((line) => line.id && line.item_id)
          .map((line) => ({
            line_id: line.id,
            approved_qty: Number(approvedQtyByLine[line.id] ?? line.requested_qty),
          })),
      });
      toast.success('Approval saved');
      void refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve indent');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      await rejectIndent.mutateAsync({ indentId, reason: rejectReason.trim() });
      toast.success('Indent rejected');
      setRejectOpen(false);
      void refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject indent');
    }
  };

  const handleFulfill = async () => {
    try {
      await fulfillIndent.mutateAsync(indentId);
      toast.success('Fulfillment initiated');
      void refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fulfill indent');
    }
  };

  const title = isNew ? 'New indent' : (detail?.indent_number ?? 'Indent');
  const breadcrumbs = [
    { label: 'Inventory', to: '/inventory/dashboard' },
    { label: 'Indents', to: '/inventory/indents' },
    { label: isNew ? 'New' : (detail?.indent_number ?? '…') },
  ];

  if (!isNew && isLoading && OPERATIONAL_INVENTORY_API_ENABLED) {
    return (
      <InventoryPageShell title="Indent" breadcrumbs={breadcrumbs}>
        <p className="text-sm text-muted-foreground">Loading indent…</p>
      </InventoryPageShell>
    );
  }

  return (
    <InventoryPageShell
      title={title}
      breadcrumbs={breadcrumbs}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && status ? (
            <Badge variant={indentStatusBadgeVariant(status)}>{indentStatusLabel(status)}</Badge>
          ) : null}
          <Button type="button" variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to="/inventory/indents">
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Link>
          </Button>
          {editable ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSaveDraft()}
                disabled={saveDraft.isPending || (submitAttempted && !draftValidation.isValid)}
              >
                Save draft
              </Button>
              {!isNew ? (
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitIndent.isPending || (submitAttempted && !draftValidation.isValid)}
                >
                  Submit
                </Button>
              ) : null}
            </>
          ) : null}
          {showApproval ? (
            <>
              <Button type="button" variant="outline" onClick={() => setRejectOpen(true)}>
                Reject
              </Button>
              <Button type="button" onClick={() => void handleApprove()} disabled={approveIndent.isPending}>
                Save approval
              </Button>
            </>
          ) : null}
          {status === 'approved' || status === 'partially_approved' ? (
            <Button type="button" onClick={() => void handleFulfill()} disabled={fulfillIndent.isPending}>
              Initiate fulfillment
            </Button>
          ) : null}
        </div>
      }
    >
      {detail?.rejection_reason ? (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          Rejected: {detail.rejection_reason}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <InventoryPanel title="Indent details">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="indent-date">Indent date</Label>
                <Input
                  id="indent-date"
                  type="date"
                  value={indentDate}
                  disabled={!editable}
                  onChange={(event) => setIndentDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fulfillment</Label>
                <Select
                  value={fulfillment}
                  disabled={!editable}
                  onValueChange={(v) => setFulfillment(v as typeof fulfillment)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FULFILLMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {fulfillment === 'procurement' ? (
                <div className="space-y-2">
                  <Label>Purchase indent #</Label>
                  <Input
                    value={purchaseIndentNumber}
                    disabled={!editable}
                    onChange={(e) => setPurchaseIndentNumber(e.target.value)}
                  />
                  {submitAttempted && draftValidation.headerErrors.purchase_indent_number ? (
                    <p className="text-xs text-destructive">
                      {draftValidation.headerErrors.purchase_indent_number}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>From store</Label>
                <Select
                  value={fromStoreId || undefined}
                  disabled={!editable}
                  onValueChange={setFromStoreId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.store_code} — {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To store</Label>
                <Select value={toStoreId || undefined} disabled={!editable} onValueChange={setToStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.store_code} — {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Indent type</Label>
                <Select
                  value={indentType}
                  disabled={!editable}
                  onValueChange={(v) => setIndentType(v as typeof indentType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDENT_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label>Priority</Label>
              <ToggleGroup
                type="single"
                value={priority}
                disabled={!editable}
                onValueChange={(value) => {
                  if (value) setPriority(value as typeof priority);
                }}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem value="normal">Normal</ToggleGroupItem>
                <ToggleGroupItem value="urgent">Urgent</ToggleGroupItem>
                <ToggleGroupItem value="stat">STAT</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="indent-remarks">Remarks</Label>
              <Textarea
                id="indent-remarks"
                value={remarks}
                disabled={!editable}
                onChange={(event) => setRemarks(event.target.value)}
                rows={2}
              />
            </div>
          </InventoryPanel>

          <InventoryPanel title={`Requested items (${lines.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">Item</th>
                    <th className="px-2 py-2 font-medium">Item code</th>
                    <th className="px-2 py-2 font-medium">Base UOM</th>
                    <th className="px-2 py-2 font-medium">Req. qty</th>
                    {showApproval ? <th className="px-2 py-2 font-medium">Approved qty</th> : null}
                    <th className="px-2 py-2 font-medium">Remarks</th>
                    {editable ? <th className="px-2 py-2" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => {
                    const activeMatches = activeIndentWarningsByLine[line.id];
                    return (
                      <Fragment key={line.id}>
                        <tr className="border-b align-top">
                          <td className="px-2 py-2 tabular-nums text-muted-foreground">{index + 1}</td>
                          <td className="px-2 py-2">
                            {editable ? (
                              <Select
                                value={line.item_id || undefined}
                                onValueChange={(value) => handleItemSelect(line.id, value)}
                              >
                                <SelectTrigger className="min-w-[220px]">
                                  <SelectValue placeholder="Search or select item…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {items.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.code} — {item.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              line.item_name
                            )}
                          </td>
                          <td className="px-2 py-2 text-muted-foreground">{line.item_code || '—'}</td>
                          <td className="px-2 py-2">{line.uom || '—'}</td>
                          <td className="px-2 py-2">
                            {editable ? (
                              <Input
                                type="number"
                                min={0}
                                className="w-24"
                                value={line.requested_qty}
                                onChange={(e) =>
                                  updateLine(line.id, { requested_qty: Number(e.target.value) })
                                }
                              />
                            ) : (
                              line.requested_qty
                            )}
                          </td>
                          {showApproval ? (
                            <td className="px-2 py-2">
                              <Input
                                type="number"
                                min={0}
                                className="w-24"
                                value={approvedQtyByLine[line.id] ?? ''}
                                onChange={(e) =>
                                  setApprovedQtyByLine((prev) => ({
                                    ...prev,
                                    [line.id]: e.target.value,
                                  }))
                                }
                              />
                            </td>
                          ) : null}
                          <td className="px-2 py-2">
                            {editable ? (
                              <Input
                                value={line.remarks ?? ''}
                                onChange={(e) => updateLine(line.id, { remarks: e.target.value })}
                              />
                            ) : (
                              (line.remarks ?? '—')
                            )}
                          </td>
                          {editable ? (
                            <td className="px-2 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setLines((prev) => prev.filter((entry) => entry.id !== line.id))
                                }
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </td>
                          ) : null}
                        </tr>
                        {activeMatches && activeMatches.length > 0 ? (
                          <tr className="border-b bg-amber-50/60 dark:bg-amber-950/20">
                            <td
                              colSpan={lineTableColSpan}
                              className="px-3 py-1.5 text-[11px] leading-tight text-amber-700 dark:text-amber-400"
                            >
                              Already on{' '}
                              {activeMatches.map((match, matchIndex) => (
                                <Fragment key={match.indent_id}>
                                  {matchIndex > 0 ? ', ' : null}
                                  <Link
                                    to="/inventory/indents/$indentId"
                                    params={{ indentId: match.indent_id }}
                                    className="font-mono underline underline-offset-2"
                                  >
                                    {match.indent_number}
                                  </Link>{' '}
                                  ({indentStatusLabel(match.status)})
                                </Fragment>
                              ))}
                              . Consider updating the existing indent instead.
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {editable ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={() => setLines((prev) => [...prev, EMPTY_INDENT_LINE()])}
              >
                <Plus className="size-4" />
                Add row
              </Button>
            ) : null}
          </InventoryPanel>
        </div>

        <InventoryPanel title="Summary">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Total requested qty</dt>
              <dd className="font-medium tabular-nums">{totalQty}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Line items</dt>
              <dd className="font-medium tabular-nums">{lines.filter((l) => l.item_id).length}</dd>
            </div>
            {detail?.inventory_grn_id ? (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Linked GRN</dt>
                <dd>
                  <Link
                    to="/inventory/grn-logs/new"
                    search={{ grnId: detail.inventory_grn_id }}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Open GRN
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>
        </InventoryPanel>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject indent</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => void handleReject()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </InventoryPageShell>
  );
}
