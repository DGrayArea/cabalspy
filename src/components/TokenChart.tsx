"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  CandlestickSeries,
} from "lightweight-charts";
import type { CandlestickSeriesOptions } from "lightweight-charts";
import { pumpFunService } from "@/services/pumpfun";

interface TokenChartProps {
  mintAddress: string;
  tokenSymbol: string;
  isPumpFun?: boolean;
  createdTimestamp?: number;
}

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export function TokenChart({
  mintAddress,
  tokenSymbol,
  isPumpFun = false,
  createdTimestamp,
}: TokenChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [currency, setCurrency] = useState<"USD" | "SOL">("USD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart with dark theme
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
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: "#374151",
        textColor: "#9ca3af",
      },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Create candlestick series (v5.0+ API uses addSeries with CandlestickSeries)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981", // green
      downColor: "#ef4444", // red
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    } as CandlestickSeriesOptions);

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // Fetch and update chart data
  useEffect(() => {
    if (!isPumpFun || !chartRef.current || !seriesRef.current) {
      setLoading(false);
      return;
    }

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

        if (candles.length === 0) {
          setError("No chart data available for this token");
          setLoading(false);
          return;
        }

        // Convert candles to lightweight-charts format
        // lightweight-charts expects timestamp in seconds (not milliseconds)
        const chartData: CandlestickData<Time>[] = candles.map((candle) => {
          // Handle both milliseconds and seconds timestamps
          const timestamp =
            candle.timestamp > 1e12
              ? Math.floor(candle.timestamp / 1000) // Convert ms to seconds
              : candle.timestamp;

          return {
            time: timestamp as Time,
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
          };
        });

        // Update chart
        seriesRef.current.setData(chartData);
        chartRef.current.timeScale().fitContent();

        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch chart data:", err);
        setError("Failed to load chart data");
        setLoading(false);
      }
    };

    fetchChartData();
  }, [mintAddress, timeframe, currency, isPumpFun, createdTimestamp]);

  if (!isPumpFun) {
    return (
      <div className="h-full flex items-center justify-center bg-panel-elev rounded-lg border border-gray-800/50">
        <div className="text-center text-gray-400">
          <p className="text-sm">Chart available for pump.fun tokens only</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chart Title and Controls */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-3">
          {tokenSymbol}/{currency === "USD" ? "SOL" : "SOL"} Market Cap (
          {currency})
        </h3>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Timeframe:</span>
            <div className="flex gap-1">
              {(["1m", "5m", "15m", "1h", "4h", "1d"] as Timeframe[]).map(
                (tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      timeframe === tf
                        ? "bg-primary text-white"
                        : "bg-panel-elev text-gray-400 hover:text-white"
                    }`}
                  >
                    {tf}
                  </button>
                )
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Currency:</span>
            <div className="flex gap-1">
              {(["USD", "SOL"] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
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
      <div className="flex-1 relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-panel-elev/80 z-10 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-gray-400">Loading chart data...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-panel-elev/80 z-10 rounded-lg">
            <div className="text-center text-gray-400">
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
