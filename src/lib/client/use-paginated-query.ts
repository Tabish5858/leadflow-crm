"use client";

import type {
  DocumentData,
  FirestoreError,
  QueryConstraint,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
} from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";

interface PaginatedQueryOptions<T> {
  /** Firestore collection reference */
  collectionRef: ReturnType<typeof collection>;
  /** Base query constraints (filters) - stable reference recommended */
  baseConstraints?: QueryConstraint[];
  /** Sort field for pagination cursor */
  orderByField: string;
  /** Sort direction */
  orderDirection?: "asc" | "desc";
  /** Page size */
  pageSize?: number;
  /** Enable total count (uses getCountFromServer - costs 1 read) */
  enableCount?: boolean;
  /** Transform raw doc data to typed result */
  transform?: (id: string, data: DocumentData) => T;
  /** Re-fetch when these deps change */
  deps?: unknown[];
}

/**
 * Cursor-based pagination hook for Firestore.
 *
 * Features:
 * - Cursor-based pagination (efficient for large datasets)
 * - Loading/error states
 * - Optional total count
 * - Refresh support
 *
 * Usage:
 * ```tsx
 * const { items, loading, hasMore, loadMore, refresh } = usePaginatedQuery({
 *   collectionRef: collection(db, "projects"),
 *   baseConstraints: [where("workspaceId", "==", wsId)],
 *   orderByField: "createdAt",
 *   orderDirection: "desc",
 *   pageSize: 20,
 * });
 * ```
 */
export function usePaginatedQuery<T extends { id: string }>({
  collectionRef,
  baseConstraints = [],
  orderByField,
  orderDirection = "desc",
  pageSize = 20,
  enableCount = false,
  transform,
  deps = [],
}: PaginatedQueryOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const loadKeyRef = useRef(0);

  const fetchPage = useCallback(
    async (isLoadMore: boolean) => {
      try {
        if (isLoadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const constraints: QueryConstraint[] = [
          ...baseConstraints,
          orderBy(orderByField, orderDirection),
          limit(pageSize + 1),
        ];

        if (isLoadMore && lastDocRef.current) {
          constraints.unshift(startAfter(lastDocRef.current));
        }

        const q = query(collectionRef, ...constraints);
        const snap = await getDocs(q);

        const docs = snap.docs;
        const hasMoreDocs = docs.length > pageSize;
        const pageDocs = hasMoreDocs ? docs.slice(0, pageSize) : docs;

        const transformed = pageDocs.map((d) => {
          const data = d.data();
          if (transform) return transform(d.id, data);
          return { id: d.id, ...data } as unknown as T;
        });

        if (isLoadMore) {
          setItems((prev) => [...prev, ...transformed]);
        } else {
          setItems(transformed);
        }

        lastDocRef.current = pageDocs[pageDocs.length - 1] ?? null;
        setHasMore(hasMoreDocs);
      } catch (e) {
        setError(e as FirestoreError);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collectionRef, baseConstraints, orderByField, orderDirection, pageSize, transform]
  );

  // Fetch total count
  useEffect(() => {
    if (!enableCount) return;
    let cancelled = false;
    (async () => {
      try {
        const q = query(collectionRef, ...baseConstraints);
        const snap = await getCountFromServer(q);
        if (!cancelled) setTotalCount(snap.data().count);
      } catch {
        // Count failed - skip
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableCount, ...deps]);

  // Initial fetch + refresh on dep change
  useEffect(() => {
    loadKeyRef.current += 1;
    lastDocRef.current = null;
    fetchPage(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, ...deps]);

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      fetchPage(true);
    }
  }, [loading, loadingMore, hasMore, fetchPage]);

  const refresh = useCallback(() => {
    lastDocRef.current = null;
    fetchPage(false);
  }, [fetchPage]);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    totalCount,
    loadMore,
    refresh,
  } as const;
}
