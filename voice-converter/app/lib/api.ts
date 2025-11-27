/**
 * API utility functions
 * Handles basePath differences between development and production
 */

/**
 * Get the correct API path with basePath prefix if needed
 * On Render.com: /api/...
 * In development: /api/...
 */
export function getApiPath(endpoint: string): string {
  // Always return the endpoint as-is since Next.js handles routing
  return endpoint;
}

