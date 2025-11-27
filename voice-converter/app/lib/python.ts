import { existsSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Get the correct Python executable path
 * Uses venv for local development, system python3 for production
 */
export function getPythonPath(): string {
  // Try multiple possible locations for venv
  const possiblePaths = [
    // Standard location: ../venv-unicsonic relative to project root
    join(process.cwd(), '..', 'venv-unicsonic', 'bin', 'python3'),
    // Absolute path from project root
    resolve(process.cwd(), '..', 'venv-unicsonic', 'bin', 'python3'),
    // If we're in .next/standalone, go up more levels
    resolve(process.cwd(), '..', '..', '..', 'venv-unicsonic', 'bin', 'python3'),
  ];
  
  for (const venvPath of possiblePaths) {
    if (existsSync(venvPath)) {
      console.log(`✅ Using local Python venv: ${venvPath}`);
      return venvPath;
    }
  }
  
  // Use system python3 (Render.com or system install)
  console.warn('⚠️ venv-unicsonic not found, using system python3 (pydub may not be available)');
  return 'python3';
}
