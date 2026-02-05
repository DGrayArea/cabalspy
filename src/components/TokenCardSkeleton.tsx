/**
 * TokenCardSkeleton Component
 * 
 * Skeleton loader for token cards to improve perceived performance
 * while data is loading. Shows animated placeholder matching the
 * actual token card layout.
 */

import React from 'react';

export function TokenCardSkeleton() {
  return (
    <div className="animate-pulse bg-gray-900/50 rounded-xl border border-gray-800 p-4">
      {/* Header with icon and name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gray-800 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-800 rounded w-1/2" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="h-3 bg-gray-800 rounded w-12 mb-1" />
          <div className="h-4 bg-gray-800 rounded w-16" />
        </div>
        <div>
          <div className="h-3 bg-gray-800 rounded w-12 mb-1" />
          <div className="h-4 bg-gray-800 rounded w-16" />
        </div>
        <div>
          <div className="h-3 bg-gray-800 rounded w-12 mb-1" />
          <div className="h-4 bg-gray-800 rounded w-16" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-800 rounded-full w-full" />
    </div>
  );
}

export function TokenListSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <TokenCardSkeleton key={i} />
      ))}
    </div>
  );
}
