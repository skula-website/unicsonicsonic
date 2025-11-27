'use client';

import { useState, useRef, useEffect } from 'react';
import AudioSpectrum from './AudioSpectrum';
import WatermarkEnergyComparison from './WatermarkEnergyComparison';
import { getApiPath } from '../lib/api';

interface AudioCleanerProps {
  isOpen?: boolean; // Add isOpen prop
  onClose: () => void;
  onOpenAnalyzer?: (file?: File) => void;
  preloadedFile?: File;
  originRect?: DOMRect | null; // For zoom animation
}

export default function AudioCleaner({ isOpen = true, onClose, onOpenAnalyzer, preloadedFile, originRect }: AudioCleanerProps) {
  const [audioFile, setAudioFile] = useState<File | null>(preloadedFile || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [originalFileUrl, setOriginalFileUrl] = useState<string | null>(null);
  const [cleanedFileUrl, setCleanedFileUrl] = useState<string | null>(null);
  const [cleanedFile, setCleanedFile] = useState<File | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  const [size, setSize] = useState({ width: 1000, height: 700 });
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
      if (animationPhase !== 'closed' && animationPhase !== 'closing') {
        setAnimationPhase('closing');
        const timer = setTimeout(() => {
          setAnimationPhase('closed');
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, originRect]); // Remove animationPhase from dependencies to prevent loop
  
  // Handle zoom animation positioning
  useEffect(() => {
    if (!modalRef.current || !originRect) return;
    
    const modal = modalRef.current;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const finalX = (viewportWidth - 1000) / 2;
    const finalY = (viewportHeight - 700) / 2;
    const finalWidth = 1000;
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

  // Estimate processing time based on file size
  const estimateProcessingTime = (fileSizeMB: number): number => {
    // Cleaning takes longer than analysis:
    // Small files (<10 MB): ~20-40s
    // Medium files (10-30 MB): ~60-120s
    // Large files (30-60 MB): ~180-300s
    // Very large files (>60 MB): ~300-480s
    
    if (fileSizeMB < 10) return 40;
    if (fileSizeMB < 30) return 120;
    if (fileSizeMB < 60) return 300;
    return 480; // 8 minutes for very large files
  };

  // Timer effect - updates every second while processing
  useEffect(() => {
    if (isProcessing) {
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
  }, [isProcessing]);

  // Set estimated time when file is selected
  useEffect(() => {
    if (audioFile && !isProcessing) {
      const fileSizeMB = audioFile.size / (1024 * 1024);
      setEstimatedSeconds(estimateProcessingTime(fileSizeMB));
    }
  }, [audioFile, isProcessing]);

  // Set preloaded file hvis den kommer fra analyzer
  useEffect(() => {
    if (preloadedFile) {
      setAudioFile(preloadedFile);
      // Create preview URL for original file
      const url = URL.createObjectURL(preloadedFile);
      setOriginalFileUrl(url);
      setProgress('📎 File automatically transferred from analysis');
      
      // Cleanup on unmount
      return () => URL.revokeObjectURL(url);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      // Create blob URL for original file for comparison
      if (originalFileUrl) URL.revokeObjectURL(originalFileUrl);
      const url = URL.createObjectURL(file);
      setOriginalFileUrl(url);
      setProgress('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      // Create blob URL for original file for comparison
      if (originalFileUrl) URL.revokeObjectURL(originalFileUrl);
      const url = URL.createObjectURL(file);
      setOriginalFileUrl(url);
      setProgress('');
    }
  };

  const handleClean = async () => {
    if (!audioFile) return;

    setIsProcessing(true);
    setProgress('🧹 Removing fingerprints and watermarks...');
    setElapsedSeconds(0);
    
    // Set estimated time based on file size
    const fileSizeMB = audioFile.size / (1024 * 1024);
    setEstimatedSeconds(estimateProcessingTime(fileSizeMB));
    
    const startTime = Date.now();

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);

      console.log('🚀 Starting fetch to', getApiPath('/api/clean-audio'));
      
      const response = await fetch(getApiPath('/api/clean-audio'), {
        method: 'POST',
        body: formData,
        // No timeout - let it take as long as needed for large files
        signal: undefined,
      }).catch((fetchError) => {
        console.error('❌ Fetch failed:', fetchError);
        console.error('Fetch error details:', {
          message: fetchError.message,
          name: fetchError.name,
          stack: fetchError.stack
        });
        throw new Error(`Network error: ${fetchError.message}`);
      });

      console.log('✓ Response received:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error:', errorText);
        let errorMsg = 'Cleaning failed';
        try {
          const errorJson = JSON.parse(errorText);
          
          // Handle timeout errors specifically
          if (response.status === 504 || errorJson.code === 'TIMEOUT') {
            errorMsg = errorJson.details || 
              'Request timeout - file is too large. Railway HTTP timeout exceeded. Try with a smaller file or wait for optimization update.';
          } else {
            errorMsg = errorJson.details || errorJson.error || errorMsg;
          }
        } catch {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      setProgress('⏳ Downloading cleaned file...');
      console.log('📥 Reading response blob...');

      // Stream the response to avoid memory issues with large files
      const blob = await response.blob();
      console.log(`✓ Blob received: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
      
      if (blob.size === 0) {
        throw new Error('Received empty file from server');
      }

      const cleanedUrl = window.URL.createObjectURL(blob);
      setCleanedFileUrl(cleanedUrl);
      
      // Also save as File for transfer to analyzer
      const cleanedFileName = audioFile.name.replace(/\.(wav|mp3|m4a|flac)$/i, '_cleaned.wav');
      const file = new File([blob], cleanedFileName, { type: 'audio/wav' });
      setCleanedFile(file);

      // Log processing time for future estimates
      const processingTime = Math.round((Date.now() - startTime) / 1000);
      console.log(`📊 Processing time logged: ${processingTime}s for ${fileSizeMB.toFixed(1)} MB file`);

      setProgress('✅ Cleaning completed!');
      setIsProcessing(false);
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

    } catch (error) {
      console.error('Cleaning error:', error);
      setProgress(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(false);
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleDownload = () => {
    if (!cleanedFileUrl || !audioFile) return;

    const a = document.createElement('a');
    a.href = cleanedFileUrl;
    a.download = `cleaned_${audioFile.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    if (originalFileUrl) URL.revokeObjectURL(originalFileUrl);
    if (cleanedFileUrl) URL.revokeObjectURL(cleanedFileUrl);
    
    setAudioFile(null);
    setOriginalFileUrl(null);
    setCleanedFileUrl(null);
    setCleanedFile(null);
    setProgress('');
  };

  // Use zoom animation if originRect is provided, otherwise use old drag/resize behavior
  const useZoomAnimation = !!originRect;
  
  if (!isOpen && animationPhase === 'closed') return null;
  
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
          className={`bg-gradient-to-r from-orange-600 to-amber-600 rounded-t-xl px-6 py-3 flex items-center justify-between select-none ${
            useZoomAnimation ? '' : 'cursor-move'
          }`}
          onMouseDown={useZoomAnimation ? undefined : handleDragStart}
        >
          <div className="flex items-center gap-3">
            <img src="/unicsonic-logo.svg" alt="UnicSonic" className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold text-white drop-shadow-md">
                UnicSonic Fingerprint Remover
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Remove AI watermarks from Suno and other AI generators
              </p>
            </div>
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
        <div className="flex-1 overflow-y-auto p-8">

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors ${
            audioFile
              ? 'border-green-500 bg-green-500/20'
              : 'border-slate-600 hover:border-orange-500 bg-slate-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {audioFile ? (
            <div className="space-y-2">
              <p className="text-4xl">🎵</p>
              <p className="font-medium text-white">{audioFile.name}</p>
              <p className="text-sm text-gray-300">
                {(audioFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              {audioFile.size > 30 * 1024 * 1024 && (
                <div className="mt-2 p-2 bg-orange-500/20 border border-orange-500/50 rounded">
                  <p className="text-xs text-orange-200">
                    ⏱️ Large file ({(audioFile.size / 1024 / 1024).toFixed(0)} MB). Processing may take 3-8 minutes.
                  </p>
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-orange-400 hover:text-orange-300 text-sm font-medium"
              >
                Change File
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-4xl">📁</p>
              <p className="text-gray-300">
                Drag audio file here or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-orange-400 hover:text-orange-300 font-medium"
                >
                  select file
                </button>
              </p>
              <p className="text-xs text-gray-400">
                WAV, MP3, M4A, FLAC etc.
              </p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-orange-200 font-medium mb-2">
            🔍 What gets removed?
          </p>
          <ul className="text-xs text-orange-100 space-y-1 ml-4 list-disc">
            <li>Spectral watermarks (18-22 kHz ultrasound)</li>
            <li>Statistical fingerprints in amplitude patterns</li>
            <li>Inaudible DC offset and subsonic rumble</li>
            <li>File metadata (EXIF, ID3, producer tags)</li>
          </ul>
        </div>

        {/* Progress */}
        {progress && (
          <div className="bg-slate-700 border border-slate-600 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-gray-200 mb-2">{progress}</p>
            {progress.includes('Cleaning completed') && (
              <p className="text-sm text-green-300 mt-2 mb-2">
                🔊 No audible difference - your audio quality is fully preserved!
              </p>
            )}
            
            {/* Timer and Progress Visualization */}
            {isProcessing && (
              <div className="mt-3 space-y-2">
                {/* Timer Display */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-300">⏱️ Elapsed:</span>
                    <span className="font-mono font-bold text-orange-100">
                      {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  {estimatedSeconds && (
                    <div className="flex items-center gap-2">
                      <span className="text-orange-300">Estimated:</span>
                      <span className="font-mono text-orange-200">
                        {Math.floor(estimatedSeconds / 60)}:{(estimatedSeconds % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Progress Bar */}
                {estimatedSeconds && (
                  <div className="w-full bg-orange-900/50 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-1000 ease-out relative overflow-hidden"
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
                  <p className="text-xs text-orange-300 text-center">
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

        {/* Before/After Comparison (if processed) */}
        {cleanedFileUrl && originalFileUrl && (
          <div className="mb-6 space-y-4">
            <h3 className="text-lg font-bold text-white">📊 Before/After Comparison</h3>
            
            {/* Audio Players */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Before */}
              <div className="bg-red-500/20 border-2 border-red-500/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-red-300">⚠️ Original (with fingerprints)</span>
                </div>
                <audio controls className="w-full">
                  <source src={originalFileUrl} />
                </audio>
                <p className="text-xs text-red-200 mt-2">
                  May contain AI watermarks in the 18-22 kHz range
                </p>
              </div>
              
              {/* After */}
              <div className="bg-green-500/20 border-2 border-green-500/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-green-300">✓ Cleaned</span>
                </div>
                <audio controls className="w-full">
                  <source src={cleanedFileUrl} />
                </audio>
                <p className="text-xs text-green-600 mt-2">
                  Fingerprints removed - ready for distribution
                </p>
              </div>
            </div>

            {/* Simple Energy Comparison (Most Convincing) - REAL DATA */}
            <WatermarkEnergyComparison 
              originalFile={audioFile}
              cleanedFile={cleanedFile}
            />

            {/* Technical Spectrum (for nerds - collapsible) */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-semibold text-gray-600 hover:text-gray-800 flex items-center gap-2">
                <span className="transform group-open:rotate-90 transition-transform">▶</span>
                🔬 Technical Spectrum Analysis (Advanced)
              </summary>
              <div className="mt-3 space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <AudioSpectrum 
                    audioUrl={originalFileUrl} 
                    label="⚠️ Original (Before Cleaning)"
                    color="red"
                  />
                  <AudioSpectrum 
                    audioUrl={cleanedFileUrl} 
                    label="✓ Cleaned (After Cleaning)"
                    color="green"
                  />
                </div>
                <p className="text-xs text-gray-600 italic">
                  💡 Frequency domain visualization (14-24 kHz). Subtle differences in the 18-22 kHz range.
                </p>
              </div>
            </details>

            {/* Quality Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>💡 Compare:</strong> Listen to both audio files and view the spectrograms. 
                The cleaned file should sound identical, but energy in the red zone (18-22 kHz) should be reduced.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {!cleanedFileUrl ? (
            // Before cleaning
            <div className="flex gap-3">
              <button
                onClick={handleClean}
                disabled={!audioFile || isProcessing}
                className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
                  audioFile && !isProcessing
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isProcessing ? '🔄 Processing...' : '🧹 Remove Fingerprints'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-lg font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            // After cleaning
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 py-3 px-6 rounded-lg font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
              >
                💾 Download Cleaned File
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-lg font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                Clean New File
              </button>
            </div>
          )}
          
          {/* Direct link to Analyzer */}
          {onOpenAnalyzer && !cleanedFileUrl && (
            <button
              onClick={() => onOpenAnalyzer()}
              className="w-full py-2 px-4 rounded-lg font-medium text-purple-700 bg-purple-50 border-2 border-purple-200 hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
            >
              🔍 Open Fingerprint Analysis
              <span className="text-sm text-purple-600">→</span>
            </button>
          )}

          {/* After cleaning: suggest analyzing cleaned file */}
          {cleanedFileUrl && onOpenAnalyzer && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-800 mb-3">
                <strong>💡 Verify cleaning:</strong> Want to double-check that fingerprints are removed?
              </p>
              <button
                onClick={() => onOpenAnalyzer && onOpenAnalyzer(cleanedFile || undefined)}
                className="w-full py-2 px-4 rounded-lg font-medium text-purple-700 bg-white border-2 border-purple-300 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
              >
                🔍 Analyze Cleaned File
                <span className="text-sm">→</span>
              </button>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            ⚠️ <strong>Note:</strong> Suno Pro/Premium should already have watermark-free output.
            Only use this tool if you're unsure or experiencing issues.
          </p>
        </div>
        
        {/* Resize Handles - only when not using zoom animation */}
        {!isMaximized && !useZoomAnimation && (
          <>
            {/* Corner resize handles */}
            <div 
              className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize hover:opacity-100 opacity-50 transition-opacity z-10"
              onMouseDown={(e) => handleResizeStart(e, 'se')}
            >
              <div className="absolute bottom-1 right-1 w-4 h-4 border-r-2 border-b-2 border-orange-400"></div>
            </div>
            <div 
              className="absolute bottom-0 left-0 w-6 h-6 cursor-nesw-resize hover:opacity-100 opacity-50 transition-opacity z-10"
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
            >
              <div className="absolute bottom-1 left-1 w-4 h-4 border-l-2 border-b-2 border-orange-400"></div>
            </div>
            <div 
              className="absolute top-12 right-0 w-6 h-6 cursor-nesw-resize hover:opacity-100 opacity-50 transition-opacity z-10"
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
            >
              <div className="absolute top-1 right-1 w-4 h-4 border-r-2 border-t-2 border-orange-400"></div>
            </div>
            <div 
              className="absolute top-12 left-0 w-6 h-6 cursor-nwse-resize hover:opacity-100 opacity-50 transition-opacity z-10"
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
            >
              <div className="absolute top-1 left-1 w-4 h-4 border-l-2 border-t-2 border-orange-400"></div>
            </div>
            {/* Edge resize handles */}
            <div 
              className="absolute bottom-0 left-6 right-6 h-2 cursor-ns-resize hover:bg-orange-400/50 transition-colors z-10"
              onMouseDown={(e) => handleResizeStart(e, 's')}
            ></div>
            <div 
              className="absolute top-12 left-6 right-6 h-2 cursor-ns-resize hover:bg-orange-400/50 transition-colors z-10"
              onMouseDown={(e) => handleResizeStart(e, 'n')}
            ></div>
            <div 
              className="absolute left-0 top-14 bottom-2 w-2 cursor-ew-resize hover:bg-orange-400/50 transition-colors z-10"
              onMouseDown={(e) => handleResizeStart(e, 'w')}
            ></div>
            <div 
              className="absolute right-0 top-14 bottom-2 w-2 cursor-ew-resize hover:bg-orange-400/50 transition-colors z-10"
              onMouseDown={(e) => handleResizeStart(e, 'e')}
            ></div>
          </>
        )}
        </div>
      </div>
    </>
  );
}

