import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Checkbox } from '@pulse/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from '@pulse/ui/switch';
import { toast } from 'sonner';
import {
  useSequenceConfigurationDetail,
  useUpsertSequenceIdentifier,
  type SequenceIdentifierConfig,
} from '@/features/configurator/api/sequence-configuration';
import { SEQUENCE_IDENTIFIER_META } from '@/features/configurator/sequence-constants';
import {
  buildFormatCode,
  buildFormatPreview,
  DATE_FORMATS,
  formatPreviewExampleNote,
  moveSegmentInOrder,
  normalizeSegmentOrder,
  normalizeTenantNumericCode,
  type DateFormat,
  type IdentifierType,
  type SequenceFormatSegment,
  type SegmentType,
} from '@/features/configurator/sequence-format';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';

const SEGMENT_LABELS: Record<SegmentType, string> = {
  prefix_text: 'Prefix Text',
  date_format: 'Date Format',
  tenant_code: 'Tenant Code',
  sequence: 'Sequence',
};

function cloneSegments(segments: SequenceFormatSegment[]): SequenceFormatSegment[] {
  return normalizeSegmentOrder(segments.map((s) => ({ ...s })));
}

interface SequenceCustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  identifierType: IdentifierType | null;
  onSaved: () => void;
}

export function SequenceCustomizeDialog({
  open,
  onOpenChange,
  tenantId,
  identifierType,
  onSaved,
}: SequenceCustomizeDialogProps) {
  const { data: detail } = useSequenceConfigurationDetail(tenantId, { enabled: open && !!tenantId });
  const upsert = useUpsertSequenceIdentifier(tenantId);
  const [segments, setSegments] = useState<SequenceFormatSegment[]>([]);
  const [revertToDefault, setRevertToDefault] = useState(false);

  const tenantNumericCode = normalizeTenantNumericCode(detail?.tenant_numeric_code);
  const meta = identifierType ? SEQUENCE_IDENTIFIER_META[identifierType] : null;

  const sourceConfig = useMemo((): SequenceIdentifierConfig | undefined => {
    if (!identifierType || !detail) return undefined;
    return detail.identifiers.find((i) => i.identifier_type === identifierType);
  }, [detail, identifierType]);

  useEffect(() => {
    if (!open || !sourceConfig) return;
    setSegments(cloneSegments(sourceConfig.segments));
    setRevertToDefault(!sourceConfig.is_custom);
  }, [open, sourceConfig]);

  const ordered = useMemo(() => normalizeSegmentOrder(segments), [segments]);
  const formatCode = useMemo(() => buildFormatCode(ordered), [ordered]);
  const sampleSequence = useMemo(() => {
    const seq = ordered.find((s) => s.segment_type === 'sequence' && s.enabled);
    return seq?.sequence_starts_at ?? 1;
  }, [ordered]);
  const formatPreview = useMemo(
    () => buildFormatPreview(ordered, tenantNumericCode, new Date(), sampleSequence),
    [ordered, tenantNumericCode, sampleSequence],
  );
  const exampleNote = useMemo(
    () => formatPreviewExampleNote(tenantNumericCode),
    [tenantNumericCode],
  );

  const updateSegment = useCallback((type: SegmentType, patch: Partial<SequenceFormatSegment>) => {
    setSegments((prev) =>
      prev.map((s) => (s.segment_type === type ? { ...s, ...patch } : s)),
    );
  }, []);

  const moveSegment = useCallback((type: SegmentType, direction: -1 | 1) => {
    setSegments((prev) => moveSegmentInOrder(prev, type, direction));
  }, []);

  const onSave = async () => {
    if (!identifierType) return;
    try {
      if (revertToDefault) {
        await upsert.mutateAsync({ identifierType, body: { is_custom: false } });
        toast.success('Reverted to platform default');
      } else {
        await upsert.mutateAsync({
          identifierType,
          body: { is_custom: true, segments: normalizeSegmentOrder(segments) },
        });
        toast.success('Sequence format saved');
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(92dvh,900px)] w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden border bg-background p-0 shadow-xl sm:max-w-[32rem] sm:rounded-xl"
      >
        <DialogHeader className="shrink-0 space-y-1.5 border-b px-5 py-4 text-left">
          <DialogTitle className="text-base font-semibold tracking-tight">
            Customise — {meta?.title ?? 'Identifier'}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
            All segment types are available below—turn off what you do not need, or enable tenant
            code and reorder segments. Saved layout applies to this tenant only.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="rounded-lg border border-border/80 bg-muted/30 px-4 py-3.5 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Format preview</p>
            <p className="font-mono text-xl font-semibold tracking-tight break-all text-foreground">
              {formatPreview}
            </p>
            <p className="font-mono text-sm text-muted-foreground">{formatCode}</p>
            <p className="text-[11px] text-muted-foreground">{exampleNote}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Components &amp; Order</p>
            <div className="space-y-2.5">
              {ordered.map((segment, idx) => {
                const type = segment.segment_type;
                const canMoveUp = idx > 0;
                const canMoveDown = idx < ordered.length - 1;
                const disabled = revertToDefault;

                return (
                  <div
                    key={type}
                    className={`rounded-lg border border-border bg-card shadow-sm ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    <div className="flex gap-2 p-3">
                      <Checkbox
                        id={`seg-${type}`}
                        checked={segment.enabled}
                        disabled={disabled}
                        onCheckedChange={(checked) =>
                          updateSegment(type, { enabled: checked === true })
                        }
                        className="mt-2 shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Label
                          htmlFor={`seg-${type}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {SEGMENT_LABELS[type]}
                        </Label>
                        {segment.enabled ? (
                          <div className="space-y-2 pt-0.5">
                            {type === 'prefix_text' ? (
                              <Input
                                value={segment.prefix_value ?? ''}
                                disabled={disabled}
                                onChange={(e) =>
                                  updateSegment(type, { prefix_value: e.target.value })
                                }
                                placeholder="e.g. MOH"
                                className="h-9 text-sm"
                              />
                            ) : null}
                            {type === 'date_format' ? (
                              <Select
                                value={segment.date_format ?? 'YYMMDD'}
                                disabled={disabled}
                                onValueChange={(v) =>
                                  updateSegment(type, { date_format: v as DateFormat })
                                }
                              >
                                <SelectTrigger className="h-9 w-full text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {DATE_FORMATS.map((df) => (
                                    <SelectItem key={df} value={df}>
                                      {df}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : null}
                            {type === 'tenant_code' ? (
                              <Input
                                value={tenantNumericCode}
                                readOnly
                                tabIndex={-1}
                                className="h-9 text-sm bg-muted/60"
                              />
                            ) : null}
                            {type === 'sequence' ? (
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Digits</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={12}
                                    disabled={disabled}
                                    value={segment.sequence_digits ?? 7}
                                    onChange={(e) =>
                                      updateSegment(type, {
                                        sequence_digits: Number.parseInt(e.target.value, 10) || 7,
                                      })
                                    }
                                    className="h-9 text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Starts at</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    disabled={disabled}
                                    value={segment.sequence_starts_at ?? 1}
                                    onChange={(e) =>
                                      updateSegment(type, {
                                        sequence_starts_at:
                                          Number.parseInt(e.target.value, 10) || 1,
                                      })
                                    }
                                    className="h-9 text-sm"
                                  />
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-center justify-start gap-0 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={disabled || !canMoveUp}
                          aria-label={`Move ${SEGMENT_LABELS[type]} up`}
                          className="size-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            moveSegment(type, -1);
                          }}
                        >
                          <ChevronUp className="size-4" strokeWidth={2} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={disabled || !canMoveDown}
                          aria-label={`Move ${SEGMENT_LABELS[type]} down`}
                          className="size-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            moveSegment(type, 1);
                          }}
                        >
                          <ChevronDown className="size-4" strokeWidth={2} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-row flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-3.5 sm:justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="seq-revert-default"
              checked={revertToDefault}
              onCheckedChange={setRevertToDefault}
            />
            <Label htmlFor="seq-revert-default" className="text-sm font-normal cursor-pointer">
              Set to default
            </Label>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={upsert.isPending || !identifierType}
              onClick={() => void onSave()}
              className="min-w-[5rem] bg-[#008C9E] text-white hover:bg-[#00798a]"
            >
              {upsert.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
