"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import { createContract, getContract } from "@/lib/firebase/contracts";
import { db } from "@/lib/firebase/client";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import type { ContractType, ContractSigner, Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import {
  ArrowLeft,
  Loader2,
  UserPlus,
  X,
  FileSignature,
  FileCheck,
  Plus,
  Search,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface ClientOption {
  id: string;
  name: string;
  email: string;
}

interface ProjectOption {
  id: string;
  name: string;
  status: string;
}

interface TemplateOption {
  id: string;
  title: string;
  type: string;
}

export default function NewContractPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeWorkspace } = useWorkspace();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<ContractType>("contract");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Client
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Project
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");

  // Template
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  // Signers
  const [signers, setSigners] = useState<ContractSigner[]>([]);
  const [showSignerInput, setShowSignerInput] = useState(false);
  const [newSignerEmail, setNewSignerEmail] = useState("");
  const [newSignerName, setNewSignerName] = useState("");

  // Load workspace clients and projects
  useEffect(() => {
    if (!activeWorkspace?.id) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch workspace members with role "client" from users collection
        const workspaceRef = await getDocs(
          query(
            collection(db, "workspaces"),
            where("__name__", "==", activeWorkspace.id)
          )
        );
        const workspaceData = workspaceRef.docs[0]?.data();
        const memberIds = workspaceData?.memberIds || [];

        // Fetch user details for all members
        const clientList: ClientOption[] = [];
        for (const uid of memberIds) {
          const userSnap = await getDocs(
            query(collection(db, "users"), where("__name__", "==", uid))
          );
          const userData = userSnap.docs[0]?.data();
          if (userData && (userData.role === "client")) {
            clientList.push({
              id: uid,
              name: userData.displayName || userData.email || uid,
              email: userData.email || "",
            });
          }
        }
        setClients(clientList);

        // Fetch projects
        const projectSnap = await getDocs(
          query(
            collection(db, "projects"),
            where("workspaceId", "==", activeWorkspace.id),
            orderBy("createdAt", "desc")
          )
        );
        const projectList: ProjectOption[] = projectSnap.docs.map((d) => ({
          id: d.id,
          name: (d.data() as Project).name,
          status: (d.data() as Project).status,
        }));
        setProjects(projectList);

        // Handle pre-fill from URL params
        const prefillClientId = searchParams?.get("clientId");
        const prefillProjectId = searchParams?.get("projectId");

        if (prefillProjectId) {
          const project = projectList.find((p) => p.id === prefillProjectId);
          if (project) setSelectedProject(project);
        }

        if (prefillClientId) {
          const client = clientList.find((c) => c.id === prefillClientId);
          if (client) setSelectedClient(client);
        }
      } catch (e) {
        console.error("Failed to load data:", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeWorkspace?.id, searchParams]);

  // Add owner as default signer when client is selected
  const handleClientSelect = (client: ClientOption) => {
    setSelectedClient(client);
    setShowClientDropdown(false);

    // Add client as a signer if not already added
    if (!signers.find((s) => s.email === client.email)) {
      const newSigner: ContractSigner = {
        id: `signer-${Date.now()}`,
        email: client.email,
        name: client.name,
        title: "Client",
        type: "signer",
        status: "pending",
        required: true,
      };
      setSigners((prev) => [...prev, newSigner]);
    }
  };

  // Auto-populate title from template
  useEffect(() => {
    if (selectedTemplate) {
      setTitle(`${type === "proposal" ? "Proposal" : "Contract"} from ${selectedTemplate.title}`);
    }
  }, [selectedTemplate, type]);

  const handleAddSignerManually = () => {
    if (!newSignerEmail.trim()) return;
    const signer: ContractSigner = {
      id: `signer-${Date.now()}`,
      email: newSignerEmail.trim(),
      name: newSignerName.trim() || newSignerEmail.trim(),
      title: newSignerName.trim() || "Signer",
      type: "signer",
      status: "pending",
      required: true,
    };
    setSigners([...signers, signer]);
    setNewSignerEmail("");
    setNewSignerName("");
    setShowSignerInput(false);
  };

  const handleRemoveSigner = (id: string) => {
    setSigners(signers.filter((s) => s.id !== id));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!activeWorkspace?.id) return;

    setCreating(true);
    try {
      const contractId = await createContract(activeWorkspace.id, {
        contractTitle: title.trim(),
        type,
        clientId: selectedClient?.id || null,
        projectId: selectedProject?.id || null,
        signers,
      });
      toast.success(`${type === "contract" ? "Contract" : "Proposal"} created`);
      router.push(`/contracts/${contractId}`);
    } catch (e) {
      console.error("Create contract error:", e);
      toast.error("Failed to create contract. Check console for details.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px] w-full rounded-lg" />
      </div>
    );
  }

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contracts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New {type === "contract" ? "Contract" : "Proposal"}</h1>
          <p className="text-sm text-muted-foreground">Create a new document to send for signatures</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Document Type Selector — Match GigBase UX */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Choose a document type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("proposal")}
                className={`flex flex-col gap-2 p-4 rounded-lg border-2 text-left transition-all ${
                  type === "proposal"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Proposal</span>
                  <FileCheck className="h-5 w-5 text-purple-500" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A persuasive document that outlines your plan or offer.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setType("contract")}
                className={`flex flex-col gap-2 p-4 rounded-lg border-2 text-left transition-all ${
                  type === "contract"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Contract</span>
                  <FileSignature className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A legally binding agreement that outlines terms, conditions, and responsibilities.
                </p>
              </button>
            </div>
          </div>

          <Separator />

          {/* Client Selector - Dropdown with search */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Client</Label>
            <div className="relative">
              <div
                className="flex items-center gap-2 w-full h-10 px-3 rounded-md border border-input bg-background text-sm cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setShowClientDropdown(!showClientDropdown)}
              >
                {selectedClient ? (
                  <span className="flex-1">{selectedClient.name} ({selectedClient.email})</span>
                ) : (
                  <span className="flex-1 text-muted-foreground">Select a client from the dropdown</span>
                )}
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>

              {showClientDropdown && (
                <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md">
                  <div className="p-2">
                    <Input
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Search clients..."
                      className="h-8 text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-muted-foreground text-center">No clients found</p>
                    ) : (
                      filteredClients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => handleClientSelect(client)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors text-left ${
                            selectedClient?.id === client.id ? "bg-primary/5 font-medium" : ""
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate">{client.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Project Selector - Only for contracts */}
          {type === "contract" && (
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Project (optional)</Label>
              <div className="relative">
                <div
                  className="flex items-center gap-2 w-full h-10 px-3 rounded-md border border-input bg-background text-sm cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                >
                  {selectedProject ? (
                    <span className="flex-1">{selectedProject.name}</span>
                  ) : (
                    <span className="flex-1 text-muted-foreground">Select a project from the dropdown</span>
                  )}
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>

                {showProjectDropdown && (
                  <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md">
                    <div className="p-2">
                      <Input
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        placeholder="Search projects..."
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      <button
                        onClick={() => { setSelectedProject(null); setShowProjectDropdown(false); }}
                        className="w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted text-left"
                      >
                        No project
                      </button>
                      {filteredProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => { setSelectedProject(project); setShowProjectDropdown(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors text-left ${
                            selectedProject?.id === project.id ? "bg-primary/5 font-medium" : ""
                          }`}
                        >
                          <span className="truncate">{project.name}</span>
                          <span className="text-xs text-muted-foreground capitalize ml-auto shrink-0">{project.status}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${type === "contract" ? "Contract" : "Proposal"} title`}
              className="mt-1.5"
            />
          </div>

          <Separator />

          {/* Signers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Signers</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => setShowSignerInput(!showSignerInput)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add Signer
              </Button>
            </div>

            {showSignerInput && (
              <div className="flex gap-2 mb-3 p-3 rounded-md border bg-muted/20">
                <Input
                  value={newSignerEmail}
                  onChange={(e) => setNewSignerEmail(e.target.value)}
                  placeholder="Email address"
                  className="flex-1 text-sm"
                />
                <Input
                  value={newSignerName}
                  onChange={(e) => setNewSignerName(e.target.value)}
                  placeholder="Name"
                  className="flex-1 text-sm"
                />
                <Button size="sm" onClick={handleAddSignerManually} disabled={!newSignerEmail.trim()}>
                  Add
                </Button>
              </div>
            )}

            {signers.length > 0 ? (
              <div className="space-y-2">
                {signers.map((signer) => (
                  <div
                    key={signer.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-md bg-muted/50 text-sm border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {signer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{signer.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{signer.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleRemoveSigner(signer.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 rounded-md border border-dashed">
                <UserPlus className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No signers added yet</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Select a client above or add a signer manually
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button variant="ghost" asChild>
          <Link href="/contracts">Cancel</Link>
        </Button>
        <Button onClick={handleCreate} disabled={creating || !title.trim()} size="lg" className="px-8 rounded-full">
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            `Create ${type === "contract" ? "Contract" : "Proposal"}`
          )}
        </Button>
      </div>
    </div>
  );
}
