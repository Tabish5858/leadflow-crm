"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import {
  getContract,
  updateContract,
  sendContract,
  deleteContract,
  convertContractToTemplate,
} from "@/lib/firebase/contracts";
import type { Contract, ContractSigner } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  Trash2,
  Plus,
  X,
  UserPlus,
  Check,
  Eye,
  Signature,
  FileSignature,
  FileCheck,
  FilePlus,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle, FontFamily, FontSize } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import { ContractSections } from "@/components/contracts/contract-sections";

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
  terminated: "bg-orange-100 text-orange-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  signed: "Signed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  terminated: "Terminated",
};

function formatDate(ts: { toDate?: () => Date; seconds?: number } | null | undefined) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date((ts.seconds || 0) * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null;

  const ToolBtn = ({ action, active, label }: { action: () => void; active?: boolean; label: string }) => (
    <button
      type="button"
      onClick={action}
      className={`px-2 py-1 text-xs rounded hover:bg-muted transition-colors ${
        active ? "bg-muted font-bold" : ""
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30 rounded-t-lg">
      <ToolBtn
        action={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        label="B"
      />
      <ToolBtn
        action={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        label="I"
      />
      <ToolBtn
        action={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        label="U"
      />
      <ToolBtn
        action={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        label="S"
      />
      <div className="w-px bg-border mx-1" />
      <ToolBtn
        action={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        label="H1"
      />
      <ToolBtn
        action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        label="H2"
      />
      <ToolBtn
        action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        label="H3"
      />
      <div className="w-px bg-border mx-1" />
      <select
        onChange={(e) => {
          const val = e.target.value;
          if (val === "") return;
          editor.chain().focus().setFontFamily(val).run();
          e.target.value = "";
        }}
        className="h-7 px-1 text-xs rounded border bg-background"
        defaultValue=""
      >
        <option value="" disabled>Font</option>
        <option value="serif">Serif</option>
        <option value="sans-serif">Sans</option>
        <option value="monospace">Mono</option>
        <option value="cursive">Cursive</option>
      </select>
      <select
        onChange={(e) => {
          const val = e.target.value;
          if (val === "") return;
          editor.chain().focus().setFontSize(val).run();
          e.target.value = "";
        }}
        className="h-7 px-1 text-xs rounded border bg-background"
        defaultValue=""
      >
        <option value="" disabled>Size</option>
        <option value="12px">12</option>
        <option value="14px">14</option>
        <option value="16px">16</option>
        <option value="18px">18</option>
        <option value="24px">24</option>
        <option value="36px">36</option>
      </select>
      <div className="w-px bg-border mx-1" />
      <ToolBtn
        action={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        label="• List"
      />
      <ToolBtn
        action={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        label="1. List"
      />
      <ToolBtn
        action={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        label="Quote"
      />
      <ToolBtn
        action={() => editor.chain().focus().setHorizontalRule().run()}
        label="—"
      />
      <div className="ml-auto">
        <ContractSections
          onInsert={(html) => editor.chain().focus().insertContent(html).run()}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { activeWorkspace, user } = useWorkspace();

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSignerDialog, setShowSignerDialog] = useState(false);
  const [newSignerEmail, setNewSignerEmail] = useState("");
  const [newSignerName, setNewSignerName] = useState("");
  const [newSignerTitle, setNewSignerTitle] = useState("");
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [converting, setConverting] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Placeholder.configure({
        placeholder: "Write your contract content here...",
      }),
    ],
    content: "",
    editable: true,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[400px] px-4 py-3",
      },
    },
  });

  // Load contract
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getContract(id);
      if (!data) {
        toast.error("Contract not found");
        router.push("/contracts");
        return;
      }
      setContract(data);
      setTitle(data.contractTitle);
      if (editor && data.content) {
        editor.commands.setContent(data.content);
      }
    } catch {
      toast.error("Failed to load contract");
    } finally {
      setLoading(false);
    }
  }, [id, router, editor]);

  useEffect(() => {
    load();
  }, [load]);

  // Save contract
  const handleSave = async () => {
    if (!contract) return;
    setSaving(true);
    try {
      await updateContract(contract.id, {
        contractTitle: title,
        content: editor?.getHTML() || "",
      });
      setContract((prev) => prev ? { ...prev, contractTitle: title, content: editor?.getHTML() || "" } : null);
      toast.success("Contract saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Send contract
  const handleSend = async () => {
    if (!contract) return;
    if (!contract.signers || contract.signers.length === 0) {
      toast.error("Add at least one signer before sending");
      return;
    }
    try {
      await handleSave();
      await sendContract(contract.id, {
        userId: user?.id || "owner",
        userName: user?.displayName || "Owner",
      });
      toast.success("Contract sent");
      load();
    } catch {
      toast.error("Failed to send");
    }
  };

  // Convert to Template
  const handleConvertToTemplate = async () => {
    if (!contract || !activeWorkspace?.id) return;
    setConverting(true);
    try {
      await handleSave();
      const templateId = await convertContractToTemplate(contract.id, activeWorkspace.id);
      toast.success("Contract converted to template");
      setShowConvertDialog(false);
      router.push(`/contracts/templates/${templateId}`);
    } catch {
      toast.error("Failed to convert to template");
    } finally {
      setConverting(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!contract) return;
    setDeleting(true);
    try {
      await deleteContract(contract.id);
      toast.success("Contract deleted");
      router.push("/contracts");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  // Add signer
  const handleAddSigner = () => {
    if (!contract || !newSignerEmail.trim()) return;

    const newSigner: ContractSigner = {
      id: `signer-${Date.now()}`,
      email: newSignerEmail.trim(),
      name: newSignerName.trim() || newSignerEmail.trim(),
      title: newSignerTitle.trim() || "Signer",
      type: "signer",
      status: "pending",
      required: true,
    };

    const updatedSigners = [...(contract.signers || []), newSigner];
    setContract({ ...contract, signers: updatedSigners });
    updateContract(contract.id, { signers: updatedSigners });

    setNewSignerEmail("");
    setNewSignerName("");
    setNewSignerTitle("");
    setShowSignerDialog(false);
    toast.success("Signer added");
  };

  // Remove signer
  const handleRemoveSigner = (signerId: string) => {
    if (!contract) return;
    const updatedSigners = (contract.signers || []).filter((s) => s.id !== signerId);
    setContract({ ...contract, signers: updatedSigners });
    updateContract(contract.id, { signers: updatedSigners });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!contract) return null;

  const canEdit = contract.status === "draft";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/contracts")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            {canEdit ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xl font-bold border-0 px-0 focus-visible:ring-0 h-9"
                placeholder="Contract title"
              />
            ) : (
              <h1 className="text-xl font-bold">{contract.contractTitle}</h1>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={`${STATUS_STYLES[contract.status] || ""} text-xs`}>
                {STATUS_LABELS[contract.status] || contract.status}
              </Badge>
              <span className="text-xs text-muted-foreground capitalize">{contract.type}</span>
              {contract.dateSent && (
                <span className="text-xs text-muted-foreground">
                  Sent {formatDate(contract.dateSent)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
              <Button size="sm" className="gap-2" onClick={handleSend}>
                <Send className="h-4 w-4" />
                Send
              </Button>
            </>
          )}
          {contract.status === "draft" && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowConvertDialog(true)}>
              <FilePlus className="h-4 w-4" />
              Save as Template
            </Button>
          )}
          {contract.status !== "signed" && contract.status !== "cancelled" && (
            <Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main content */}
        <div className="space-y-4">
          <div className="rounded-lg border">
            <EditorToolbar editor={editor} />
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Signers */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Signers</h3>
              {canEdit && (
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowSignerDialog(true)}>
                  <UserPlus className="h-3.5 w-3.5" />
                  Add
                </Button>
              )}
            </div>

            {(!contract.signers || contract.signers.length === 0) ? (
              <p className="text-xs text-muted-foreground">No signers added yet</p>
            ) : (
              <div className="space-y-2">
                {contract.signers.map((signer) => (
                  <div key={signer.id} className="flex items-start justify-between gap-2 p-2 rounded-md bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{signer.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{signer.email}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {signer.status}
                        </Badge>
                        {signer.required && (
                          <span className="text-[10px] text-muted-foreground">Required</span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveSigner(signer.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity */}
          {contract.activities && contract.activities.length > 0 && (
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-3">Activity</h3>
              <div className="space-y-2">
                {contract.activities.map((activity, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <div className="mt-0.5">
                      {activity.type === "created" && <FileSignature className="h-3.5 w-3.5 text-muted-foreground" />}
                      {activity.type === "sent" && <Send className="h-3.5 w-3.5 text-blue-500" />}
                      {activity.type === "signed" && <Check className="h-3.5 w-3.5 text-green-500" />}
                      {activity.type === "viewed" && <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="text-muted-foreground capitalize">{activity.type}</p>
                      <p className="text-muted-foreground/60">
                        {activity.userName} · {formatDate(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Convert to Template dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Convert this contract into a reusable template. The current content will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>Cancel</Button>
            <Button onClick={handleConvertToTemplate} disabled={converting}>
              {converting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FilePlus className="h-4 w-4 mr-2" />}
              Save as Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signer dialog */}
      <Dialog open={showSignerDialog} onOpenChange={setShowSignerDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Signer</DialogTitle>
            <DialogDescription>Add a person who needs to sign this document.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Email *</label>
              <Input
                value={newSignerEmail}
                onChange={(e) => setNewSignerEmail(e.target.value)}
                placeholder="signer@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Name</label>
              <Input
                value={newSignerName}
                onChange={(e) => setNewSignerName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Title/Role</label>
              <Input
                value={newSignerTitle}
                onChange={(e) => setNewSignerTitle(e.target.value)}
                placeholder="e.g. Client, Manager"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignerDialog(false)}>Cancel</Button>
            <Button onClick={handleAddSigner} disabled={!newSignerEmail.trim()}>Add Signer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Contract?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
