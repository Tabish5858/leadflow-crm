"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientPortalSettings } from "@/types";
import { Download, FileText } from "lucide-react";

interface HelpfulFilesCardProps {
  settings: ClientPortalSettings;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function HelpfulFilesCard({ settings }: HelpfulFilesCardProps) {
  const files = settings.helpfulFiles;
  if (!files || files.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          Helpful Files
        </CardTitle>
        <CardDescription>Reference documents from your agency team</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.fileSize)}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                <a
                  href={file.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={file.title}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
