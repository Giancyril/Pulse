import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number with comma separators */
export function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n);
}

/** Format milliseconds to human-readable e.g. "42 ms" or "1.2 s" */
export function formatDuration(ms: number) {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}
