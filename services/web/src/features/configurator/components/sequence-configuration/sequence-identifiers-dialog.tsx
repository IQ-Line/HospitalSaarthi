import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { useSequenceConfigurationDetail } from '@/features/configurator/api/sequence-configuration';
import { IDENTIFIER_TYPES, type IdentifierType } from '@/features/configurator/sequence-format';
import { SEQUENCE_IDENTIFIER_META } from '@/features/configurator/sequence-constants';
import { SequenceCustomizeDialog } from './sequence-customize-dialog';

interface SequenceIdentifiersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  tenantCode: string | null;
}

export function SequenceIdentifiersDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  tenantCode,
}: SequenceIdentifiersDialogProps) {
  const [customizeType, setCustomizeType] = useState<IdentifierType | null>(null);
  const { data: detail, refetch } = useSequenceConfigurationDetail(tenantId, {
    enabled: (open || customizeType != null) && !!tenantId,
  });

  const codeLabel = tenantCode?.trim() || '—';

  const listDialogOpen = open && customizeType == null;

  return (
    <>
      <Dialog
        open={listDialogOpen}
        onOpenChange={(next) => {
          if (!next && customizeType == null) onOpenChange(false);
        }}
      >
        <DialogContent
          showCloseButton
          className="flex max-h-[min(88dvh,820px)] w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden border bg-background p-0 shadow-xl sm:max-w-xl sm:rounded-xl"
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4 text-left">
            <DialogTitle className="text-base font-semibold">{tenantName}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tenant code: {codeLabel}
            </DialogDescription>
          </DialogHeader>

          <ul className="min-h-0 flex-1 overflow-y-auto divide-y">
            {IDENTIFIER_TYPES.map((identifierType) => {
              const meta = SEQUENCE_IDENTIFIER_META[identifierType];
              const config = detail?.identifiers.find((i) => i.identifier_type === identifierType);
              const isCustom = config?.is_custom ?? false;
              const Icon = meta.icon;

              return (
                <li key={identifierType} className="flex gap-3 px-5 py-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-4 text-muted-foreground" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{meta.title}</span>
                      <Badge
                        variant={isCustom ? 'default' : 'secondary'}
                        className={
                          isCustom
                            ? 'bg-violet-100 text-violet-800 hover:bg-violet-100 border-violet-200'
                            : 'font-normal'
                        }
                      >
                        {isCustom ? 'Custom' : 'Default'}
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-foreground/90">{config?.format_code ?? '—'}</p>
                    <p className="text-xs text-muted-foreground leading-snug">{meta.description}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 self-center"
                    onClick={() => setCustomizeType(identifierType)}
                  >
                    <Pencil className="size-3.5" />
                    Customise
                  </Button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>

      <SequenceCustomizeDialog
        open={customizeType != null}
        onOpenChange={(next) => {
          if (!next) setCustomizeType(null);
        }}
        tenantId={tenantId}
        identifierType={customizeType}
        sourceConfig={
          customizeType && detail
            ? (detail.identifiers.find((i) => i.identifier_type === customizeType) ?? null)
            : null
        }
        tenantNumericCode={detail?.tenant_numeric_code ?? tenantCode}
        onSaved={() => void refetch()}
      />
    </>
  );
}
