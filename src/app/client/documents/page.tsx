"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleGuard } from "@/components/client/module-guard";
import { useClientUser } from "@/contexts/client-user-context";
import { fetchClientDocuments } from "@/lib/client/client-data";
import type { DocumentSummary } from "@/lib/client/client-data";
import { db } from "@/lib/firebase/client";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import {
  Download,
  File,
  FileImage,
  FileText,
  FileArchive,
  Loader2,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

import { ErrorState, PageHeader, SkeletonList } from "@/components/client/module-layout";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <FileImage className="h-8 w-8" />;
  if (mimeType.startsWith("video/")) return <File className="h-8 w-8" />;
  if (mimeType.includes("pdf")) return <FileText className="h-8 w-8" />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar"))
    return <FileArchive className="h-8 w-8" />;
  return <File className="h-8 w-8" />;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "—";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ClientDocumentsPage() {
  const { clientWorkspaceId, uid } = useClientUser();
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!clientWorkspaceId || !uid) return;
    setLoading(true);
    fetchClientDocuments(clientWorkspaceId, uid, 100)
      .then(setDocuments)
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, [clientWorkspaceId, uid]);

  const filtered = useMemo(() => {
    if (!search.trim()) return documents;
    const q = search.toLowerCase();
    return documents.filter((d) => d.fileName.toLowerCase().includes(q));
  }, [documents, search]);

  if (error) {
    return (
      <div>
        <PageHeader title="Documents" description="Shared files and resources" />
        <ErrorState
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description={
          loading ? "Loading..." : `${documents.length} file${documents.length !== 1 ? "s" : ""}`
        }
      />

      {/* Search */}
      {!loading && documents.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-8 mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
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
            <p className="text-sm text-muted-foreground mt-1">
              {search
                ? "Try a different search term."
                : "Shared documents will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <Card
              key={doc.id}
              className="transition-all hover:border-primary/50 hover:shadow-sm"
            >
              <CardContent className="p-4">
                <div className="text-muted-foreground mb-3">
                  {getFileIcon(doc.mimeType)}
                </div>
                <h3 className="text-sm font-semibold truncate mb-1">
                  {doc.fileName}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {doc.fileType && `${doc.fileType} · `}
                  {formatFileSize(doc.fileSize)} · {formatDate(doc.createdAt)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  asChild
                >
                  <a
                    href={doc.cloudinaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientDocumentsPageWrapper() {
  return (
    <ModuleGuard moduleKey="documents">
      <ClientDocumentsPage />
    </ModuleGuard>
  );
}
