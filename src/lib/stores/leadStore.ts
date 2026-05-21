import { create } from "zustand";
import type { Lead } from "@/types";
import {
  createLead,
  updateLead,
  deleteLead,
  deleteLeads,
  subscribeToLeads,
  getLeadStats,
} from "@/lib/firebase/firestore";
import type { LeadFormData } from "@/lib/schemas/lead";

interface LeadState {
  leads: Lead[];
  filteredLeads: Lead[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedIds: Set<string>;
  stats: {
    total: number;
    byStatus: Record<string, number>;
    totalValue: number;
  };
  unsubscribe: (() => void) | null;

  // Actions
  initialize: (workspaceId: string) => void;
  addLead: (workspaceId: string, userId: string, data: LeadFormData, customFields?: Record<string, unknown>) => Promise<void>;
  editLead: (id: string, data: Partial<LeadFormData>) => Promise<void>;
  removeLead: (id: string) => Promise<void>;
  removeLeads: (ids: string[]) => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
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
  error: null,
  searchQuery: "",
  selectedIds: new Set(),
  stats: { total: 0, byStatus: {}, totalValue: 0 },
  unsubscribe: null,

  initialize: (workspaceId: string) => {
    const existing = get().unsubscribe;
    if (existing) existing();

    set({ loading: true });

    const unsub = subscribeToLeads(workspaceId, (leads) => {
      set({ leads, filteredLeads: leads, loading: false });
    });

    set({ unsubscribe: unsub });
  },

  addLead: async (workspaceId: string, userId: string, data: LeadFormData, customFields?: Record<string, unknown>) => {
    set({ loading: true, error: null });
    try {
      await createLead({
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
        createdBy: userId,
      });
      set({ loading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create lead";
      set({ error: message, loading: false });
      throw error;
    }
  },

  editLead: async (id: string, data: Partial<LeadFormData>) => {
    set({ loading: true, error: null });
    try {
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

      await updateLead(id, updateData);
      set({ loading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update lead";
      set({ error: message, loading: false });
      throw error;
    }
  },

  removeLead: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await deleteLead(id);
      set({ loading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete lead";
      set({ error: message, loading: false });
      throw error;
    }
  },

  removeLeads: async (ids: string[]) => {
    set({ loading: true, error: null });
    try {
      await deleteLeads(ids);
      set({ selectedIds: new Set(), loading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete leads";
      set({ error: message, loading: false });
      throw error;
    }
  },

  updateStatus: async (id: string, status: string) => {
    set({ loading: true, error: null });
    try {
      await updateLead(id, { status });
      set({ loading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update status";
      set({ error: message, loading: false });
      throw error;
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
      const stats = await getLeadStats(workspaceId);
      set({ stats });
    } catch {
      // Stats are non-critical
    }
  },
}));
