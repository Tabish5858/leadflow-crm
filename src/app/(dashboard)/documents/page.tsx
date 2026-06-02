"use client";

import { useWorkspace } from "@/contexts/workspace-context";
import { getDocuments, deleteDocument, uploadDocument } from "@/lib/firebase/documents";
import { formatFileSize, canPreview } from "@/lib/documents";
import type { Document } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import {
  Download,
  ExternalLink,
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  Loader2,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkspaceDocumentsPage() {
  const { activeWorkspace } = useWorkspace();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const data = await getDocuments(activeWorkspace.id, { max: 200 });
      setDocuments(data);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return documents;
    const q = search.toLowerCase();
    return documents.filter(
      (d) =>
        d.fileName.toLowerCase().includes(q) ||
        d.fileType.toLowerCase().includes(q) ||
        d.mimeType.toLowerCase().includes(q)
    );
  }, [documents, search]);

  // ── Upload ───────────────────────────────────────────────────────────────

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length || !activeWorkspace?.id) return;
    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await uploadDocument(activeWorkspace.id, file);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setUploading(false);
    setUploadOpen(false);

    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded`);
      load();
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} upload${errorCount > 1 ? "s" : ""} failed`);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpload(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    handleUpload(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(true);
  };

  const onDragLeave = () => setDropActive(false);

  // ── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteId || !activeWorkspace?.id) return;
    setDeleting(true);
    try {
      await deleteDocument(activeWorkspace.id, deleteId);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteId));
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload and manage files for your workspace
          </p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <UploadDialogContent
              uploading={uploading}
              dropActive={dropActive}
              fileInputRef={fileInputRef}
              onFileSelect={onFileSelect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClose={() => setUploadOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      {!loading && documents.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <File className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">
              {search ? "No matching files" : "No documents yet"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {search
                ? "Try a different search term."
                : "Upload your first document to get started."}
            </p>
            {!search && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setUploadOpen(true)}>
                <Upload className="h-4 w-4" />
                Upload a file
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Document?</DialogTitle>
            <DialogDescription>
              This will permanently remove this file from your workspace and
              Cloudinary storage. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Upload Dialog Inner ───────────────────────────────────────────────────────

function UploadDialogContent({
  uploading,
  dropActive,
  fileInputRef,
  onFileSelect,
  onDrop,
  onDragOver,
  onDragLeave,
  onClose,
}: {
  uploading: boolean;
  dropActive: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Upload files</DialogTitle>
        <DialogDescription>
          Drop files here or click to browse. Max 10MB per file.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8
            text-center cursor-pointer transition-colors
            ${dropActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
            }
            ${uploading ? "pointer-events-none opacity-60" : ""}
          `}
        >
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-3" />
              <p className="text-sm font-medium">Uploading...</p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">
                {dropActive ? "Drop files here" : "Drag & drop files here"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={onFileSelect}
            className="hidden"
            disabled={uploading}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={uploading}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  );
}

// ─── Document Icon ─────────────────────────────────────────────────────────────

/** Must be a separate component to satisfy React Compiler rules */
function DocumentIcon({ fileType, className }: { fileType: string; className?: string }) {
  const icons: Record<string, typeof File> = {
    image: FileImage,
    pdf: FileText,
    spreadsheet: FileSpreadsheet,
    document: FileText,
    text: FileType,
    code: FileCode,
    archive: FileArchive,
  };
  const Icon = icons[fileType] || File;
  return <Icon className={className} />;
}

// ─── Document Card ─────────────────────────────────────────────────────────────

function DocumentCard({
  doc,
  onDelete,
}: {
  doc: Document;
  onDelete: (id: string) => void;
}) {

  return (
    <Card className="group transition-all hover:border-primary/50 hover:shadow-sm">
      <CardContent className="p-5">
        {/* Icon + Delete */}
        <div className="flex items-start justify-between mb-3">
          <div className="text-muted-foreground">
            <DocumentIcon fileType={doc.fileType} className="h-10 w-10" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Name + meta */}
        <h3 className="text-sm font-semibold truncate mb-1" title={doc.fileName}>
          {doc.fileName}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 flex-wrap">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {doc.fileType || "file"}
          </Badge>
          <span>{formatFileSize(doc.fileSize)}</span>
          <span>&middot;</span>
          <span>{doc.createdAt?.toDate().toLocaleDateString()}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-2" asChild>
            <a href={doc.cloudinaryUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          </Button>
          {canPreview(doc.fileType) && (
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href={doc.cloudinaryUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Preview
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
