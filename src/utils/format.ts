/**
 * Formatting utilities for numbers and currency
 */

/**
 * Format a number as currency (USD)
 * @param value Number to format
 * @returns Formatted string (e.g., "$1.23B", "$456.78M", "$12.34K")
 */
export function formatCurrency(value: number): string {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`;
  }
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

/**
 * Format a number with appropriate suffix
 * @param value Number to format
 * @returns Formatted string (e.g., "1.23M", "456.78K", "12.34")
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

