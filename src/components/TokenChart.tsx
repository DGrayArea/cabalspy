"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  Time,
  CandlestickSeries,
  LineSeries,
} from "lightweight-charts";
import type {
  CandlestickSeriesOptions,
  LineSeriesOptions,
} from "lightweight-charts";
import { ExternalLink, Loader2 } from "lucide-react";
import { pumpFunService } from "@/services/pumpfun";

interface TokenChartProps {
  mintAddress: string;
  tokenSymbol: string;
  isPumpFun?: boolean;
  createdTimestamp?: number;
  chainId?: string;
  isMigrated?: boolean;
  /** Best pair address from DexScreener (preferred for iframe embed accuracy) */
  pairAddress?: string;
  /** GeckoTerminal pair address (fallback if DexScreener chart fails) */
  geckoTerminalPairAddress?: string;
}

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "6h" | "12h" | "24h";
type ChartType = "candlestick" | "line";
type IframeSource = "dexscreener" | "geckoterminal";

export function TokenChart({
  mintAddress,
  tokenSymbol,
  isPumpFun = false,
  createdTimestamp,
  chainId = "solana",
  isMigrated = false,
  pairAddress,
  geckoTerminalPairAddress,
}: TokenChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick" | "Line"> | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [currency, setCurrency] = useState<"USD" | "SOL">("USD");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeSource, setIframeSource] = useState<IframeSource>("dexscreener");

  // Use native chart ONLY for active (not-yet-migrated) pump.fun tokens
  const useNativeChart = isPumpFun && !isMigrated;

  // Normalised chain string for DexScreener
  const dexChain =
    chainId === "sol" || chainId === "solana" ? "solana" : chainId;

  // Prefer pairAddress for embed accuracy; fall back to mintAddress
  const dexEmbedId = pairAddress || mintAddress;
  const dexEmbedUrl = `https://dexscreener.com/${dexChain}/${dexEmbedId}?embed=1&theme=dark&trades=0&info=0`;
  const dexPublicUrl = `https://dexscreener.com/${dexChain}/${dexEmbedId}`;

  // GeckoTerminal embed — map chain
  const geckoNetwork =
    chainId === "sol" || chainId === "solana"
      ? "solana"
      : chainId === "bsc"
      ? "bsc"
      : "solana";
  const geckoEmbedId = geckoTerminalPairAddress || mintAddress;
  const geckoEmbedUrl = `https://www.geckoterminal.com/${geckoNetwork}/pools/${geckoEmbedId}?embed=1&footer=0&info=0&swaps=0&grayscale=0&light_chart=0`;
  const geckoPublicUrl = `https://www.geckoterminal.com/${geckoNetwork}/pools/${geckoEmbedId}`;

  // ── Iframe chart (non-native) ───────────────────────────────────────────────
  if (!useNativeChart) {
    const isGecko = iframeSource === "geckoterminal";
    const embedUrl = isGecko ? geckoEmbedUrl : dexEmbedUrl;
    const publicUrl = isGecko ? geckoPublicUrl : dexPublicUrl;
    const sourceLabel = isGecko ? "GeckoTerminal" : "DexScreener";

    return (
      <div className="h-full w-full flex flex-col gap-2">
        {/* Header row */}
        <div className="flex-shrink-0 flex items-center justify-between flex-wrap gap-2">
          {/* Source switcher */}
          <div className="flex gap-1 bg-panel-elev rounded-lg p-1">
            <button
              onClick={() => setIframeSource("dexscreener")}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                !isGecko
                  ? "bg-primary text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              DexScreener
            </button>
            <button
              onClick={() => setIframeSource("geckoterminal")}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                isGecko
                  ? "bg-primary text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              GeckoTerminal
            </button>
          </div>

          {/* Open external link */}
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Open on {sourceLabel} <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Embed */}
        <div className="flex-1 min-h-[300px] w-full bg-panel-elev rounded-lg overflow-hidden border border-gray-800/50">
          <iframe
            key={embedUrl} // re-mount when source changes
            src={embedUrl}
            className="w-full h-full border-none"
            title={`${tokenSymbol} Chart — ${sourceLabel}`}
            allow="clipboard-write"
          />
        </div>
      </div>
    );
  }

  // ── Native lightweight-charts (active pump.fun only) ───────────────────────
  return (
    <div className="h-full w-full flex flex-col" style={{ height: "100%", width: "100%" }}>
      {/* Chart Title and Controls */}
      <div className="mb-2 sm:mb-4 flex-shrink-0">
        <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-1.5 sm:mb-3">
          {tokenSymbol}/{currency === "USD" ? "SOL" : "SOL"} Market Cap ({currency})
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2">
          {/* Chart Type and Timeframe */}
          <div className="flex items-center gap-2 sm:gap-2 min-w-0 flex-1">
            {/* Chart Type Toggle */}
            <div className="flex gap-1 sm:mr-2 sm:border-r sm:border-gray-800/50 sm:pr-2 flex-shrink-0">
              <button
                onClick={() => setChartType("candlestick")}
                className={`px-2 py-1.5 sm:px-2 sm:py-1 text-xs rounded transition-colors touch-manipulation ${
                  chartType === "candlestick"
                    ? "bg-primary text-white"
                    : "bg-panel-elev text-gray-400 hover:text-white"
                }`}
                title="Candlestick Chart"
              >
                📊
              </button>
              <button
                onClick={() => setChartType("line")}
                className={`px-2 py-1.5 sm:px-2 sm:py-1 text-xs rounded transition-colors touch-manipulation ${
                  chartType === "line"
                    ? "bg-primary text-white"
                    : "bg-panel-elev text-gray-400 hover:text-white"
                }`}
                title="Line Chart"
              >
                📈
              </button>
            </div>

            {/* Timeframe */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                Timeframe:
              </span>
              <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0">
                {(["1m", "5m", "15m", "1h", "4h", "6h", "12h", "24h"] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2.5 py-1.5 sm:px-2 sm:py-1 text-xs rounded transition-colors touch-manipulation whitespace-nowrap flex-shrink-0 ${
                      timeframe === tf
                        ? "bg-primary text-white"
                        : "bg-panel-elev text-gray-400 hover:text-white"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Currency */}
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            <span className="text-xs text-gray-400 whitespace-nowrap">Currency:</span>
            <div className="flex gap-1">
              {(["USD", "SOL"] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`px-2.5 py-1.5 sm:px-2 sm:py-1 text-xs rounded transition-colors touch-manipulation ${
                    currency === curr
                      ? "bg-primary text-white"
                      : "bg-panel-elev text-gray-400 hover:text-white"
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div
        className="relative overflow-hidden flex-1"
        style={{ flex: "1 1 auto", minHeight: "200px", width: "100%" }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-panel-elev/80 z-10 rounded-lg">
            <div className="text-center">
              <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-gray-400">Loading chart data...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-panel-elev/80 z-10 rounded-lg">
            <div className="text-center text-gray-400">
              <p className="text-sm mb-3">{error}</p>
              {/* Offer DexScreener fallback even for pump.fun if native chart fails */}
              <a
                href={dexPublicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 justify-center"
              >
                View on DexScreener <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      {/* Hidden useEffects — must be inside function body */}
      <NativeChartEffects
        chartContainerRef={chartContainerRef}
        chartRef={chartRef}
        seriesRef={seriesRef}
        chartType={chartType}
        mintAddress={mintAddress}
        timeframe={timeframe}
        currency={currency}
        isPumpFun={isPumpFun}
        createdTimestamp={createdTimestamp}
        setLoading={setLoading}
        setError={setError}
      />
    </div>
  );
}

// ── Extracted effects sub-component to keep JSX readable ──────────────────────
function NativeChartEffects({
  chartContainerRef,
  chartRef,
  seriesRef,
  chartType,
  mintAddress,
  timeframe,
  currency,
  isPumpFun,
  createdTimestamp,
  setLoading,
  setError,
}: {
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  chartRef: React.MutableRefObject<IChartApi | null>;
  seriesRef: React.MutableRefObject<ISeriesApi<"Candlestick" | "Line"> | null>;
  chartType: ChartType;
  mintAddress: string;
  timeframe: Timeframe;
  currency: "USD" | "SOL";
  isPumpFun: boolean;
  createdTimestamp?: number;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
}) {
  // Initialize chart instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      crosshair: { mode: 0 },
      rightPriceScale: {
        borderColor: "#374151",
        textColor: "#9ca3af",
        scaleMargins: { top: 0.1, bottom: 0.1 },
        autoScale: true,
      },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series =
      chartType === "candlestick"
        ? chart.addSeries(CandlestickSeries, {
            upColor: "#10b981",
            downColor: "#ef4444",
            borderVisible: false,
            wickUpColor: "#10b981",
            wickDownColor: "#ef4444",
            priceFormat: { type: "price", precision: 8, minMove: 0.00000001 },
          } as CandlestickSeriesOptions)
        : chart.addSeries(LineSeries, {
            color: "#3b82f6",
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
            priceFormat: { type: "price", precision: 8, minMove: 0.00000001 },
          } as LineSeriesOptions);

    chartRef.current = chart;
    seriesRef.current = series;

    const container = chartContainerRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (chart && width > 0 && height > 0) {
          chart.applyOptions({ width, height });
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [chartType]);

  // Fetch candle data
  useEffect(() => {
    if (!isPumpFun || !chartRef.current || !seriesRef.current) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);

        const candles = await pumpFunService.fetchTokenCandles(
          mintAddress,
          timeframe,
          1000,
          currency,
          createdTimestamp
        );

        if (cancelled) return;

        if (candles.length === 0) {
          setError("No chart data available for this token");
          setLoading(false);
          return;
        }

        if (chartType === "candlestick") {
          const chartData: CandlestickData<Time>[] = candles.map((c) => ({
            time: (c.timestamp > 1e12 ? Math.floor(c.timestamp / 1000) : c.timestamp) as Time,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
          }));
          (seriesRef.current as ISeriesApi<"Candlestick">).setData(chartData);
        } else {
          const chartData: LineData<Time>[] = candles.map((c) => ({
            time: (c.timestamp > 1e12 ? Math.floor(c.timestamp / 1000) : c.timestamp) as Time,
            value: parseFloat(c.close),
          }));
          (seriesRef.current as ISeriesApi<"Line">).setData(chartData);
        }

        if (chartRef.current && seriesRef.current) {
          chartRef.current.timeScale().fitContent();
          chartRef.current.priceScale("right").applyOptions({
            autoScale: true,
            scaleMargins: { top: 0.1, bottom: 0.1 },
          });
          seriesRef.current.applyOptions({
            priceFormat: { type: "price", precision: 8, minMove: 0.00000001 },
          });
        }

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch chart data:", err);
        setError("Failed to load chart data");
        setLoading(false);
      }
    };

    fetchChartData();
    return () => { cancelled = true; };
  }, [mintAddress, timeframe, currency, chartType, isPumpFun, createdTimestamp]);

  return null;
}
