'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getApiPath } from '../lib/api';

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
  spectrogramBase64: string;
}

interface FingerprintAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCleaner?: (file?: File) => void;
  preloadedFile?: File;
  originRect?: DOMRect | null; // For zoom animation
}

export default function FingerprintAnalyzer({ isOpen, onClose, onOpenCleaner, preloadedFile, originRect }: FingerprintAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Zoom animation states
  const [animationPhase, setAnimationPhase] = useState<'opening' | 'open' | 'closing' | 'closed'>('closed');
  
  // Timer states for progress tracking
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Drag and resize state (disabled when using zoom animation)
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 900, height: 700 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Zoom animation effect
  useEffect(() => {
    if (isOpen && originRect) {
      setAnimationPhase('opening');
      const timer = setTimeout(() => {
        setAnimationPhase('open');
      }, 400);
      return () => clearTimeout(timer);
    } else if (!isOpen) {
      setAnimationPhase('closing');
      const timer = setTimeout(() => {
        setAnimationPhase('closed');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, originRect]);
  
  // Handle zoom animation positioning
  useEffect(() => {
    if (!modalRef.current || !originRect) return;
    
    const modal = modalRef.current;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const finalX = (viewportWidth - 900) / 2;
    const finalY = (viewportHeight - 700) / 2;
    const finalWidth = 900;
    const finalHeight = 700;
    
    const startX = originRect.left;
    const startY = originRect.top;
    const startWidth = originRect.width;
    const startHeight = originRect.height;
    
    if (animationPhase === 'opening') {
      modal.style.position = 'fixed';
      modal.style.left = `${startX}px`;
      modal.style.top = `${startY}px`;
      modal.style.width = `${startWidth}px`;
      modal.style.height = `${startHeight}px`;
      modal.style.transformOrigin = 'top left';
      modal.style.transition = 'none';
      modal.style.opacity = '0';
      
      modal.offsetHeight;
      
      requestAnimationFrame(() => {
        modal.style.transition = 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)';
        modal.style.left = `${finalX}px`;
        modal.style.top = `${finalY}px`;
        modal.style.width = `${finalWidth}px`;
        modal.style.height = `${finalHeight}px`;
        modal.style.opacity = '1';
      });
    } else if (animationPhase === 'closing') {
      requestAnimationFrame(() => {
        modal.style.transition = 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)';
        modal.style.left = `${startX}px`;
        modal.style.top = `${startY}px`;
        modal.style.width = `${startWidth}px`;
        modal.style.height = `${startHeight}px`;
        modal.style.opacity = '0';
      });
    } else if (animationPhase === 'open') {
      modal.style.position = 'fixed';
      modal.style.left = `${finalX}px`;
      modal.style.top = `${finalY}px`;
      modal.style.width = `${finalWidth}px`;
      modal.style.height = `${finalHeight}px`;
      modal.style.transformOrigin = 'center center';
      modal.style.transition = 'none';
      modal.style.opacity = '1';
    }
  }, [animationPhase, originRect]);

  // Handle preloaded file from cleaner
  useEffect(() => {
    if (preloadedFile) {
      setFile(preloadedFile);
      setResult(null);
      setError('');
      setProgress('📎 File automatically transferred from cleaning - ready for analysis');
    }
  }, [preloadedFile]);

  // Drag functionality
  const handleDragStart = (e: React.MouseEvent) => {
    if (isMaximized) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && !isMaximized) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
      if (isResizing && !isMaximized) {
        const newSize = { ...size };
        if (resizeDir.includes('e')) {
          newSize.width = Math.max(600, e.clientX - position.x);
        }
        if (resizeDir.includes('w')) {
          const newWidth = Math.max(600, size.width - (e.clientX - position.x));
          newSize.width = newWidth;
          setPosition(prev => ({ ...prev, x: e.clientX }));
        }
        if (resizeDir.includes('s')) {
          newSize.height = Math.max(500, e.clientY - position.y);
        }
        if (resizeDir.includes('n')) {
          const newHeight = Math.max(500, size.height - (e.clientY - position.y));
          newSize.height = newHeight;
          setPosition(prev => ({ ...prev, y: e.clientY }));
        }
        setSize(newSize);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDir('');
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, position, size, resizeDir, isMaximized]);

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    if (isMaximized) return;
    e.stopPropagation();
    setIsResizing(true);
    setResizeDir(direction);
  };

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
      setResult(null);
      setError('');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError('');
    }
  };

  // Estimate processing time based on file size
  const estimateProcessingTime = (fileSizeMB: number): number => {
    // Base estimates (in seconds):
    // Small files (<10 MB): ~15-30s
    // Medium files (10-30 MB): ~30-90s
    // Large files (30-60 MB): ~90-180s
    // Very large files (>60 MB): ~180-300s
    
    if (fileSizeMB < 10) return 30;
    if (fileSizeMB < 30) return 90;
    if (fileSizeMB < 60) return 180;
    return 300; // 5 minutes for very large files
  };

  // Timer effect - updates every second while analyzing
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

  // Set estimated time when file is selected
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
    
    // Set estimated time based on file size
    const fileSizeMB = file.size / (1024 * 1024);
    const useMP3Optimization = fileSizeMB > 30;
    setEstimatedSeconds(estimateProcessingTime(fileSizeMB));
    
    const startTime = Date.now();

    try {
      // Show MP3 optimization message if applicable
      if (useMP3Optimization) {
        console.log(`⚡ MP3 Optimization: File is ${fileSizeMB.toFixed(2)} MB - will convert to MP3 for faster analysis`);
        setProgress('⚡ Large file detected - converting to MP3 for faster analysis...');
        // Small delay to show the message
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.log(`📊 Direct analysis: File is ${fileSizeMB.toFixed(2)} MB - analyzing WAV directly`);
        setProgress('Preparing analysis...');
      }

      const formData = new FormData();
      formData.append('audio', file);

      // Update progress based on optimization
      if (useMP3Optimization) {
        setProgress('🔄 Converting to MP3 (this may take 10-20 seconds)...');
      } else {
        setProgress('Analyzing audio file...');
      }

      const response = await fetch(getApiPath('/api/analyze-fingerprint'), {
        method: 'POST',
        body: formData,
      });

      // Update progress when analysis starts (after MP3 conversion if applicable)
      if (useMP3Optimization) {
        console.log('✓ MP3 conversion should be complete - starting analysis...');
        setProgress('✓ MP3 conversion complete - analyzing audio file...');
      } else {
        setProgress('Analyzing audio file...');
      }

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle timeout errors specifically
        if (response.status === 504 || errorData.code === 'TIMEOUT') {
          throw new Error(
            errorData.details || 
            'Request timeout - file is too large. Railway HTTP timeout exceeded. Try with a smaller file or wait for optimization update.'
          );
        }
        
        throw new Error(errorData.error || 'Analysis failed');
      }

      const analysisResult: AnalysisResult = await response.json();
      setResult(analysisResult);
      
      // Log processing time for future estimates
      const processingTime = Math.round((Date.now() - startTime) / 1000);
      console.log(`📊 Processing time logged: ${processingTime}s for ${fileSizeMB.toFixed(1)} MB file`);
      
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

  if (!isOpen && animationPhase === 'closed') return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean': return 'text-green-600';
      case 'suspicious': return 'text-yellow-600';
      case 'watermarked': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'clean': return '✓ No fingerprints detected';
      case 'suspicious': return '⚠ Suspicious energy in high frequencies';
      case 'watermarked': return '⚠ Possible watermark detected';
      default: return 'Unknown status';
    }
  };

  // Use zoom animation if originRect is provided, otherwise use old drag/resize behavior
  const useZoomAnimation = !!originRect;
  
  return (
    <>
      {/* Backdrop - only when using zoom animation and fully open */}
      {useZoomAnimation && (
        <div
          className={`fixed inset-0 bg-slate-900/70 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
            animationPhase === 'open' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ 
            pointerEvents: 'none', // Don't allow clicks on backdrop
            zIndex: 40
          }}
        />
      )}
      
      {/* Legacy backdrop for non-zoom mode */}
      {!useZoomAnimation && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-[2px] flex items-center justify-center z-50 p-4" />
      )}
      
      <div 
        ref={modalRef}
        className={`bg-slate-800 rounded-xl shadow-2xl border-2 border-slate-700 flex flex-col ${
          useZoomAnimation ? '' : isMaximized ? 'absolute inset-4' : 'absolute'
        }`}
        style={useZoomAnimation ? {} : (isMaximized ? {} : {
          width: `${size.width}px`,
          height: `${size.height}px`,
          left: position.x ? `${position.x}px` : '50%',
          top: position.y ? `${position.y}px` : '50%',
          transform: position.x ? 'none' : 'translate(-50%, -50%)',
          zIndex: 50
        })}
      >
        {/* Header med controls */}
        <div 
          className={`bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-xl px-6 py-3 flex items-center justify-between select-none ${
            useZoomAnimation ? '' : 'cursor-move'
          }`}
          onMouseDown={useZoomAnimation ? undefined : handleDragStart}
        >
          <div className="flex items-center gap-3">
            <img src="/unicsonic-logo.svg" alt="UnicSonic" className="w-8 h-8" />
            <h2 className="text-xl font-bold text-white drop-shadow-md">
              UnicSonic Fingerprint Analysis
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="w-8 h-8 rounded hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded hover:bg-red-500/80 flex items-center justify-center text-white transition-colors font-bold text-xl"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {!result ? (
            <>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  dragActive ? 'border-purple-500 bg-purple-500/20' : 'border-slate-600 bg-slate-900/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="text-4xl mb-4">🎵</div>
                <p className="text-gray-300 mb-4">
                  Drag audio file here or click to select
                </p>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="analyzer-file-input"
                />
                <label
                  htmlFor="analyzer-file-input"
                  className="inline-block px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg cursor-pointer hover:from-purple-700 hover:to-indigo-700 shadow-lg"
                >
                  Select File
                </label>
              </div>

              {file && (
                <div className="mt-4 p-4 bg-slate-700 rounded-lg border border-slate-600">
                  <p className="text-sm text-gray-400">Selected file:</p>
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-sm text-gray-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  {file.size > 30 * 1024 * 1024 && (
                    <div className="mt-2 p-2 bg-blue-500/20 border border-blue-500/50 rounded">
                      <p className="text-xs text-blue-200 font-medium mb-1">
                        ⚡ MP3 Optimization Enabled
                      </p>
                      <p className="text-xs text-blue-300">
                        Large file detected. Will convert to MP3 first for faster analysis (50-70% faster). 
                        Original WAV preserved for cleaning if needed.
                      </p>
                    </div>
                  )}
                  {file.size <= 30 * 1024 * 1024 && file.size > 20 * 1024 * 1024 && (
                    <div className="mt-2 p-2 bg-orange-500/20 border border-orange-500/50 rounded">
                      <p className="text-xs text-orange-200">
                        ⏱️ Large file detected. Processing may take 2-5 minutes. Please be patient!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {progress && (
                <div className="mt-4 p-4 bg-purple-500/20 rounded-lg border border-purple-500/50">
                  <p className="text-purple-200 mb-2">{progress}</p>
                  
                  {/* Timer and Progress Visualization */}
                  {analyzing && (
                    <div className="mt-3 space-y-2">
                      {/* Timer Display */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-purple-300">⏱️ Elapsed:</span>
                          <span className="font-mono font-bold text-purple-100">
                            {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                        {estimatedSeconds && (
                          <div className="flex items-center gap-2">
                            <span className="text-purple-300">Estimated:</span>
                            <span className="font-mono text-purple-200">
                              {Math.floor(estimatedSeconds / 60)}:{(estimatedSeconds % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      {estimatedSeconds && (
                        <div className="w-full bg-purple-900/50 rounded-full h-3 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000 ease-out relative overflow-hidden"
                            style={{ 
                              width: `${Math.min((elapsedSeconds / estimatedSeconds) * 100, 95)}%` 
                            }}
                          >
                            {/* Animated shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                          </div>
                        </div>
                      )}
                      
                      {/* Time remaining estimate */}
                      {estimatedSeconds && elapsedSeconds < estimatedSeconds && (
                        <p className="text-xs text-purple-300 text-center">
                          ~{Math.max(1, Math.ceil((estimatedSeconds - elapsedSeconds) / 60))} minute{Math.ceil((estimatedSeconds - elapsedSeconds) / 60) !== 1 ? 's' : ''} remaining
                        </p>
                      )}
                      {estimatedSeconds && elapsedSeconds >= estimatedSeconds && (
                        <p className="text-xs text-orange-300 text-center animate-pulse">
                          ⏳ Taking longer than expected... Please wait
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-500/20 rounded-lg border border-red-500/50">
                  <p className="text-red-200">❌ {error}</p>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <div className="flex gap-4">
                  <button
                    onClick={analyzeFile}
                    disabled={!file || analyzing}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed shadow-lg"
                  >
                    {analyzing ? 'Analyzing...' : 'Start Analysis'}
                  </button>
                  {file && (
                    <button
                      onClick={reset}
                      disabled={analyzing}
                      className="px-6 py-3 bg-slate-700 text-gray-200 rounded-lg font-medium hover:bg-slate-600 disabled:opacity-50 border border-slate-600"
                    >
                      Reset
                    </button>
                  )}
                </div>
                
                {/* Direct link to Cleaner */}
                {onOpenCleaner && (
                  <button
                    onClick={() => onOpenCleaner(file || undefined)}
                    className="w-full py-2 px-4 rounded-lg font-medium text-orange-300 bg-orange-500/20 border-2 border-orange-500/50 hover:bg-orange-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    🧹 Open Fingerprint Remover
                    <span className="text-sm text-orange-400">→</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-6">
                {/* Status Header */}
                <div className="p-6 bg-slate-700 rounded-lg border-2 border-slate-600">
                  <h3 className={`text-2xl font-bold ${getStatusColor(result.status)} mb-2`}>
                    {getStatusText(result.status)}
                  </h3>
                  <p className="text-gray-300 text-sm">{result.filename}</p>
                </div>

                {/* Technical Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-700 rounded-lg border border-slate-600">
                    <p className="text-sm text-gray-400">Sample Rate</p>
                    <p className="text-xl font-bold text-purple-400">{result.sampleRate} Hz</p>
                  </div>
                  <div className="p-4 bg-slate-700 rounded-lg border border-slate-600">
                    <p className="text-sm text-gray-400">Duration</p>
                    <p className="text-xl font-bold text-purple-400">{result.duration.toFixed(2)}s</p>
                  </div>
                  {result.watermarkToReferenceRatio !== undefined && (
                    <div className={`p-4 rounded-lg border ${
                      result.watermarkToReferenceRatio > 0.35 ? 'bg-red-500/20 border-red-500/50' : 
                      result.watermarkToReferenceRatio > 0.25 ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-green-500/20 border-green-500/50'
                    }`}>
                      <p className="text-sm text-gray-300">Watermark/Reference Ratio</p>
                      <p className={`text-xl font-bold ${
                        result.watermarkToReferenceRatio > 0.35 ? 'text-red-300' : 
                        result.watermarkToReferenceRatio > 0.25 ? 'text-yellow-300' : 'text-green-300'
                      }`}>
                        {result.watermarkToReferenceRatio.toFixed(3)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {result.watermarkToReferenceRatio > 0.35 ? 'High (suspicious)' : 
                         result.watermarkToReferenceRatio > 0.25 ? 'Moderate' : 'Normal'}
                      </p>
                    </div>
                  )}
                  {result.framesWatermarkElevatedPercent !== undefined && (
                    <div className={`p-4 rounded-lg border ${
                      result.framesWatermarkElevatedPercent > 15 ? 'bg-red-500/20 border-red-500/50' : 
                      result.framesWatermarkElevatedPercent > 10 ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-green-500/20 border-green-500/50'
                    }`}>
                      <p className="text-sm text-gray-300">Frames with Elevated WM</p>
                      <p className={`text-xl font-bold ${
                        result.framesWatermarkElevatedPercent > 15 ? 'text-red-300' : 
                        result.framesWatermarkElevatedPercent > 10 ? 'text-yellow-300' : 'text-green-300'
                      }`}>
                        {result.framesWatermarkElevatedPercent.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {result.framesWatermarkElevatedPercent > 15 ? 'High frequency' : 
                         result.framesWatermarkElevatedPercent > 10 ? 'Moderate' : 'Low (normal)'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Key Detection Metrics */}
                <div className="p-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg border-2 border-purple-500/50">
                  <h4 className="font-bold text-white mb-3">🔍 Key Detection Metrics</h4>
                  
                  <div className="space-y-3">
                    {result.watermarkToReferenceRatio !== undefined && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-200">Watermark vs Reference (18-22 kHz / 14-18 kHz)</span>
                          <span className={`font-bold ${
                            result.watermarkToReferenceRatio > 0.35 ? 'text-red-300' : 
                            result.watermarkToReferenceRatio > 0.25 ? 'text-yellow-300' : 'text-green-300'
                          }`}>
                            {result.watermarkToReferenceRatio.toFixed(3)}
                          </span>
                        </div>
                        <div className="bg-slate-900 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full ${
                              result.watermarkToReferenceRatio > 0.35 ? 'bg-red-500' : 
                              result.watermarkToReferenceRatio > 0.25 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(result.watermarkToReferenceRatio * 200, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Clean audio: ~0.18 | Watermark: &gt;0.35
                        </p>
                      </div>
                    )}
                    
                    {result.framesWatermarkElevatedPercent !== undefined && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-200">Frames with Elevated Energy</span>
                          <span className={`font-bold ${
                            result.framesWatermarkElevatedPercent > 15 ? 'text-red-300' : 
                            result.framesWatermarkElevatedPercent > 10 ? 'text-yellow-300' : 'text-green-300'
                          }`}>
                            {result.framesWatermarkElevatedPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="bg-slate-900 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full ${
                              result.framesWatermarkElevatedPercent > 15 ? 'bg-red-500' : 
                              result.framesWatermarkElevatedPercent > 10 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(result.framesWatermarkElevatedPercent * 5, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Clean audio: ~7% | Watermark: &gt;15%
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Spectrogram */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-bold text-gray-800 mb-3">📊 Spectral Analysis</h4>
                  <img
                    src={`data:image/png;base64,${result.spectrogramBase64}`}
                    alt="Spectrogram"
                    className="w-full rounded-lg border border-gray-300"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Red line at 18 kHz marks the watermark region. Energy above this line indicates possible fingerprints.
                  </p>
                </div>

                {/* Conclusion */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-bold text-gray-800 mb-3">📋 Conclusion</h4>
                  {result.status === 'clean' && (
                    <p className="text-gray-700">
                      This audio file appears clean. There is no suspicious energy in the high frequency range (18-22 kHz) 
                      typically used for digital watermarks. The file can be used without further processing.
                    </p>
                  )}
                  {result.status === 'suspicious' && (
                    <p className="text-gray-700">
                      Slightly elevated energy has been detected in the high frequency range. This could be naturally occurring 
                      or a weak watermark. Consider running the file through the "Remove Fingerprints" function to be certain.
                    </p>
                  )}
                  {result.status === 'watermarked' && (
                    <p className="text-gray-700">
                      ⚠ Significant energy has been detected in the watermark region (18-22 kHz). This likely indicates 
                      a digital fingerprint from AI generation tools. It is strongly recommended to run the file through 
                      the "Remove Fingerprints" function before release.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex gap-4">
                  <button
                    onClick={reset}
                    className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
                  >
                    Analyze New File
                  </button>
                  {file && (
                    <button
                      onClick={() => {
                        const url = URL.createObjectURL(file);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = file.name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 flex items-center gap-2"
                    >
                      💾 Download
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
                
                {/* Direct link to Cleaner - especially useful after finding watermarks */}
                {onOpenCleaner && result && result.status !== 'clean' && (
                  <button
                    onClick={() => onOpenCleaner(file || undefined)}
                    className="w-full py-3 px-6 rounded-lg font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    🚨 Remove These Fingerprints Now!
                    <span className="text-lg">→</span>
                  </button>
                )}
                
                {/* Also show for clean files, but less prominent */}
                {onOpenCleaner && result && result.status === 'clean' && (
                  <button
                    onClick={() => onOpenCleaner(file || undefined)}
                    className="w-full py-2 px-4 rounded-lg font-medium text-blue-700 bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                  >
                    🧹 Open Fingerprint Remover
                    <span className="text-sm text-blue-600">→</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Resize Handles - only when not using zoom animation */}
        {!isMaximized && !useZoomAnimation && (
          <>
            {/* Corner resize handles */}
            <div 
              className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize hover:opacity-100 opacity-50 transition-opacity z-10"
              onMouseDown={(e) => handleResizeStart(e, 'se')}
            >
              <div className="absolute bottom-1 right-1 w-4 h-4 border-r-2 border-b-2 border-purple-400"></div>
            </div>
            <div 
              className="absolute bottom-0 left-0 w-6 h-6 cursor-nesw-resize hover:opacity-100 opacity-50 transition-opacity z-10"
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
            >
              <div className="absolute bottom-1 left-1 w-4 h-4 border-l-2 border-b-2 border-purple-400"></div>
            </div>
            <div 
              className="absolute top-12 right-0 w-6 h-6 cursor-nesw-resize hover:opacity-100 opacity-50 transition-opacity z-10"
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
            >
              <div className="absolute top-1 right-1 w-4 h-4 border-r-2 border-t-2 border-purple-400"></div>
            </div>
            <div 
              className="absolute top-12 left-0 w-6 h-6 cursor-nwse-resize hover:opacity-100 opacity-50 transition-opacity z-10"
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
            >
              <div className="absolute top-1 left-1 w-4 h-4 border-l-2 border-t-2 border-purple-400"></div>
            </div>
            {/* Edge resize handles */}
            <div 
              className="absolute bottom-0 left-6 right-6 h-2 cursor-ns-resize hover:bg-purple-400/50 transition-colors z-10"
              onMouseDown={(e) => handleResizeStart(e, 's')}
            ></div>
            <div 
              className="absolute top-12 left-6 right-6 h-2 cursor-ns-resize hover:bg-purple-400/50 transition-colors z-10"
              onMouseDown={(e) => handleResizeStart(e, 'n')}
            ></div>
            <div 
              className="absolute left-0 top-14 bottom-2 w-2 cursor-ew-resize hover:bg-purple-400/50 transition-colors z-10"
              onMouseDown={(e) => handleResizeStart(e, 'w')}
            ></div>
            <div 
              className="absolute right-0 top-14 bottom-2 w-2 cursor-ew-resize hover:bg-purple-400/50 transition-colors z-10"
              onMouseDown={(e) => handleResizeStart(e, 'e')}
            ></div>
          </>
        )}
      </div>
    </>
  );
}


