"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Folder,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";

export interface DocumentFolder {
  id: string;
  name: string;
  documentCount: number;
}

interface DocumentFoldersProps {
  folders: DocumentFolder[];
  activeFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
}

export function DocumentFolders({
  folders,
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: DocumentFoldersProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim());
    setNewFolderName("");
    setShowCreateDialog(false);
  };

  const handleRename = (folderId: string) => {
    if (!editingName.trim()) return;
    onRenameFolder(folderId, editingName.trim());
    setEditingFolderId(null);
    setEditingName("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Folders</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* All Documents */}
      <button
        onClick={() => onSelectFolder(null)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
          activeFolderId === null
            ? "bg-primary/10 text-primary font-medium"
            : "hover:bg-muted text-muted-foreground"
        }`}
      >
        <FolderOpen className="h-4 w-4" />
        <span className="flex-1 text-left">All Documents</span>
        <span className="text-xs text-muted-foreground">
          {folders.reduce((sum, f) => sum + f.documentCount, 0)}
        </span>
      </button>

      {/* Folder list */}
      <div className="max-h-[300px] overflow-y-auto space-y-0.5">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`group flex items-center rounded-md transition-colors ${
                activeFolderId === folder.id ? "bg-primary/10" : "hover:bg-muted"
              }`}
            >
              {editingFolderId === folder.id ? (
                <div className="flex items-center gap-1 px-2 py-1 w-full">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-7 text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(folder.id);
                      if (e.key === "Escape") setEditingFolderId(null);
                    }}
                  />
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRename(folder.id)}>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditingFolderId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => onSelectFolder(folder.id)}
                  className="flex items-center gap-2 px-3 py-2 text-sm flex-1 min-w-0"
                >
                  <Folder className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1 text-left">{folder.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{folder.documentCount}</span>
                </button>
              )}

              {/* Folder actions */}
              {editingFolderId !== folder.id && (
                <div className="flex items-center gap-0.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setEditingFolderId(folder.id);
                      setEditingName(folder.name);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => setShowDeleteConfirm(folder.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newFolderName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(o) => { if (!o) setShowDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Folder?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Documents in this folder will not be deleted, but will lose their folder association.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (showDeleteConfirm) onDeleteFolder(showDeleteConfirm);
                setShowDeleteConfirm(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
