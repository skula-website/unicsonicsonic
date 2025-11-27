/**
 * Simple lyrics storage utility
 * Used to store and retrieve lyrics for use in other pipeline functions
 * (genre detection, press release, music review, etc.)
 */

const STORAGE_KEYS = {
  RAW: 'lyrics_raw',
  FORMATTED: 'lyrics_formatted',
  FORMAT_TYPE: 'lyrics_format_type',
};

export interface LyricsData {
  raw: string;
  formatted: string;
  formatType: 'apple' | 'spotify' | null;
}

/**
 * Get saved lyrics from localStorage
 * @returns LyricsData object with raw, formatted, and formatType, or null if nothing saved
 */
export function getSavedLyrics(): LyricsData | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(STORAGE_KEYS.RAW);
  const formatted = localStorage.getItem(STORAGE_KEYS.FORMATTED);
  const formatType = localStorage.getItem(STORAGE_KEYS.FORMAT_TYPE) as 'apple' | 'spotify' | null;

  if (!raw && !formatted) return null;

  return {
    raw: raw || '',
    formatted: formatted || '',
    formatType: formatType || null,
  };
}

/**
 * Check if lyrics are saved
 * @returns true if any lyrics are saved
 */
export function hasSavedLyrics(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(STORAGE_KEYS.RAW);
  const formatted = localStorage.getItem(STORAGE_KEYS.FORMATTED);
  return !!(raw || formatted);
}

/**
 * Clear saved lyrics
 */
export function clearSavedLyrics(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.RAW);
  localStorage.removeItem(STORAGE_KEYS.FORMATTED);
  localStorage.removeItem(STORAGE_KEYS.FORMAT_TYPE);
}

