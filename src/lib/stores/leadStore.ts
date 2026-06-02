import { create } from "zustand";
import type { Lead } from "@/types";
import { Timestamp } from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";
import {
  createLead,
  updateLead,
  deleteLead,
  deleteLeads,
  getLeadsByWorkspace,
  getAllLeadsByWorkspace,
  getLeadStats,
} from "@/lib/firebase/firestore";
import { demoStore } from "@/lib/demo/demo-data";
import type { LeadFormData } from "@/lib/schemas/lead";

// Check if demo mode is active (Zustand stores are singletons outside React context)
function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("leadflow_demo_mode") === "true";
}

// Audit logging helpers (imported dynamically to keep bundle small)
async function audit(
  fn: "logLeadCreated" | "logLeadUpdated" | "logLeadDeleted",
  ...args: unknown[]
) {
  try {
    const { [fn]: auditFn } = await import("@/lib/firebase/activities");
    await (auditFn as (...a: unknown[]) => Promise<void>)(...args);
  } catch {
    // Audit failures are non-critical - don't disrupt the user
  }
}

const PAGE_SIZE = 200;

interface LeadState {
  leads: Lead[];
  filteredLeads: Lead[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  cursor: DocumentData | null;
  error: string | null;
  searchQuery: string;
  selectedIds: Set<string>;
  stats: {
    total: number;
    byStatus: Record<string, number>;
    totalValue: number;
  };

  // Actions
  initialize: (workspaceId: string) => Promise<void>;
  initializeAll: (workspaceId: string) => Promise<void>;
  loadMore: (workspaceId: string) => Promise<void>;
  addLead: (workspaceId: string, userId: string, data: LeadFormData, customFields?: Record<string, unknown>, userName?: string) => Promise<void>;
  editLead: (id: string, data: Partial<LeadFormData>, userId?: string, userName?: string) => Promise<void>;
  removeLead: (id: string, userId?: string, userName?: string) => Promise<void>;
  removeLeads: (ids: string[], userId?: string, userName?: string) => Promise<void>;
  updateStatus: (id: string, status: string, userId?: string, userName?: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  refreshStats: (workspaceId: string) => Promise<void>;
}

export const useLeadStore = create<LeadState>((set, get) => ({
  leads: [],
  filteredLeads: [],
  loading: false,
  loadingMore: false,
  hasMore: true,
  totalCount: 0,
  cursor: null,
  error: null,
  searchQuery: "",
  selectedIds: new Set(),
  stats: { total: 0, byStatus: {}, totalValue: 0 },

  initialize: async (workspaceId: string) => {
    set({ loading: true, error: null, leads: [], filteredLeads: [], cursor: null, hasMore: true });

    try {
      if (isDemoMode()) {
        const leads = demoStore.getAllLeads();
        set({
          leads,
          filteredLeads: leads,
          cursor: null,
          hasMore: false,
          totalCount: leads.length,
          loading: false,
        });
        return;
      }
      const { leads, lastVisible, total } = await getLeadsByWorkspace(workspaceId, PAGE_SIZE);
      set({
        leads,
        filteredLeads: leads,
        cursor: lastVisible,
        hasMore: leads.length >= PAGE_SIZE,
        totalCount: total,
        loading: false,
      });
    } catch {
      set({ error: "Failed to load leads", loading: false });
    }
  },

  initializeAll: async (workspaceId: string) => {
    set({ loading: true, error: null, leads: [], filteredLeads: [], cursor: null, hasMore: false });

    try {
      if (isDemoMode()) {
        const leads = demoStore.getAllLeads();
        set({
          leads,
          filteredLeads: leads,
          cursor: null,
          hasMore: false,
          totalCount: leads.length,
          loading: false,
        });
        return;
      }
      const { leads, total } = await getAllLeadsByWorkspace(workspaceId);
      set({
        leads,
        filteredLeads: leads,
        cursor: null,
        hasMore: false,
        totalCount: total,
        loading: false,
      });
    } catch {
      set({ error: "Failed to load leads", loading: false });
    }
  },

  loadMore: async (workspaceId: string) => {
    const { cursor, hasMore, loadingMore } = get();
    if (!hasMore || loadingMore || !cursor) return;

    set({ loadingMore: true });

    try {
      const { leads: newLeads, lastVisible, total } = await getLeadsByWorkspace(workspaceId, PAGE_SIZE, cursor);
      const currentLeads = get().leads;

      const merged = [...currentLeads, ...newLeads];

      set({
        leads: merged,
        filteredLeads: merged,
        cursor: lastVisible,
        hasMore: newLeads.length >= PAGE_SIZE,
        totalCount: total,
        loadingMore: false,
      });
    } catch {
      set({ loadingMore: false });
    }
  },

  addLead: async (workspaceId: string, userId: string, data: LeadFormData, customFields?: Record<string, unknown>, userName?: string) => {
    set({ loading: true, error: null });
    try {
      const now = Timestamp.now();
      const leadData = {
        workspaceId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        company: data.company || null,
        jobTitle: data.jobTitle || null,
        status: data.status,
        source: data.source || null,
        niche: data.niche || null,
        country: data.country || null,
        city: data.city || null,
        website: data.website || null,
        linkedin: data.linkedin || null,
        value: data.value || null,
        currency: data.currency || "USD",
        assignedTo: null,
        tags: data.tags || [],
        notes: data.notes || null,
        customFields: customFields || {},
        socialProfiles: {},
        avatarUrl: null,
        attachments: [],
        lastContactedAt: null,
        nextFollowUpAt: null,
        expectedCloseAt: data.expectedCloseAt ? Timestamp.fromDate(new Date(data.expectedCloseAt)) : null,
        createdBy: userId,
      };

      let newId: string;
      if (isDemoMode()) {
        newId = `demo-lead-${Date.now()}`;
        const newLead: Lead = {
          id: newId,
          ...leadData,
          createdAt: now,
          updatedAt: now,
        };
        demoStore.addLead(newLead);
      } else {
        newId = await createLead(leadData);
      }

      // Append new lead to local state (no reload needed)
      const leadName = `${data.firstName} ${data.lastName}`.trim();
      const newLead: Lead = {
        id: newId,
        ...leadData,
        createdAt: now,
        updatedAt: now,
      };
      set((state) => ({
        leads: [newLead, ...state.leads],
        filteredLeads: [newLead, ...state.filteredLeads],
        totalCount: state.totalCount + 1,
        loading: false,
      }));
      // Audit log (fire-and-forget)
      if (userName) {
        audit("logLeadCreated", newId, workspaceId, userId, userName, leadName);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create lead";
      set({ error: message, loading: false });
      throw error;
    }
  },

  editLead: async (id: string, data: Partial<LeadFormData>, userId?: string, userName?: string) => {
    try {
      // Capture old values for audit before modifying
      const currentLead = get().leads.find((l) => l.id === id);

      const updateData: Partial<Lead> = {};
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone || null;
      if (data.company !== undefined) updateData.company = data.company || null;
      if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle || null;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.source !== undefined) updateData.source = data.source || null;
      if (data.niche !== undefined) updateData.niche = data.niche || null;
      if (data.country !== undefined) updateData.country = data.country || null;
      if (data.city !== undefined) updateData.city = data.city || null;
      if (data.website !== undefined) updateData.website = data.website || null;
      if (data.linkedin !== undefined) updateData.linkedin = data.linkedin || null;
      if (data.value !== undefined) updateData.value = data.value || null;
      if (data.currency !== undefined) updateData.currency = data.currency;
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.notes !== undefined) updateData.notes = data.notes || null;
      if (data.expectedCloseAt !== undefined)
        updateData.expectedCloseAt = data.expectedCloseAt
          ? Timestamp.fromDate(new Date(data.expectedCloseAt))
          : null;

      if (isDemoMode()) {
        demoStore.updateLead(id, updateData);
      } else {
        await updateLead(id, updateData);
      }

      // Optimistic update
      set((state) => ({
        leads: state.leads.map((l) => (l.id === id ? { ...l, ...updateData } : l)),
        filteredLeads: state.filteredLeads.map((l) => (l.id === id ? { ...l, ...updateData } : l)),
      }));

      // Audit log (fire-and-forget)
      if (currentLead && userId && userName) {
        const leadName = `${currentLead.firstName} ${currentLead.lastName}`.trim();
        const oldValue = { ...currentLead };
        // Only send changed fields as newValue
        const newValue: Record<string, unknown> = {};
        for (const key of Object.keys(updateData) as (keyof Lead)[]) {
          if (key in updateData) {
            newValue[key] = updateData[key];
          }
        }
        audit("logLeadUpdated", id, currentLead.workspaceId, userId, userName, leadName, oldValue, newValue);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update lead";
      set({ error: message });
      throw error;
    }
  },

  removeLead: async (id: string, userId?: string, userName?: string) => {
    try {
      const currentLead = get().leads.find((l) => l.id === id);
      if (isDemoMode()) {
        demoStore.deleteLead(id);
      } else {
        await deleteLead(id);
      }
      set((state) => ({
        leads: state.leads.filter((l) => l.id !== id),
        filteredLeads: state.filteredLeads.filter((l) => l.id !== id),
      }));
      if (currentLead && userId && userName) {
        const leadName = `${currentLead.firstName} ${currentLead.lastName}`.trim();
        audit("logLeadDeleted", id, currentLead.workspaceId, userId, userName, leadName);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete lead";
      set({ error: message });
      throw error;
    }
  },

  removeLeads: async (ids: string[], userId?: string, userName?: string) => {
    set({ loading: true, error: null });
    try {
      const deletedLeads = get().leads.filter((l) => ids.includes(l.id));
      if (isDemoMode()) {
        demoStore.deleteLeads(ids);
      } else {
        await deleteLeads(ids);
      }
      set((state) => ({
        leads: state.leads.filter((l) => !ids.includes(l.id)),
        filteredLeads: state.filteredLeads.filter((l) => !ids.includes(l.id)),
        selectedIds: new Set(),
        loading: false,
      }));
      if (userId && userName) {
        for (const lead of deletedLeads) {
          const leadName = `${lead.firstName} ${lead.lastName}`.trim();
          audit("logLeadDeleted", lead.id, lead.workspaceId, userId, userName, leadName);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete leads";
      set({ error: message, loading: false });
      throw error;
    }
  },

  updateStatus: async (id: string, status: string, userId?: string, userName?: string) => {
    // Optimistic update: move card immediately in UI, then sync to Firestore in background
    const prevLeads = get().leads;
    const prevFiltered = get().filteredLeads;
    const currentLead = get().leads.find((l) => l.id === id);
    const oldStatus = currentLead?.status;

    set((state) => ({
      leads: state.leads.map((l) => (l.id === id ? { ...l, status } : l)),
      filteredLeads: state.filteredLeads.map((l) => (l.id === id ? { ...l, status } : l)),
    }));

    try {
      if (isDemoMode()) {
        demoStore.updateLead(id, { status });
      } else {
        await updateLead(id, { status });
      }
      // Audit log (fire-and-forget)
      if (currentLead && userId && userName) {
        const leadName = `${currentLead.firstName} ${currentLead.lastName}`.trim();
        audit("logLeadUpdated", id, currentLead.workspaceId, userId, userName, leadName,
          oldStatus ? { status: oldStatus } as Record<string, unknown> : null,
          { status } as Record<string, unknown>
        );
      }
    } catch (error: unknown) {
      // Revert on failure
      set({ leads: prevLeads, filteredLeads: prevFiltered });
      const message = error instanceof Error ? error.message : "Failed to update status";
      set({ error: message });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    const { leads } = get();
    if (!query.trim()) {
      set({ filteredLeads: leads });
      return;
    }
    const term = query.toLowerCase();
    const filtered = leads.filter(
      (lead) =>
        lead.firstName.toLowerCase().includes(term) ||
        lead.lastName.toLowerCase().includes(term) ||
        lead.email.toLowerCase().includes(term) ||
        (lead.company?.toLowerCase().includes(term) ?? false) ||
        lead.tags.some((tag) => tag.toLowerCase().includes(term))
    );
    set({ filteredLeads: filtered });
  },

  toggleSelect: (id: string) => {
    const selectedIds = new Set(get().selectedIds);
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
    set({ selectedIds });
  },

  selectAll: () => {
    const { filteredLeads } = get();
    set({ selectedIds: new Set(filteredLeads.map((l) => l.id)) });
  },

  clearSelection: () => {
    set({ selectedIds: new Set() });
  },

  refreshStats: async (workspaceId: string) => {
    try {
      if (isDemoMode()) {
        set({ stats: demoStore.getLeadStats() });
        return;
      }
      const stats = await getLeadStats(workspaceId);
      set({ stats });
    } catch {
      // Stats are non-critical
    }
  },
}));
