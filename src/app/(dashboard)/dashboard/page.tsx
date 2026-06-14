"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { RequireModuleAccess } from "@/components/shared/require-module-access";
import { DashboardCardSkeleton } from "@/components/dashboard/dashboard-card";
import { TasksCard } from "@/components/dashboard/cards/tasks-card";
import { ProjectsCard } from "@/components/dashboard/cards/projects-card";
import { InvoicesCard } from "@/components/dashboard/cards/invoices-card";
import { ContractsCard } from "@/components/dashboard/cards/contracts-card";
import { MeetingsCard } from "@/components/dashboard/cards/meetings-card";
import { MessagesCard } from "@/components/dashboard/cards/messages-card";
import { useWorkspace } from "@/contexts/workspace-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useDashboardCards } from "@/lib/hooks/use-dashboard-cards";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { LayoutDashboard, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import type { DashboardCardId } from "@/types/dashboard";
import type { ModuleId } from "@/types";

/** Map card ID to component */
const CARD_COMPONENTS: Record<DashboardCardId, React.ReactNode> = {
  tasks: <TasksCard />,
  projects: <ProjectsCard />,
  invoices: <InvoicesCard />,
  contracts: <ContractsCard />,
  meetings: <MeetingsCard />,
  messages: <MessagesCard />,
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, activeWorkspace } = useWorkspace();
  const { canAccess } = usePermissions();
  const { visibleCards, orderLoaded, handleDragEnd } = useDashboardCards();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const userName = user?.displayName || "there";
  const hasAnyModule: ModuleId[] = [
    "leads", "projects", "invoices",
    "contracts", "meetings", "messages",
  ];
  const anyModuleAccessible = hasAnyModule.some((m) => canAccess(m));

  // Loading state while workspace context or card order resolves
  if (!activeWorkspace?.id || !orderLoaded) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <RequireModuleAccess moduleId="dashboard">
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{userName !== "there" ? `, ${userName.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening across your workspace.
          </p>
        </div>

        {/* Draggable Card Grid */}
        {anyModuleAccessible ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visibleCards}
              strategy={rectSortingStrategy}
            >
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {visibleCards.map((cardId) => (
                  <div key={cardId}>{CARD_COMPONENTS[cardId]}</div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <EmptyState
            icon={<LayoutDashboard className="h-6 w-6" />}
            title="Welcome to LeadFlow CRM"
            description="Contact your workspace admin to adjust your module permissions."
            actionLabel={undefined}
            onAction={undefined}
          />
        )}
      </div>
    </RequireModuleAccess>
  );
}
