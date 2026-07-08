import { Link, useNavigate } from '@tanstack/react-router';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
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
  useInventoryIndentCancel,
  useInventoryIndentFulfill,
  useInventoryIndentReject,
  useInventoryIndentSaveDraft,
  useInventoryIndentSubmit,
} from '../api/indent-mutations';
import { useInventoryTransferCreate } from '../api/transfer-mutations';
import {
  useInventoryIndentActiveChecks,
  useInventoryIndentDetail,
  useInventoryIndentStores,
  useInventoryItems,
  useInventoryStock,
  useInventoryStores,
} from '../api/queries';
import {
  canApproveIndent,
  canFulfillIndent,
  indentStockSupplyStoreId,
  indentTransferFromStoreId,
  indentTransferToStoreId,
  isPartialApproval,
  resolveIndentDetailDirection,
  validateApprovalStock,
  type IndentListDirection,
} from '../lib/indent-workflow';
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

function indentTypeLabel(value: string): string {
  return INDENT_TYPES.find((option) => option.value === value)?.label ?? value;
}

function fulfillmentRouteLabel(value: string): string {
  return FULFILLMENT_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

type InventoryIndentDetailPageProps = {
  indentId: string;
  view?: IndentListDirection;
  activeStoreId?: string;
};

function isEditableStatus(status: InventoryIndentStatus | undefined, isNew: boolean) {
  return isNew || status === 'draft';
}

export function InventoryIndentDetailPage({
  indentId,
  view,
  activeStoreId,
}: InventoryIndentDetailPageProps) {
  const navigate = useNavigate();
  const isNew = indentId === 'new';
  const { data: detail, isLoading, refetch } = useInventoryIndentDetail(isNew ? undefined : indentId);
  const { data: stores = [] } = useInventoryStores();
  const { data: indentStores = [] } = useInventoryIndentStores();
  const { data: items = [] } = useInventoryItems();

  const saveDraft = useInventoryIndentSaveDraft();
  const submitIndent = useInventoryIndentSubmit();
  const approveIndent = useInventoryIndentApprove();
  const rejectIndent = useInventoryIndentReject();
  const cancelIndent = useInventoryIndentCancel();
  const fulfillIndent = useInventoryIndentFulfill();
  const createTransfer = useInventoryTransferCreate();

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
  const [rejectReason, setRejectReason] = useState('');
  const [approvalRemarks, setApprovalRemarks] = useState('');

  const isProcurement = fulfillment === 'procurement';
  const procurementStores = useMemo(
    () => stores.filter((store) => store.is_central_store),
    [stores],
  );

  const listDirection =
    view ??
    (detail ? resolveIndentDetailDirection(detail, activeStoreId) : 'outgoing');
  const isIncoming = listDirection === 'incoming';
  const status = isNew ? 'draft' : detail?.status;
  const editable = !isIncoming && isEditableStatus(status, isNew);
  const showApproval = detail ? canApproveIndent(detail) : false;
  const showWorkflowView = !isNew && status !== 'draft';
  const canFulfill = detail ? canFulfillIndent(detail) : false;
  const showAvailableQty = showApproval || canFulfill;
  const showApprovedQtyReadOnly =
    !showApproval &&
    status != null &&
    !['draft', 'submitted', 'cancelled'].includes(status);
  const stockStoreId = detail ? indentStockSupplyStoreId(detail) : toStoreId;
  const stockStoreName =
    detail && stockStoreId
      ? (indentStores.find((store) => store.id === stockStoreId)?.name ??
        (stockStoreId === detail.from_store_id ? detail.from_store : detail.to_store))
      : null;

  const { data: stockData } = useInventoryStock({
    store_id: showApproval || canFulfill ? stockStoreId : undefined,
    status: 'all',
  });

  const availableQtyByItemCode = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stockData?.data ?? []) {
      map.set(row.item_code, row.quantity);
    }
    return map;
  }, [stockData?.data]);

  const availableQtyByItemId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stockData?.data ?? []) {
      map.set(row.id, row.quantity);
    }
    return map;
  }, [stockData?.data]);

  useEffect(() => {
    if (!isNew || !activeStoreId || isProcurement) return;
    const store = indentStores.find((entry) => entry.id === activeStoreId);
    if (!store?.indent_authority) return;
    // Requesting store is To (receives). Supplying hub is From (sends stock).
    setToStoreId(activeStoreId);
    if (store.indent_target_store_id) {
      setFromStoreId(store.indent_target_store_id);
    }
  }, [activeStoreId, indentStores, isNew, isProcurement]);

  useEffect(() => {
    if (!isNew || !isProcurement) return;
    const central = procurementStores[0];
    if (central) {
      setFromStoreId(central.id);
      setToStoreId('');
    }
  }, [isNew, isProcurement, procurementStores]);

  useEffect(() => {
    if (!detail || isNew) return;
    setIndentDate(detail.request_date);
    setFulfillment(detail.route);
    setPurchaseIndentNumber(detail.purchase_indent_number ?? '');
    setFromStoreId(detail.from_store_id);
    setToStoreId(detail.to_store_id ?? '');
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

  const lineTableColSpan =
    6 + (showAvailableQty ? 1 : 0) + (showApproval || showApprovedQtyReadOnly ? 1 : 0) + (editable ? 1 : 0);

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

  const handleFulfillmentChange = (value: typeof fulfillment) => {
    setFulfillment(value);
    if (value === 'procurement') {
      setToStoreId('');
      const central = procurementStores[0];
      if (central) setFromStoreId(central.id);
    }
  };

  const buildPayload = () => ({
    indent_date: indentDate,
    from_store_id: fromStoreId,
    to_store_id: isProcurement ? null : toStoreId || null,
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
      void navigate({
        to: '/inventory/indents/$indentId',
        params: { indentId: id },
        search: {
          view: listDirection,
          storeId: activeStoreId || toStoreId || fromStoreId,
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit indent');
    }
  };

  const handleApprove = async () => {
    const approvalLines = lines
      .filter((line) => line.id && line.item_id)
      .map((line) => ({
        line_id: line.id,
        approved_qty: Number(approvedQtyByLine[line.id] ?? line.requested_qty),
      }));

    for (const line of approvalLines) {
      const source = lines.find((entry) => entry.id === line.line_id);
      if (line.approved_qty > Number(source?.requested_qty ?? 0)) {
        toast.error('Approved quantity cannot exceed requested quantity.');
        return;
      }
    }

    const partial = isPartialApproval(lines, approvedQtyByLine);
    if (partial && !approvalRemarks.trim()) {
      toast.error('Approval remarks are required for partial approval.');
      return;
    }

    const hasApprovedQty = approvalLines.some((line) => line.approved_qty > 0);
    if (!hasApprovedQty) {
      toast.error('At least one line must have an approved quantity greater than zero.');
      return;
    }

    const stockError = validateApprovalStock(
      lines,
      approvedQtyByLine,
      availableQtyByItemCode,
      availableQtyByItemId,
    );
    if (stockError) {
      toast.error(stockError);
      return;
    }

    if (!OPERATIONAL_INVENTORY_API_ENABLED) {
      toast.success(partial ? 'Indent partially approved (mock).' : 'Indent approved (mock).');
      return;
    }
    try {
      await approveIndent.mutateAsync({
        indentId,
        lines: approvalLines,
        approval_remarks: partial ? approvalRemarks.trim() : null,
      });
      toast.success(partial ? 'Partial approval saved' : 'Indent approved');
      void refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve indent');
    }
  };

  const handleCancelDraft = async () => {
    if (!OPERATIONAL_INVENTORY_API_ENABLED) {
      toast.success('Draft indent cancelled (mock).');
      void navigate({ to: '/inventory/indents', search: { tab: 'outgoing', storeId: activeStoreId } });
      return;
    }
    try {
      await cancelIndent.mutateAsync(indentId);
      toast.success('Draft indent cancelled');
      void navigate({ to: '/inventory/indents', search: { tab: 'outgoing', storeId: activeStoreId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel indent');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      await rejectIndent.mutateAsync({ indentId, reason: rejectReason.trim() });
      toast.success('Indent rejected');
      void refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject indent');
    }
  };

  const handleInitiateFulfillment = async () => {
    if (!detail) return;
    if (!OPERATIONAL_INVENTORY_API_ENABLED) {
      toast.success('Fulfillment initiated (mock).');
      return;
    }
    try {
      if (detail.route === 'procurement') {
        await fulfillIndent.mutateAsync(indentId);
        toast.success('Procurement started — complete the draft GRN to finish');
      } else {
        const approvedLines = detail.lines.filter(
          (line) => line.item_id && Number(line.approved_qty ?? line.requested_qty) > 0,
        );
        await createTransfer.mutateAsync({
          transfer_date: new Date().toISOString().slice(0, 10),
          from_store_id: indentTransferFromStoreId(detail),
          to_store_id: indentTransferToStoreId(detail),
          transfer_type: detail.indent_type === 'emergency' ? 'emergency' : 'normal',
          remarks: detail.remarks
            ? `From indent ${detail.indent_number}: ${detail.remarks}`
            : `From indent ${detail.indent_number}`,
          inventory_indent_id: detail.id,
          lines: approvedLines.map((line, index) => ({
            item_id: line.item_id!,
            transfer_qty: Number(line.approved_qty ?? line.requested_qty),
            line_remarks: line.remarks ?? null,
            sort_order: index,
          })),
        });
        toast.success('Transfer created — complete it on Transfers to finish');
      }
      void refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to initiate fulfillment');
    }
  };

  const listSearch = { tab: listDirection, storeId: activeStoreId };

  const title = isNew ? 'New indent' : (detail?.indent_number ?? 'Indent');
  const breadcrumbs = [
    { label: 'Inventory', to: '/inventory/dashboard' },
    { label: 'Indents', to: '/inventory/indents', search: listSearch },
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
            <Link to="/inventory/indents" search={listSearch}>
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
                <>
                  <Button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={submitIndent.isPending || (submitAttempted && !draftValidation.isValid)}
                  >
                    Submit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void handleCancelDraft()}
                    disabled={cancelIndent.isPending}
                  >
                    Cancel draft
                  </Button>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      }
    >
      {detail?.rejection_reason ? (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          Rejected: {detail.rejection_reason}
        </div>
      ) : null}

      {detail?.approval_remarks ? (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          Partial approval note: {detail.approval_remarks}
        </div>
      ) : null}

      {showWorkflowView && detail ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">From: </span>
                <span className="font-medium">{detail.from_store}</span>
              </p>
              {detail.route !== 'procurement' ? (
                <p>
                  <span className="text-muted-foreground">To: </span>
                  <span className="font-medium">{detail.to_store}</span>
                </p>
              ) : null}
              <p>
                <span className="text-muted-foreground">Type: </span>
                <span className="font-medium">{indentTypeLabel(detail.indent_type)}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Priority: </span>
                <span className="font-medium uppercase">{detail.priority}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Route: </span>
                <span className="font-medium">{fulfillmentRouteLabel(detail.route)}</span>
              </p>
            </div>

            <InventoryPanel title="Items">
              <ul className="flex flex-col gap-2">
                {lines
                  .filter((line) => line.item_id)
                  .map((line) => (
                    <li key={line.id} className="rounded-md border bg-muted/40 px-3 py-2">
                      <div className="font-medium">{line.item_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {line.item_code} · requested {line.requested_qty} {line.uom}
                        {status !== 'submitted' && line.approved_qty != null
                          ? ` · approved ${line.approved_qty}`
                          : null}
                      </div>
                      {showApproval ? (
                        <>
                          {line.item_code || line.item_id ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Available at {stockStoreName ?? 'supply store'}:{' '}
                              {(line.item_id
                                ? availableQtyByItemId.get(line.item_id)
                                : undefined) ??
                                (line.item_code
                                  ? availableQtyByItemCode.get(line.item_code)
                                  : undefined) ??
                                0}{' '}
                              {line.uom}
                            </p>
                          ) : null}
                          <div className="mt-2 flex items-center gap-2">
                            <Label className="text-xs">Approved qty</Label>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 w-24"
                              value={approvedQtyByLine[line.id] ?? ''}
                              onChange={(e) =>
                                setApprovedQtyByLine((prev) => ({
                                  ...prev,
                                  [line.id]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </>
                      ) : null}
                    </li>
                  ))}
              </ul>

              {showApproval ? (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="approval-remarks">
                      Approval remarks (required for partial approval)
                    </Label>
                    <Textarea
                      id="approval-remarks"
                      value={approvalRemarks}
                      onChange={(event) => setApprovalRemarks(event.target.value)}
                      rows={2}
                      placeholder="Explain why approved quantity is less than requested"
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => void handleApprove()}
                    disabled={approveIndent.isPending}
                  >
                    Save approval
                  </Button>
                  <div className="space-y-2">
                    <Label className="text-xs" htmlFor="reject-reason">
                      Reject reason
                    </Label>
                    <Textarea
                      id="reject-reason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    onClick={() => void handleReject()}
                    disabled={rejectIndent.isPending || !rejectReason.trim()}
                  >
                    Reject indent
                  </Button>
                </div>
              ) : null}

              {canFulfill ? (
                <div className="mt-4">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => void handleInitiateFulfillment()}
                    disabled={fulfillIndent.isPending || createTransfer.isPending}
                  >
                    Initiate fulfillment (
                    {detail.route === 'procurement' ? 'PR + GRN' : 'stock transfer'})
                  </Button>
                </div>
              ) : null}

              {status === 'in_fulfillment' ? (
                <div className="mt-4 flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    Fulfillment in progress — complete the linked document to mark this indent
                    fulfilled.
                  </p>
                  {detail.inventory_stock_transfer_id ? (
                    <Button type="button" className="w-full" asChild>
                      <Link
                        to="/inventory/transfers"
                        search={{ transferId: detail.inventory_stock_transfer_id }}
                      >
                        Open transfers
                      </Link>
                    </Button>
                  ) : null}
                  {detail.inventory_grn_id ? (
                    <Button type="button" variant="outline" className="w-full" asChild>
                      <Link
                        to="/inventory/grn-logs/new"
                        search={{ grnId: detail.inventory_grn_id }}
                      >
                        Open GRN
                      </Link>
                    </Button>
                  ) : null}
                </div>
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
              {detail.inventory_grn_id ? (
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
      ) : (
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
                  onValueChange={(v) => handleFulfillmentChange(v as typeof fulfillment)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FULFILLMENT_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={option.value === 'procurement' && procurementStores.length === 0}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isProcurement ? (
                  <p className="text-xs text-muted-foreground">
                    Stock is procured from an external supplier. No internal store transfer.
                  </p>
                ) : null}
              </div>
              {isProcurement ? (
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
              {isProcurement ? (
                <div className="space-y-2">
                  <Label>Receiving store</Label>
                  <Select
                    value={fromStoreId || undefined}
                    disabled={!editable}
                    onValueChange={setFromStoreId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {procurementStores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.store_code} — {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {submitAttempted && draftValidation.headerErrors.from_store_id ? (
                    <p className="text-xs text-destructive">
                      {draftValidation.headerErrors.from_store_id}
                    </p>
                  ) : null}
                </div>
              ) : (
                <>
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
                    {submitAttempted && draftValidation.headerErrors.from_store_id ? (
                      <p className="text-xs text-destructive">
                        {draftValidation.headerErrors.from_store_id}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label>To store</Label>
                    <Select
                      value={toStoreId || undefined}
                      disabled={!editable}
                      onValueChange={setToStoreId}
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
                    {submitAttempted && draftValidation.headerErrors.to_store_id ? (
                      <p className="text-xs text-destructive">
                        {draftValidation.headerErrors.to_store_id}
                      </p>
                    ) : null}
                  </div>
                </>
              )}
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

          <InventoryPanel title={isIncoming ? `Item details (${lines.length})` : `Requested items (${lines.length})`}>
            {showApproval ? (
              <div className="mb-4 space-y-2">
                <Label htmlFor="approval-remarks">Approval remarks (required for partial approval)</Label>
                <Textarea
                  id="approval-remarks"
                  value={approvalRemarks}
                  onChange={(event) => setApprovalRemarks(event.target.value)}
                  rows={2}
                  placeholder="Explain why approved quantity is less than requested"
                />
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">Item</th>
                    <th className="px-2 py-2 font-medium">Item code</th>
                    <th className="px-2 py-2 font-medium">Base UOM</th>
                    {showAvailableQty ? <th className="px-2 py-2 font-medium">Available qty</th> : null}
                    <th className="px-2 py-2 font-medium">Req. qty</th>
                    {showApproval || showApprovedQtyReadOnly ? (
                      <th className="px-2 py-2 font-medium">Approved qty</th>
                    ) : null}
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
                          {showAvailableQty ? (
                            <td className="px-2 py-2 tabular-nums">
                              {line.item_id || line.item_code
                                ? (line.item_id
                                    ? availableQtyByItemId.get(line.item_id)
                                    : undefined) ??
                                  (line.item_code
                                    ? availableQtyByItemCode.get(line.item_code)
                                    : undefined) ??
                                  0
                                : '—'}
                            </td>
                          ) : null}
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
                          ) : showApprovedQtyReadOnly ? (
                            <td className="px-2 py-2 tabular-nums">
                              {line.approved_qty ?? approvedQtyByLine[line.id] ?? '—'}
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
      )}

    </InventoryPageShell>
  );
}
