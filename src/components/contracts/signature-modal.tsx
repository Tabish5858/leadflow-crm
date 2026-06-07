"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Signature, Check, Loader2 } from "lucide-react";

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSign: (signature: string) => Promise<void>;
  signerName: string;
  title?: string;
  description?: string;
}

export function SignatureModal({
  open,
  onClose,
  onSign,
  signerName,
  title = "Sign Document",
  description = "Type your full name to add your digital signature.",
}: SignatureModalProps) {
  const [typedName, setTypedName] = useState("");
  const [signing, setSigning] = useState(false);

  const handleSign = async () => {
    if (!typedName.trim()) return;
    setSigning(true);
    try {
      await onSign(typedName.trim());
      setTypedName("");
    } catch {
      // error handled upstream
    } finally {
      setSigning(false);
    }
  };

  const handleClose = () => {
    if (signing) return;
    setTypedName("");
    onClose();
  };

  const initials = typedName
    .trim()
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !signing) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Cursive signature preview */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-full min-h-[80px] rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex items-center justify-center p-4">
              {typedName.trim() ? (
                <p className="text-3xl font-['cursive','Brush_Script_MT','Segoe_Script','Comic_Sans_MS'] text-primary">
                  {typedName}
                </p>
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                  <Signature className="h-8 w-8" />
                  <span className="text-xs">Signature preview</span>
                </div>
              )}
            </div>

            {initials && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {initials}
                </div>
                <span>Your initials: <strong>{initials}</strong></span>
              </div>
            )}
          </div>

          {/* Name input */}
          <div>
            <Label htmlFor="signature-name" className="text-sm font-medium">
              Type your full name
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Your typed name serves as your electronic signature.
            </p>
            <Input
              id="signature-name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={signerName || "John Doe"}
              className="text-lg"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSign()}
            />
          </div>

          {/* Legal text */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            By clicking <strong>Sign</strong>, you agree that your typed name constitutes
            your electronic signature and that you consent to electronic transactions
            related to this document.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={signing}>
            Cancel
          </Button>
          <Button onClick={handleSign} disabled={!typedName.trim() || signing}>
            {signing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Sign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
