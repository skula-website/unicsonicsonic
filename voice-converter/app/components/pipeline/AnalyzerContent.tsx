'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getApiPath } from '../../lib/api';
import FileSelector from './FileSelector';
import FileInfoHeader from './FileInfoHeader';
import { useFileHistory } from '../../lib/fileHistory';

interface AnalysisResult {
  filename: string;
  sampleRate: number;
  duration: number;
  nyquistFreq: number;
  watermarkEnergy: number;
  energyRatio: number;
  meanFrameRatio?: number;
  medianFrameRatio?: number;
  maxFrameRatio?: number;
  watermarkToReferenceRatio?: number;
  medianWatermarkToReference?: number;
  framesWatermarkHigherPercent?: number;
  framesWatermarkElevatedPercent?: number;
  status: 'clean' | 'suspicious' | 'watermarked';
  spectrogramBase64?: string;
}

interface AnalyzerContentProps {
  onOpenCleaner?: (file?: File, isClean?: boolean) => void;
  onNextProcess?: (file?: File) => void;
  preloadedFile?: File;
}

export default function AnalyzerContent({ onOpenCleaner, onNextProcess, preloadedFile }: AnalyzerContentProps) {
  const { fileHistory, getLatestFile } = useFileHistory();
  
  // File state - prioritize preloadedFile, otherwise use latest from history
  const getInitialFile = () => {
    if (preloadedFile) return preloadedFile;
    const latest = getLatestFile();
    return latest ? latest.file : null;
  };
  
  const [file, setFile] = useState<File | null>(getInitialFile());
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get current file's process history
  const currentFileHistory = file 
    ? fileHistory.find(entry => entry.file.name === file.name)?.processes || []
    : [];
  
  // Initialize file when it's set
  useEffect(() => {
    if (file && !preloadedFile) {
      const latest = getLatestFile();
      if (latest && latest.file.name === file.name) {
        setProgress('📎 Seneste fil automatisk valgt');
      }
    } else if (preloadedFile) {
      setProgress('📎 Fil automatisk overført fra forrige proces');
    }
  }, [file, preloadedFile, getLatestFile]);

  // Handle file selection from FileSelector
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setError('');
    setProgress('');
  };

  const estimateProcessingTime = (fileSizeMB: number): number => {
    if (fileSizeMB < 10) return 30;
    if (fileSizeMB < 30) return 90;
    if (fileSizeMB < 60) return 180;
    return 300;
  };

  useEffect(() => {
    if (analyzing) {
      setElapsedSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setElapsedSeconds(0);
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [analyzing]);

  useEffect(() => {
    if (file && !analyzing) {
      const fileSizeMB = file.size / (1024 * 1024);
      setEstimatedSeconds(estimateProcessingTime(fileSizeMB));
    }
  }, [file, analyzing]);

  const analyzeFile = async () => {
    if (!file) return;

    setAnalyzing(true);
    setError('');
    setResult(null);
    setElapsedSeconds(0);
    
    const fileSizeMB = file.size / (1024 * 1024);
    const useMP3Optimization = fileSizeMB > 30;
    setEstimatedSeconds(estimateProcessingTime(fileSizeMB));
    
    try {
      if (useMP3Optimization) {
        setProgress('⚡ Converting to MP3...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const formData = new FormData();
      formData.append('audio', file);

      setProgress(useMP3Optimization ? '🔄 Analyzing MP3...' : 'Analyzing...');

      const response = await fetch(getApiPath('/api/analyze-fingerprint'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 504 || errorData.code === 'TIMEOUT') {
          throw new Error(errorData.details || 'Request timeout - file is too large.');
        }
        throw new Error(errorData.error || 'Analysis failed');
      }

      const analysisResult: AnalysisResult = await response.json();
      setResult(analysisResult);
      setProgress('Analysis completed ✓');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setProgress('');
    } finally {
      setAnalyzing(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError('');
    setProgress('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean': return 'text-green-400';
      case 'suspicious': return 'text-yellow-400';
      case 'watermarked': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'clean': return '✓ No fingerprints detected';
      case 'suspicious': return '⚠ Suspicious energy detected';
      case 'watermarked': return '⚠ Possible watermark detected';
      default: return 'Unknown status';
    }
  };

  return (
    <div className="space-y-2">
      {/* File Info Header */}
      {file && (
        <FileInfoHeader
          fileName={file.name}
          fileSize={file.size}
          processes={currentFileHistory}
        />
      )}
      
      <div className="p-3 space-y-2">
        {!result ? (
          <>
            {/* File Selector */}
            <FileSelector
              onFileSelect={handleFileSelect}
              acceptedFileTypes="audio/*"
              currentFile={file}
            />


            {progress && (
              <div className="p-2 md:p-3 bg-purple-500/20 rounded-lg border border-purple-500/50">
                <p className="text-purple-200 text-xs md:text-sm mb-1.5 md:mb-2">{progress}</p>
                {analyzing && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-purple-300">⏱️ {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}</span>
                      {estimatedSeconds && (
                        <span className="text-purple-200">Est: {Math.floor(estimatedSeconds / 60)}:{(estimatedSeconds % 60).toString().padStart(2, '0')}</span>
                      )}
                    </div>
                    {estimatedSeconds && (
                      <div className="w-full bg-purple-900/50 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000"
                          style={{ width: `${Math.min((elapsedSeconds / estimatedSeconds) * 100, 95)}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/50">
                <p className="text-red-200 text-sm">❌ {error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={analyzeFile}
                disabled={!file || analyzing}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded text-sm font-medium hover:from-purple-700 hover:to-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed"
              >
              {analyzing ? 'Analyzing...' : 'Start Analysis'}
            </button>
            {file && (
              <button
                onClick={reset}
                disabled={analyzing}
                className="px-4 py-2 bg-slate-700 text-gray-200 rounded text-sm font-medium hover:bg-slate-600 disabled:opacity-50"
              >
                Reset
              </button>
            )}
          </div>
          </>
        ) : (
          <>
            {/* Compact Results */}
          <div className={`p-3 rounded-lg border-2 ${getStatusColor(result.status)} border-opacity-50 bg-slate-700`}>
            <h3 className={`text-lg font-bold ${getStatusColor(result.status)} mb-1`}>
              {getStatusText(result.status)}
            </h3>
            <p className="text-gray-300 text-xs">{result.filename}</p>
          </div>

          {/* Compact Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-slate-700 rounded border border-slate-600">
              <p className="text-xs text-gray-400">Sample Rate</p>
              <p className="text-sm font-bold text-purple-400">{result.sampleRate} Hz</p>
            </div>
            <div className="p-2 bg-slate-700 rounded border border-slate-600">
              <p className="text-xs text-gray-400">Duration</p>
              <p className="text-sm font-bold text-purple-400">{result.duration.toFixed(1)}s</p>
            </div>
            {result.watermarkToReferenceRatio !== undefined && (
              <div className={`p-2 rounded border col-span-2 ${
                result.watermarkToReferenceRatio > 0.35 ? 'bg-red-500/20 border-red-500/50' : 
                result.watermarkToReferenceRatio > 0.25 ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-green-500/20 border-green-500/50'
              }`}>
                <p className="text-xs text-gray-300">Watermark/Reference</p>
                <p className={`text-sm font-bold ${
                  result.watermarkToReferenceRatio > 0.35 ? 'text-red-300' : 
                  result.watermarkToReferenceRatio > 0.25 ? 'text-yellow-300' : 'text-green-300'
                }`}>
                  {result.watermarkToReferenceRatio.toFixed(3)}
                </p>
              </div>
            )}
          </div>

          {/* Compact Conclusion */}
          <div className={`p-3 rounded-lg border-l-4 ${
            result.status === 'clean' ? 'bg-green-500/10 border-green-500' :
            result.status === 'suspicious' ? 'bg-yellow-500/10 border-yellow-500' :
            'bg-red-500/10 border-red-500'
          }`}>
            <h4 className={`font-bold text-sm mb-1 ${
              result.status === 'clean' ? 'text-green-300' :
              result.status === 'suspicious' ? 'text-yellow-300' :
              'text-red-300'
            }`}>📋 Conclusion</h4>
            <p className="text-gray-300 text-xs">
              {result.status === 'clean' && 'This audio file appears clean. No suspicious energy detected.'}
              {result.status === 'suspicious' && 'Slightly elevated energy detected. Consider running through fingerprint remover.'}
              {result.status === 'watermarked' && 'Significant energy detected in watermark region. Strongly recommend cleaning.'}
            </p>
          </div>

          {/* Spectrogram Comparison - AFTER Conclusion */}
          <div className="p-3 bg-slate-800 rounded-lg border border-slate-600 mt-3">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="font-bold text-white text-sm">📊 Spectral Analysis</h4>
              <div className="group relative">
                <div className="w-4 h-4 rounded-full bg-slate-600 hover:bg-slate-500 text-white text-xs flex items-center justify-center cursor-help font-bold">
                  i
                </div>
                <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                  <p className="text-xs text-white font-semibold mb-2">Color Scale:</p>
                  <ul className="text-[10px] text-gray-300 space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 bg-gradient-to-r from-purple-900 to-blue-900 rounded border border-slate-600"></span>
                      <span>Dark purple/blue = Low energy (clean)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 bg-gradient-to-r from-yellow-500 to-green-500 rounded border border-slate-600"></span>
                      <span>Yellow/green = High energy (watermark)</span>
                    </li>
                    <li className="text-gray-400 mt-2 pt-2 border-t border-slate-700">
                      Above 18 kHz: Dark = good, Bright = bad
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {/* Reference Example (Clean Audio) */}
              <div className="bg-slate-900 rounded border border-slate-700 p-2">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h5 className="text-xs font-semibold text-green-300 mb-1">✓ Reference: Clean Audio</h5>
                    <p className="text-xs text-gray-400">Example of audio without watermarks</p>
                  </div>
                  <div className="group relative ml-2">
                    <div className="w-4 h-4 rounded-full bg-slate-600 hover:bg-slate-500 text-white text-[10px] flex items-center justify-center cursor-help font-bold">
                      i
                    </div>
                    <div className="absolute right-0 top-6 z-50 w-56 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                      <p className="text-[10px] text-white font-semibold mb-1.5">Color Scale:</p>
                      <ul className="text-[9px] text-gray-300 space-y-1">
                        <li className="flex items-center gap-1.5">
                          <span className="w-3 h-3 bg-gradient-to-r from-purple-900 to-blue-900 rounded border border-slate-600 flex-shrink-0"></span>
                          <span>Dark purple/blue = Low energy</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-3 h-3 bg-gradient-to-r from-yellow-500 to-green-500 rounded border border-slate-600 flex-shrink-0"></span>
                          <span>Yellow/green = High energy</span>
                        </li>
                      </ul>
                      <p className="text-[9px] text-gray-400 mt-1.5 pt-1.5 border-t border-slate-700">
                        Above 18 kHz: Dark = good, Bright = bad
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-950 rounded border border-slate-800 p-2 relative">
                  <img
                    src="/reference-spectrogram.png"
                    alt="Reference Spectrogram - Clean Audio"
                    className="w-full rounded border border-slate-700"
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.parentElement?.querySelector('.fallback');
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                  <div className="fallback hidden aspect-video bg-gradient-to-b from-blue-900 via-purple-900 to-slate-900 rounded border border-slate-700 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl mb-1">📊</div>
                      <p className="text-xs text-gray-400">Clean Audio Pattern</p>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Low energy above 18 kHz = Clean
                </p>
              </div>

              {/* Actual File Analysis */}
              <div className="bg-slate-900 rounded border border-slate-700 p-2">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h5 className={`text-xs font-semibold mb-1 ${
                      result.status === 'clean' ? 'text-green-300' :
                      result.status === 'suspicious' ? 'text-yellow-300' :
                      'text-red-300'
                    }`}>
                      {result.status === 'clean' ? '✓' : result.status === 'suspicious' ? '⚠' : '⚠️'} Your File
                    </h5>
                    <p className="text-xs text-gray-400">Analysis of uploaded audio</p>
                  </div>
                  <div className="group relative ml-2">
                    <div className="w-4 h-4 rounded-full bg-slate-600 hover:bg-slate-500 text-white text-[10px] flex items-center justify-center cursor-help font-bold">
                      i
                    </div>
                    <div className="absolute right-0 top-6 z-50 w-56 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                      <p className="text-[10px] text-white font-semibold mb-1.5">Color Scale:</p>
                      <ul className="text-[9px] text-gray-300 space-y-1">
                        <li className="flex items-center gap-1.5">
                          <span className="w-3 h-3 bg-gradient-to-r from-purple-900 to-blue-900 rounded border border-slate-600 flex-shrink-0"></span>
                          <span>Dark purple/blue = Low energy</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-3 h-3 bg-gradient-to-r from-yellow-500 to-green-500 rounded border border-slate-600 flex-shrink-0"></span>
                          <span>Yellow/green = High energy</span>
                        </li>
                      </ul>
                      <p className="text-[9px] text-gray-400 mt-1.5 pt-1.5 border-t border-slate-700">
                        Above 18 kHz: Dark = good, Bright = bad
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-950 rounded border border-slate-800 p-2 relative">
                  {result.spectrogramBase64 ? (
                    <img
                      src={`data:image/png;base64,${result.spectrogramBase64}`}
                      alt="Spectrogram - Watermark Analysis"
                      className="w-full rounded border border-slate-700"
                    />
                  ) : (
                    <div className="aspect-video bg-gradient-to-b from-slate-800 via-slate-700 to-slate-800 rounded border border-slate-700 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl mb-1">⏳</div>
                        <p className="text-xs text-gray-400">Generating spectrogram...</p>
                      </div>
                    </div>
                  )}
                </div>
                <p className={`text-[10px] mt-1 ${
                  result.status === 'clean' ? 'text-green-400' :
                  result.status === 'suspicious' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {result.status === 'clean' && '✓ Clean - No watermark detected'}
                  {result.status === 'suspicious' && '⚠ Suspicious - Elevated energy detected'}
                  {result.status === 'watermarked' && '⚠️ Watermarked - High energy in 18-22 kHz'}
                </p>
              </div>
            </div>

            {/* Explanation */}
            <div className="bg-slate-900/50 rounded border border-slate-700 p-2 mt-2">
              <h6 className="text-xs font-semibold text-white mb-1.5">🔍 How to Read This:</h6>
              <ul className="text-[10px] text-gray-300 space-y-1 list-disc list-inside">
                <li>
                  <span className="text-green-400 font-medium">Green dashed lines (14-18 kHz):</span> Reference range - used as baseline for comparison. Normal audio has low energy here.
                </li>
                <li>
                  <span className="text-red-400 font-medium">Red dashed lines (18-22 kHz):</span> Watermark detection zone - AI watermarks are typically embedded here. High energy (bright colors) = suspicious.
                </li>
                <li>
                  <strong className="text-white">Color meaning:</strong> Dark purple/blue = low energy (good), Yellow/green = high energy (bad for watermark zone).
                </li>
                <li>
                  <strong className="text-white">Comparison:</strong> Compare your file (right) to the clean example (left). If both show dark colors above 18 kHz, your file is likely clean.
                </li>
                <li>
                  <strong className="text-white">Warning sign:</strong> Bright yellow/green spots above 18 kHz in your file indicate possible watermarks that should be removed.
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={reset}
              className="flex-1 px-3 md:px-4 py-1.5 md:py-2 bg-blue-500 text-white rounded text-xs md:text-sm font-medium hover:bg-blue-600"
            >
              Analyze New File
            </button>
            {onOpenCleaner && result && (
              <button
                onClick={() => onOpenCleaner(file || undefined, result.status === 'clean')}
                className={`flex-1 px-3 md:px-4 py-1.5 md:py-2 text-white rounded text-xs md:text-sm font-bold transition-all ${
                  result.status === 'clean'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                    : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
                }`}
              >
                {result.status === 'clean' ? '✓ Continue to Key Detect' : '🚨 Remove Fingerprints'}
              </button>
            )}
          </div>
          </>
        )}
      </div>
    </div>
  );
}

