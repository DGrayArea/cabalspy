/**
 * TokenCardSkeleton Component
 *
 * Skeleton loader for token cards to improve perceived performance
 * while data is loading. Shows animated placeholder matching the
 * actual CompactTokenCard layout.
 */

import React from "react";

export function TokenCardSkeleton() {
  return (
    <div className="animate-pulse bg-gray-900/50 rounded-xl border border-gray-800/60 p-3 sm:p-4 flex flex-col gap-3">
      {/* Header: avatar + name + symbol + chain badge */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gray-800 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-3.5 bg-gray-800 rounded w-2/3 mb-1.5" />
          <div className="h-3 bg-gray-700 rounded w-1/3" />
        </div>
        {/* Chain badge */}
        <div className="w-6 h-6 bg-gray-800 rounded-full flex-shrink-0" />
      </div>

      {/* Price + change */}
      <div className="flex items-center justify-between">
        <div className="h-4 bg-gray-800 rounded w-24" />
        <div className="h-4 bg-gray-700 rounded w-14" />
      </div>

      {/* Stats row: MC / Vol / Txns */}
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="h-2.5 bg-gray-800 rounded w-10" />
            <div className="h-3.5 bg-gray-700 rounded w-14" />
          </div>
        ))}
      </div>

      {/* Bonding progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <div className="h-2 bg-gray-800 rounded w-16" />
          <div className="h-2 bg-gray-800 rounded w-8" />
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full w-full overflow-hidden">
          <div
            className="h-full bg-gray-700 rounded-full"
            style={{ width: `${30 + Math.random() * 50}%` }}
          />
        </div>
      </div>

      {/* Quick buy button placeholder */}
      <div className="h-8 bg-gray-800 rounded-lg w-full" />
    </div>
  );
}

export function TokenListSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <TokenCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Marquee skeleton — horizontal strip of pill-shaped placeholders
 */
export function MarqueeSkeleton() {
  return (
    <div className="glass rounded-3xl p-3 border border-white/10 overflow-hidden">
      <div className="flex items-center gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse flex-shrink-0 h-12 bg-panel-elev/80 border border-white/5 rounded-2xl flex items-center gap-3 px-3 min-w-[160px]"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-16 bg-white/10 rounded" />
              <div className="h-2 w-10 bg-white/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
