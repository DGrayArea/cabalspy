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
import { pumpFunService } from "@/services/pumpfun";

interface TokenChartProps {
  mintAddress: string;
  tokenSymbol: string;
  isPumpFun?: boolean;
  createdTimestamp?: number;
}

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "6h" | "12h" | "24h";
type ChartType = "candlestick" | "line";

export function TokenChart({
  mintAddress,
  tokenSymbol,
  isPumpFun = false,
  createdTimestamp,
}: TokenChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick" | "Line"> | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [currency, setCurrency] = useState<"USD" | "SOL">("USD");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
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
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        // Custom price formatter to handle small decimal values
        autoScale: true,
      },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Create initial series based on chart type
    const initialSeries =
      chartType === "candlestick"
        ? chart.addSeries(CandlestickSeries, {
            upColor: "#10b981", // green
            downColor: "#ef4444", // red
            borderVisible: false,
            wickUpColor: "#10b981",
            wickDownColor: "#ef4444",
            priceFormat: {
              type: "price",
              precision: 8, // Show up to 8 decimal places for small values
              minMove: 0.00000001, // Minimum price movement
            },
          } as CandlestickSeriesOptions)
        : chart.addSeries(LineSeries, {
            color: "#3b82f6", // blue
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
            priceFormat: {
              type: "price",
              precision: 8, // Show up to 8 decimal places for small values
              minMove: 0.00000001, // Minimum price movement
            },
          } as LineSeriesOptions);

    chartRef.current = chart;
    seriesRef.current = initialSeries;

    const container = chartContainerRef.current;
    if (!container) return;

    // Handle resize using ResizeObserver for better performance
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (chart && width > 0 && height > 0) {
          chart.applyOptions({
            width: width,
            height: height,
          });
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [chartType]);

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
        if (chartType === "candlestick") {
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
          (seriesRef.current as ISeriesApi<"Candlestick">).setData(chartData);
        } else {
          // Line chart uses close prices
          const chartData: LineData<Time>[] = candles.map((candle) => {
            const timestamp =
              candle.timestamp > 1e12
                ? Math.floor(candle.timestamp / 1000)
                : candle.timestamp;

            return {
              time: timestamp as Time,
              value: parseFloat(candle.close),
            };
          });
          (seriesRef.current as ISeriesApi<"Line">).setData(chartData);
        }

        if (chartRef.current && seriesRef.current) {
          // Auto-scale to fit data properly
          chartRef.current.timeScale().fitContent();

          // Update price scale to handle small values properly
          const priceScale = chartRef.current.priceScale("right");
          priceScale.applyOptions({
            autoScale: true,
            scaleMargins: {
              top: 0.1,
              bottom: 0.1,
            },
          });

          // Update series price format to show proper decimals for small values
          seriesRef.current.applyOptions({
            priceFormat: {
              type: "price",
              precision: 8, // Show up to 8 decimal places
              minMove: 0.00000001, // Minimum price movement (1e-8)
            },
          });
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch chart data:", err);
        setError("Failed to load chart data");
        setLoading(false);
      }
    };

    fetchChartData();
  }, [
    mintAddress,
    timeframe,
    currency,
    chartType,
    isPumpFun,
    createdTimestamp,
  ]);

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
    <div
      className="h-full w-full flex flex-col"
      style={{ height: "100%", width: "100%" }}
    >
      {/* Chart Title and Controls */}
      <div className="mb-2 sm:mb-4 flex-shrink-0">
        <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-1.5 sm:mb-3">
          {tokenSymbol}/{currency === "USD" ? "SOL" : "SOL"} Market Cap (
          {currency})
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2">
          {/* Chart Type and Timeframe - Horizontal scrollable on mobile */}
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
            {/* Timeframe - Scrollable on mobile */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                Timeframe:
              </span>
              <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0">
                {(
                  [
                    "1m",
                    "5m",
                    "15m",
                    "1h",
                    "4h",
                    "6h",
                    "12h",
                    "24h",
                  ] as Timeframe[]
                ).map((tf) => (
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
          {/* Currency - Full width on mobile, inline on desktop */}
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              Currency:
            </span>
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
        style={{
          flex: "1 1 auto",
          minHeight: "200px",
          width: "100%",
        }}
      >
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
