import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Get the correct project root path
 * In standalone mode, process.cwd() is .next/standalone/
 * We need to go up to find the actual project root
 */
export function getProjectRoot(): string {
  const cwd = process.cwd();
  
  // Check if we're in standalone mode (check for scripts folder)
  if (existsSync(join(cwd, 'scripts'))) {
    return cwd; // Local development
  }
  
  // In standalone mode, scripts are 2 levels up
  const standaloneRoot = join(cwd, '..', '..');
  if (existsSync(join(standaloneRoot, 'scripts'))) {
    return standaloneRoot;
  }
  
  // Fallback to cwd
  console.warn('⚠️ Could not determine project root, using cwd');
  return cwd;
}

/**
 * Get paths to common directories
 */
export function getPaths() {
  const root = getProjectRoot();
  
  return {
    root,
    scripts: join(root, 'scripts'),
    temp: join(root, 'temp'),
    output: join(root, 'output'),
  };
}


