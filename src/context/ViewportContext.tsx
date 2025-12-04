"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface ViewportContextType {
  isDesktop: boolean;
  isMobile: boolean;
  width: number;
}

const ViewportContext = createContext<ViewportContextType | undefined>(
  undefined
);

export function ViewportProvider({ children }: { children: ReactNode }) {
  // Initialize with null to indicate "not yet determined" state
  // This prevents hydration mismatch and flash of wrong content
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const checkViewport = () => {
      const w = window.innerWidth;
      setWidth(w);
      // Use 1024px (lg breakpoint) for better desktop detection
      // 768px (md) is often tablet territory
      setIsDesktop(w >= 1024);
    };

    // Initial check
    checkViewport();

    // Listen for resize events
    window.addEventListener("resize", checkViewport);

    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  // During SSR or before hydration, default to desktop view to avoid flash
  const resolvedIsDesktop = isDesktop === null ? true : isDesktop;

  const value = {
    isDesktop: resolvedIsDesktop,
    isMobile: !resolvedIsDesktop,
    width,
  };

  return (
    <ViewportContext.Provider value={value}>
      {children}
    </ViewportContext.Provider>
  );
}

export function useViewport() {
  const context = useContext(ViewportContext);
  if (context === undefined) {
    throw new Error("useViewport must be used within a ViewportProvider");
  }
  return context;
}
