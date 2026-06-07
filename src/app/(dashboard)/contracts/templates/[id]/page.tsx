"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import { getTemplate, updateTemplate, deleteTemplate, createContract } from "@/lib/firebase/contracts";
import type { ContractTemplate, ContractType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  Trash2,
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

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function ToolBtn({ action, active, label }: { action: () => void; active?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={action}
      className={`px-2 py-1 text-xs rounded hover:bg-muted transition-colors ${active ? "bg-muted font-bold" : ""}`}
    >
      {label}
    </button>
  );
}

function EditorToolbar({ editor }: { editor: import("@tiptap/react").Editor | null }) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30 rounded-t-lg">
      <ToolBtn action={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="B" />
      <ToolBtn action={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="I" />
      <ToolBtn action={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} label="U" />
      <ToolBtn action={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} label="S" />
      <div className="w-px bg-border mx-1" />
      <ToolBtn action={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} label="H1" />
      <ToolBtn action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="H2" />
      <ToolBtn action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} label="H3" />
      <div className="w-px bg-border mx-1" />
      <select
        onChange={(e) => { const v = e.target.value; if (v) { editor.chain().focus().setFontFamily(v).run(); } e.target.value = ""; }}
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
        onChange={(e) => { const v = e.target.value; if (v) { editor.chain().focus().setFontSize(v).run(); } e.target.value = ""; }}
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
      <ToolBtn action={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="• List" />
      <ToolBtn action={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="1. List" />
      <ToolBtn action={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label="Quote" />
      <ToolBtn action={() => editor.chain().focus().setHorizontalRule().run()} label="—" />
      <div className="ml-auto">
        <ContractSections
          onInsert={(html) => editor.chain().focus().insertContent(html).run()}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();

  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ContractType>("contract");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showUseDialog, setShowUseDialog] = useState(false);
  const [newContractTitle, setNewContractTitle] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Placeholder.configure({ placeholder: "Write your template content here..." }),
    ],
    content: "",
    editable: true,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3",
      },
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTemplate(id);
      if (!data) {
        toast.error("Template not found");
        router.push("/contracts?tab=Templates");
        return;
      }
      setTemplate(data);
      setTitle(data.templateTitle);
      setDescription(data.templateDescription);
      setType(data.type);
      if (editor && data.content) {
        editor.commands.setContent(data.content);
      }
    } catch {
      toast.error("Failed to load template");
    } finally {
      setLoading(false);
    }
  }, [id, router, editor]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    try {
      await updateTemplate(template.id, {
        templateTitle: title,
        templateDescription: description,
        type,
        content: editor?.getHTML() || "",
      });
      toast.success("Template saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    setDeleting(true);
    try {
      await deleteTemplate(template.id);
      toast.success("Template deleted");
      router.push("/contracts?tab=Templates");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleUseTemplate = async () => {
    if (!template || !activeWorkspace?.id || !newContractTitle.trim()) return;
    try {
      const contractId = await createContract(activeWorkspace.id, {
        contractTitle: newContractTitle.trim(),
        type: template.type,
        content: template.content,
      });
      toast.success("Contract created from template");
      setShowUseDialog(false);
      router.push(`/contracts/${contractId}`);
    } catch {
      toast.error("Failed to create contract");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!template) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/contracts?tab=Templates")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-bold border-0 px-0 focus-visible:ring-0 h-9"
              placeholder="Template title"
            />
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {type === "proposal" ? <FileCheck className="h-3.5 w-3.5" /> : <FileSignature className="h-3.5 w-3.5" />}
                <span className="capitalize">{type}</span>
              </div>
              <span className="text-xs text-muted-foreground">Template</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => {
            setNewContractTitle(`New from: ${title}`);
            setShowUseDialog(true);
          }}>
            <FilePlus className="h-4 w-4" />
            Use Template
          </Button>
          <Button size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Description */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm font-medium">Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Template description"
            className="mt-1.5"
          />
        </CardContent>
      </Card>

      {/* Type toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("contract")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
            type === "contract" ? "border-primary bg-primary/5 text-primary font-medium" : "border-input"
          }`}
        >
          <FileSignature className="h-4 w-4" />
          Contract
        </button>
        <button
          type="button"
          onClick={() => setType("proposal")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
            type === "proposal" ? "border-primary bg-primary/5 text-primary font-medium" : "border-input"
          }`}
        >
          <FileCheck className="h-4 w-4" />
          Proposal
        </button>
      </div>

      {/* Editor */}
      <Card>
        <EditorToolbar editor={editor} />
        <EditorContent editor={editor} />
      </Card>

      {/* Use Template Dialog */}
      <Dialog open={showUseDialog} onOpenChange={setShowUseDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Contract from Template</DialogTitle>
            <DialogDescription>This will create a new contract with the template content.</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-sm font-medium">Contract Title</Label>
            <Input
              value={newContractTitle}
              onChange={(e) => setNewContractTitle(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUseDialog(false)}>Cancel</Button>
            <Button onClick={handleUseTemplate} disabled={!newContractTitle.trim()}>
              Create Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
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
