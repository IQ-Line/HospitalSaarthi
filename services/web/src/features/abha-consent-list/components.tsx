import { useState } from 'react';
import { Button } from '@pulse/ui/button';
import { Badge } from '@pulse/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import type { ConsentListArtifact, ConsentListSession } from './api';
import { formatConsentDateTime, hiTypesDisplayList } from './formatters';

export {
  ViewDocumentsDialog,
  recordsFromArtifact,
  recordsFromSession,
} from './view-documents-modal';
export type { ConsentHealthRecord } from './view-documents-modal';

interface FacilityRow {
  name: string;
  granted: number;
  pending: number | string;
  received: number | string;
  acknowledged: boolean;
  artifact: ConsentListArtifact;
}

function buildFacilityRows(session: ConsentListSession): FacilityRow[] {
  return session.consentArtifacts.map((artifact, index) => {
    const allContexts = artifact.careContexts ?? [];
    const receivedRefs = new Set(
      (artifact.dataPushed?.entries ?? [])
        .map((e) => e.careContextReference)
        .filter(Boolean) as string[],
    );
    const hasData = (artifact.dataPushed?.entries?.length ?? 0) > 0;
    const acknowledged = hasData || artifact.sessionStatus === 'REQUESTED';

    return {
      name: artifact.hipName ?? artifact.hipId ?? `HIP ${index + 1}`,
      granted: allContexts.length,
      pending: acknowledged
        ? allContexts.filter((c) => !receivedRefs.has(c.careContextReference)).length
        : '-',
      received: acknowledged ? receivedRefs.size : '-',
      acknowledged,
      artifact,
    };
  });
}

interface ConsentDetailsPanelProps {
  session: ConsentListSession;
  onViewDocuments: (artifact?: ConsentListArtifact) => void;
}

export function ConsentDetailsPanel({ session, onViewDocuments }: ConsentDetailsPanelProps) {
  const facilities = buildFacilityRows(session);
  const [facilityFilter, setFacilityFilter] = useState('all');

  const filteredFacilities =
    facilityFilter === 'all'
      ? facilities
      : facilities.filter((f) => f.name === facilityFilter);

  const requestedAt = session._consentStatusTimestamps?.REQUESTED ?? session.createdAt;
  const grantedAt = session._consentStatusTimestamps?.GRANTED ?? session.grantedAt;
  const requestedHiTypes = hiTypesDisplayList(session.hiTypes);
  const grantedHiTypes =
    session.status === 'GRANTED' ? requestedHiTypes : ['N/A'];

  return (
    <div className="border-t border-gray-200 bg-[#FAFAFA] px-3 py-4 sm:px-4">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-l-4 border-l-[#2563EB] p-4 sm:p-6">
          <h3 className="mb-4 text-lg font-bold text-gray-800">Consent Details</h3>

          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-[minmax(18rem,1fr)_minmax(0,2fr)] md:items-start md:gap-8">
            <div className="min-w-0 space-y-3">
              <p className="text-sm font-medium text-gray-700">Timeline</p>
              <div className="space-y-3">
                <div className="w-full rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium leading-snug text-blue-800">
                  Requested: {formatConsentDateTime(requestedAt)}
                </div>
                {session.status === 'GRANTED' && grantedAt ? (
                  <div className="w-full rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium leading-snug text-green-800">
                    Granted: {formatConsentDateTime(grantedAt)}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="min-w-0 space-y-3">
              <p className="text-sm font-medium text-gray-700">Health Information Types</p>
              <div className="space-y-3">
                <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
                  <p className="text-sm leading-relaxed text-gray-700 break-words">
                    <span className="font-medium">Requested:</span> {requestedHiTypes.join(', ') || '—'}
                  </p>
                </div>
                <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
                  <p className="text-sm leading-relaxed text-gray-700 break-words">
                    <span className="font-medium">Granted:</span> {grantedHiTypes.join(', ')}
                  </p>
                </div>
                <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
                  <p className="text-sm leading-relaxed text-gray-700 break-words">
                    <span className="font-medium">Purpose of Use:</span> {session.purpose.text}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {session.status === 'GRANTED' ? (
          <div className="border-t border-gray-200 pt-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="text-base font-semibold text-gray-800">
                Health Facility-wise Consent Acknowledgement
              </h4>
              <Select value={facilityFilter} onValueChange={setFacilityFilter}>
                <SelectTrigger className="h-9 w-full bg-white sm:w-[180px]">
                  <SelectValue placeholder="Health Facility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Facilities</SelectItem>
                  {facilities.map((f) => (
                    <SelectItem key={f.name} value={f.name}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Sl.No</th>
                    <th className="py-2 pr-4 font-medium">Health Facility</th>
                    <th className="py-2 pr-4 font-medium">Granted Care-Contexts Status</th>
                    <th className="py-2 pr-4 font-medium">Pending</th>
                    <th className="py-2 pr-4 font-medium">Received</th>
                    <th className="py-2 pr-4 font-medium">Health Facility Acknowledge</th>
                    <th className="py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFacilities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-muted-foreground">
                        No consent artefacts received yet.
                      </td>
                    </tr>
                  ) : (
                    filteredFacilities.map((row, index) => (
                      <tr key={row.artifact.consentId} className="border-b border-gray-100">
                        <td className="py-3 pr-4 tabular-nums">{index + 1}</td>
                        <td className="py-3 pr-4">{row.name}</td>
                        <td className="py-3 pr-4 tabular-nums">{row.granted}</td>
                        <td className="py-3 pr-4 tabular-nums">{row.pending}</td>
                        <td className="py-3 pr-4 tabular-nums">{row.received}</td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant="outline"
                            className={
                              row.acknowledged
                                ? 'border-green-200 bg-green-50 text-green-700'
                                : 'border-blue-200 bg-blue-50 text-blue-700'
                            }
                          >
                            {row.acknowledged ? 'Acknowledged' : 'Did Not Acknowledge'}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 bg-[#2563EB] hover:bg-[#1d4ed8]"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDocuments(row.artifact);
                            }}
                          >
                            View Documents
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
