/**
 * useInfiniteScroll Hook
 * 
 * Implements infinite scroll functionality using Intersection Observer API.
 * Automatically loads more content when user scrolls near the bottom of the page.
 * 
 * @param onLoadMore - Callback function to load more data
 * @param options - Configuration options
 * @returns Object with ref to attach to sentinel element and loading state
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number; // How close to bottom before triggering (0-1)
  rootMargin?: string; // Margin around root element
  enabled?: boolean; // Whether infinite scroll is enabled
  hasMore?: boolean; // Whether there's more data to load
}

export function useInfiniteScroll(
  onLoadMore: () => Promise<void> | void,
  options: UseInfiniteScrollOptions = {}
) {
  const {
    threshold = 0.5,
    rootMargin = '100px',
    enabled = true,
    hasMore = true,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false); // Prevent duplicate calls

  const handleIntersect = useCallback(
    async (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      // Only load if:
      // 1. Element is intersecting
      // 2. Not currently loading
      // 3. Infinite scroll is enabled
      // 4. There's more data to load
      if (
        entry.isIntersecting &&
        !loadingRef.current &&
        enabled &&
        hasMore
      ) {
        loadingRef.current = true;
        setIsLoading(true);

        try {
          await onLoadMore();
        } catch (error) {
          console.error('Error loading more:', error);
        } finally {
          setIsLoading(false);
          loadingRef.current = false;
        }
      }
    },
    [onLoadMore, enabled, hasMore]
  );

  useEffect(() => {
    const target = observerTarget.current;
    if (!target || !enabled) return;

    const observer = new IntersectionObserver(handleIntersect, {
      threshold,
      rootMargin,
    });

    observer.observe(target);

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [handleIntersect, threshold, rootMargin, enabled]);

  return {
    observerTarget,
    isLoading,
  };
}
