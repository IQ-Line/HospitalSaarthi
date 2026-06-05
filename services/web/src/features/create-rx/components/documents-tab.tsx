import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MoreVertical, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@pulse/ui/dropdown-menu';
import {
  downloadHealthDocument,
  fetchPatientHealthDocuments,
  uploadHealthDocument,
  type HealthDocumentSummary,
} from '../api/health-documents';
import { useCreateRxStore } from '../create-rx.store';
import { UploadDocumentModal } from './upload-document-modal';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function healthDocumentsQueryKey(patientId: string, visitId: string) {
  return ['create-rx', 'health-documents', patientId, visitId] as const;
}

export function DocumentsTab() {
  const queryClient = useQueryClient();
  const context = useCreateRxStore((s) => s.context);
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);

  const patientId = context?.patient.id ?? '';
  const visitId = context?.visit.id ?? '';

  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedHiType, setSelectedHiType] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: healthDocumentsQueryKey(patientId, visitId),
    queryFn: () => fetchPatientHealthDocuments(patientId, visitId),
    enabled: Boolean(patientId) && !uploadOpen,
  });

  const documents = data?.data ?? [];

  const resetUploadForm = useCallback(() => {
    setFile(null);
    setSelectedHiType('');
    setDocumentTitle('');
  }, []);

  const handleUpload = async () => {
    if (!patientId) {
      toast.error('Patient context is missing');
      return;
    }
    if (!file || !selectedHiType.trim() || !documentTitle.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('Please compress and upload below 10 MB size file');
      return;
    }

    setUploading(true);
    try {
      await uploadHealthDocument(
        patientId,
        file,
        selectedHiType,
        documentTitle,
        visitId || undefined,
      );
      toast.success('Document uploaded successfully');
      resetUploadForm();
      setUploadOpen(false);
      await queryClient.invalidateQueries({
        queryKey: healthDocumentsQueryKey(patientId, visitId),
      });
      void refetch();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: HealthDocumentSummary) => {
    try {
      await downloadHealthDocument(doc.download_url, doc.file_name, doc.file_type);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to download document',
      );
    }
  };

  if (!patientId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Open a patient visit to upload documents.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-gray-400" />
          </div>
        ) : (
          documents.map((doc) => (
            <article
              key={doc.id}
              className="rounded-lg border border-[#E2E8F0] bg-white p-4 py-6 shadow-sm transition-colors hover:border-blue-300 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="truncate text-lg font-bold text-gray-800">
                  {doc.document_title}
                </h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Options">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void handleDownload(doc)}>
                      Download
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-sm text-gray-500">
                Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
              </p>
              <p className="mt-1 truncate text-xs text-gray-400">{doc.hi_type}</p>
            </article>
          ))
        )}

        <button
          type="button"
          disabled={isReadOnly}
          onClick={() => setUploadOpen(true)}
          className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#CBD5E0] bg-white p-4 shadow-md transition-colors hover:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="mb-2 size-10 text-gray-400" />
          <span className="font-semibold text-blue-500">
            {isReadOnly ? 'Consultation ended and visit closed.' : 'Add New File'}
          </span>
        </button>
      </div>

      <UploadDocumentModal
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) resetUploadForm();
        }}
        selectedHiType={selectedHiType}
        onSelectedHiTypeChange={setSelectedHiType}
        documentTitle={documentTitle}
        onDocumentTitleChange={setDocumentTitle}
        file={file}
        onFileChange={setFile}
        onUpload={() => void handleUpload()}
        uploading={uploading}
      />
    </>
  );
}
