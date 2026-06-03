"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, X, ChevronDown, ChevronUp, User } from "lucide-react";
import type { WorkspaceMember } from "@/types";
import { updateProject } from "@/lib/firebase/projects";
import { toast } from "@/lib/toast";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

interface ClientsCardProps {
  projectId: string;
  members: WorkspaceMember[];
  clientIds: string[];
  onProjectUpdated: () => void;
}

export default function ClientsCard({ projectId, members, clientIds, onProjectUpdated }: ClientsCardProps) {
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAddDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAddDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showAddDropdown]);

  // Filter members who have "client" role or are in clients list
  const clientMembers = members.filter((m) => clientIds.includes(m.userId));
  const availableClients = members.filter((m) => !clientIds.includes(m.userId) && m.role === "client");
  // Also allow adding any member as client
  const availableMembers = members.filter((m) => !clientIds.includes(m.userId) && m.role !== "client");

  const handleAddClient = async (userId: string) => {
    setSaving(true);
    try {
      await updateProject(projectId, { clients: [...clientIds, userId] } as any);
      toast.success("Client added");
      setShowAddDropdown(false);
      onProjectUpdated();
    } catch {
      toast.error("Failed to add client");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveClient = async (userId: string) => {
    setSaving(true);
    try {
      await updateProject(projectId, { clients: clientIds.filter((id) => id !== userId) } as any);
      toast.success("Client removed");
      onProjectUpdated();
    } catch {
      toast.error("Failed to remove client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ borderRadius: "8px" }}
      className="flex flex-col p-5 w-full bg-card border border-border hover:border-foreground/20 transition-colors"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Clients</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {clientMembers.length}
          </span>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="h-6 w-6 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent"
              title="Add client"
            >
              <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {showAddDropdown && (
              <div className="absolute right-0 top-8 bg-popover border border-border rounded-md shadow-lg z-50 py-1 min-w-[200px] max-h-[250px] overflow-y-auto">
                {availableClients.length === 0 && availableMembers.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No members available</p>
                ) : (
                  <>
                    {availableClients.length > 0 && (
                      <>
                        <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium uppercase">Client Role</p>
                        {availableClients.map((m) => (
                          <button key={m.userId} onClick={() => handleAddClient(m.userId)} disabled={saving}
                            className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-accent disabled:opacity-50"
                          >
                            <Avatar className="h-6 w-6 border">
                              <AvatarFallback className="bg-primary/10 text-primary text-[8px]">{getInitials(m.displayName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{m.displayName}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    {availableMembers.length > 0 && (
                      <>
                        <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium uppercase">Team Members</p>
                        {availableMembers.map((m) => (
                          <button key={m.userId} onClick={() => handleAddClient(m.userId)} disabled={saving}
                            className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-accent disabled:opacity-50"
                          >
                            <Avatar className="h-6 w-6 border">
                              <AvatarFallback className="bg-primary/10 text-primary text-[8px]">{getInitials(m.displayName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{m.displayName}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {clientMembers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No clients assigned</p>
        ) : (
          clientMembers.map((client) => {
            const isExpanded = expandedClient === client.userId;
            return (
              <div key={client.userId}>
                <div className="flex items-center gap-2.5 group pr-1">
                  <Avatar className="h-7 w-7 border shrink-0">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">
                      {getInitials(client.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-foreground truncate">{client.displayName}</p>
                      <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-warning/20 text-warning">Client</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{client.email}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setExpandedClient(isExpanded ? null : client.userId)}
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded hover:bg-accent transition-opacity shrink-0"
                      title="Details"
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                    </button>
                    <button onClick={() => handleRemoveClient(client.userId)}
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 transition-opacity shrink-0"
                      title="Remove client"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
                  {isExpanded && (
                  <div className="ml-9 mt-2 p-3 rounded-md bg-muted/50 space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Email</span>
                      <span className="text-foreground font-medium">{client.email || "-"}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Role</span>
                      <span className="text-foreground capitalize">{client.role}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
