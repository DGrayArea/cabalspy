import { useEffect, useState, useRef } from "react";

/**
 * Custom hook to trigger a background flash animation when a value changes.
 * Used to make the UI feel real-time and alive when WebSockets update token data.
 * 
 * @param value The value to watch (e.g., price, volume)
 * @param threshold Only flash if the change is significant (optional)
 * @returns 'flash-up' | 'flash-down' | '' — apply this class to the element
 */
export function useFlashOnUpdate(value: number, threshold = 0) {
  const [flashClass, setFlashClass] = useState<"flash-up" | "flash-down" | "">("");
  const prevValueRef = useRef<number>(value);

  useEffect(() => {
    const prevValue = prevValueRef.current;
    
    // Ignore initial mount
    if (prevValue === undefined) {
      prevValueRef.current = value;
      return;
    }

    const difference = value - prevValue;
    
    // Only flash if the difference exceeds the threshold
    if (Math.abs(difference) > threshold) {
      if (difference > 0) {
        setFlashClass("flash-up");
      } else {
        setFlashClass("flash-down");
      }
      
      // Remove class after animation completes (adjust to match CSS duration)
      const timeout = setTimeout(() => {
        setFlashClass("");
      }, 1000); // 1s animation
      
      prevValueRef.current = value;
      return () => clearTimeout(timeout);
    }
  }, [value, threshold]);

  return flashClass;
}
