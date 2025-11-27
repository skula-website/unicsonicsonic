import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { getPythonPath } from '@/app/lib/python';
import { getPaths } from '@/app/lib/paths';

// Increase body size limit for large audio files (100MB)
export const maxDuration = 600; // Max execution time: 10 minutes - extra margin for large files
export const dynamic = 'force-dynamic';
export const maxBodySize = 100 * 1024 * 1024; // 100MB in bytes
export const runtime = 'nodejs';

const paths = getPaths();
const TEMP_DIR = paths.temp;
const SCRIPTS_DIR = paths.scripts;

// Ensure temp directory exists
async function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTempDir();

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file uploaded' },
        { status: 400 }
      );
    }

    const fileSizeMB = audioFile.size / (1024 * 1024);
    console.log('🧹 Audio Cleaning Request:', {
      filename: audioFile.name,
      size: `${fileSizeMB.toFixed(2)} MB`,
      type: audioFile.type,
    });
    
    // Warn if file is very large (may hit Railway HTTP timeout)
    if (fileSizeMB > 50) {
      console.warn(`⚠️ Large file detected (${fileSizeMB.toFixed(2)} MB) - may hit Railway HTTP timeout`);
    }

    // Save uploaded file
    const timestamp = Date.now();
    const inputPath = path.join(TEMP_DIR, `input_${timestamp}_${audioFile.name}`);
    const outputPath = path.join(TEMP_DIR, `cleaned_${timestamp}_${audioFile.name}`);

    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(inputPath, buffer);

    // Verify file was saved correctly
    const { stat } = await import('fs/promises');
    const inputStats = await stat(inputPath);
    console.log(`✓ File saved to: ${inputPath} (${(inputStats.size / (1024 * 1024)).toFixed(2)} MB)`);

    // Run Python fingerprint remover
    const pythonScript = path.join(SCRIPTS_DIR, 'remove_audio_fingerprint.py');
    const pythonPath = getPythonPath(); // Auto-detect: venv (local) or system python3 (Render.com)

    console.log(`🐍 Running Python script: ${pythonScript}`);
    console.log(`🐍 Python path: ${pythonPath}`);
    console.log(`🐍 Input path: ${inputPath}`);
    console.log(`🐍 Output path: ${outputPath}`);

    const pythonProcess = spawn(pythonPath, [
      pythonScript,
      inputPath,
      outputPath,
    ], {
      env: {
        ...process.env,
        TMPDIR: TEMP_DIR,  // Use our temp dir instead of system /tmp
        MPLCONFIGDIR: TEMP_DIR,  // Matplotlib config dir
      }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      console.log('[Python]', text);
    });

    pythonProcess.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      console.error('[Python Error]', text);
    });

    // Timeout efter 15 minutter (for meget store filer)
    const timeout = new Promise<number>((_, reject) => {
      setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        reject(new Error('Timeout: Processing took over 15 minutes'));
      }, 900000); // 15 min
    });

    // Wait for Python process to complete
    const exitCode = await Promise.race([
      new Promise<number>((resolve) => {
        pythonProcess.on('close', resolve);
      }),
      timeout,
    ]);

    if (exitCode !== 0) {
      // Include both stdout and stderr in error message for debugging
      const debugInfo = stdout ? `\n\nSTDOUT:\n${stdout}` : '';
      throw new Error(`Python script failed with exit code ${exitCode}${debugInfo}\n\nSTDERR:\n${stderr}`);
    }

    // Get file stats
    const { stat } = await import('fs/promises');
    const fileStats = await stat(outputPath);
    const cleanedFileSizeMB = fileStats.size / (1024 * 1024);
    console.log(`📊 Cleaned file size: ${cleanedFileSizeMB.toFixed(2)} MB`);

    // Detect output format from file extension
    const outputExt = path.extname(outputPath).toLowerCase();
    const contentType = outputExt === '.mp3' ? 'audio/mpeg' : 'audio/wav';
    console.log(`📦 Output format: ${outputExt}, Content-Type: ${contentType}`);

    console.log('✅ Audio cleaning complete - streaming response...');

    // Use streaming for large files to avoid timeout
    // Convert Node.js ReadableStream to Web ReadableStream
    const fileStream = createReadStream(outputPath);
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk: string | Buffer) => {
          // Convert Node.js Buffer to Uint8Array for Web Streams
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          controller.enqueue(new Uint8Array(buffer));
        });
        fileStream.on('end', () => {
          controller.close();
          // Cleanup temp files after stream completes
          setTimeout(async () => {
            await unlink(inputPath).catch(console.error);
            await unlink(outputPath).catch(console.error);
            console.log('🧹 Temp files cleaned up');
          }, 2000);
        });
        fileStream.on('error', (err) => {
          console.error('❌ Stream error:', err);
          controller.error(err);
          // Cleanup on error
          unlink(inputPath).catch(console.error);
          unlink(outputPath).catch(console.error);
        });
      },
      cancel() {
        console.log('⚠️ Stream cancelled by client');
        fileStream.destroy();
        unlink(inputPath).catch(console.error);
        unlink(outputPath).catch(console.error);
      }
    });

    // Return streaming response
    const response = new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="cleaned_${audioFile.name}"`,
        'Content-Length': fileStats.size.toString(),
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked', // Enable chunked transfer
      },
    });

    return response;

  } catch (error) {
    console.error('❌ Audio cleaning error:', error);
    
    // Handle connection reset/timeout errors specifically
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage.includes('aborted') || 
                              errorMessage.includes('ECONNRESET') ||
                              errorMessage.includes('timeout');
    
    if (isConnectionError) {
      console.error('⚠️ Connection timeout/reset detected - Railway HTTP proxy timeout likely exceeded');
      return NextResponse.json(
        { 
          error: 'Request timeout - file is too large or processing took too long',
          details: 'Railway HTTP timeout exceeded. Try with a smaller file or wait for MP3 optimization update.',
          code: 'TIMEOUT'
        },
        { status: 504 } // Gateway Timeout
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Fingerprint removal failed', 
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

