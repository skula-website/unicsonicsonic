import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, createReadStream } from 'fs';
import { join } from 'path';
import { getPythonPath } from '@/app/lib/python';
import { getPaths } from '@/app/lib/paths';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes
export const maxBodySize = 200 * 1024 * 1024; // 200MB in bytes

const paths = getPaths();
const TEMP_DIR = paths.temp;

function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function detectFileType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const typeMap: { [key: string]: string } = {
    'wav': 'WAV',
    'mp3': 'MP3',
    'flac': 'FLAC',
    'm4a': 'M4A',
    'aac': 'AAC',
    'ogg': 'OGG',
    'opus': 'OGG',
    'wma': 'WMA',
  };
  return typeMap[ext] || 'Unknown';
}

export async function POST(request: NextRequest) {
  let tempInputPath = '';
  let tempOutputPath = '';

  try {
    ensureTempDir();

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const outputFormat = (formData.get('outputFormat') as string) || 'wav';
    const sampleRate = formData.get('sampleRate') ? parseInt(formData.get('sampleRate') as string) : null;
    const bitDepth = formData.get('bitDepth') ? parseInt(formData.get('bitDepth') as string) : null;
    const bitrate = (formData.get('bitrate') as string) || '320k';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file uploaded' }, { status: 400 });
    }

    if (outputFormat !== 'wav' && outputFormat !== 'mp3') {
      return NextResponse.json({ error: 'Output format must be wav or mp3' }, { status: 400 });
    }

    const fileSizeMB = audioFile.size / (1024 * 1024);
    const detectedType = detectFileType(audioFile.name);
    
    console.log(`🔄 Audio conversion request: ${audioFile.name} (${fileSizeMB.toFixed(2)} MB, ${detectedType}) → ${outputFormat.toUpperCase()}`);

    // Save uploaded file with normalized filenames
    const timestamp = Date.now();
    const normalizedInputName = normalizeFilename(audioFile.name, 'input', timestamp);
    const normalizedOutputName = normalizeFilename(audioFile.name, 'converted', timestamp);
    tempInputPath = join(TEMP_DIR, normalizedInputName);
    const outputExtension = outputFormat === 'wav' ? 'wav' : 'mp3';
    // Update extension in normalized name
    tempOutputPath = join(TEMP_DIR, normalizedOutputName.replace(/\.[^.]+$/, `.${outputExtension}`));
    
    console.log(`📝 Original filename: ${audioFile.name}`);
    console.log(`📝 Normalized input: ${normalizedInputName}`);
    console.log(`📝 Normalized output: ${tempOutputPath.split('/').pop()}`);

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    writeFileSync(tempInputPath, buffer);

    console.log(`✓ File saved to: ${tempInputPath}`);

    // Run conversion script
    const pythonPath = getPythonPath();
    const scriptPath = join(paths.scripts, 'convert_audio.py');
    
    console.log(`🐍 Python path: ${pythonPath}`);
    console.log(`🐍 Script path: ${scriptPath}`);
    
    // Verify Python path exists
    if (!existsSync(pythonPath) && pythonPath !== 'python3') {
      console.warn(`⚠️ Python path ${pythonPath} does not exist, falling back to system python3`);
      // Will use 'python3' which should work if pydub is installed system-wide
    }

    const result = await convertAudio(
      pythonPath,
      scriptPath,
      tempInputPath,
      tempOutputPath,
      outputFormat,
      sampleRate,
      bitDepth,
      bitrate
    );

    if (!result.success) {
      throw new Error(result.error || 'Conversion failed');
    }

    // Stream the converted file back
    const fileStats = await import('fs/promises').then(fs => fs.stat(tempOutputPath));
    const fileSize = fileStats.size;
    const outputFileSizeMB = fileSize / (1024 * 1024);

    console.log(`✅ Conversion complete: ${outputFileSizeMB.toFixed(2)} MB`);

    // Create readable stream
    const fileStream = createReadStream(tempOutputPath);

    // Generate download filename with original name restored
    const downloadFilename = generateDownloadFilename(audioFile.name, '_converted');
    
    // Return streamed response
    return new NextResponse(fileStream as any, {
      headers: {
        'Content-Type': outputFormat === 'wav' ? 'audio/wav' : 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Content-Length': fileSize.toString(),
      },
    });

  } catch (error) {
    console.error('Conversion error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage.includes('aborted') || 
                              errorMessage.includes('ECONNRESET') ||
                              errorMessage.includes('timeout');
    
    if (isConnectionError) {
      return NextResponse.json(
        { 
          error: 'Request timeout - file is too large or processing took too long',
          details: 'Conversion timeout exceeded. Try with a smaller file.',
          code: 'TIMEOUT'
        },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  } finally {
    // Cleanup temp files after a delay to allow streaming to complete
    setTimeout(() => {
      try {
        if (tempInputPath && existsSync(tempInputPath)) unlinkSync(tempInputPath);
        if (tempOutputPath && existsSync(tempOutputPath)) unlinkSync(tempOutputPath);
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }, 5000); // 5 second delay to allow stream to start
  }
}

function convertAudio(
  pythonPath: string,
  scriptPath: string,
  inputPath: string,
  outputPath: string,
  outputFormat: string,
  sampleRate: number | null,
  bitDepth: number | null,
  bitrate: string
): Promise<{ success: boolean; error?: string; [key: string]: any }> {
  return new Promise((resolve) => {
    // Always send all arguments in correct order, even if optional ones are null
    // Python script will parse them intelligently based on their type/value
    const args = [
      scriptPath,
      inputPath,
      outputPath,
      outputFormat,
      sampleRate ? sampleRate.toString() : '',
      bitDepth ? bitDepth.toString() : '',
      bitrate
    ];
    
    // Only filter out empty strings from optional args (sampleRate, bitDepth)
    // Keep bitrate even if it's the default
    const filteredArgs = [
      args[0], // scriptPath
      args[1], // inputPath
      args[2], // outputPath
      args[3], // outputFormat
      ...(args[4] ? [args[4]] : []), // sampleRate (only if set)
      ...(args[5] ? [args[5]] : []), // bitDepth (only if set)
      args[6]  // bitrate (always include)
    ];

    const pythonProcess = spawn(pythonPath, filteredArgs, {
      env: {
        ...process.env,
        TMPDIR: TEMP_DIR,
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    const timeout = setTimeout(() => {
      pythonProcess.kill();
      console.error('⚠️ Conversion timeout');
      resolve({ success: false, error: 'Conversion timeout' });
    }, 300000); // 5 minutes max for conversion
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('[Convert]:', data.toString());
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('[Convert Error]:', data.toString());
    });
    
    pythonProcess.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code === 0 && existsSync(outputPath)) {
        // Try to parse JSON from stdout (last line)
        try {
          const lines = stdout.trim().split('\n');
          const jsonLine = lines[lines.length - 1];
          if (jsonLine.startsWith('{')) {
            const result = JSON.parse(jsonLine);
            resolve(result);
          } else {
            resolve({ success: true });
          }
        } catch (e) {
          resolve({ success: true });
        }
      } else {
        console.error(`Conversion failed with code ${code}: ${stderr}`);
        resolve({ success: false, error: stderr || 'Conversion failed' });
      }
    });
    
    pythonProcess.on('error', (err) => {
      clearTimeout(timeout);
      console.error('Conversion process error:', err);
      resolve({ success: false, error: err.message });
    });
  });
}

