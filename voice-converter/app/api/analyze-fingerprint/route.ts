import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getPythonPath } from '@/app/lib/python';
import { getPaths } from '@/app/lib/paths';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes - extra margin for large files on Railway
export const maxBodySize = 100 * 1024 * 1024; // 100MB in bytes

// Use project temp dir instead of system /tmp (which may be full)
const paths = getPaths();
const TEMP_DIR = paths.temp;

// Ensure temp directory exists
function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  let tempInputPath = '';
  let tempOutputPath = '';
  let mp3Path = '';
  let originalWavPath = '';

  try {
    ensureTempDir();
    
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const skipImage = formData.get('skipImage') === 'true'; // For energy comparison only

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file uploaded' }, { status: 400 });
    }

    const fileSizeMB = audioFile.size / (1024 * 1024);
    console.log(`📊 Analysis request: ${audioFile.name} (${fileSizeMB.toFixed(2)} MB)`);
    
    // OPTIMIZATION: For large files (>30 MB), convert to MP3 first for faster analysis
    // This reduces processing time by 50-70% and avoids Railway HTTP timeout
    const USE_MP3_OPTIMIZATION = fileSizeMB > 30;
    let mp3Path = '';
    let originalWavPath = '';
    
    if (USE_MP3_OPTIMIZATION) {
      console.log(`⚡ Large file detected - using MP3 optimization for faster analysis`);
    }

    // Save uploaded file temporarily (using our temp dir, not system /tmp)
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    originalWavPath = join(TEMP_DIR, `analyze_input_${Date.now()}_${audioFile.name}`);
    tempOutputPath = skipImage ? 'skip' : join(TEMP_DIR, `analyze_output_${Date.now()}.png`);
    
    writeFileSync(originalWavPath, buffer);

    // Convert to MP3 if optimization enabled
    if (USE_MP3_OPTIMIZATION) {
      mp3Path = join(TEMP_DIR, `analyze_mp3_${Date.now()}.mp3`);
      const convertScript = join(paths.scripts, 'convert_to_mp3.py');
      const pythonPath = getPythonPath();
      
      console.log(`🔄 Converting to MP3 for faster analysis...`);
      const convertSuccess = await convertToMP3(pythonPath, convertScript, originalWavPath, mp3Path);
      
      if (convertSuccess) {
        tempInputPath = mp3Path; // Use MP3 for analysis
        console.log(`✓ Using MP3 for analysis (original WAV preserved)`);
      } else {
        console.warn(`⚠️ MP3 conversion failed, falling back to WAV analysis`);
        tempInputPath = originalWavPath; // Fallback to WAV
      }
    } else {
      tempInputPath = originalWavPath; // Use WAV directly for small files
    }

    // Auto-detect: venv (local) or system python3 (Render.com)
    const pythonPath = getPythonPath();
    const scriptPath = join(paths.scripts, 'analyze_fingerprint.py');

    // Run analysis with JSON output
    const result = await runAnalysisScript(pythonPath, scriptPath, tempInputPath, tempOutputPath, skipImage);

    if (!result.success) {
      throw new Error(result.error || 'Analysis failed');
    }

    // Read the generated spectrogram (only if not skipped)
    let spectrogramBase64 = '';
    if (!skipImage && tempOutputPath !== 'skip' && existsSync(tempOutputPath)) {
      const imageBuffer = readFileSync(tempOutputPath);
      spectrogramBase64 = imageBuffer.toString('base64');
    }

    return NextResponse.json({
      filename: audioFile.name,
      sampleRate: result.sampleRate,
      duration: result.duration,
      nyquistFreq: result.nyquistFreq,
      watermarkEnergy: result.watermarkEnergy,
      energyRatio: result.energyRatio,
      meanFrameRatio: result.meanFrameRatio,
      medianFrameRatio: result.medianFrameRatio,
      maxFrameRatio: result.maxFrameRatio,
      watermarkToReferenceRatio: result.watermarkToReferenceRatio,
      medianWatermarkToReference: result.medianWatermarkToReference,
      framesWatermarkHigherPercent: result.framesWatermarkHigherPercent,
      framesWatermarkElevatedPercent: result.framesWatermarkElevatedPercent,
      status: result.status,
      spectrogramBase64
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
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
      { error: errorMessage },
      { status: 500 }
    );
  } finally {
    // Cleanup temp files
    try {
      if (tempInputPath && existsSync(tempInputPath)) unlinkSync(tempInputPath);
      if (mp3Path && existsSync(mp3Path)) unlinkSync(mp3Path);
      if (originalWavPath && existsSync(originalWavPath)) unlinkSync(originalWavPath);
      if (tempOutputPath && tempOutputPath !== 'skip' && existsSync(tempOutputPath)) unlinkSync(tempOutputPath);
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  }
}

function convertToMP3(
  pythonPath: string,
  scriptPath: string,
  inputPath: string,
  outputPath: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const pythonProcess = spawn(pythonPath, [scriptPath, inputPath, outputPath, '320k'], {
      env: {
        ...process.env,
        TMPDIR: TEMP_DIR,
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    const timeout = setTimeout(() => {
      pythonProcess.kill();
      console.error('⚠️ MP3 conversion timeout');
      resolve(false);
    }, 120000); // 2 minutes max for conversion
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('[MP3 Convert]:', data.toString());
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('[MP3 Convert Error]:', data.toString());
    });
    
    pythonProcess.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 && existsSync(outputPath)) {
        resolve(true);
      } else {
        console.error(`MP3 conversion failed with code ${code}: ${stderr}`);
        resolve(false);
      }
    });
    
    pythonProcess.on('error', (err) => {
      clearTimeout(timeout);
      console.error('MP3 conversion process error:', err);
      resolve(false);
    });
  });
}

function runAnalysisScript(
  pythonPath: string,
  scriptPath: string,
  inputPath: string,
  outputPath: string,
  skipImage: boolean = false
): Promise<{
  success: boolean;
  error?: string;
  sampleRate?: number;
  duration?: number;
  nyquistFreq?: number;
  watermarkEnergy?: number;
  energyRatio?: number;
  meanFrameRatio?: number;
  medianFrameRatio?: number;
  maxFrameRatio?: number;
  watermarkToReferenceRatio?: number;
  medianWatermarkToReference?: number;
  framesWatermarkHigherPercent?: number;
  framesWatermarkElevatedPercent?: number;
  framesAboveVeryLowPercent?: number;
  framesAboveBaselinePercent?: number;
  suspiciousFramesPercent?: number;
  status?: string;
}> {
  return new Promise((resolve) => {
    const args = skipImage 
      ? [scriptPath, inputPath, '--json']  // Skip image generation
      : [scriptPath, inputPath, outputPath, '--json'];
    
    const pythonProcess = spawn(pythonPath, args, {
      env: {
        ...process.env,
        TMPDIR: TEMP_DIR,  // Use our temp dir instead of system /tmp
        MPLCONFIGDIR: TEMP_DIR,  // Matplotlib config dir
      }
    });
    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      pythonProcess.kill();
      resolve({ success: false, error: 'Timeout: Analysis took over 10 minutes' });
    }, 600000); // 10 minutes

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('[Analysis stdout]:', data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('[Analysis stderr]:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        resolve({ success: false, error: `Python script exited with code ${code}\n${stderr}` });
        return;
      }

      // Parse JSON output from script
      try {
        // Find JSON in stdout (look for last complete JSON object)
        const jsonMatch = stdout.match(/\{[^\{]*"sampleRate"[^\}]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          resolve({
            success: true,
            sampleRate: data.sampleRate,
            duration: data.duration,
            nyquistFreq: data.nyquistFreq,
            watermarkEnergy: data.watermarkEnergy,
            energyRatio: data.energyRatio,
            meanFrameRatio: data.meanFrameRatio,
            medianFrameRatio: data.medianFrameRatio,
            maxFrameRatio: data.maxFrameRatio,
            watermarkToReferenceRatio: data.watermarkToReferenceRatio,
            medianWatermarkToReference: data.medianWatermarkToReference,
            framesWatermarkHigherPercent: data.framesWatermarkHigherPercent,
            framesWatermarkElevatedPercent: data.framesWatermarkElevatedPercent,
            framesAboveVeryLowPercent: data.framesAboveVeryLowPercent,
            framesAboveBaselinePercent: data.framesAboveBaselinePercent,
            suspiciousFramesPercent: data.suspiciousFramesPercent,
            status: data.status
          });
        } else {
          resolve({ success: false, error: 'Kunne ikke parse analyse resultat' });
        }
      } catch (e) {
        resolve({ success: false, error: `JSON parse error: ${e}` });
      }
    });

    process.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ success: false, error: err.message });
    });
  });
}


