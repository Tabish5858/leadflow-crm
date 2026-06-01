"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

/**
 * Action Items Card — shows items needing client attention.
 * Currently displays static guidance since invoice/contract
 * features are built in Phase 3. When data sources exist,
 * this card computes pending items dynamically.
 */
export function ActionItemsCard() {
  // Phase 3 will connect this to real data sources:
  // - Pending invoices (invoices collection)
  // - Unsigned contracts (documents collection)
  // - Pending project requests (project_requests collection)
  // - Overdue items
  //
  // For now, show a helpful "no action needed" state.

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4 text-primary" />
          Action Items
        </CardTitle>
        <CardDescription>Things that need your attention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500/50" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            All clear!
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            No pending items need your attention right now.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/client/projects">
              View your projects
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
