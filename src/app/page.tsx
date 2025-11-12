'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import TokenRow from '@/components/TokenRow';
import AuthButton from '@/components/AuthButton';
import { TokenData } from '@/types/token';
import { useTokens } from '@/hooks/useTokens';
import { useAuth } from '@/context/AuthContext';
import { User } from 'lucide-react';

// Component that uses useSearchParams - must be wrapped in Suspense
function AuthCallbackHandler() {
  const searchParams = useSearchParams();
  const { login } = useAuth();

  // Handle OAuth callback
  useEffect(() => {
    const authSuccess = searchParams.get('authSuccess');
    const userData = searchParams.get('user');

    if (authSuccess && userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData));
        login('google', user);
        // Clean URL
        window.history.replaceState({}, '', '/');
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }
  }, [searchParams, login]);

  return null;
}

function HomeContent() {
  const { tokens: allTokens, isLoading: tokensLoading, error: tokensError } = useTokens();
  
  // Memoize token splits to avoid recalculation on every render
  const { newPairs, finalStretch, migrated } = useMemo(() => ({
    newPairs: allTokens.filter((_, i) => i % 3 === 0),
    finalStretch: allTokens.filter((_, i) => i % 3 === 1),
    migrated: allTokens.filter((_, i) => i % 3 === 2),
  }), [allTokens]);

  const [pageNew, setPageNew] = useState(0);
  const [pageFinal, setPageFinal] = useState(0);
  const [pageMigrated, setPageMigrated] = useState(0);
  const pageSize = 15;

  // Memoize paginated results
  const { pagedNew, pagedFinal, pagedMigrated, totalNewPages, totalFinalPages, totalMigratedPages } = useMemo(() => ({
    pagedNew: newPairs.slice(pageNew * pageSize, (pageNew + 1) * pageSize),
    pagedFinal: finalStretch.slice(pageFinal * pageSize, (pageFinal + 1) * pageSize),
    pagedMigrated: migrated.slice(pageMigrated * pageSize, (pageMigrated + 1) * pageSize),
    totalNewPages: Math.max(1, Math.ceil(newPairs.length / pageSize)),
    totalFinalPages: Math.max(1, Math.ceil(finalStretch.length / pageSize)),
    totalMigratedPages: Math.max(1, Math.ceil(migrated.length / pageSize)),
  }), [newPairs, finalStretch, migrated, pageNew, pageFinal, pageMigrated, pageSize]);

  return (
    <div className="min-h-screen bg-app text-white">
      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Pulse</h1>
              <p className="text-gray-400">Real-time token tracking and trading</p>
              <Link 
                href="/pulse"
                className="inline-block mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                View Table Layout →
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {tokensLoading && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-blue-900 text-blue-300">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  Loading...
                </div>
              )}
              {tokensError && (
                <div className="text-red-400 text-sm">
                  Error: {tokensError}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Link 
                  href="/profile"
                  className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <AuthButton />
              </div>
            </div>
          </div>
        </div>

        {/* Three Column Layout - Responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* New Pairs Column */}
          <div className="bg-panel rounded-lg p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">New Pairs</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Page {pageNew + 1} / {totalNewPages}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPageNew((p) => Math.max(0, p - 1))}
                    className="px-2 py-1 bg-panel-elev text-xs rounded"
                    disabled={pageNew === 0}
                  >Prev</button>
                  <button
                    onClick={() => setPageNew((p) => Math.min(totalNewPages - 1, p + 1))}
                    className="px-2 py-1 bg-blue-600 text-xs rounded disabled:bg-gray-600"
                    disabled={pageNew >= totalNewPages - 1}
                  >Next</button>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {pagedNew.map((token) => (
                <TokenRow key={token.id} token={token} />
              ))}
            </div>
          </div>

          {/* Final Stretch Column */}
          <div className="bg-panel rounded-lg p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Final Stretch</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Page {pageFinal + 1} / {totalFinalPages}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPageFinal((p) => Math.max(0, p - 1))}
                    className="px-2 py-1 bg-panel-elev text-xs rounded"
                    disabled={pageFinal === 0}
                  >Prev</button>
                  <button
                    onClick={() => setPageFinal((p) => Math.min(totalFinalPages - 1, p + 1))}
                    className="px-2 py-1 bg-blue-600 text-xs rounded disabled:bg-gray-600"
                    disabled={pageFinal >= totalFinalPages - 1}
                  >Next</button>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {pagedFinal.map((token) => (
                <TokenRow key={token.id} token={token} />
              ))}
            </div>
          </div>

          {/* Migrated Column */}
          <div className="bg-panel rounded-lg p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Migrated</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Page {pageMigrated + 1} / {totalMigratedPages}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPageMigrated((p) => Math.max(0, p - 1))}
                    className="px-2 py-1 bg-panel-elev text-xs rounded"
                    disabled={pageMigrated === 0}
                  >Prev</button>
                  <button
                    onClick={() => setPageMigrated((p) => Math.min(totalMigratedPages - 1, p + 1))}
                    className="px-2 py-1 bg-blue-600 text-xs rounded disabled:bg-gray-600"
                    disabled={pageMigrated >= totalMigratedPages - 1}
                  >Next</button>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {pagedMigrated.map((token) => (
                <TokenRow key={token.id} token={token} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Suspense fallback={null}>
        <AuthCallbackHandler />
      </Suspense>
      <HomeContent />
    </>
  );
}