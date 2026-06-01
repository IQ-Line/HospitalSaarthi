import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { DataTable } from '@/components/data-table';
import {
  useSequenceConfigurationDetail,
  useSequenceConfigurations,
  type SequenceConfigurationSummary,
} from '@/features/configurator/api/sequence-configuration';
import { IDENTIFIER_TYPES } from '@/features/configurator/sequence-format';
import { SEQUENCE_IDENTIFIER_META } from '@/features/configurator/sequence-constants';
import { prefixFromFormatCode } from '@/features/configurator/sequence-format';
import { SequenceIdentifiersDialog } from './sequence-identifiers-dialog';

function provisioningLabel(status: string) {
  if (status === 'provisioning') return 'Pending';
  if (status === 'active') return 'Active';
  if (status === 'suspended') return 'Suspended';
  return status;
}

interface SequenceConfigurationPanelProps {
  tenantId: string;
}

export function SequenceConfigurationPanel({ tenantId }: SequenceConfigurationPanelProps) {
  const [identifiersOpen, setIdentifiersOpen] = useState(false);
  const { data: listRes, isLoading: listLoading } = useSequenceConfigurations(undefined, {
    enabled: !!tenantId,
  });
  const { data: detail, isLoading: detailLoading } = useSequenceConfigurationDetail(tenantId);

  const summary = useMemo(() => {
    const fromList = listRes?.data?.find((r) => r.iq_tenant_id === tenantId);
    if (fromList) return fromList;
    if (!detail) return null;
    const identifiers = Object.fromEntries(
      detail.identifiers.map((i) => [
        i.identifier_type,
        { is_custom: i.is_custom, format_code: i.format_code },
      ]),
    ) as SequenceConfigurationSummary['identifiers'];
    const custom_count = detail.identifiers.filter((i) => i.is_custom).length;
    return {
      iq_tenant_id: detail.iq_tenant_id,
      tenant_name: detail.tenant_name,
      tenant_numeric_code: detail.tenant_numeric_code,
      provisioning_status: 'active',
      status: detail.status,
      custom_count,
      identifiers,
    } satisfies SequenceConfigurationSummary;
  }, [listRes?.data, tenantId, detail]);

  const columns = useMemo<ColumnDef<SequenceConfigurationSummary, unknown>[]>(
    () => [
      {
        id: 'sr',
        header: 'Sr.',
        cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span>,
      },
      {
        accessorKey: 'tenant_name',
        header: 'Tenant name',
        cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
      },
      {
        accessorKey: 'tenant_numeric_code',
        header: 'Tenant code',
        cell: ({ getValue }) => {
          const v = getValue<string | null>();
          return <span className="font-mono text-sm">{v ?? '—'}</span>;
        },
      },
      {
        accessorKey: 'provisioning_status',
        header: 'Status',
        cell: ({ getValue }) => {
          const s = getValue<string>();
          const active = s === 'active';
          return (
            <Badge variant={active ? 'default' : 'secondary'} className="font-normal">
              {provisioningLabel(s)}
            </Badge>
          );
        },
      },
      {
        id: 'configured',
        header: 'Configured',
        cell: ({ row }) => {
          const count = row.original.custom_count;
          if (count > 0) {
            return (
              <Badge
                variant="outline"
                className="bg-violet-50 text-violet-800 border-violet-200 font-normal"
              >
                {count} custom
              </Badge>
            );
          }
          return <span className="text-sm text-muted-foreground">On Default</span>;
        },
      },
      ...IDENTIFIER_TYPES.map(
        (id): ColumnDef<SequenceConfigurationSummary, unknown> => ({
          id,
          header: SEQUENCE_IDENTIFIER_META[id].listColumn,
          cell: ({ row }) => {
            const entry = row.original.identifiers[id];
            const prefix = prefixFromFormatCode(entry?.format_code ?? '');
            return <span className="font-mono text-sm">{prefix}</span>;
          },
        }),
      ),
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: () => (
          <div className="text-right">
            <Button type="button" variant="outline" size="sm" onClick={() => setIdentifiersOpen(true)}>
              Configure
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const tableData = summary ? [summary] : [];
  const isLoading = listLoading || detailLoading;

  return (
    <>
      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={tableData}
          isLoading={isLoading}
          showColumnMenu
          emptyTitle="No sequence configuration"
          emptyDescription="Sequence settings for this tenant could not be loaded."
        />
      </div>

      {summary ? (
        <SequenceIdentifiersDialog
          open={identifiersOpen}
          onOpenChange={setIdentifiersOpen}
          tenantId={tenantId}
          tenantName={summary.tenant_name}
          tenantCode={summary.tenant_numeric_code}
        />
      ) : null}
    </>
  );
}
