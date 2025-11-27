/**
 * Filename utilities for safe file handling in pipeline
 */

/**
 * Normalize filename for safe use in file system
 * Removes spaces, special characters, and ensures safe file names
 * Format: prefix_timestamp_(originalname).ext
 * 
 * @param originalFilename Original filename from user
 * @param prefix Optional prefix (e.g., 'input', 'cleaned', 'converted')
 * @param timestamp Optional timestamp to make unique
 * @returns Normalized filename safe for file system with original name in parentheses
 */
export function normalizeFilename(
  originalFilename: string,
  prefix?: string,
  timestamp?: number
): string {
  // Extract extension
  const lastDot = originalFilename.lastIndexOf('.');
  const nameWithoutExt = lastDot > 0 
    ? originalFilename.substring(0, lastDot)
    : originalFilename;
  const extension = lastDot > 0 
    ? originalFilename.substring(lastDot)
    : '';
  
  // Normalize original name: remove spaces, special chars, keep only alphanumeric, dash, underscore
  const normalizedOriginal = nameWithoutExt
    .replace(/\s+/g, '_')  // Replace spaces with underscore
    .replace(/[^a-zA-Z0-9_-]/g, '')  // Remove special characters
    .substring(0, 50);  // Limit length
  
  // Build final filename: prefix_timestamp_(originalname).ext
  const parts: string[] = [];
  if (prefix) parts.push(prefix);
  if (timestamp) parts.push(timestamp.toString());
  parts.push(`(${normalizedOriginal})`);
  
  return parts.join('_') + extension.toLowerCase();
}

/**
 * Generate display filename for user (keeps original name visible)
 * Format: prefix_(originalname).ext
 */
export function generateDisplayFilename(
  originalFilename: string,
  prefix: string
): string {
  const lastDot = originalFilename.lastIndexOf('.');
  const nameWithoutExt = lastDot > 0 
    ? originalFilename.substring(0, lastDot)
    : originalFilename;
  const extension = lastDot > 0 
    ? originalFilename.substring(lastDot)
    : '';
  
  return `${prefix}_(${nameWithoutExt})${extension}`;
}

/**
 * Store original filename for later use
 * This allows us to restore original filename when downloading
 */
export interface FileMetadata {
  originalFilename: string;
  normalizedFilename: string;
  timestamp: number;
}

/**
 * Create file metadata for tracking original filename
 */
export function createFileMetadata(
  originalFilename: string,
  normalizedFilename: string
): FileMetadata {
  return {
    originalFilename,
    normalizedFilename,
    timestamp: Date.now(),
  };
}

/**
 * Generate download filename with original name restored
 * Adds suffix to indicate processing (e.g., '_cleaned', '_converted')
 */
export function generateDownloadFilename(
  originalFilename: string,
  suffix: string = '_processed'
): string {
  const lastDot = originalFilename.lastIndexOf('.');
  if (lastDot > 0) {
    const nameWithoutExt = originalFilename.substring(0, lastDot);
    const extension = originalFilename.substring(lastDot);
    return `${nameWithoutExt}${suffix}${extension}`;
  }
  return `${originalFilename}${suffix}`;
}

