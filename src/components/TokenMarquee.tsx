"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TokenData } from "@/types/token";
import { formatCurrency, formatPercentCompact } from "@/utils/format";
import { TrendingUp, TrendingDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPlatformLogo, getPlatformIcon, getPlatformName } from "@/utils/platformLogos";
import { aiPlatformDetector } from "@/services/ai-platform-detector";

interface TokenMarqueeProps {
  tokens: TokenData[];
  speed?: "slow" | "normal" | "fast";
}

export function TokenMarquee({ tokens, speed = "normal" }: TokenMarqueeProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [platformLogoErrors, setPlatformLogoErrors] = useState<Set<string>>(new Set());

  // Drag state
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const dragMoved = useRef(false);

  // Duplicate tokens for seamless loop
  const duplicatedTokens = [...tokens, ...tokens];

  // Speed configuration
  const speedConfig = {
    slow: "120s",
    normal: "80s",
    fast: "50s",
  };

  const animationDuration = speedConfig[speed];

  // Inject marquee animation styles
  useEffect(() => {
    const styleId = "token-marquee-animation";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes tokenMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-no-select {
          user-select: none;
          -webkit-user-select: none;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const pauseAnimation = useCallback(() => {
    if (innerRef.current) innerRef.current.style.animationPlayState = "paused";
  }, []);

  const resumeAnimation = useCallback(() => {
    if (innerRef.current) innerRef.current.style.animationPlayState = "running";
  }, []);

  // Mouse drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    dragMoved.current = false;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    pauseAnimation();
    scrollRef.current.classList.add("marquee-no-select");
    scrollRef.current.style.cursor = "grabbing";
  }, [pauseAnimation]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // drag speed multiplier
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
    dragMoved.current = true;
  }, []);

  const onMouseUp = useCallback(() => {
    if (!scrollRef.current) return;
    isDragging.current = false;
    scrollRef.current.classList.remove("marquee-no-select");
    scrollRef.current.style.cursor = "grab";
    resumeAnimation();
  }, [resumeAnimation]);

  const onMouseLeave = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.classList.remove("marquee-no-select");
      scrollRef.current.style.cursor = "grab";
    }
    resumeAnimation();
  }, [resumeAnimation]);

  // Touch drag handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    dragMoved.current = false;
    startX.current = e.touches[0].pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    pauseAnimation();
  }, [pauseAnimation]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
    dragMoved.current = true;
  }, []);

  const onTouchEnd = useCallback(() => {
    isDragging.current = false;
    resumeAnimation();
  }, [resumeAnimation]);

  const handleImageError = (tokenId: string) => {
    setImageErrors((prev) => new Set(prev).add(tokenId));
  };

  const handlePlatformLogoError = (tokenId: string) => {
    setPlatformLogoErrors((prev) => new Set(prev).add(tokenId));
  };

  if (tokens.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full bg-panel/50 border-y border-gray-800/50 py-3 overflow-hidden">
      {/* Scrollable drag container — hidden scrollbar */}
      <div
        ref={scrollRef}
        className="overflow-x-scroll scrollbar-hide"
        style={{ cursor: "grab" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Animated inner strip */}
        <div
          ref={innerRef}
          className="flex gap-4 sm:gap-6"
          style={{
            animation: `tokenMarquee ${animationDuration} linear infinite`,
            willChange: "transform",
            width: "max-content",
          }}
          onMouseEnter={() => {
            if (!isDragging.current) pauseAnimation();
          }}
          onMouseLeave={() => {
            if (!isDragging.current) resumeAnimation();
          }}
        >
          {duplicatedTokens.map((token, index) => {
            const hasImageError = imageErrors.has(token.id);
            const priceChange =
              token.priceChange24h !== undefined
                ? token.priceChange24h
                : (token.percentages && token.percentages.length > 0
                  ? token.percentages[4] !== undefined
                    ? token.percentages[4]
                    : token.percentages.reduce((sum, p) => sum + p, 0) /
                      token.percentages.length
                  : 0);
            const isPositive = priceChange >= 0;

            const platform = aiPlatformDetector.detectPlatform({
              id: token.id,
              name: token.name,
              symbol: token.symbol,
              image: token.image,
              source: (token as any).source,
              protocol: (token as any).protocol,
              chain: token.chain,
              raydiumPool: (token as any).raydiumPool,
            });
            const platformLogo = getPlatformLogo(platform);
            const platformIcon = getPlatformIcon(platform);
            const platformName = getPlatformName(platform);
            const hasPlatformLogoError = platformLogoErrors.has(token.id);

            const tokenAddress = token.id.includes(":") ? token.id.split(":")[1] : token.id;
            const tokenChain = (token.chain || (token.id.includes(":") ? token.id.split(":")[0] : "solana")).toLowerCase();

            return (
              <Link
                key={`${token.id}-${index}`}
                href={`/${tokenChain}/${tokenAddress}`}
                className="flex items-center gap-3 px-4 py-2 bg-panel-elev/50 rounded-lg border border-gray-700/30 hover:border-primary/50 transition-all min-w-[240px] sm:min-w-[280px] shrink-0 cursor-pointer group"
                draggable={false}
                onClick={(e) => {
                  // Prevent navigation if the user was dragging
                  if (dragMoved.current) {
                    e.preventDefault();
                    dragMoved.current = false;
                  }
                }}
              >
                {/* Token Image/Icon */}
                {token.image && !hasImageError ? (
                  <div className="relative w-10 h-10 shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <Image
                        src={token.image}
                        alt={token.symbol}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(token.id)}
                        unoptimized
                        draggable={false}
                      />
                    </div>
                    {platformLogo && !hasPlatformLogoError ? (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-panel rounded-full border-2 border-panel flex items-center justify-center overflow-hidden">
                        <img
                          src={platformLogo}
                          alt={platformName}
                          className="w-full h-full object-cover"
                          onError={() => handlePlatformLogoError(token.id)}
                          loading="lazy"
                          draggable={false}
                        />
                      </div>
                    ) : (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-panel rounded-full border-2 border-panel flex items-center justify-center text-[8px]">
                        {platformIcon}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative w-10 h-10 shrink-0">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary/30 via-purple-500/20 to-green-500/30 flex items-center justify-center text-lg">
                      {token.icon || "🪙"}
                    </div>
                    {platformLogo && !hasPlatformLogoError ? (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-panel rounded-full border-2 border-panel flex items-center justify-center overflow-hidden">
                        <img
                          src={platformLogo}
                          alt={platformName}
                          className="w-full h-full object-cover"
                          onError={() => handlePlatformLogoError(token.id)}
                          loading="lazy"
                          draggable={false}
                        />
                      </div>
                    ) : (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-panel rounded-full border-2 border-panel flex items-center justify-center text-[8px]">
                        {platformIcon}
                      </div>
                    )}
                  </div>
                )}

                {/* Token Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white truncate">
                      {token.symbol}
                    </span>
                    <span className="text-xs text-gray-400 truncate">
                      {token.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-medium text-gray-300">
                      {formatCurrency(token.marketCap)}
                    </span>
                    <div
                      className={`flex items-center gap-0.5 text-xs font-semibold ${
                        isPositive ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{formatPercentCompact(Math.abs(priceChange), false)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
