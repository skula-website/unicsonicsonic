'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { getApiPath } from '../../lib/api';

interface TrimmerContentProps {
  onNextProcess?: (file?: File) => void;
  preloadedFile?: File;
}

export default function TrimmerContent({ onNextProcess, preloadedFile }: TrimmerContentProps) {
  const [audioFile, setAudioFile] = useState<File | null>(preloadedFile || null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  
  // Waveform and trimming state
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [trimmedFile, setTrimmedFile] = useState<File | null>(null);
  const [trimmedFileUrl, setTrimmedFileUrl] = useState<string | null>(null);

  // Initialize audio when file is loaded
  useEffect(() => {
    if (preloadedFile) {
      setAudioFile(preloadedFile);
      const url = URL.createObjectURL(preloadedFile);
      setAudioUrl(url);
      setOriginalFile(preloadedFile);
    }
  }, [preloadedFile]);

  // Generate waveform data from audio file
  const generateWaveform = useCallback(async (file: File) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const data = audioBuffer.getChannelData(0); // Use first channel
      const sampleRate = audioBuffer.sampleRate;
      const duration = audioBuffer.duration;
      setDuration(duration);
      
      // Downsample for visualization (1000 points max for smooth rendering)
      const samples = 1000;
      const blockSize = Math.floor(data.length / samples);
      const waveform: number[] = [];
      
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          const index = i * blockSize + j;
          if (index < data.length) {
            sum += Math.abs(data[index]);
          }
        }
        waveform.push(sum / blockSize);
      }
      
      setWaveformData(waveform);
      setEndTime(duration);
      
      // Create audio element for playback
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      const audio = new Audio(url);
      audioRef.current = audio;
      setAudioElement(audio);
      
      // Update current time during playback
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      
    } catch (err) {
      console.error('Error generating waveform:', err);
      setError('Failed to load audio file');
    }
  }, []);

  // Load file and generate waveform
  useEffect(() => {
    if (audioFile && !waveformData.length) {
      generateWaveform(audioFile);
    }
  }, [audioFile, waveformData.length, generateWaveform]);

  // Draw waveform on canvas
  useEffect(() => {
    if (!waveformCanvasRef.current || !waveformData.length || !duration) return;
    
    const canvas = waveformCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    
    // Clear canvas
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.fillRect(0, 0, width, height);
    
    // Draw waveform
    const barWidth = drawWidth / waveformData.length;
    const maxAmplitude = Math.max(...waveformData);
    
    // Draw unselected area (before start)
    ctx.fillStyle = '#475569'; // slate-600
    for (let i = 0; i < waveformData.length; i++) {
      const x = padding + i * barWidth;
      const time = (i / waveformData.length) * duration;
      if (time < startTime) {
        const amplitude = (waveformData[i] / maxAmplitude) * drawHeight;
        ctx.fillRect(x, padding + drawHeight / 2 - amplitude / 2, barWidth - 1, amplitude);
      }
    }
    
    // Draw selected area
    ctx.fillStyle = '#8b5cf6'; // purple-500
    for (let i = 0; i < waveformData.length; i++) {
      const x = padding + i * barWidth;
      const time = (i / waveformData.length) * duration;
      if (time >= startTime && time <= endTime) {
        const amplitude = (waveformData[i] / maxAmplitude) * drawHeight;
        ctx.fillRect(x, padding + drawHeight / 2 - amplitude / 2, barWidth - 1, amplitude);
      }
    }
    
    // Draw unselected area (after end)
    ctx.fillStyle = '#475569'; // slate-600
    for (let i = 0; i < waveformData.length; i++) {
      const x = padding + i * barWidth;
      const time = (i / waveformData.length) * duration;
      if (time > endTime) {
        const amplitude = (waveformData[i] / maxAmplitude) * drawHeight;
        ctx.fillRect(x, padding + drawHeight / 2 - amplitude / 2, barWidth - 1, amplitude);
      }
    }
    
    // Draw playback position indicator (thin line, so trim markers are visible)
    if (currentTime > 0 && currentTime <= duration) {
      const playX = padding + (currentTime / duration) * drawWidth;
      ctx.strokeStyle = '#fbbf24'; // amber-400
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playX, padding);
      ctx.lineTo(playX, padding + drawHeight);
      ctx.stroke();
    }
    
    // Draw start marker (thin line)
    const startX = padding + (startTime / duration) * drawWidth;
    ctx.strokeStyle = '#10b981'; // emerald-500
    ctx.lineWidth = 1; // Very thin line
    ctx.beginPath();
    ctx.moveTo(startX, padding);
    ctx.lineTo(startX, padding + drawHeight);
    ctx.stroke();
    
    // Draw start handle (triangle pointing down)
    const handleSize = 12;
    const handleY = padding - handleSize;
    ctx.fillStyle = '#10b981'; // emerald-500
    ctx.beginPath();
    ctx.moveTo(startX, handleY);
    ctx.lineTo(startX - handleSize / 2, handleY + handleSize);
    ctx.lineTo(startX + handleSize / 2, handleY + handleSize);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Draw end marker (thin line)
    const endX = padding + (endTime / duration) * drawWidth;
    ctx.strokeStyle = '#ef4444'; // red-500
    ctx.lineWidth = 1; // Very thin line
    ctx.beginPath();
    ctx.moveTo(endX, padding);
    ctx.lineTo(endX, padding + drawHeight);
    ctx.stroke();
    
    // Draw end handle (triangle pointing down)
    ctx.fillStyle = '#ef4444'; // red-500
    ctx.beginPath();
    ctx.moveTo(endX, handleY);
    ctx.lineTo(endX - handleSize / 2, handleY + handleSize);
    ctx.lineTo(endX + handleSize / 2, handleY + handleSize);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
  }, [waveformData, duration, startTime, endTime, currentTime]);

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      setOriginalFile(file);
      setWaveformData([]);
      setError('');
      setProgress('');
    }
  };

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setOriginalFile(file);
      setWaveformData([]);
      setError('');
      setProgress('');
    }
  };

  // Handle waveform click/drag
  const handleWaveformMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!waveformCanvasRef.current || !duration) return;
    
    const canvas = waveformCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const padding = 20;
    const drawWidth = canvas.width - padding * 2;
    const clickTime = ((x - padding) / drawWidth) * duration;
    
    // Check if clicking near start or end handle (larger hit area for triangle)
    const startX = padding + (startTime / duration) * drawWidth;
    const endX = padding + (endTime / duration) * drawWidth;
    const handleSize = 12;
    const handleY = padding - handleSize;
    
    // Check if clicking in triangle area (above waveform) or on marker line
    const isInStartHandle = (x >= startX - handleSize / 2 && x <= startX + handleSize / 2 && 
                              y >= handleY && y <= padding + 20) || 
                            (Math.abs(x - startX) < 8 && y >= padding && y <= padding + 200);
    const isInEndHandle = (x >= endX - handleSize / 2 && x <= endX + handleSize / 2 && 
                            y >= handleY && y <= padding + 20) || 
                          (Math.abs(x - endX) < 8 && y >= padding && y <= padding + 200);
    
    if (isInStartHandle) {
      setIsDragging('start');
    } else if (isInEndHandle) {
      setIsDragging('end');
    } else {
      // Click in waveform - seek to that position
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(startTime, Math.min(endTime, clickTime));
      }
    }
  };

  const handleWaveformMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !waveformCanvasRef.current || !duration) return;
    
    const canvas = waveformCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padding = 20;
    const drawWidth = canvas.width - padding * 2;
    const clickTime = ((x - padding) / drawWidth) * duration;
    const clampedTime = Math.max(0, Math.min(duration, clickTime));
    
    if (isDragging === 'start') {
      setStartTime(Math.min(clampedTime, endTime - 0.1)); // Min 0.1s selection
    } else if (isDragging === 'end') {
      setEndTime(Math.max(clampedTime, startTime + 0.1)); // Min 0.1s selection
    }
  };

  const handleWaveformMouseUp = () => {
    setIsDragging(null);
  };

  // Playback controls
  const handlePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // If current time is outside selection, start from selection start
      if (currentTime < startTime || currentTime > endTime) {
        audioRef.current.currentTime = startTime;
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(startTime, Math.min(endTime, time));
    }
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Trim audio
  const handleTrim = async () => {
    if (!audioFile || startTime >= endTime) {
      setError('Invalid time range');
      return;
    }

    setIsProcessing(true);
    setError('');
    setProgress('✂️ Trimming audio...');

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('startSeconds', startTime.toString());
      formData.append('endSeconds', endTime.toString());

      const response = await fetch(getApiPath('/api/trim-audio'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Trimming failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      setProgress('⏳ Downloading trimmed file...');

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Received empty file from server');
      }

      const trimmedUrl = window.URL.createObjectURL(blob);
      setTrimmedFileUrl(trimmedUrl);

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let trimmedFileName = audioFile.name.replace(/\.[^/.]+$/, '') + '_trimmed.wav';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch) {
          trimmedFileName = filenameMatch[1].replace(/^["']|["']$/g, '');
        }
      }

      const trimmedFile = new File([blob], trimmedFileName, { type: blob.type || 'audio/wav' });
      setTrimmedFile(trimmedFile);

      setProgress('✅ Trimming completed!');
      setIsProcessing(false);

    } catch (err) {
      console.error('Trimming error:', err);
      setProgress(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  // Replace original with trimmed
  const handleReplaceOriginal = () => {
    if (!trimmedFile || !originalFile) return;
    
    const confirmed = window.confirm(
      '⚠️ Warning: This will replace the original file with the trimmed version.\n\n' +
      'The original file will be lost, but you can always reload it from Process 7 or earlier.\n\n' +
      'Do you want to continue?'
    );
    
    if (confirmed) {
      setAudioFile(trimmedFile);
      setOriginalFile(trimmedFile);
      setTrimmedFile(null);
      setTrimmedFileUrl(null);
      setWaveformData([]);
      setStartTime(0);
      setEndTime(0);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      setProgress('✅ Original file replaced with trimmed version');
    }
  };

  // Download trimmed file
  const handleDownload = () => {
    if (!trimmedFileUrl || !trimmedFile) return;

    const a = document.createElement('a');
    a.href = trimmedFileUrl;
    a.download = trimmedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (trimmedFileUrl) {
        URL.revokeObjectURL(trimmedFileUrl);
      }
    };
  }, [audioUrl, trimmedFileUrl]);

  return (
    <div className="space-y-4">
      {/* File Upload */}
      {!audioFile ? (
        <div
          ref={containerRef}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-gray-300 text-sm mb-2">📎 Drop audio file here or click to select</p>
          <p className="text-gray-500 text-xs">Supports: WAV, MP3, FLAC, M4A, etc.</p>
        </div>
      ) : (
        <>
          {/* File Info */}
          <div className="bg-slate-700 rounded-lg p-3">
            <p className="text-white text-sm font-medium truncate">📎 {audioFile.name}</p>
            <p className="text-gray-400 text-xs mt-1">
              Duration: {formatTime(duration)} | Selected: {formatTime(endTime - startTime)}
            </p>
          </div>

          {/* Waveform Visualization */}
          <div className="bg-slate-800 rounded-lg p-4">
            <canvas
              ref={waveformCanvasRef}
              width={800}
              height={220}
              className="w-full h-auto cursor-pointer"
              onMouseDown={handleWaveformMouseDown}
              onMouseMove={handleWaveformMouseMove}
              onMouseUp={handleWaveformMouseUp}
              onMouseLeave={handleWaveformMouseUp}
              style={{ maxWidth: '100%', height: 'auto' }}
            />
            
            {/* Time Labels */}
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Start: {formatTime(startTime)}</span>
              <span>Current: {formatTime(currentTime)}</span>
              <span>End: {formatTime(endTime)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-4 bg-slate-700 rounded-lg p-3">
            <button
              onClick={handlePlay}
              disabled={isProcessing}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
            <div className="flex-1 text-sm text-gray-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Trim Button */}
          <button
            onClick={handleTrim}
            disabled={isProcessing || startTime >= endTime}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isProcessing ? progress : '✂️ Trim Audio'}
          </button>

          {/* Results */}
          {trimmedFile && (
            <div className="bg-slate-700 rounded-lg p-4 space-y-3">
              <p className="text-white font-medium">✅ Trimmed file ready</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                >
                  📥 Download
                </button>
                <button
                  onClick={handleReplaceOriginal}
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium"
                >
                  🔄 Replace Original
                </button>
              </div>
              
              {/* Navigation to next process (step 9) */}
              {onNextProcess && (
                <div className="pt-2 border-t border-slate-600">
                  <p className="text-xs text-gray-400 mb-2">Continue to next process:</p>
                  <button
                    onClick={() => onNextProcess(trimmedFile)}
                    className="w-full px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded text-xs md:text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all"
                  >
                    ✓ Continue to Fade In/Out (using trimmed file)
                  </button>
                  <button
                    onClick={() => onNextProcess(audioFile || undefined)}
                    className="w-full mt-2 px-3 md:px-4 py-1.5 md:py-2 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs md:text-sm font-medium transition-all"
                  >
                    Use Original File Instead
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Progress */}
          {progress && !isProcessing && (
            <div className="bg-blue-900/50 border border-blue-500 rounded-lg p-3">
              <p className="text-blue-200 text-sm">{progress}</p>
            </div>
          )}

          {/* Navigation to next process (if file loaded but not trimmed yet) */}
          {onNextProcess && audioFile && !trimmedFile && (
            <div className="bg-slate-700 rounded-lg p-3 border-t border-slate-600 mt-2">
              <p className="text-xs text-gray-400 mb-2">Continue to next process:</p>
              <button
                onClick={() => onNextProcess(audioFile)}
                className="w-full px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded text-xs md:text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all"
              >
                ✓ Continue to Fade In/Out (using current file)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

