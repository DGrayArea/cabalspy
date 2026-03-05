/**
 * Formatting utilities for numbers and currency
 */

/**
 * Format a small number to show the last valid decimal place
 * Examples: 0.0053 -> 0.005, 0.0000027 -> 0.000002, 0.00000001 -> 0.00000001
 * @param value Number to format
 * @returns Formatted string with appropriate decimal places
 */
function formatSmallNumber(value: number): string {
  if (value === 0) return "0";
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1) {
    return value.toFixed(2);
  }
  
  // For very small numbers, show more precision
  if (absValue < 0.000001) {
    // Use scientific notation for extremely small numbers or show up to 10 decimals
    const str = absValue.toFixed(10);
    // Remove trailing zeros
    const trimmed = str.replace(/\.?0+$/, '');
    return value < 0 ? `-${trimmed}` : trimmed;
  }
  
  // Convert to string with high precision to avoid scientific notation
  const str = absValue.toFixed(20);
  const decimalIndex = str.indexOf('.');
  
  if (decimalIndex === -1) {
    return value.toFixed(2);
  }
  
  // Find first non-zero digit after decimal
  let firstNonZero = -1;
  for (let i = decimalIndex + 1; i < str.length; i++) {
    if (str[i] !== '0' && str[i] !== 'e') {
      firstNonZero = i;
      break;
    }
  }
  
  if (firstNonZero === -1) {
    return "0";
  }
  
  // Count zeros before first non-zero digit
  const zerosBeforeFirstNonZero = firstNonZero - decimalIndex - 1;
  
  // Show the first non-zero digit and 2 more digits after it for better precision
  // Examples: 0.0053 -> 0.0053 (4 decimals), 0.0000027 -> 0.0000027 (7 decimals)
  // Total decimal places = zeros before + 3 digits (first non-zero + 2 more)
  const totalDecimalPlaces = Math.min(zerosBeforeFirstNonZero + 3, 10);
  
  // Truncate (not round) to the desired decimal places
  const multiplier = Math.pow(10, totalDecimalPlaces);
  const truncated = Math.floor(absValue * multiplier) / multiplier;
  const formatted = (value < 0 ? -truncated : truncated).toFixed(totalDecimalPlaces);
  
  // Remove trailing zeros
  return formatted.replace(/\.?0+$/, '');
}

/**
 * Format a number as currency (USD)
 * @param value Number to format
 * @returns Formatted string (e.g., "$1.23T", "$1.23B", "$456.78M", "$12.34K", "$0.005")
 */
export function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  
  if (absValue >= 1000000000000) {
    return `${sign}$${(absValue / 1000000000000).toFixed(2)}T`;
  }
  if (absValue >= 1000000000) {
    return `${sign}$${(absValue / 1000000000).toFixed(2)}B`;
  }
  if (absValue >= 1000000) {
    return `${sign}$${(absValue / 1000000).toFixed(2)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(2)}K`;
  }
  if (absValue >= 1) {
    return `${sign}$${absValue.toFixed(2)}`;
  }
  // For values less than 1, use smart decimal formatting
  return `${sign}$${formatSmallNumber(absValue)}`;
}

/**
 * Format a number with appropriate suffix (K, M, B, T)
 * @param value Number to format
 * @returns Formatted string (e.g., "1.23T", "456.78B", "12.34M", "1.23K", "12.34")
 */
export function formatNumber(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  
  if (absValue >= 1000000000000) {
    return `${sign}${(absValue / 1000000000000).toFixed(2)}T`;
  }
  if (absValue >= 1000000000) {
    return `${sign}${(absValue / 1000000000).toFixed(2)}B`;
  }
  if (absValue >= 1000000) {
    return `${sign}${(absValue / 1000000).toFixed(2)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}${(absValue / 1000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

/**
 * Format a percentage with appropriate suffix for large values
 * @param value Percentage value (e.g., 150 for 150%)
 * @param showSign Whether to show + for positive values
 * @returns Formatted string (e.g., "+150.00%", "-12.34%", "+1.23M%")
 */
export function formatPercent(value: number, showSign: boolean = true): string {
  const absValue = Math.abs(value);
  const sign = value >= 0 ? (showSign ? "+" : "") : "-";
  
  if (absValue >= 1000000000000) {
    return `${sign}${(absValue / 1000000000000).toFixed(2)}T%`;
  }
  if (absValue >= 1000000000) {
    return `${sign}${(absValue / 1000000000).toFixed(2)}B%`;
  }
  if (absValue >= 1000000) {
    return `${sign}${(absValue / 1000000).toFixed(2)}M%`;
  }
  if (absValue >= 10000) {
    return `${sign}${(absValue / 1000).toFixed(2)}K%`;
  }
  return `${sign}${absValue.toFixed(2)}%`;
}

/**
 * Format a compact percentage (shorter format for small spaces)
 * @param value Percentage value
 * @param showSign Whether to show + for positive values
 * @returns Formatted string with 1 decimal for compact display
 */
export function formatPercentCompact(value: number, showSign: boolean = true): string {
  const absValue = Math.abs(value);
  const sign = value >= 0 ? (showSign ? "+" : "") : "-";
  
  if (absValue >= 1000000000000) {
    return `${sign}${(absValue / 1000000000000).toFixed(1)}T%`;
  }
  if (absValue >= 1000000000) {
    return `${sign}${(absValue / 1000000000).toFixed(1)}B%`;
  }
  if (absValue >= 1000000) {
    return `${sign}${(absValue / 1000000).toFixed(1)}M%`;
  }
  if (absValue >= 10000) {
    return `${sign}${(absValue / 1000).toFixed(1)}K%`;
  }
  if (absValue >= 1000) {
    return `${sign}${(absValue / 1000).toFixed(2)}K%`;
  }
  return `${sign}${absValue.toFixed(1)}%`;
}

