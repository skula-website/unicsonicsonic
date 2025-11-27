import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { getPythonPath } from '@/app/lib/python';
import { getPaths } from '@/app/lib/paths';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.2.0',
      services: {
        nodejs: 'ok',
        python: 'unknown',
        filesystem: 'unknown',
      },
    };

    // Check Python availability
    try {
      const pythonPath = getPythonPath();
      health.services.python = pythonPath === 'python3' ? 'system' : 'venv';
    } catch (error) {
      health.services.python = 'error';
    }

    // Check filesystem (temp directory)
    try {
      const paths = getPaths();
      const tempDir = paths.temp;
      if (existsSync(tempDir)) {
        health.services.filesystem = 'ok';
      } else {
        health.services.filesystem = 'temp_dir_missing';
      }
    } catch (error) {
      health.services.filesystem = 'error';
    }

    // If all critical services are ok, return 200
    if (
      health.services.nodejs === 'ok' &&
      health.services.python !== 'error' &&
      health.services.filesystem === 'ok'
    ) {
      return NextResponse.json(health, { status: 200 });
    }

    // If some services have issues, return 503 (Service Unavailable)
    return NextResponse.json(health, { status: 503 });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
