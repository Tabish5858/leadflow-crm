"use client";

import { useState } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  ChevronsUpDown,
  Plus,
  Building2,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

function getWorkspaceInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, switchWorkspace, createNewWorkspace } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Please enter a workspace name");
      return;
    }
    if (trimmed.length < 2) {
      toast.error("Workspace name must be at least 2 characters");
      return;
    }
    setCreating(true);
    try {
      await createNewWorkspace(trimmed);
      toast.success(`Workspace "${trimmed}" created`);
      setNewName("");
      setCreateOpen(false);
    } catch {
      toast.error("Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  if (!activeWorkspace) return null;

  return (
    <>
      {/* Workspace Selector */}
      <div className="px-3 pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-2 h-10 text-sm font-medium hover:bg-accent/50"
            >
              <Avatar className="h-6 w-6 border bg-primary/10">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getWorkspaceInitials(activeWorkspace.name)}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate text-left">
                {activeWorkspace.name}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64"
            align="start"
            side="right"
            sideOffset={8}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Workspaces
            </DropdownMenuLabel>

            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => switchWorkspace(workspace.id)}
                className="gap-2 cursor-pointer"
              >
                <Avatar className="h-6 w-6 border bg-primary/10">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getWorkspaceInitials(workspace.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate">{workspace.name}</span>
                {workspace.id === activeWorkspace.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => setCreateOpen(true)}
              className="gap-2 cursor-pointer text-primary"
            >
              <Plus className="h-4 w-4" />
              Create Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator className="mt-2" />

      {/* Create Workspace Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Create Workspace
            </DialogTitle>
            <DialogDescription>
              Create a new workspace to organize your leads and team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace name</label>
              <Input
                placeholder="e.g., Acme Corp"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                autoFocus
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                This name will be visible to all members.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setNewName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
