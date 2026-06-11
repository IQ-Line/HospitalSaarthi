import { useQuery } from '@tanstack/react-query';
import { FileText, Loader2, MoreVertical, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@pulse/ui/dropdown-menu';
import { Input } from '@pulse/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { downloadHealthDocument, HEALTH_DOCUMENT_HI_TYPES } from '@/features/create-rx/api/health-documents';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { fetchHistoricalPatientDocuments } from '../api/historical-records';
import { historicalRecordsQueryKeys } from '../api/query-keys';
import { defaultDateRange, formatHistoricalShortDate } from '../lib/formatters';
import type { HistoricalDocumentItem } from '../types';

interface HistoricalDocumentsTabProps {
  patientId: string;
}

function DocumentCard({ doc }: { doc: HistoricalDocumentItem }) {
  const handleDownload = async () => {
    try {
      await downloadHealthDocument(doc.downloadUrl, doc.fileName, doc.fileType);
    } catch (error) {
      console.error(error);
      toast.error('Failed to download document');
    }
  };

  return (
    <article className="relative rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm transition-colors hover:border-blue-300 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <FileText className="size-5 shrink-0 text-gray-500" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Options">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void handleDownload()}>Download</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-sm font-semibold text-gray-800">{doc.doctorName}</p>
      <p className="mt-1 text-xs font-medium text-red-500">ABDM: Unlinked</p>
      <p className="mt-2 text-sm text-gray-700">{doc.hiType}</p>
      <p className="mt-1 text-xs text-gray-500">Visit ID: {doc.visitNumber}</p>
      <p className="mt-1 text-xs text-gray-500">
        Report time: {formatHistoricalShortDate(doc.reportTime)},{' '}
        {new Date(doc.reportTime).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })}
      </p>
    </article>
  );
}

export function HistoricalDocumentsTab({ patientId }: HistoricalDocumentsTabProps) {
  const { startDate, endDate } = defaultDateRange();
  const [filters, setFilters] = useState({
    startDate,
    endDate,
    search: '',
    documentType: 'all',
    reportCategory: 'all',
  });
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const queryFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const { data: documents = [], isLoading } = useQuery({
    queryKey: historicalRecordsQueryKeys.patientDocuments(patientId, queryFilters),
    queryFn: () => fetchHistoricalPatientDocuments(patientId, queryFilters),
    enabled: Boolean(patientId),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm">
        <Input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
          className="h-10 w-[130px]"
          aria-label="From date"
        />
        <Input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
          className="h-10 w-[130px]"
          aria-label="To date"
        />
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search"
            className="h-10 pl-9"
          />
        </div>
        <Select
          value={filters.documentType}
          onValueChange={(value) => setFilters((f) => ({ ...f, documentType: value }))}
        >
          <SelectTrigger className="h-10 w-[180px]">
            <SelectValue placeholder="Document Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Document Types</SelectItem>
            {HEALTH_DOCUMENT_HI_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.reportCategory}
          onValueChange={(value) => setFilters((f) => ({ ...f, reportCategory: value }))}
        >
          <SelectTrigger className="h-10 w-[160px]">
            <SelectValue placeholder="Reports" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reports</SelectItem>
            {HEALTH_DOCUMENT_HI_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-lg bg-[#F5F5F5] py-16 text-center text-sm text-muted-foreground">
          No documents found
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
