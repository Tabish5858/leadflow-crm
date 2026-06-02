import { create } from "zustand";
import { Timestamp } from "firebase/firestore";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { TimeEntry } from "@/types";
import { demoStore } from "@/lib/demo/demo-data";

// Check if demo mode is active (Zustand stores are singletons outside React context)
function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("leadflow_demo_mode") === "true";
}

interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsed: number;
  leadId: string | null;
  description: string;
  billable: boolean;
}

interface TimeTrackingState {
  // Timer
  timer: TimerState;

  // Entries
  entries: TimeEntry[];
  loading: boolean;
  totalSeconds: number;

  // Actions - Timer
  startTimer: (leadId?: string, description?: string) => void;
  stopTimer: (workspaceId: string, userId: string) => Promise<string | null>;
  resetTimer: () => void;
  setTimerDescription: (desc: string) => void;
  setTimerBillable: (billable: boolean) => void;

  // Actions - Entries
  initialize: (workspaceId: string) => void;
  addManualEntry: (
    workspaceId: string,
    userId: string,
    entry: {
      leadId: string | null;
      description: string;
      startTime: Timestamp;
      endTime: Timestamp;
      duration: number;
      billable: boolean;
      hourlyRate: number | null;
    }
  ) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

export const useTimeTrackingStore = create<TimeTrackingState>((set, get) => ({
  timer: {
    isRunning: false,
    startTime: null,
    elapsed: 0,
    leadId: null,
    description: "",
    billable: false,
  },
  entries: [],
  loading: false,
  totalSeconds: 0,

  startTimer: (leadId, description) => {
    set({
      timer: {
        isRunning: true,
        startTime: Date.now(),
        elapsed: 0,
        leadId: leadId || null,
        description: description || "",
        billable: false,
      },
    });
  },

  stopTimer: async (workspaceId, userId) => {
    const { timer } = get();
    if (!timer.startTime) return null;

    const endTime = Timestamp.now();
    const startTime = Timestamp.fromMillis(timer.startTime);
    const duration = Math.floor((Date.now() - timer.startTime) / 1000);

    try {
      let entryId: string;
      if (isDemoMode()) {
        entryId = `demo-time-${Date.now()}`;
        demoStore.addTimeEntry({
          id: entryId,
          workspaceId,
          leadId: timer.leadId,
          taskId: null,
          userId,
          description: timer.description || "Untitled",
          startTime,
          endTime,
          duration,
          billable: timer.billable,
          hourlyRate: null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      } else {
        const entriesRef = collection(db, "timeEntries");
        const docRef = await addDoc(entriesRef, {
          workspaceId,
          leadId: timer.leadId,
          taskId: null,
          userId,
          description: timer.description || "Untitled",
          startTime,
          endTime,
          duration,
          billable: timer.billable,
          hourlyRate: null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        entryId = docRef.id;
      }

      set({
        timer: {
          isRunning: false,
          startTime: null,
          elapsed: 0,
          leadId: null,
          description: "",
          billable: false,
        },
      });

      return entryId;
    } catch {
      return null;
    }
  },

  resetTimer: () => {
    set({
      timer: {
        isRunning: false,
        startTime: null,
        elapsed: 0,
        leadId: null,
        description: "",
        billable: false,
      },
    });
  },

  setTimerDescription: (description) => {
    set((state) => ({
      timer: { ...state.timer, description },
    }));
  },

  setTimerBillable: (billable) => {
    set((state) => ({
      timer: { ...state.timer, billable },
    }));
  },

  initialize: (workspaceId) => {
    set({ loading: true });

    if (isDemoMode()) {
      const entries = demoStore.getTimeEntries();
      const totalSeconds = entries.reduce((sum, e) => sum + e.duration, 0);
      set({ entries, totalSeconds, loading: false });
      // Return a no-op unsubscribe function
      return () => {};
    }

    const entriesRef = collection(db, "timeEntries");
    const q = query(
      entriesRef,
      where("workspaceId", "==", workspaceId),
      orderBy("startTime", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TimeEntry[];

      const totalSeconds = entries.reduce((sum, e) => sum + e.duration, 0);

      set({ entries, totalSeconds, loading: false });
    });
  },

  addManualEntry: async (workspaceId, userId, entry) => {
    if (isDemoMode()) {
      demoStore.addTimeEntry({
        id: `demo-time-${Date.now()}`,
        workspaceId,
        leadId: entry.leadId,
        taskId: null,
        userId,
        description: entry.description,
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: entry.duration,
        billable: entry.billable,
        hourlyRate: entry.hourlyRate,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return;
    }
    const entriesRef = collection(db, "timeEntries");
    await addDoc(entriesRef, {
      ...entry,
      taskId: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  },

  deleteEntry: async (id) => {
    if (isDemoMode()) {
      demoStore.deleteTimeEntry(id);
      return;
    }
    const docRef = doc(db, "timeEntries", id);
    await deleteDoc(docRef);
  },
}));
