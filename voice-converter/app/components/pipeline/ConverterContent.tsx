'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getApiPath } from '../../lib/api';

interface ConverterContentProps {
  onNextProcess?: (file?: File) => void;
  preloadedFile?: File;
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

export default function ConverterContent({ onNextProcess, preloadedFile }: ConverterContentProps) {
  const [file, setFile] = useState<File | null>(preloadedFile || null);
  const [dragActive, setDragActive] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState('');
  const [convertedFile, setConvertedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  
  const [outputFormat, setOutputFormat] = useState<'wav' | 'mp3'>('wav');
  const [sampleRate, setSampleRate] = useState<number | null>(null);
  const [bitDepth, setBitDepth] = useState<number | null>(null);
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (preloadedFile) {
      setFile(preloadedFile);
      setConvertedFile(null);
      setError('');
      setProgress('📎 File ready for conversion');
    }
  }, [preloadedFile]);

  // Auto-set output format based on input file type
  useEffect(() => {
    if (file) {
      const detectedType = detectFileType(file.name);
      // If input is WAV, suggest MP3 (and vice versa)
      if (detectedType === 'WAV') {
        setOutputFormat('mp3');
      } else if (detectedType === 'MP3') {
        setOutputFormat('wav');
      }
      // For other formats, default to WAV (higher quality)
      else {
        setOutputFormat('wav');
      }
    }
  }, [file]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('audio/')) {
      setFile(droppedFile);
      setConvertedFile(null);
      setError('');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setConvertedFile(null);
      setError('');
    }
  };

  const estimateProcessingTime = (fileSizeMB: number): number => {
    if (fileSizeMB < 10) return 20;
    if (fileSizeMB < 30) return 60;
    if (fileSizeMB < 60) return 120;
    return 180;
  };

  useEffect(() => {
    if (converting) {
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
  }, [converting]);

  useEffect(() => {
    if (file && !converting) {
      const fileSizeMB = file.size / (1024 * 1024);
      setEstimatedSeconds(estimateProcessingTime(fileSizeMB));
    }
  }, [file, converting]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConvert = async () => {
    if (!file) return;

    // Check if conversion is actually needed
    const detectedType = detectFileType(file.name);
    const isSameFormat = (detectedType === 'WAV' && outputFormat === 'wav') || 
                         (detectedType === 'MP3' && outputFormat === 'mp3');
    
    if (isSameFormat && !sampleRate && !bitDepth) {
      setError('No conversion needed: Input and output formats are the same with no quality changes. Please select a different output format or adjust quality settings.');
      return;
    }

    setConverting(true);
    setError('');
    setProgress('🔄 Starting conversion...');
    setConvertedFile(null);

    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('outputFormat', outputFormat);
      if (sampleRate) formData.append('sampleRate', sampleRate.toString());
      if (bitDepth) formData.append('bitDepth', bitDepth.toString());
      formData.append('bitrate', '320k');

      const response = await fetch(getApiPath('/api/convert-audio'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Conversion failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Get filename from Content-Disposition header (should be normalized with original name)
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = file.name.replace(/\.[^/.]+$/, '') + '_converted.' + outputFormat;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch) {
          // Strip any quotes from the filename
          filename = filenameMatch[1].replace(/^["']|["']$/g, '');
        }
      }

      // Convert response to blob and create File with normalized name
      const blob = await response.blob();
      const convertedBlob = new File([blob], filename, { type: blob.type });
      setConvertedFile(convertedBlob);
      setProgress(''); // Clear progress, success shown in header

    } catch (err) {
      console.error('Conversion error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Conversion failed';
      setError(errorMessage);
      setProgress('');
    } finally {
      setConverting(false);
    }
  };

  const handleContinueToAnalyzer = (useOriginal: boolean = false) => {
    if (onNextProcess) {
      if (useOriginal && file) {
        onNextProcess(file);
      } else if (convertedFile) {
        onNextProcess(convertedFile);
      }
    }
  };

  const handleDownload = () => {
    if (convertedFile && downloadLinkRef.current) {
      const url = URL.createObjectURL(convertedFile);
      downloadLinkRef.current.href = url;
      downloadLinkRef.current.download = convertedFile.name;
      downloadLinkRef.current.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }
  };

  const detectedType = file ? detectFileType(file.name) : null;
  const showWarning = file && detectedType === 'WAV' && outputFormat === 'mp3';

  return (
    <div className="space-y-2 md:space-y-2 p-3 md:p-3">
      {/* File Upload */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-4 md:p-3 text-center transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-400 dark:border-slate-600'}
          ${file ? 'bg-slate-50 dark:bg-slate-800/50' : ''}
        `}
      >
        {file ? (
          <div className="space-y-2">
            <div className="text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-200">
              📎 {file.name}
            </div>
            <div className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
              {detectedType && `Detected format: ${detectedType}`}
              <br />
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </div>
            <button
              onClick={() => {
                setFile(null);
                setConvertedFile(null);
                setError('');
              }}
              className="text-xs md:text-sm text-red-600 dark:text-red-400 hover:underline mt-2"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-2xl md:text-4xl mb-2">🎵</div>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
              Drag & drop audio file or click to select
            </p>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
              id="audio-upload"
            />
            <label
              htmlFor="audio-upload"
              className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-xs md:text-sm"
            >
              Select File
            </label>
          </div>
        )}
      </div>

      {/* Conversion Settings */}
      {file && (
        <div className="space-y-2 md:space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 md:p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm md:text-base text-slate-800 dark:text-slate-200">
              Conversion Settings
            </h3>
            {convertedFile && (
              <span className="text-xs md:text-sm text-green-600 dark:text-green-400 font-medium">
                ✅ Conversion completed!
              </span>
            )}
          </div>

          {/* Output Format */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5 md:mb-1">
              Output Format
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setOutputFormat('wav')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  outputFormat === 'wav'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                WAV
              </button>
              <button
                onClick={() => setOutputFormat('mp3')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  outputFormat === 'mp3'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                MP3
              </button>
            </div>
          </div>

          {/* Warning for WAV → MP3 */}
          {showWarning && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg p-1.5 md:p-2 text-xs md:text-sm text-red-800 dark:text-red-200">
              ⚠️ MP3 is not for upload - quality may be lost
            </div>
          )}

          {/* Sample Rate */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5 md:mb-1">
              Sample Rate (optional - keeps original if not set)
            </label>
            <select
              value={sampleRate || ''}
              onChange={(e) => setSampleRate(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs md:text-sm text-slate-800 dark:text-slate-200"
            >
              <option value="">Keep original</option>
              <option value="44100">44.1 kHz (CD standard)</option>
              <option value="48000">48 kHz (Video standard)</option>
              <option value="96000">96 kHz (High-res)</option>
            </select>
          </div>

          {/* Bit Depth (only for WAV) */}
          {outputFormat === 'wav' && (
            <div>
              <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5 md:mb-1">
                Bit Depth (optional - keeps original if not set)
              </label>
              <select
                value={bitDepth || ''}
                onChange={(e) => setBitDepth(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs md:text-sm text-slate-800 dark:text-slate-200"
              >
                <option value="">Keep original</option>
                <option value="16">16-bit (CD standard)</option>
                <option value="24">24-bit (High-res)</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      {progress && !convertedFile && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-1.5 md:p-2 text-xs md:text-sm text-blue-800 dark:text-blue-200">
          {progress}
        </div>
      )}

      {/* Timer & Progress Bar */}
      {converting && (
        <div className="space-y-1 md:space-y-1.5">
          <div className="flex justify-between text-xs md:text-sm text-slate-600 dark:text-slate-400">
            <span>Elapsed: {formatTime(elapsedSeconds)}</span>
            {estimatedSeconds && (
              <span>Est: {formatTime(estimatedSeconds)}</span>
            )}
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 md:h-2">
            <div
              className="bg-blue-600 h-1.5 md:h-2 rounded-full transition-all duration-300 animate-pulse"
              style={{
                width: estimatedSeconds
                  ? `${Math.min((elapsedSeconds / estimatedSeconds) * 100, 95)}%`
                  : '50%',
              }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg p-1.5 md:p-2 text-xs md:text-sm text-red-800 dark:text-red-200">
          ❌ {error}
        </div>
      )}

      {/* Convert Button */}
      {file && !convertedFile && (
        <button
          onClick={handleConvert}
          disabled={converting}
          className="w-full px-4 py-2 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed font-medium text-sm md:text-base transition-colors"
        >
          {converting ? '🔄 Converting...' : '🔄 Convert Audio'}
        </button>
      )}

      {/* Success & Actions */}
      {convertedFile && (
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex flex-col gap-1.5 md:gap-2">
            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="w-full px-4 py-2 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm md:text-base transition-colors"
            >
              📥 Download Converted File
            </button>

            {/* Continue to Analyzer Options */}
            {onNextProcess && (
              <div className="space-y-1.5 md:space-y-2">
                <button
                  onClick={() => handleContinueToAnalyzer(false)}
                  className="w-full px-4 py-2 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm md:text-base transition-colors"
                >
                  ✓ Continue to Analyzer (using converted file)
                </button>
                {file && (
                  <button
                    onClick={() => handleContinueToAnalyzer(true)}
                    className="w-full px-4 py-2 md:py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium text-sm md:text-base transition-colors"
                  >
                    ↶ Use Original File Instead
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden download link */}
      <a ref={downloadLinkRef} href="#" download style={{ display: 'none' }} />
    </div>
  );
}

