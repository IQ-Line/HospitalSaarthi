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
  useInventoryIndentCancel,
  useInventoryIndentReject,
  useInventoryIndentSaveDraft,
  useInventoryIndentSubmit,
} from '../api/indent-mutations';
import {
  useInventoryIndentActiveChecks,
  useInventoryIndentDetail,
  useInventoryIndentStores,
  useInventoryItems,
  useInventoryStock,
  useInventoryStores,
} from '../api/queries';
import {
  indentSupportsTransferCreation,
  indentTransferFromStoreId,
  indentTransferToStoreId,
  isPartialApproval,
  resolveIndentDetailDirection,
  type IndentListDirection,
} from '../lib/indent-workflow';
import { EMPTY_INDENT_LINE } from '../mock/fixtures';
import type {
  InventoryIndentActiveMatch,
  InventoryIndentLine,
  InventoryIndentRow,
  InventoryIndentStatus,
  InventoryItemOption,
  InventoryStore,
} from '../types';
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
  view?: IndentListDirection;
  activeStoreId?: string;
};

function isEditableStatus(status: InventoryIndentStatus | undefined, isNew: boolean) {
  return isNew || status === 'draft';
}

type IndentListSearch = { tab: IndentListDirection; storeId: string | undefined };
type IndentFulfillment = 'stock_transfer' | 'procurement';
type IndentTypeValue = 'store_transfer' | 'pharmacy_refill' | 'emergency';
type IndentPriority = 'normal' | 'urgent' | 'stat';

type IndentActionsProps = {
  isNew: boolean;
  status: InventoryIndentStatus | undefined;
  listSearch: IndentListSearch;
  editable: boolean;
  showApproval: boolean;
  isIncoming: boolean;
  transferCreatable: boolean;
  detail: InventoryIndentRow | undefined;
  saveDraftPending: boolean;
  submitPending: boolean;
  cancelPending: boolean;
  approvePending: boolean;
  submitAttempted: boolean;
  draftValid: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onCancelDraft: () => void;
  onApprove: () => void;
  onOpenReject: () => void;
};

function IndentActions({
  isNew,
  status,
  listSearch,
  editable,
  showApproval,
  isIncoming,
  transferCreatable,
  detail,
  saveDraftPending,
  submitPending,
  cancelPending,
  approvePending,
  submitAttempted,
  draftValid,
  onSaveDraft,
  onSubmit,
  onCancelDraft,
  onApprove,
  onOpenReject,
}: IndentActionsProps) {
  return (
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
            onClick={onSaveDraft}
            disabled={saveDraftPending || (submitAttempted && !draftValid)}
          >
            Save draft
          </Button>
          {!isNew ? (
            <>
              <Button
                type="button"
                onClick={onSubmit}
                disabled={submitPending || (submitAttempted && !draftValid)}
              >
                Submit
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onCancelDraft}
                disabled={cancelPending}
              >
                Cancel draft
              </Button>
            </>
          ) : null}
        </>
      ) : null}
      {showApproval ? (
        <>
          <Button type="button" variant="outline" onClick={onOpenReject}>
            Reject
          </Button>
          <Button type="button" onClick={onApprove} disabled={approvePending}>
            Save approval
          </Button>
        </>
      ) : null}
      {transferCreatable && isIncoming ? (
        <Button type="button" asChild>
          <Link
            to="/inventory/transfers"
            search={{
              indentId: detail!.id,
              fromStoreId: indentTransferFromStoreId(detail!) ?? undefined,
              toStoreId: indentTransferToStoreId(detail!),
            }}
          >
            Create transfer
          </Link>
        </Button>
      ) : null}
      {detail?.inventory_stock_transfer_id ? (
        <Button type="button" variant="outline" asChild>
          <Link
            to="/inventory/transfers"
            search={{ transferId: detail.inventory_stock_transfer_id }}
          >
            View transfer
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function IndentIncomingSummary({
  isIncoming,
  detail,
}: {
  isIncoming: boolean;
  detail: InventoryIndentRow | undefined;
}) {
  if (!isIncoming || !detail) return null;
  return (
    <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4 text-sm md:grid-cols-2 xl:grid-cols-4">
      <div>
        <p className="text-xs text-muted-foreground">
          {detail.route === 'procurement' ? 'Receiving store' : 'Requesting store'}
        </p>
        <p className="font-medium">{detail.from_store}</p>
      </div>
      {detail.route !== 'procurement' ? (
        <div>
          <p className="text-xs text-muted-foreground">Fulfilling store</p>
          <p className="font-medium">{detail.to_store}</p>
        </div>
      ) : null}
      <div>
        <p className="text-xs text-muted-foreground">Requested by</p>
        <p className="font-medium">{detail.created_by ?? '—'}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Priority</p>
        <p className="font-medium uppercase">{detail.priority}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Remarks</p>
        <p className="font-medium">{detail.remarks?.trim() || '—'}</p>
      </div>
    </div>
  );
}

type IndentDetailsFieldsProps = {
  editable: boolean;
  isProcurement: boolean;
  indentDate: string;
  onIndentDateChange: (value: string) => void;
  fulfillment: IndentFulfillment;
  onFulfillmentChange: (value: IndentFulfillment) => void;
  procurementStores: InventoryStore[];
  purchaseIndentNumber: string;
  onPurchaseIndentNumberChange: (value: string) => void;
  fromStoreId: string;
  onFromStoreIdChange: (value: string) => void;
  toStoreId: string;
  onToStoreIdChange: (value: string) => void;
  indentType: IndentTypeValue;
  onIndentTypeChange: (value: IndentTypeValue) => void;
  priority: IndentPriority;
  onPriorityChange: (value: IndentPriority) => void;
  remarks: string;
  onRemarksChange: (value: string) => void;
  stores: InventoryStore[];
  submitAttempted: boolean;
  headerErrors: Record<string, string>;
};

function IndentDetailsFields({
  editable,
  isProcurement,
  indentDate,
  onIndentDateChange,
  fulfillment,
  onFulfillmentChange,
  procurementStores,
  purchaseIndentNumber,
  onPurchaseIndentNumberChange,
  fromStoreId,
  onFromStoreIdChange,
  toStoreId,
  onToStoreIdChange,
  indentType,
  onIndentTypeChange,
  priority,
  onPriorityChange,
  remarks,
  onRemarksChange,
  stores,
  submitAttempted,
  headerErrors,
}: IndentDetailsFieldsProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="indent-date">Indent date</Label>
          <Input
            id="indent-date"
            type="date"
            value={indentDate}
            disabled={!editable}
            onChange={(event) => onIndentDateChange(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Fulfillment</Label>
          <Select
            value={fulfillment}
            disabled={!editable}
            onValueChange={(v) => onFulfillmentChange(v as IndentFulfillment)}
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
              onChange={(e) => onPurchaseIndentNumberChange(e.target.value)}
            />
            {submitAttempted && headerErrors.purchase_indent_number ? (
              <p className="text-xs text-destructive">
                {headerErrors.purchase_indent_number}
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
              onValueChange={onFromStoreIdChange}
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
            {submitAttempted && headerErrors.from_store_id ? (
              <p className="text-xs text-destructive">
                {headerErrors.from_store_id}
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
                onValueChange={onFromStoreIdChange}
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
              {submitAttempted && headerErrors.from_store_id ? (
                <p className="text-xs text-destructive">
                  {headerErrors.from_store_id}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>To store</Label>
              <Select
                value={toStoreId || undefined}
                disabled={!editable}
                onValueChange={onToStoreIdChange}
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
              {submitAttempted && headerErrors.to_store_id ? (
                <p className="text-xs text-destructive">
                  {headerErrors.to_store_id}
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
            onValueChange={(v) => onIndentTypeChange(v as IndentTypeValue)}
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
            if (value) onPriorityChange(value as IndentPriority);
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
          onChange={(event) => onRemarksChange(event.target.value)}
          rows={2}
        />
      </div>
    </>
  );
}

type IndentLineRowProps = {
  line: InventoryIndentLine;
  index: number;
  editable: boolean;
  isIncoming: boolean;
  showApproval: boolean;
  status: InventoryIndentStatus | undefined;
  items: InventoryItemOption[];
  availableQtyByItemCode: Map<string, number>;
  approvedQtyByLine: Record<string, string>;
  activeMatches: InventoryIndentActiveMatch[] | undefined;
  lineTableColSpan: number;
  onItemSelect: (lineId: string, itemId: string) => void;
  onUpdateLine: (lineId: string, patch: Partial<InventoryIndentLine>) => void;
  onApprovedQtyChange: (lineId: string, value: string) => void;
  onRemove: () => void;
};

function IndentLineRow({
  line,
  index,
  editable,
  isIncoming,
  showApproval,
  status,
  items,
  availableQtyByItemCode,
  approvedQtyByLine,
  activeMatches,
  lineTableColSpan,
  onItemSelect,
  onUpdateLine,
  onApprovedQtyChange,
  onRemove,
}: IndentLineRowProps) {
  return (
    <Fragment>
      <tr className="border-b align-top">
        <td className="px-2 py-2 tabular-nums text-muted-foreground">{index + 1}</td>
        <td className="px-2 py-2">
          {editable ? (
            <Select
              value={line.item_id || undefined}
              onValueChange={(value) => onItemSelect(line.id, value)}
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
        {isIncoming ? (
          <td className="px-2 py-2 tabular-nums">
            {line.item_code
              ? (availableQtyByItemCode.get(line.item_code) ?? 0)
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
                onUpdateLine(line.id, { requested_qty: Number(e.target.value) })
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
                onApprovedQtyChange(line.id, e.target.value)
              }
            />
          </td>
        ) : isIncoming && status !== 'submitted' ? (
          <td className="px-2 py-2 tabular-nums">
            {line.approved_qty ?? approvedQtyByLine[line.id] ?? '—'}
          </td>
        ) : null}
        <td className="px-2 py-2">
          {editable ? (
            <Input
              value={line.remarks ?? ''}
              onChange={(e) => onUpdateLine(line.id, { remarks: e.target.value })}
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
              onClick={onRemove}
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
}

type IndentItemsPanelProps = {
  isIncoming: boolean;
  showApproval: boolean;
  status: InventoryIndentStatus | undefined;
  editable: boolean;
  lines: InventoryIndentLine[];
  items: InventoryItemOption[];
  approvalRemarks: string;
  onApprovalRemarksChange: (value: string) => void;
  availableQtyByItemCode: Map<string, number>;
  approvedQtyByLine: Record<string, string>;
  onApprovedQtyChange: (lineId: string, value: string) => void;
  activeIndentWarningsByLine: Record<string, InventoryIndentActiveMatch[]>;
  lineTableColSpan: number;
  onItemSelect: (lineId: string, itemId: string) => void;
  onUpdateLine: (lineId: string, patch: Partial<InventoryIndentLine>) => void;
  onRemoveLine: (lineId: string) => void;
  onAddRow: () => void;
};

function IndentItemsPanel({
  isIncoming,
  showApproval,
  status,
  editable,
  lines,
  items,
  approvalRemarks,
  onApprovalRemarksChange,
  availableQtyByItemCode,
  approvedQtyByLine,
  onApprovedQtyChange,
  activeIndentWarningsByLine,
  lineTableColSpan,
  onItemSelect,
  onUpdateLine,
  onRemoveLine,
  onAddRow,
}: IndentItemsPanelProps) {
  return (
    <InventoryPanel title={isIncoming ? `Item details (${lines.length})` : `Requested items (${lines.length})`}>
      {showApproval ? (
        <div className="mb-4 space-y-2">
          <Label htmlFor="approval-remarks">Approval remarks (required for partial approval)</Label>
          <Textarea
            id="approval-remarks"
            value={approvalRemarks}
            onChange={(event) => onApprovalRemarksChange(event.target.value)}
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
              {isIncoming ? <th className="px-2 py-2 font-medium">Available qty</th> : null}
              <th className="px-2 py-2 font-medium">Req. qty</th>
              {showApproval || (isIncoming && status !== 'submitted') ? (
                <th className="px-2 py-2 font-medium">Approved qty</th>
              ) : null}
              <th className="px-2 py-2 font-medium">Remarks</th>
              {editable ? <th className="px-2 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <IndentLineRow
                key={line.id}
                line={line}
                index={index}
                editable={editable}
                isIncoming={isIncoming}
                showApproval={showApproval}
                status={status}
                items={items}
                availableQtyByItemCode={availableQtyByItemCode}
                approvedQtyByLine={approvedQtyByLine}
                activeMatches={activeIndentWarningsByLine[line.id]}
                lineTableColSpan={lineTableColSpan}
                onItemSelect={onItemSelect}
                onUpdateLine={onUpdateLine}
                onApprovedQtyChange={onApprovedQtyChange}
                onRemove={() => onRemoveLine(line.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {editable ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 gap-1.5"
          onClick={onAddRow}
        >
          <Plus className="size-4" />
          Add row
        </Button>
      ) : null}
    </InventoryPanel>
  );
}

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function computeLineTableColSpan(showApproval: boolean, isIncoming: boolean, editable: boolean) {
  return 6 + (showApproval ? 2 : 0) + (isIncoming && !showApproval ? 1 : 0) + (editable ? 1 : 0);
}

function buildAvailableQtyMap(rows: Array<{ item_code: string; quantity: number }>) {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.item_code, row.quantity);
  }
  return map;
}

type BuildIndentPayloadInput = {
  indentDate: string;
  fromStoreId: string;
  toStoreId: string;
  isProcurement: boolean;
  indentType: IndentTypeValue;
  priority: IndentPriority;
  fulfillment: IndentFulfillment;
  purchaseIndentNumber: string;
  remarks: string;
  lines: InventoryIndentLine[];
};

function buildIndentPayload({
  indentDate,
  fromStoreId,
  toStoreId,
  isProcurement,
  indentType,
  priority,
  fulfillment,
  purchaseIndentNumber,
  remarks,
  lines,
}: BuildIndentPayloadInput) {
  return {
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
  };
}

function buildApprovalLines(
  lines: InventoryIndentLine[],
  approvedQtyByLine: Record<string, string>,
) {
  return lines
    .filter((line) => line.id && line.item_id)
    .map((line) => ({
      line_id: line.id,
      approved_qty: Number(approvedQtyByLine[line.id] ?? line.requested_qty),
    }));
}

function approvalExceedsRequested(
  lines: InventoryIndentLine[],
  approvalLines: Array<{ line_id: string; approved_qty: number }>,
) {
  for (const line of approvalLines) {
    const source = lines.find((entry) => entry.id === line.line_id);
    if (line.approved_qty > Number(source?.requested_qty ?? 0)) {
      return true;
    }
  }
  return false;
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
  const showApproval = isIncoming && status === 'submitted';
  const transferCreatable = detail ? indentSupportsTransferCreation(detail) : false;
  const stockStoreId = (detail ? indentTransferFromStoreId(detail) : toStoreId) ?? undefined;

  const { data: stockData } = useInventoryStock({
    store_id: showApproval || transferCreatable ? stockStoreId : undefined,
    status: 'all',
  });

  const availableQtyByItemCode = useMemo(
    () => buildAvailableQtyMap(stockData?.data ?? []),
    [stockData?.data],
  );

  useEffect(() => {
    if (!isNew || !activeStoreId || isProcurement) return;
    const store = indentStores.find((entry) => entry.id === activeStoreId);
    if (!store?.indent_authority) return;
    setFromStoreId(activeStoreId);
    if (store.indent_target_store_id) {
      setToStoreId(store.indent_target_store_id);
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

  const lineTableColSpan = computeLineTableColSpan(showApproval, isIncoming, editable);

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

  const buildPayload = () =>
    buildIndentPayload({
      indentDate,
      fromStoreId,
      toStoreId,
      isProcurement,
      indentType,
      priority,
      fulfillment,
      purchaseIndentNumber,
      remarks,
      lines,
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
      toast.error(toErrorMessage(error, 'Failed to save indent'));
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
      toast.error(toErrorMessage(error, 'Failed to submit indent'));
    }
  };

  const handleApprove = async () => {
    const approvalLines = buildApprovalLines(lines, approvedQtyByLine);

    if (approvalExceedsRequested(lines, approvalLines)) {
      toast.error('Approved quantity cannot exceed requested quantity.');
      return;
    }

    const partial = isPartialApproval(lines, approvedQtyByLine);
    if (partial && !approvalRemarks.trim()) {
      toast.error('Approval remarks are required for partial approval.');
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
      toast.error(toErrorMessage(error, 'Failed to approve indent'));
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
      toast.error(toErrorMessage(error, 'Failed to cancel indent'));
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
      toast.error(toErrorMessage(error, 'Failed to reject indent'));
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
        <IndentActions
          isNew={isNew}
          status={status}
          listSearch={listSearch}
          editable={editable}
          showApproval={showApproval}
          isIncoming={isIncoming}
          transferCreatable={transferCreatable}
          detail={detail}
          saveDraftPending={saveDraft.isPending}
          submitPending={submitIndent.isPending}
          cancelPending={cancelIndent.isPending}
          approvePending={approveIndent.isPending}
          submitAttempted={submitAttempted}
          draftValid={draftValidation.isValid}
          onSaveDraft={() => void handleSaveDraft()}
          onSubmit={() => void handleSubmit()}
          onCancelDraft={() => void handleCancelDraft()}
          onApprove={() => void handleApprove()}
          onOpenReject={() => setRejectOpen(true)}
        />
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

      <IndentIncomingSummary isIncoming={isIncoming} detail={detail} />

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <InventoryPanel title="Indent details">
            <IndentDetailsFields
              editable={editable}
              isProcurement={isProcurement}
              indentDate={indentDate}
              onIndentDateChange={setIndentDate}
              fulfillment={fulfillment}
              onFulfillmentChange={handleFulfillmentChange}
              procurementStores={procurementStores}
              purchaseIndentNumber={purchaseIndentNumber}
              onPurchaseIndentNumberChange={setPurchaseIndentNumber}
              fromStoreId={fromStoreId}
              onFromStoreIdChange={setFromStoreId}
              toStoreId={toStoreId}
              onToStoreIdChange={setToStoreId}
              indentType={indentType}
              onIndentTypeChange={setIndentType}
              priority={priority}
              onPriorityChange={setPriority}
              remarks={remarks}
              onRemarksChange={setRemarks}
              stores={stores}
              submitAttempted={submitAttempted}
              headerErrors={draftValidation.headerErrors}
            />
          </InventoryPanel>

          <IndentItemsPanel
            isIncoming={isIncoming}
            showApproval={showApproval}
            status={status}
            editable={editable}
            lines={lines}
            items={items}
            approvalRemarks={approvalRemarks}
            onApprovalRemarksChange={setApprovalRemarks}
            availableQtyByItemCode={availableQtyByItemCode}
            approvedQtyByLine={approvedQtyByLine}
            onApprovedQtyChange={(lineId, value) =>
              setApprovedQtyByLine((prev) => ({ ...prev, [lineId]: value }))
            }
            activeIndentWarningsByLine={activeIndentWarningsByLine}
            lineTableColSpan={lineTableColSpan}
            onItemSelect={handleItemSelect}
            onUpdateLine={updateLine}
            onRemoveLine={(lineId) => setLines((prev) => prev.filter((entry) => entry.id !== lineId))}
            onAddRow={() => setLines((prev) => [...prev, EMPTY_INDENT_LINE()])}
          />
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
