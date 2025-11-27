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
    const startSeconds = parseFloat(formData.get('startSeconds') as string);
    const endSeconds = parseFloat(formData.get('endSeconds') as string);

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file uploaded' },
        { status: 400 }
      );
    }

    if (isNaN(startSeconds) || isNaN(endSeconds) || startSeconds < 0 || endSeconds <= startSeconds) {
      return NextResponse.json(
        { error: 'Invalid time range. Start must be >= 0 and end must be > start' },
        { status: 400 }
      );
    }

    const fileSizeMB = audioFile.size / (1024 * 1024);
    console.log('✂️ Audio Trimming Request:', {
      filename: audioFile.name,
      size: `${fileSizeMB.toFixed(2)} MB`,
      startSeconds,
      endSeconds,
      duration: `${(endSeconds - startSeconds).toFixed(2)}s`
    });

    // Save uploaded file with normalized filename
    const timestamp = Date.now();
    const normalizedInputName = normalizeFilename(audioFile.name, 'input', timestamp);
    const normalizedOutputName = normalizeFilename(audioFile.name, 'trimmed', timestamp);
    const inputPath = path.join(TEMP_DIR, normalizedInputName);
    const outputPath = path.join(TEMP_DIR, normalizedOutputName);

    console.log(`📝 Original filename: ${audioFile.name}`);
    console.log(`📝 Normalized input: ${normalizedInputName}`);
    console.log(`📝 Normalized output: ${normalizedOutputName}`);

    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
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
        }
      } catch (error) {
        console.log(`⚠️ File not found yet, retry ${retries + 1}/${maxRetries}`);
      }

      if (retries < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
        retries++;
      } else {
        throw new Error(`File was not saved correctly after ${maxRetries} retries`);
      }
    }

    // Run Python trimming script
    const pythonScript = path.join(SCRIPTS_DIR, 'trim_audio.py');
    const pythonPath = getPythonPath();

    console.log(`🐍 Running Python script: ${pythonScript}`);
    console.log(`🐍 Python path: ${pythonPath}`);
    console.log(`🐍 Input path: ${inputPath}`);
    console.log(`🐍 Output path: ${outputPath}`);
    console.log(`🐍 Time range: ${startSeconds}s - ${endSeconds}s`);

    const pythonProcess = spawn(pythonPath, [
      pythonScript,
      inputPath,
      outputPath,
      startSeconds.toString(),
      endSeconds.toString(),
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

    const timeout = new Promise<number>((_, reject) => {
      setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        reject(new Error('Timeout: Processing took over 15 minutes'));
      }, 900000); // 15 min
    });

    const exitCode = await Promise.race([
      new Promise<number>((resolve) => {
        pythonProcess.on('close', resolve);
      }),
      timeout,
    ]);

    if (exitCode !== 0) {
      const debugInfo = stdout ? `\n\nSTDOUT:\n${stdout}` : '';
      throw new Error(`Python script failed with exit code ${exitCode}${debugInfo}\n\nSTDERR:\n${stderr}`);
    }

    // Parse result from stdout (JSON)
    let result;
    try {
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('Could not parse JSON result from Python script');
    }

    // Get file stats
    const fileStats = await stat(outputPath);
    const trimmedFileSizeMB = fileStats.size / (1024 * 1024);
    console.log(`📊 Trimmed file size: ${trimmedFileSizeMB.toFixed(2)} MB`);

    // Detect output format from file extension
    const outputExt = path.extname(outputPath).toLowerCase();
    const contentType = outputExt === '.mp3' ? 'audio/mpeg' : 'audio/wav';
    console.log(`📦 Output format: ${outputExt}, Content-Type: ${contentType}`);

    console.log('✅ Audio trimming complete - streaming response...');

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

    // Generate download filename with original name restored
    const downloadFilename = generateDownloadFilename(audioFile.name, '_trimmed');

    // Return streaming response
    const response = new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Content-Length': fileStats.size.toString(),
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      },
    });

    return response;

  } catch (error) {
    console.error('❌ Audio trimming error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage.includes('aborted') || 
                              errorMessage.includes('ECONNRESET') ||
                              errorMessage.includes('timeout');
    
    if (isConnectionError) {
      return NextResponse.json(
        { 
          error: 'Request timeout - file is too large or processing took too long',
          details: 'Railway HTTP timeout exceeded. Try with a smaller file.',
          code: 'TIMEOUT'
        },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Audio trimming failed', 
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

