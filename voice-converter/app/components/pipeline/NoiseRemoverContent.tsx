'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { getApiPath } from '../../lib/api';
import { normalizeFilename } from '../../lib/filename';
import FileSelector from './FileSelector';
import { useFileHistory } from '../../lib/fileHistory';

interface NoiseRemoverContentProps {
  onNextProcess?: (file?: File) => void;
  onPreviousProcess?: () => void;
  preloadedFile?: File;
}

export default function NoiseRemoverContent({ onNextProcess, onPreviousProcess, preloadedFile }: NoiseRemoverContentProps) {
  const { fileHistory, getLatestFile } = useFileHistory();
  
  // File state - prioritize preloadedFile, otherwise use latest from history
  const getInitialFile = () => {
    if (preloadedFile) return preloadedFile;
    const latest = getLatestFile();
    return latest ? latest.file : null;
  };
  
  const [originalFile, setOriginalFile] = useState<File | null>(getInitialFile());
  const [originalFileUrl, setOriginalFileUrl] = useState<string | null>(null);
  const [denoisedFile, setDenoisedFile] = useState<File | null>(null);
  const [denoisedFileUrl, setDenoisedFileUrl] = useState<string | null>(null);
  
  // Initialize file URL when file is set
  useEffect(() => {
    if (originalFile && !originalFileUrl) {
      const url = URL.createObjectURL(originalFile);
      setOriginalFileUrl(url);
      // Show message if file was auto-selected from history
      if (!preloadedFile) {
        const latest = getLatestFile();
        if (latest && latest.file.name === originalFile.name) {
          setProgress('📎 Seneste fil automatisk valgt');
        }
      } else {
        setProgress('📎 Fil automatisk overført fra forrige proces');
      }
    }
  }, [originalFile, originalFileUrl, preloadedFile, getLatestFile]);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [reductionStrength, setReductionStrength] = useState(30); // 0-100% (default 30% = less aggressive)
  const [stationary, setStationary] = useState(false);
  
  // Audio playback state
  const [activePlayer, setActivePlayer] = useState<'original' | 'denoised'>('original');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDraggingPlayback, setIsDraggingPlayback] = useState(false);
  const isDraggingPlaybackRef = useRef(false); // Ref to track dragging state for event listeners
  const [isHoveringPlaybackHandle, setIsHoveringPlaybackHandle] = useState(false);
  
  // Keep ref in sync with state
  useEffect(() => {
    isDraggingPlaybackRef.current = isDraggingPlayback;
  }, [isDraggingPlayback]);
  
  // Stop all audio when modal closes/opens (listen to custom event)
  useEffect(() => {
    const handleStopAllAudio = () => {
      if (originalAudioRef.current) {
        originalAudioRef.current.pause();
        originalAudioRef.current.currentTime = 0;
      }
      if (denoisedAudioRef.current) {
        denoisedAudioRef.current.pause();
        denoisedAudioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
    };
    
    window.addEventListener('stop-all-audio', handleStopAllAudio);
    return () => {
      window.removeEventListener('stop-all-audio', handleStopAllAudio);
    };
  }, []);
  
  // Waveform state
  const [originalWaveform, setOriginalWaveform] = useState<number[]>([]);
  const [denoisedWaveform, setDenoisedWaveform] = useState<number[]>([]);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const denoisedAudioRef = useRef<HTMLAudioElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const denoisedCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Generate waveform data from audio file
  const generateWaveform = useCallback(async (file: File): Promise<number[]> => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const data = audioBuffer.getChannelData(0);
      const samples = 1000; // Downsample for visualization
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
      
      return waveform;
    } catch (err) {
      console.error('Error generating waveform:', err);
      return [];
    }
  }, []);

  // Load waveform when original file changes
  useEffect(() => {
    if (originalFile && !originalWaveform.length) {
      generateWaveform(originalFile).then(setOriginalWaveform);
    }
  }, [originalFile, originalWaveform.length, generateWaveform]);

  // Load waveform when denoised file changes
  useEffect(() => {
    if (denoisedFile && !denoisedWaveform.length) {
      generateWaveform(denoisedFile).then(setDenoisedWaveform);
    }
  }, [denoisedFile, denoisedWaveform.length, generateWaveform]);

  // Setup audio elements
  useEffect(() => {
    if (originalFileUrl) {
      // Cleanup previous audio
      if (originalAudioRef.current) {
        originalAudioRef.current.pause();
        originalAudioRef.current = null;
      }
      
      const audio = new Audio(originalFileUrl);
      originalAudioRef.current = audio;
      
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });
      
      audio.addEventListener('timeupdate', () => {
        // Don't update time during drag (prevents conflicts)
        if (isDraggingPlaybackRef.current) return;
        
        if (activePlayer === 'original' || !denoisedFile) {
          setCurrentTime(audio.currentTime);
        }
      });
      
      audio.addEventListener('ended', () => {
        if (activePlayer === 'original' || !denoisedFile) {
          setIsPlaying(false);
        }
      });
      
      return () => {
        audio.pause();
        audio.removeEventListener('loadedmetadata', () => {});
        audio.removeEventListener('timeupdate', () => {});
        audio.removeEventListener('ended', () => {});
      };
    }
  }, [originalFileUrl, activePlayer, denoisedFile]); // Removed isDraggingPlayback - don't re-run effect when drag starts

  useEffect(() => {
    if (denoisedFileUrl) {
      // Cleanup previous audio
      if (denoisedAudioRef.current) {
        denoisedAudioRef.current.pause();
        denoisedAudioRef.current = null;
      }
      
      const audio = new Audio(denoisedFileUrl);
      denoisedAudioRef.current = audio;
      
      audio.addEventListener('loadedmetadata', () => {
        if (!duration) setDuration(audio.duration);
      });
      
      audio.addEventListener('timeupdate', () => {
        // Don't update time during drag (prevents conflicts)
        if (isDraggingPlaybackRef.current) return;
        
        if (activePlayer === 'denoised') {
          setCurrentTime(audio.currentTime);
        }
      });
      
      audio.addEventListener('ended', () => {
        if (activePlayer === 'denoised') {
          setIsPlaying(false);
        }
      });
      
      return () => {
        audio.pause();
        audio.removeEventListener('loadedmetadata', () => {});
        audio.removeEventListener('timeupdate', () => {});
        audio.removeEventListener('ended', () => {});
      };
    }
  }, [denoisedFileUrl, duration, activePlayer]); // Removed isDraggingPlayback - don't re-run effect when drag starts

  // Global mouse events for stable dragging (works even when mouse leaves canvas)
  useEffect(() => {
    if (!isDraggingPlayback) {
      // Only cleanup when dragging stops
      return;
    }
    
    console.log('🎯 Global drag handler active', {
      activePlayer,
      duration,
      hasOriginalCanvas: !!originalCanvasRef.current,
      hasDenoisedCanvas: !!denoisedCanvasRef.current
    });
    
    // Store current values in refs to avoid stale closures
    const currentActivePlayer = activePlayer;
    const currentDuration = duration;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      console.log('🖱️ Global mousemove event received');
      
      // Use the active canvas for calculations
      const activeCanvas = currentActivePlayer === 'original' ? originalCanvasRef.current : denoisedCanvasRef.current;
      
      if (!activeCanvas) {
        console.warn('⚠️ No active canvas found');
        return;
      }
      
      if (!currentDuration || currentDuration <= 0) {
        console.warn('⚠️ No duration:', currentDuration);
        return;
      }
      
      const rect = activeCanvas.getBoundingClientRect();
      
      // Handle canvas scaling
      const scaleX = activeCanvas.width / rect.width;
      const x = (e.clientX - rect.left) * scaleX;
      
      const padding = 20;
      const drawWidth = activeCanvas.width - padding * 2;
      const clickTime = ((x - padding) / drawWidth) * currentDuration;
      const clampedTime = Math.max(0, Math.min(currentDuration, clickTime));
      
      console.log('🔄 Dragging to:', clampedTime.toFixed(2), 's', {
        clientX: e.clientX,
        rectLeft: rect.left,
        x,
        clickTime,
        clampedTime
      });
      
      // Call handleSeek directly with current values
      const masterAudio = currentActivePlayer === 'original' ? originalAudioRef.current : denoisedAudioRef.current;
      const slaveAudio = currentActivePlayer === 'original' ? denoisedAudioRef.current : originalAudioRef.current;
      
      if (masterAudio) {
        masterAudio.currentTime = clampedTime;
        console.log('✅ Master audio seeked to:', clampedTime);
      }
      if (slaveAudio) {
        slaveAudio.currentTime = clampedTime;
        console.log('✅ Slave audio seeked to:', clampedTime);
      }
      setCurrentTime(clampedTime);
    };
    
    const handleGlobalMouseUp = (e: MouseEvent) => {
      console.log('🛑 Drag ended (global mouseup)');
      setIsDraggingPlayback(false);
    };
    
    console.log('📌 Adding global event listeners');
    // Use capture phase to ensure we catch events before canvas handlers
    window.addEventListener('mousemove', handleGlobalMouseMove, { capture: true, passive: false });
    window.addEventListener('mouseup', handleGlobalMouseUp, { capture: true });
    
    return () => {
      console.log('🧹 Removing global event listeners (cleanup)');
      window.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
      window.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });
    };
  }, [isDraggingPlayback]); // Only depend on isDraggingPlayback to avoid unnecessary re-runs

  // Synchronize playback between players - improved with better timing
  useEffect(() => {
    if (!isPlaying || isDraggingPlayback) return;
    
    const masterAudio = activePlayer === 'original' ? originalAudioRef.current : denoisedAudioRef.current;
    const slaveAudio = activePlayer === 'original' ? denoisedAudioRef.current : originalAudioRef.current;
    
    if (masterAudio && slaveAudio) {
      // Sync immediately when playback starts
      slaveAudio.currentTime = masterAudio.currentTime;
      
      // Update slave position to match master continuously
      const updateSlave = () => {
        if (masterAudio && slaveAudio && !masterAudio.paused && !isDraggingPlaybackRef.current) {
          const masterTime = masterAudio.currentTime;
          const slaveTime = slaveAudio.currentTime;
          // Sync if difference is more than 0.05s (tighter sync)
          if (Math.abs(masterTime - slaveTime) > 0.05) {
            slaveAudio.currentTime = masterTime;
          }
        }
        if (isPlaying && !isDraggingPlaybackRef.current) {
          animationFrameRef.current = requestAnimationFrame(updateSlave);
        }
      };
      animationFrameRef.current = requestAnimationFrame(updateSlave);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, activePlayer, isDraggingPlayback]);

  // Draw waveforms
  useEffect(() => {
    if (!originalCanvasRef.current || !originalWaveform.length || !duration) return;
    
    const canvas = originalCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);
    
    const barWidth = drawWidth / originalWaveform.length;
    const maxAmplitude = Math.max(...originalWaveform);
    
    // Draw waveform
    ctx.fillStyle = activePlayer === 'original' ? '#3b82f6' : '#475569';
    for (let i = 0; i < originalWaveform.length; i++) {
      const x = padding + i * barWidth;
      const amplitude = (originalWaveform[i] / maxAmplitude) * drawHeight;
      ctx.fillRect(x, padding + drawHeight / 2 - amplitude / 2, barWidth - 1, amplitude);
    }
    
    // Draw playback position with drag handle (like trimmer)
    if (currentTime > 0 && currentTime <= duration) {
      const playX = padding + (currentTime / duration) * drawWidth;
      const handleSize = 12;
      const handleY = padding - handleSize;
      
      // Draw playback position line (thin)
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(playX, padding);
      ctx.lineTo(playX, padding + drawHeight);
      ctx.stroke();
      
      // Draw playback position handle (triangle pointing down)
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(playX, padding);
      ctx.lineTo(playX - handleSize / 2, handleY);
      ctx.lineTo(playX + handleSize / 2, handleY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [originalWaveform, duration, currentTime, activePlayer]);

  useEffect(() => {
    if (!denoisedCanvasRef.current || !denoisedWaveform.length || !duration) return;
    
    const canvas = denoisedCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);
    
    const barWidth = drawWidth / denoisedWaveform.length;
    const maxAmplitude = Math.max(...denoisedWaveform);
    
    // Draw waveform
    ctx.fillStyle = activePlayer === 'denoised' ? '#10b981' : '#475569';
    for (let i = 0; i < denoisedWaveform.length; i++) {
      const x = padding + i * barWidth;
      const amplitude = (denoisedWaveform[i] / maxAmplitude) * drawHeight;
      ctx.fillRect(x, padding + drawHeight / 2 - amplitude / 2, barWidth - 1, amplitude);
    }
    
    // Draw playback position with drag handle (like trimmer)
    if (currentTime > 0 && currentTime <= duration) {
      const playX = padding + (currentTime / duration) * drawWidth;
      const handleSize = 12;
      const handleY = padding - handleSize;
      
      // Draw playback position line (thin)
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(playX, padding);
      ctx.lineTo(playX, padding + drawHeight);
      ctx.stroke();
      
      // Draw playback position handle (triangle pointing down)
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(playX, padding);
      ctx.lineTo(playX - handleSize / 2, handleY);
      ctx.lineTo(playX + handleSize / 2, handleY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [denoisedWaveform, duration, currentTime, activePlayer]);

  // Handle file selection from FileSelector
  const handleFileSelect = (file: File) => {
    setOriginalFile(file);
    if (originalFileUrl) URL.revokeObjectURL(originalFileUrl);
    const url = URL.createObjectURL(file);
    setOriginalFileUrl(url);
    setOriginalWaveform([]);
    setDenoisedFile(null);
    setDenoisedFileUrl(null);
    setDenoisedWaveform([]);
    setProgress('');
    setError('');
    setCurrentTime(0);
    setIsPlaying(false);
    setActivePlayer('original');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      setOriginalFile(file);
      if (originalFileUrl) URL.revokeObjectURL(originalFileUrl);
      const url = URL.createObjectURL(file);
      setOriginalFileUrl(url);
      setOriginalWaveform([]);
      setDenoisedFile(null);
      setDenoisedFileUrl(null);
      setDenoisedWaveform([]);
      setProgress('');
      setError('');
    }
  };

  // Handle noise removal
  const handleRemoveNoise = async () => {
    if (!originalFile) return;

    setIsProcessing(true);
    setProgress('🔇 Removing noise...');
    setError('');
    setDenoisedFile(null);
    setDenoisedFileUrl(null);
    setDenoisedWaveform([]);

    try {
      const formData = new FormData();
      formData.append('audio', originalFile);
      formData.append('reductionStrength', (reductionStrength / 100).toString());
      formData.append('stationary', stationary.toString());
      formData.append('originalFilename', originalFile.name);

      const response = await fetch(getApiPath('/api/remove-noise'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Noise removal failed`;
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          errorDetails = errorData.details || '';
          console.error('API Error Response:', errorData);
        } catch (e) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
              errorDetails = errorText;
            }
          } catch (e2) {
            console.error('Failed to parse error response:', e2);
          }
        }
        const fullError = errorDetails ? `${errorMessage}\n\nDetails: ${errorDetails}` : errorMessage;
        throw new Error(fullError);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let denoisedFileName = `denoised_${originalFile.name}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?/);
        if (filenameMatch && filenameMatch[1]) {
          denoisedFileName = filenameMatch[1].replace(/^["']|["']$/g, '');
        }
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Received empty file from server');
      }

      const denoisedFile = new File([blob], denoisedFileName, { type: blob.type || 'audio/wav' });
      setDenoisedFile(denoisedFile);
      
      const denoisedUrl = URL.createObjectURL(blob);
      setDenoisedFileUrl(denoisedUrl);

      setProgress('✅ Noise removal completed!');
      setIsProcessing(false);

    } catch (err) {
      console.error('Noise removal error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      // Show first line of error message (main error) and full details in console
      const errorLines = errorMessage.split('\n');
      const mainError = errorLines[0];
      setError(mainError);
      setProgress(`❌ Error: ${mainError}`);
      setIsProcessing(false);
      
      // Log full error details to console for debugging
      if (errorLines.length > 1) {
        console.error('Full error details:', errorMessage);
      }
    }
  };

  // Handle playback - simplified and stable
  const handlePlayPause = () => {
    // Don't allow play/pause while dragging
    if (isDraggingPlayback) {
      console.log('⏸️ Play/pause blocked - dragging in progress');
      return;
    }
    
    console.log('▶️ Play/pause clicked, isDraggingPlayback:', isDraggingPlayback);
    
    // If only original file exists
    if (originalFile && !denoisedFile) {
      const audio = originalAudioRef.current;
      if (audio) {
        if (audio.paused) {
          console.log('▶️ Playing original (single file)');
          audio.play().catch(console.error);
          setIsPlaying(true);
          setActivePlayer('original');
        } else {
          console.log('⏸️ Pausing original (single file)');
          audio.pause();
          setIsPlaying(false);
        }
      }
      return;
    }
    
    // If both files exist
    const masterAudio = activePlayer === 'original' ? originalAudioRef.current : denoisedAudioRef.current;
    const slaveAudio = activePlayer === 'original' ? denoisedAudioRef.current : originalAudioRef.current;
    
    if (masterAudio && slaveAudio) {
      if (masterAudio.paused) {
        // Sync both players before starting
        const syncTime = masterAudio.currentTime;
        slaveAudio.currentTime = syncTime;
        console.log('▶️ Playing both files, synced at:', syncTime.toFixed(2), 's');
        masterAudio.play().catch(console.error);
        setIsPlaying(true);
      } else {
        console.log('⏸️ Pausing both files');
        masterAudio.pause();
        slaveAudio.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (time: number) => {
    const masterAudio = activePlayer === 'original' ? originalAudioRef.current : denoisedAudioRef.current;
    const slaveAudio = activePlayer === 'original' ? denoisedAudioRef.current : originalAudioRef.current;
    
    const clampedTime = Math.max(0, Math.min(duration, time));
    
    console.log('🎯 handleSeek called:', {
      time,
      clampedTime,
      duration,
      hasMaster: !!masterAudio,
      hasSlave: !!slaveAudio,
      activePlayer
    });
    
    if (masterAudio) {
      masterAudio.currentTime = clampedTime;
      console.log('✅ Master audio seeked to:', clampedTime);
    }
    if (slaveAudio) {
      slaveAudio.currentTime = clampedTime;
      console.log('✅ Slave audio seeked to:', clampedTime);
    }
    setCurrentTime(clampedTime);
  };

  // Handle waveform drag for playback position - ONLY via grab (no click-to-seek)
  const handleWaveformMouseDown = (e: React.MouseEvent<HTMLCanvasElement>, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (!canvasRef.current || !duration) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Handle canvas scaling - convert viewport coordinates to canvas coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const padding = 20;
    const drawWidth = canvas.width - padding * 2;
    const handleSize = 12;
    const handleY = padding - handleSize; // Base of triangle above waveform
    
    // Check if clicking in playback position triangle ONLY
    // Allow currentTime === 0 (start of track) - but only if duration is set
    const playX = (currentTime >= 0 && duration > 0) ? padding + (currentTime / duration) * drawWidth : -1;
    const hitAreaWidth = 30; // Even wider hit area (15px on each side) for easier grabbing
    const hitAreaHeight = 20; // Taller hit area for easier grabbing
    
    // Only allow dragging via triangle (not marker line or waveform)
    // More lenient Y check - triangle area plus some margin
    // Also allow clicking slightly below padding (in case triangle extends down)
    const isInPlaybackHandle = playX >= 0 && 
                               x >= playX - hitAreaWidth / 2 && x <= playX + hitAreaWidth / 2 && 
                               y >= handleY - 10 && y <= padding + hitAreaHeight; // Extended Y range for easier grabbing
    
    // Debug logging (can be removed later)
    if (Math.abs(x - playX) < 30) { // Only log if close to marker
      console.log('Grab check:', {
        x, y, playX, handleY, padding,
        xInRange: x >= playX - hitAreaWidth / 2 && x <= playX + hitAreaWidth / 2,
        yInRange: y >= handleY - 8 && y <= padding + 8,
        isInPlaybackHandle,
        currentTime,
        duration
      });
    }
    
    if (isInPlaybackHandle) {
      e.preventDefault(); // Prevent default behavior
      e.stopPropagation();
      
      console.log('✅ Grab started!');
      
      // Clicking on playback marker triangle - start dragging
      setIsDraggingPlayback(true);
      // Don't pause - let user control playback manually
    }
    // No else block - click-to-seek removed, only grab works
  };

  const handleWaveformMouseMove = (e: React.MouseEvent<HTMLCanvasElement>, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    // If dragging, don't handle hover - let global handler do the work
    // Don't stop propagation - let it bubble to window for global handler
    if (isDraggingPlayback) {
      return;
    }
    
    if (!canvasRef.current || !duration) {
      return;
    }
    
    // Check if mouse is over playback handle triangle
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Handle canvas scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const padding = 20;
    const drawWidth = canvas.width - padding * 2;
    const handleSize = 12;
    const handleY = padding - handleSize;
    
    const playX = currentTime >= 0 ? padding + (currentTime / duration) * drawWidth : -1;
    const hitAreaWidth = 30; // Match the hit area from mouseDown
    
    const isOverHandle = playX >= 0 && 
                         x >= playX - hitAreaWidth / 2 && x <= playX + hitAreaWidth / 2 && 
                         y >= handleY - 10 && y <= padding + 20; // Match the hit area from mouseDown
    
    setIsHoveringPlaybackHandle(isOverHandle);
  };

  const handleWaveformMouseUp = () => {
    if (isDraggingPlayback) {
      setIsDraggingPlayback(false);
      // Resume playback if it was playing before drag (optional - user can manually play)
    }
  };

  const handleWaveformMouseLeave = () => {
    setIsHoveringPlaybackHandle(false);
    handleWaveformMouseUp();
  };

  const handleTogglePlayer = () => {
    const currentMaster = activePlayer === 'original' ? originalAudioRef.current : denoisedAudioRef.current;
    const currentSlave = activePlayer === 'original' ? denoisedAudioRef.current : originalAudioRef.current;
    
    if (currentMaster && currentSlave) {
      const wasPlaying = !currentMaster.paused;
      const currentTime = currentMaster.currentTime;
      
      if (wasPlaying) {
        currentMaster.pause();
        currentSlave.pause();
      }
      
      const newActivePlayer = activePlayer === 'original' ? 'denoised' : 'original';
      setActivePlayer(newActivePlayer);
      
      if (wasPlaying) {
        // Resume playback with new master
        setTimeout(() => {
          const newMaster = newActivePlayer === 'original' ? originalAudioRef.current : denoisedAudioRef.current;
          const newSlave = newActivePlayer === 'original' ? denoisedAudioRef.current : originalAudioRef.current;
          if (newMaster && newSlave) {
            newMaster.currentTime = currentTime;
            newSlave.currentTime = currentTime;
            newMaster.play();
            setIsPlaying(true);
          }
        }, 50);
      }
    } else {
      setActivePlayer(activePlayer === 'original' ? 'denoised' : 'original');
    }
  };

  // Handle download
  const handleDownload = () => {
    if (denoisedFile) {
      const url = URL.createObjectURL(denoisedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = denoisedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Handle reset - keep original file but clear denoised
  const handleReset = () => {
    if (denoisedFileUrl) URL.revokeObjectURL(denoisedFileUrl);
    setDenoisedFile(null);
    setDenoisedFileUrl(null);
    setDenoisedWaveform([]);
    setProgress('');
    setError('');
    setCurrentTime(0);
    if (originalAudioRef.current) {
      originalAudioRef.current.pause();
      originalAudioRef.current.currentTime = 0;
    }
    if (denoisedAudioRef.current) {
      denoisedAudioRef.current.pause();
      denoisedAudioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setActivePlayer('original');
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      <div className="p-3 space-y-2">
        {/* File Selector */}
        <FileSelector
          onFileSelect={handleFileSelect}
          acceptedFileTypes="audio/*"
          currentFile={originalFile}
        />

      {/* Controls */}
      {originalFile && (
        <div className="space-y-2">
          {/* Reduction Strength Slider */}
          <div className="bg-slate-800 rounded-lg p-3">
            <label className="block text-sm font-medium text-white mb-1.5">
              Noise Reduction Strength: {reductionStrength}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={reductionStrength}
              onChange={(e) => setReductionStrength(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              disabled={isProcessing}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Light (0%)</span>
              <span>Medium (30%)</span>
              <span>Strong (100%)</span>
            </div>
          </div>

          {/* Stationary Noise Toggle */}
          <div className="bg-slate-800 rounded-lg p-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={stationary}
                onChange={(e) => setStationary(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                disabled={isProcessing}
              />
              <span className="text-sm text-white">
                Stationary noise
              </span>
              <div className="relative group">
                <svg 
                  className="w-4 h-4 text-gray-400 hover:text-purple-400 transition-colors cursor-help" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                {/* Tooltip */}
                <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-900 text-xs text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-slate-700">
                  Stationary noise er konstant baggrundsstøj som AC-hum, elektrisk brum eller kontinuerlig hvid støj. Aktiver dette hvis din støj er konstant gennem hele optagelsen.
                </div>
              </div>
            </label>
          </div>

          {/* Process Button */}
          <button
            onClick={handleRemoveNoise}
            disabled={isProcessing}
            className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : '🔇 Remove Noise'}
          </button>
        </div>
      )}

      {/* Side-by-side Players (always shown when file is loaded) */}
      {originalFile && (
        <div className="space-y-4">
          {/* Simplified Spectrum Visualization - Noise Focus */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-medium text-white mb-3">Noise Reduction Visualization</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-2">Original - Background Noise</p>
                <div className="h-20 bg-slate-800 rounded border border-slate-700 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-end">
                    {/* Simplified noise bars - showing typical noise frequencies */}
                    <div className="w-full h-full flex items-end justify-around px-2">
                      {/* Low frequency noise (AC hum, etc.) */}
                      <div className="w-3 bg-red-500/60 rounded-t" style={{ height: '45%' }} title="Low frequency noise"></div>
                      <div className="w-3 bg-orange-500/60 rounded-t" style={{ height: '60%' }} title="Mid frequency noise"></div>
                      <div className="w-3 bg-yellow-500/60 rounded-t" style={{ height: '55%' }} title="High frequency noise"></div>
                      <div className="w-3 bg-amber-500/60 rounded-t" style={{ height: '50%' }} title="Background hiss"></div>
                      <div className="w-3 bg-red-500/60 rounded-t" style={{ height: '40%' }} title="Static"></div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Visible noise across frequency range</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Cleaned - Reduced Noise</p>
                <div className="h-20 bg-slate-800 rounded border border-green-500/50 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-end">
                    {/* Reduced noise bars */}
                    <div className="w-full h-full flex items-end justify-around px-2">
                      <div className="w-3 bg-green-500/40 rounded-t" style={{ height: '15%' }} title="Reduced"></div>
                      <div className="w-3 bg-green-500/40 rounded-t" style={{ height: '20%' }} title="Reduced"></div>
                      <div className="w-3 bg-green-500/40 rounded-t" style={{ height: '18%' }} title="Reduced"></div>
                      <div className="w-3 bg-green-500/40 rounded-t" style={{ height: '16%' }} title="Reduced"></div>
                      <div className="w-3 bg-green-500/40 rounded-t" style={{ height: '12%' }} title="Reduced"></div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-green-400 mt-1">✓ Noise significantly reduced</p>
              </div>
            </div>
            <div className="mt-3 p-2 bg-blue-900/30 border border-blue-500/50 rounded text-xs text-blue-200">
              <p className="font-medium mb-1">What you're hearing:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-100">
                <li>Background hiss and static removed</li>
                <li>AC hum and electrical noise reduced</li>
                <li>Your music remains clear and natural</li>
              </ul>
            </div>
            <div className="mt-2 p-3 bg-slate-700/50 border border-slate-600 rounded text-xs text-white">
              <p className="font-medium mb-1.5">ℹ️ Important Information:</p>
              <p className="text-gray-200 leading-relaxed">
                Noise has been reduced digitally through spectral filtering. If the audio sounds slightly muffled or dark after processing, you can improve the tonal quality by using the equalizer process later in the pipeline. This allows you to adjust frequencies and restore the natural sound balance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original Player */}
            <div className={`bg-slate-800 rounded-lg p-4 border-2 ${activePlayer === 'original' ? 'border-blue-500' : 'border-slate-700'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white">Original</h3>
                {activePlayer === 'original' && isPlaying && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Playing</span>
                )}
              </div>
              {originalWaveform.length > 0 ? (
                <canvas
                  ref={originalCanvasRef}
                  width={600}
                  height={150}
                  className="w-full h-auto rounded-md mb-2"
                  style={{ cursor: isDraggingPlayback ? 'grabbing' : (isHoveringPlaybackHandle ? 'grab' : 'default') }}
                  onMouseDown={(e) => handleWaveformMouseDown(e, originalCanvasRef)}
                  onMouseMove={(e) => handleWaveformMouseMove(e, originalCanvasRef)}
                  onMouseUp={handleWaveformMouseUp}
                  onMouseLeave={handleWaveformMouseLeave}
                />
              ) : (
                <div className="h-[150px] bg-slate-900 rounded-md flex items-center justify-center mb-2">
                  <p className="text-gray-500 text-sm">Loading waveform...</p>
                </div>
              )}
              <div className="text-xs text-gray-400 text-center">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Denoised Player */}
            <div className={`bg-slate-800 rounded-lg p-4 border-2 ${activePlayer === 'denoised' ? 'border-green-500' : 'border-slate-700'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white">Cleaned</h3>
                {activePlayer === 'denoised' && isPlaying && (
                  <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">Playing</span>
                )}
              </div>
              {denoisedFile ? (
                denoisedWaveform.length > 0 ? (
                  <canvas
                    ref={denoisedCanvasRef}
                    width={600}
                    height={150}
                    className="w-full h-auto rounded-md mb-2"
                    style={{ cursor: isDraggingPlayback ? 'grabbing' : (isHoveringPlaybackHandle ? 'grab' : 'default') }}
                    onMouseDown={(e) => handleWaveformMouseDown(e, denoisedCanvasRef)}
                    onMouseMove={(e) => handleWaveformMouseMove(e, denoisedCanvasRef)}
                    onMouseUp={handleWaveformMouseUp}
                    onMouseLeave={handleWaveformMouseLeave}
                  />
                ) : (
                  <div className="h-[150px] bg-slate-900 rounded-md flex items-center justify-center mb-2">
                    <p className="text-gray-500 text-sm">Loading waveform...</p>
                  </div>
                )
              ) : (
                <div className="h-[150px] bg-slate-900 rounded-md flex items-center justify-center mb-2">
                  <p className="text-gray-500 text-sm">No cleaned file yet</p>
                </div>
              )}
              <div className="text-xs text-gray-400 text-center">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center space-x-4 bg-slate-800 p-4 rounded-lg">
            <button
              onClick={handlePlayPause}
              className="p-3 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
            
            <button
              onClick={handleTogglePlayer}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
              title="Switch between Original and Cleaned"
            >
              ⇄ Switch
            </button>
          </div>

          {/* Hidden audio elements */}
          {originalFileUrl && (
            <audio ref={originalAudioRef} src={originalFileUrl} />
          )}
          {denoisedFileUrl && (
            <audio ref={denoisedAudioRef} src={denoisedFileUrl} />
          )}
        </div>
      )}

      {/* Action Buttons */}
      {denoisedFile && (
        <div className="space-y-2">
          <button
            onClick={handleDownload}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            📥 Download Cleaned File
          </button>
          {onPreviousProcess && (
            <button
              onClick={onPreviousProcess}
              className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
            >
              ← Previous Step
            </button>
          )}
          {onNextProcess && (
            <button
              onClick={() => onNextProcess(denoisedFile)}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all"
            >
              → Next Process
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-3">
          <p className="text-red-200 text-sm font-medium mb-1">Error:</p>
          <p className="text-red-200 text-xs whitespace-pre-wrap break-words">{error}</p>
        </div>
      )}

        {/* Progress */}
        {progress && !isProcessing && (
          <div className="bg-blue-900/50 border border-blue-500 rounded-lg p-3">
            <p className="text-blue-200 text-sm">{progress}</p>
          </div>
        )}
      </div>
    </div>
  );
}

