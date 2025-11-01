'use client';

import { useState } from 'react';
import { TokenRowProps } from '@/types/token';
import TradingPanel from './TradingPanel';
import { 
  Link, 
  Search, 
  User, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  ExternalLink
} from 'lucide-react';

export default function TokenRow({ token }: TokenRowProps) {
  const [showTradingPanel, setShowTradingPanel] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage > 0) return 'bg-green-500';
    if (percentage < 0) return 'bg-red-500';
    return 'bg-gray-500';
  };

  return (
    <div className="bg-panel-elev rounded-lg p-3 sm:p-4 hover:brightness-110 transition-colors">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Left Section - Token Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {token.image && !imageError ? (
            <img 
              src={token.image} 
              alt={token.symbol} 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 object-cover" 
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="text-xl sm:text-2xl flex-shrink-0">{token.icon}</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-xs sm:text-sm truncate">{token.name}</div>
            <div className="text-xs text-muted">{token.time}</div>
          </div>
        </div>

        {/* Activity Icons - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1 text-muted flex-shrink-0">
          <Link className="w-3 h-3" />
          <Search className="w-3 h-3" />
          <User className="w-3 h-3" />
          <BarChart3 className="w-3 h-3" />
          <TrendingUp className="w-3 h-3" />
          <TrendingDown className="w-3 h-3" />
          <span className="text-xs ml-1">
            Q {token.activity.Q} {token.activity.views} {token.activity.holders} {token.activity.trades}
          </span>
        </div>
      </div>

      {/* Middle Section - Financial Metrics */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs">
        <div>
          <div className="text-muted">MC</div>
          <div className="font-semibold">{formatCurrency(token.marketCap)}</div>
        </div>
        <div>
          <div className="text-muted">V</div>
          <div className="font-semibold">{formatCurrency(token.volume)}</div>
        </div>
        <div>
          <div className="text-muted">F</div>
          <div className="font-semibold">{token.fee.toFixed(3)}</div>
        </div>
        <div>
          <div className="text-muted">TX</div>
          <div className="font-semibold">{token.transactions}</div>
        </div>
      </div>

      {/* Percentage Indicators */}
      <div className="mt-3 flex items-center gap-1">
        {token.percentages.map((percentage, index) => (
          <div
            key={index}
            className={`w-4 h-2 rounded ${getPercentageColor(percentage)}`}
            title={`${percentage}%`}
          />
        ))}
        {token.percentages.some(p => p > 0) && (
          <span className="text-xs text-green-400 ml-2">Paid</span>
        )}
      </div>

      {/* Right Section - Action Button */}
      <div className="mt-3 flex justify-end">
        <button 
          onClick={() => setShowTradingPanel(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="truncate">{token.price} SOL</span>
        </button>
      </div>

      {/* Trading Panel Modal */}
      {showTradingPanel && (
        <TradingPanel 
          token={token} 
          onClose={() => setShowTradingPanel(false)} 
        />
      )}
    </div>
  );
}
