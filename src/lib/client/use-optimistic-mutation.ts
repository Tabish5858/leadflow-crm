"use client";

import { useCallback, useState } from "react";

interface OptimisticMutationOptions<TData, TVariables> {
  /** Async mutation function (Firestore write, API call, etc.) */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Apply optimistic update to local state BEFORE mutation completes */
  optimisticUpdate: (variables: TVariables) => void;
  /** Rollback the optimistic update on failure */
  rollback: () => void;
  /** Called on successful mutation with the result data */
  onSuccess?: (data: TData) => void;
  /** Called on mutation error */
  onError?: (error: Error) => void;
}

/**
 * Generic optimistic mutation hook.
 *
 * Usage:
 * ```tsx
 * const { mutate, isLoading } = useOptimisticMutation({
 *   mutationFn: (body) => addDoc(messagesRef, body),
 *   optimisticUpdate: (body) => addTempMessage(body),
 *   rollback: () => removeTempMessage(),
 *   onSuccess: (realId) => replaceTempId(realId),
 * });
 * ```
 */
export function useOptimisticMutation<TData, TVariables>({
  mutationFn,
  optimisticUpdate,
  rollback,
  onSuccess,
  onError,
}: OptimisticMutationOptions<TData, TVariables>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (variables: TVariables) => {
      setIsLoading(true);
      setError(null);

      // 1. Apply optimistic update immediately
      let didOptimistic = false;
      try {
        optimisticUpdate(variables);
        didOptimistic = true;
      } catch (e) {
        // Optimistic update failed - don't proceed with mutation
        setIsLoading(false);
        setError(e as Error);
        return;
      }

      // 2. Perform the actual mutation
      try {
        const result = await mutationFn(variables);
        onSuccess?.(result);
      } catch (e) {
        // 3. Rollback on failure
        if (didOptimistic) {
          try {
            rollback();
          } catch {
            // Rollback failed - state may be inconsistent
          }
        }
        const err = e as Error;
        setError(err);
        onError?.(err);
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn, optimisticUpdate, rollback, onSuccess, onError]
  );

  return { mutate, isLoading, error };
}
