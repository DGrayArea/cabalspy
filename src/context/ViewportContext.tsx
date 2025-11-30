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
  // Initialize with a check if we're on the client
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return false;
  });
  const [width, setWidth] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth;
    }
    return 0;
  });

  useEffect(() => {
    const checkViewport = () => {
      const w = window.innerWidth;
      setWidth(w);
      setIsDesktop(w >= 768); // md breakpoint
    };

    // Initial check (in case window size changed during SSR)
    checkViewport();

    // Listen for resize events
    window.addEventListener("resize", checkViewport);

    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  const value = {
    isDesktop,
    isMobile: !isDesktop,
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
