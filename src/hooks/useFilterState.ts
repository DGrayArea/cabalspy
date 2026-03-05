/**
 * useFilterState Hook
 * 
 * Manages filter state with localStorage persistence.
 * Remembers user's last selected filter across page reloads.
 */

import { useState, useEffect } from 'react';

type FilterType = 'trending' | 'new' | 'finalStretch' | 'latest' | 'featured' | 'graduated' | 'marketCap';

const STORAGE_KEY = 'cabalspy_filter';

export function useFilterState(defaultFilter: FilterType = 'trending') {
  const [filter, setFilterInternal] = useState<FilterType>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isValidFilter(saved)) {
        return saved as FilterType;
      }
    }
    return defaultFilter;
  });

  const setFilter = (newFilter: FilterType) => {
    setFilterInternal(newFilter);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newFilter);
    }
  };

  return [filter, setFilter] as const;
}

function isValidFilter(value: string): boolean {
  const validFilters: FilterType[] = [
    'trending',
    'new',
    'finalStretch',
    'latest',
    'featured',
    'graduated',
    'marketCap',
  ];
  return validFilters.includes(value as FilterType);
}
