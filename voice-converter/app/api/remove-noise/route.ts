import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { getPythonPath } from '@/app/lib/python';
import { getPaths } from '@/app/lib/paths';
import { normalizeFilename, generateDownloadFilename } from '@/app/lib/filename';

// Increase body size limit for large audio files (100MB)
export const maxDuration = 600; // Max execution time: 10 minutes
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
    
    const reductionStrength = formData.get('reductionStrength') ? parseFloat(formData.get('reductionStrength') as string) : 0.5;
    const stationary = formData.get('stationary') === 'true';
    const originalFilename = formData.get('originalFilename') as string || audioFile.name;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file uploaded' },
        { status: 400 }
      );
    }

    const fileSizeMB = audioFile.size / (1024 * 1024);
    console.log('🔇 Noise Removal Request:', {
      filename: audioFile.name,
      originalFilename: originalFilename,
      size: `${fileSizeMB.toFixed(2)} MB`,
      type: audioFile.type,
      reductionStrength,
      stationary,
    });
    
    // Warn if file is very large
    if (fileSizeMB > 50) {
      console.warn(`⚠️ Large file detected (${fileSizeMB.toFixed(2)} MB) - may hit Railway HTTP timeout`);
    }

    // Save uploaded file
    const timestamp = Date.now();
    const normalizedInputName = normalizeFilename(originalFilename, 'input', timestamp);
    const normalizedOutputName = normalizeFilename(originalFilename, 'denoised', timestamp);
    const inputPath = path.join(TEMP_DIR, normalizedInputName);
    const outputPath = path.join(TEMP_DIR, normalizedOutputName);

    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    console.log(`📝 Writing file to: ${inputPath}`);
    await writeFile(inputPath, buffer);

    // Verify file was saved correctly
    const { stat } = await import('fs/promises');
    
    let retries = 0;
    const maxRetries = 20;
    let inputStats;
    
    while (retries < maxRetries) {
      try {
        inputStats = await stat(inputPath);
        if (inputStats.size === buffer.length) {
          console.log(`✓ File saved and verified: ${inputPath} (${(inputStats.size / (1024 * 1024)).toFixed(2)} MB)`);
          break;
        } else {
          console.log(`⚠️ File size mismatch: expected ${buffer.length}, got ${inputStats.size}, retry ${retries + 1}/${maxRetries}`);
        }
      } catch (error) {
        console.log(`⚠️ File not found yet, retry ${retries + 1}/${maxRetries}: ${error}`);
      }
      
      if (retries < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
        retries++;
      } else {
        throw new Error(`File was not saved correctly after ${maxRetries} retries`);
      }
    }

    // Run Python noise removal script
    const pythonScript = path.join(SCRIPTS_DIR, 'remove_noise.py');
    const pythonPath = getPythonPath();

    console.log(`🐍 Running Python script: ${pythonScript}`);
    console.log(`🐍 Python path: ${pythonPath}`);
    console.log(`🐍 Input path: ${inputPath}`);
    console.log(`🐍 Output path: ${outputPath}`);
    console.log(`🐍 Reduction strength: ${reductionStrength}, Stationary: ${stationary}`);

    const pythonProcess = spawn(pythonPath, [
      pythonScript,
      inputPath,
      outputPath,
      reductionStrength.toString(),
      stationary ? 'true' : 'false',
    ], {
      env: {
        ...process.env,
        TMPDIR: TEMP_DIR,
        MPLCONFIGDIR: TEMP_DIR,
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

    // Timeout after 15 minutes
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
      // Combine stderr and stdout for full error details
      const errorDetails = stderr.trim() || stdout.trim() || 'Unknown error';
      console.error('❌ Python script error (exit code', exitCode, '):');
      console.error('STDERR:', stderr);
      console.error('STDOUT:', stdout);
      
      // Create a more readable error message
      let errorMessage = `Python script failed with exit code ${exitCode}`;
      if (stderr.trim()) {
        errorMessage += `\n\n${stderr.trim()}`;
      } else if (stdout.trim()) {
        errorMessage += `\n\n${stdout.trim()}`;
      }
      
      throw new Error(errorMessage);
    }

    // Get file stats
    const fileStats = await stat(outputPath);
    const cleanedFileSizeMB = fileStats.size / (1024 * 1024);
    console.log(`📊 Denoised file size: ${cleanedFileSizeMB.toFixed(2)} MB`);

    console.log('✅ Noise removal complete - streaming response...');

    // Determine Content-Type based on output file extension
    const outputExt = path.extname(outputPath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (outputExt === '.mp3') {
      contentType = 'audio/mpeg';
    } else if (outputExt === '.wav') {
      contentType = 'audio/wav';
    } else if (outputExt === '.flac') {
      contentType = 'audio/flac';
    } else if (outputExt === '.ogg') {
      contentType = 'audio/ogg';
    }

    // Use streaming for large files
    const fileStream = createReadStream(outputPath);
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk: string | Buffer) => {
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

    // Generate download filename - normalize to avoid special character issues in headers
    const downloadFilename = generateDownloadFilename(originalFilename, '_denoised');
    // Further normalize for Content-Disposition header (RFC 5987 encoding for special chars)
    const safeDownloadFilename = downloadFilename
      .replace(/[^\x20-\x7E]/g, '_') // Replace non-ASCII with underscore
      .replace(/[^a-zA-Z0-9._-]/g, '_'); // Replace special chars except . _ - with underscore

    // Return streaming response
    const response = new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeDownloadFilename}"`,
        'Content-Length': fileStats.size.toString(),
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      },
    });

    return response;

  } catch (error) {
    console.error('❌ Noise removal error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage.includes('aborted') || 
                              errorMessage.includes('ECONNRESET') ||
                              errorMessage.includes('timeout');
    
    if (isConnectionError) {
      console.error('⚠️ Connection timeout/reset detected');
      return NextResponse.json(
        { 
          error: 'Request timeout - file is too large or processing took too long',
          details: 'Railway HTTP timeout exceeded. Try with a smaller file.',
          code: 'TIMEOUT'
        },
        { status: 504 }
      );
    }
    
    // Return detailed error message
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

