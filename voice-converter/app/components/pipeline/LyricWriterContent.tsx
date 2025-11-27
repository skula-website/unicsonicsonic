'use client';

import { useState, useEffect } from 'react';
import { getSavedLyrics } from '@/app/lib/lyricsStorage';

const STORAGE_KEYS = {
  RAW: 'lyrics_raw',
  FORMATTED: 'lyrics_formatted',
  FORMAT_TYPE: 'lyrics_format_type',
};

export default function LyricWriterContent() {
  const [rawLyrics, setRawLyrics] = useState('');
  const [formattedLyrics, setFormattedLyrics] = useState('');
  const [formatType, setFormatType] = useState<'apple' | 'spotify'>('apple');
  const [isFormatting, setIsFormatting] = useState(false);

  // Load saved lyrics on mount
  useEffect(() => {
    const saved = getSavedLyrics();
    if (saved) {
      if (saved.raw) setRawLyrics(saved.raw);
      if (saved.formatted) setFormattedLyrics(saved.formatted);
      if (saved.formatType) setFormatType(saved.formatType);
    }
  }, []);

  // Save raw lyrics to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && rawLyrics) {
      localStorage.setItem(STORAGE_KEYS.RAW, rawLyrics);
    }
  }, [rawLyrics]);

  // Save formatted lyrics to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && formattedLyrics) {
      localStorage.setItem(STORAGE_KEYS.FORMATTED, formattedLyrics);
      localStorage.setItem(STORAGE_KEYS.FORMAT_TYPE, formatType);
    }
  }, [formattedLyrics, formatType]);

  // Common section markers to remove (case-insensitive)
  // Patterns that match entire lines or start of lines
  const sectionMarkers = [
    /^\(verse\s*\d*\)$/i,
    /^\(chorus\)$/i,
    /^\(bridge\)$/i,
    /^\(intro\)$/i,
    /^\(outro\)$/i,
    /^\(pre-chorus\)$/i,
    /^\(prechorus\)$/i,
    /^\(post-chorus\)$/i,
    /^\(postchorus\)$/i,
    /^\[verse\s*\d*\]$/i,
    /^\[chorus\]$/i,
    /^\[bridge\]$/i,
    /^\[intro\]$/i,
    /^\[outro\]$/i,
    /^verse\s*\d*:?$/i,
    /^chorus:?$/i,
    /^bridge:?$/i,
    /^intro:?$/i,
    /^outro:?$/i,
    /^\(instrumental\)$/i,
    /^\(solo\)$/i,
    /^\(interlude\)$/i,
    // Spotify: Remove structure/artist labels like "(Verse - Charli XCX)"
    /^\([^)]*\s*-\s*[^)]+\)$/i,
  ];

  const cleanLine = (line: string, isSpotify: boolean = false): string => {
    let cleaned = line.trim();
    
    // Remove section markers from start of line (with optional colon/space after)
    cleaned = cleaned.replace(/^\(verse\s*\d*\)\s*:?\s*/i, '');
    cleaned = cleaned.replace(/^\(chorus\)\s*:?\s*/i, '');
    cleaned = cleaned.replace(/^\(bridge\)\s*:?\s*/i, '');
    cleaned = cleaned.replace(/^\(intro\)\s*:?\s*/i, '');
    cleaned = cleaned.replace(/^\(outro\)\s*:?\s*/i, '');
    cleaned = cleaned.replace(/^\[verse\s*\d*\]\s*:?\s*/i, '');
    cleaned = cleaned.replace(/^\[chorus\]\s*:?\s*/i, '');
    cleaned = cleaned.replace(/^\[bridge\]\s*:?\s*/i, '');
    cleaned = cleaned.replace(/^verse\s*\d*\s*:?\s*/i, '');
    cleaned = cleaned.replace(/^chorus\s*:?\s*/i, '');
    cleaned = cleaned.replace(/^bridge\s*:?\s*/i, '');
    
    // Spotify: Remove structure/artist labels like "(Verse - Charli XCX)"
    if (isSpotify) {
      cleaned = cleaned.replace(/^\([^)]*\s*-\s*[^)]+\)\s*:?\s*/i, '');
    }
    
    return cleaned;
  };

  const removeSectionMarkers = (line: string): boolean => {
    const trimmed = line.trim();
    // Check if the entire line matches a section marker (remove empty lines)
    return !sectionMarkers.some(marker => marker.test(trimmed));
  };

  // Capitalize first letter of a line (preserving existing capitalization)
  const capitalizeFirstLetter = (line: string): string => {
    if (line.length === 0) return line;
    const firstChar = line[0];
    // If already capitalized, keep it
    if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
      return line;
    }
    return firstChar.toUpperCase() + line.slice(1);
  };

  // Remove periods and commas from end of lines (keep !, ?, ")
  const cleanEndPunctuation = (line: string): string => {
    // Remove trailing periods and commas, but keep !, ?, and "
    return line.replace(/[.,]+$/, '');
  };

  // Remove multipliers and repeat markers - Spotify requires lines to be written out
  const removeRepeatMarkers = (line: string): string => {
    return line
      .replace(/\(repeat\s*x?\d+\)/gi, '')
      .replace(/\(repeat\s+\d+\s+times?\)/gi, '')
      .replace(/\[repeat\s*x?\d+\]/gi, '')
      // Spotify: Remove multipliers like "(X5)", "(x3)", etc.
      .replace(/\(x\d+\)/gi, '')
      .replace(/\(X\d+\)/gi, '')
      .replace(/\[x\d+\]/gi, '')
      .replace(/\[X\d+\]/gi, '')
      .trim();
  };

  // Remove sound effect descriptions (Spotify: don't transcribe non-vocal content)
  const removeSoundEffects = (line: string): string => {
    // Remove patterns like "*dial tone*", "*phone ringing*", etc.
    return line
      .replace(/\*[^*]+\*/g, '') // Remove *sound effect*
      .replace(/\[[^\]]+\]/g, (match) => {
        // Keep #INSTRUMENTAL tags, remove other bracketed content
        return match.toLowerCase().includes('instrumental') ? match : '';
      })
      .trim();
  };

  // Format a single line according to platform rules
  const formatLine = (line: string, isSpotify: boolean = false): string => {
    let formatted = cleanLine(line, isSpotify); // Remove section markers
    formatted = removeRepeatMarkers(formatted); // Remove repeat markers
    
    // Spotify: Remove sound effect descriptions
    if (isSpotify) {
      formatted = removeSoundEffects(formatted);
    }
    
    formatted = formatted.trim();
    
    if (formatted.length === 0) return '';
    
    formatted = cleanEndPunctuation(formatted); // Remove periods/commas from end
    formatted = capitalizeFirstLetter(formatted); // Capitalize first letter
    
    return formatted;
  };

  const formatForAppleMusic = (text: string): string => {
    // Apple Music requirements:
    // - Max 4000 characters
    // - Single-spaced lines, double space between stanzas
    // - First letter of each line capitalized
    // - No periods/commas at end of lines (only !, ?, ")
    // - Remove section markers like (verse), (chorus), etc.
    // - Remove "(Repeat xN)" patterns
    
    const originalLines = text.trim().split('\n');
    const formattedLines: string[] = [];
    
    for (let i = 0; i < originalLines.length; i++) {
      const originalLine = originalLines[i].trim();
      
      // Check if it's a section marker (remove it)
      if (sectionMarkers.some(marker => marker.test(originalLine))) {
        continue; // Skip section markers
      }
      
      // If empty line, preserve it as stanza break
      if (originalLine.length === 0) {
        // Only add empty line if previous line wasn't empty (avoid multiple empty lines)
        if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
          formattedLines.push('');
        }
        continue;
      }
      
      // Format the line (Apple Music)
      const formatted = formatLine(originalLine, false);
      if (formatted.length > 0) {
        formattedLines.push(formatted);
      }
    }

    // Join with single line breaks (empty lines = stanza breaks)
    const formatted = formattedLines.join('\n');
    return formatted.substring(0, 4000); // Apple Music limit
  };

  const formatForSpotify = (text: string): string => {
    // Spotify requirements:
    // - Max 5000 characters
    // - Line breaks preserved
    // - First letter of each line capitalized
    // - No periods/commas at end of lines
    // - Remove section markers like (verse), (chorus), etc.
    // - Remove multipliers (X5) - lines must be written out
    // - Remove structure/artist labels like "(Verse - Artist Name)"
    // - Remove sound effect descriptions like "*dial tone*"
    // - Keep #INSTRUMENTAL tags (if user added them)
    // - Keep vocalizations (ooh, ah, yeah, uh) - they're preserved by not removing them
    
    const originalLines = text.trim().split('\n');
    const formattedLines: string[] = [];
    
    for (let i = 0; i < originalLines.length; i++) {
      const originalLine = originalLines[i].trim();
      
      // Check if it's a section marker (remove it)
      if (sectionMarkers.some(marker => marker.test(originalLine))) {
        continue; // Skip section markers
      }
      
      // Keep #INSTRUMENTAL tags (Spotify requirement for 15+ seconds of instrumental)
      if (originalLine.toUpperCase().includes('#INSTRUMENTAL')) {
        formattedLines.push(originalLine);
        continue;
      }
      
      // If empty line, preserve it as stanza break
      if (originalLine.length === 0) {
        // Only add empty line if previous line wasn't empty (avoid multiple empty lines)
        if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
          formattedLines.push('');
        }
        continue;
      }
      
      // Format the line (Spotify-specific cleaning)
      const formatted = formatLine(originalLine, true);
      if (formatted.length > 0) {
        formattedLines.push(formatted);
      }
    }

    // Join with single line breaks
    const formatted = formattedLines.join('\n');
    return formatted.substring(0, 5000); // Spotify limit
  };

  const handleFormat = () => {
    if (!rawLyrics.trim()) {
      return;
    }

    setIsFormatting(true);
    
    // Simulate formatting (in future, this could be more sophisticated)
    setTimeout(() => {
      const formatted = formatType === 'apple' 
        ? formatForAppleMusic(rawLyrics)
        : formatForSpotify(rawLyrics);
      
      setFormattedLyrics(formatted);
      setIsFormatting(false);
    }, 300);
  };

  const handleCopy = () => {
    if (formattedLyrics) {
      navigator.clipboard.writeText(formattedLyrics);
      // Could add a toast notification here
    }
  };

  const characterCount = rawLyrics.length;
  const maxChars = formatType === 'apple' ? 4000 : 5000;
  const isOverLimit = characterCount > maxChars;

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Format Type Selector - Responsive */}
      <div className="flex gap-1.5 md:gap-2 mb-3 md:mb-4">
        <button
          onClick={() => setFormatType('apple')}
          className={`flex-1 px-2 py-1.5 md:px-4 md:py-2 rounded-lg font-medium text-xs md:text-sm transition-all ${
            formatType === 'apple'
              ? 'bg-blue-600 text-white border-2 border-blue-500'
              : 'bg-slate-700 text-gray-300 hover:bg-slate-600 border-2 border-slate-600'
          }`}
        >
          🍎 Apple Music
        </button>
        <button
          onClick={() => setFormatType('spotify')}
          className={`flex-1 px-2 py-1.5 md:px-4 md:py-2 rounded-lg font-medium text-xs md:text-sm transition-all ${
            formatType === 'spotify'
              ? 'bg-[#1DB954] text-white border-2 border-[#1ed760]'
              : 'bg-slate-700 text-gray-300 hover:bg-slate-600 border-2 border-slate-600'
          }`}
        >
          🎵 Spotify
        </button>
      </div>

      {/* Raw Lyrics Input */}
      <div>
        <div className="flex items-center justify-between mb-1.5 md:mb-2">
          <label className="text-xs md:text-sm font-bold text-white">Raw Lyrics Input</label>
          <span className={`text-xs ${isOverLimit ? 'text-red-400' : 'text-gray-400'}`}>
            {characterCount} / {maxChars} chars
          </span>
        </div>
        <textarea
          value={rawLyrics}
          onChange={(e) => setRawLyrics(e.target.value)}
          placeholder="Paste or type your lyrics here...&#10;&#10;Verse 1&#10;Line 1&#10;Line 2&#10;&#10;Chorus&#10;Line 1&#10;Line 2"
          className="w-full h-32 md:h-48 bg-slate-900 border-2 border-slate-600 rounded-lg p-2 md:p-3 text-white text-xs md:text-sm font-mono resize-none focus:outline-none focus:border-blue-500"
        />
        {isOverLimit && (
          <p className="text-xs text-red-400 mt-1">
            ⚠️ Exceeds {formatType === 'apple' ? 'Apple Music' : 'Spotify'} limit. Text will be truncated.
          </p>
        )}
      </div>

      {/* Format Button */}
      <button
        onClick={handleFormat}
        disabled={!rawLyrics.trim() || isFormatting}
        className={`w-full px-3 py-1.5 md:px-4 md:py-2 text-white rounded-lg font-medium text-xs md:text-sm disabled:bg-slate-600 disabled:cursor-not-allowed transition-all ${
          formatType === 'apple'
            ? 'bg-blue-600 hover:bg-blue-700 border-2 border-blue-500'
            : 'bg-[#1DB954] hover:bg-[#1ed760] border-2 border-[#1ed760]'
        }`}
      >
        {isFormatting ? 'Formatting...' : 'Format for ' + (formatType === 'apple' ? 'Apple Music' : 'Spotify')}
      </button>

      {/* Formatted Lyrics Output */}
      {formattedLyrics && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-white">Formatted Output</label>
            <button
              onClick={handleCopy}
              className="text-xs px-2 py-1 bg-slate-700 text-gray-300 rounded hover:bg-slate-600 transition-colors"
            >
              📋 Copy
            </button>
          </div>
          <div className="bg-slate-900 border-2 border-slate-600 rounded-lg p-3 min-h-48 max-h-64 overflow-y-auto">
            <pre className="text-white text-sm font-mono whitespace-pre-wrap">
              {formattedLyrics}
            </pre>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            ✓ Formatted for {formatType === 'apple' ? 'Apple Music' : 'Spotify'} ({formattedLyrics.length} chars)
          </p>
        </div>
      )}

      {/* Save Status */}
      {(rawLyrics || formattedLyrics) && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-2">
          <p className="text-xs text-green-200">
            💾 Saved - Available for genre detection, press release, and music review functions
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
        <p className="text-xs text-blue-200 mb-2">
          <strong>💡 Automatic Formatting:</strong>
        </p>
        <ul className="text-xs text-blue-200 space-y-1 ml-4 list-disc">
          <li>Removes section markers: (verse), (chorus), [bridge], etc.</li>
          <li>Capitalizes first letter of each line</li>
          <li>Removes periods and commas from end of lines (keeps !, ?, ")</li>
          <li>Preserves line breaks (single-spaced, double space between stanzas)</li>
          <li>Removes "(Repeat xN)" and multiplier patterns</li>
          {formatType === 'apple' ? (
            <li>Apple Music limit: 4000 characters</li>
          ) : (
            <>
              <li>Spotify limit: 5000 characters</li>
              <li>Removes structure/artist labels like "(Verse - Artist)"</li>
              <li>Removes sound effect descriptions like "*dial tone*"</li>
              <li>Keeps #INSTRUMENTAL tags (for 15+ sec instrumental sections)</li>
              <li>Preserves vocalizations (ooh, ah, yeah, uh)</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}

