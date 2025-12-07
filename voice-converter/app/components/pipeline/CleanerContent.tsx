'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import AudioSpectrum from '../AudioSpectrum';
import WatermarkEnergyComparison from '../WatermarkEnergyComparison';
import { getApiPath } from '../../lib/api';
import FileSelector from './FileSelector';
import FileInfoHeader from './FileInfoHeader';
import { useFileHistory } from '../../lib/fileHistory';

interface CleanerContentProps {
  onOpenAnalyzer?: (file?: File) => void;
  onNextProcess?: (file?: File) => void;
  preloadedFile?: File;
}

export default function CleanerContent({ onOpenAnalyzer, onNextProcess, preloadedFile }: CleanerContentProps) {
  const { fileHistory, getLatestFile } = useFileHistory();
  
  // File state - prioritize preloadedFile, otherwise use latest from history
  const getInitialFile = () => {
    if (preloadedFile) return preloadedFile;
    const latest = getLatestFile();
    return latest ? latest.file : null;
  };
  
  const [audioFile, setAudioFile] = useState<File | null>(getInitialFile());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [originalFileUrl, setOriginalFileUrl] = useState<string | null>(null);
  const [cleanedFileUrl, setCleanedFileUrl] = useState<string | null>(null);
  const [cleanedFile, setCleanedFile] = useState<File | null>(null);
  // NEW: Two sliders instead of low/medium/high
  // Defaults baseret på testresultater: 30% fingerprint + 15% humanizing = mest konsistente "Human made" resultat
  const [fingerprintIntensity, setFingerprintIntensity] = useState(30); // 20-60% (default 30% = optimal)
  const [humanizingIntensity, setHumanizingIntensity] = useState(15); // 5-20% (default 15% = optimal)
  const [cachedPreAnalysis, setCachedPreAnalysis] = useState<any>(null); // Cached pre-analysis metrics
  
  // Audio playback state (like NoiseRemoverContent)
  const [activePlayer, setActivePlayer] = useState<'original' | 'cleaned'>('original');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDraggingPlayback, setIsDraggingPlayback] = useState(false);
  const isDraggingPlaybackRef = useRef(false);
  const [isHoveringPlaybackHandle, setIsHoveringPlaybackHandle] = useState(false);
  
  // Waveform state
  const [originalWaveform, setOriginalWaveform] = useState<number[]>([]);
  const [cleanedWaveform, setCleanedWaveform] = useState<number[]>([]);
  
  // Refs
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const cleanedAudioRef = useRef<HTMLAudioElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const cleanedCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get current file's process history
  const currentFileHistory = audioFile 
    ? fileHistory.find(entry => entry.file.name === audioFile.name)?.processes || []
    : [];
  
  // Initialize file when it's set
  useEffect(() => {
    if (audioFile && !preloadedFile) {
      const latest = getLatestFile();
      if (latest && latest.file.name === audioFile.name) {
        setProgress('📎 Seneste fil automatisk valgt');
      }
    } else if (preloadedFile) {
      setProgress('📎 Fil automatisk overført fra forrige proces');
    }
  }, [audioFile, preloadedFile, getLatestFile]);

  const estimateProcessingTime = (fileSizeMB: number): number => {
    if (fileSizeMB < 10) return 40;
    if (fileSizeMB < 30) return 120;
    if (fileSizeMB < 60) return 300;
    return 480;
  };

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

  useEffect(() => {
    if (audioFile && !isProcessing) {
      const fileSizeMB = audioFile.size / (1024 * 1024);
      setEstimatedSeconds(estimateProcessingTime(fileSizeMB));
    }
  }, [audioFile, isProcessing]);

  // Initialize file URL when file is set
  useEffect(() => {
    if (audioFile && !originalFileUrl) {
      const url = URL.createObjectURL(audioFile);
      setOriginalFileUrl(url);
    }
  }, [audioFile, originalFileUrl]);
  
  // Handle file selection from FileSelector
  const handleFileSelect = (file: File) => {
    setAudioFile(file);
    if (originalFileUrl) URL.revokeObjectURL(originalFileUrl);
    setOriginalFileUrl(null); // Will be recreated in useEffect
    setCleanedFile(null);
    setCleanedFileUrl(null);
    setProgress('');
  };

  const handleClean = async () => {
    if (!audioFile) return;

    setIsProcessing(true);
    setProgress('🧹 Removing fingerprints...');
    setElapsedSeconds(0);
    
    const fileSizeMB = audioFile.size / (1024 * 1024);
    setEstimatedSeconds(estimateProcessingTime(fileSizeMB));
    
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('fingerprintIntensity', fingerprintIntensity.toString());
      formData.append('humanizingIntensity', humanizingIntensity.toString());

      const response = await fetch(getApiPath('/api/clean-audio'), {
        method: 'POST',
        body: formData,
      }).catch((fetchError) => {
        console.error('❌ Fetch error details:', {
          message: fetchError.message,
          name: fetchError.name,
          cause: fetchError.cause
        });
        
        if (fetchError.message.includes('Failed to fetch') || fetchError.name === 'TypeError') {
          throw new Error(`Network connection failed. This may be due to:\n- Connection timeout during file upload/processing\n- Server processing timeout (file may be too large)\n- Network interruption\n\nThe cleaning process may have completed on the server, but the connection was lost before the file could be downloaded. Try with a smaller file or check your network connection.`);
        }
        throw new Error(`Network error: ${fetchError.message}`);
      });

      // Check if response is ok before trying to read blob
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        let errorMsg = 'Cleaning failed';
        try {
          const errorJson = JSON.parse(errorText);
          if (response.status === 504 || errorJson.code === 'TIMEOUT') {
            errorMsg = errorJson.details || 'Request timeout - file is too large or processing took too long.';
          } else {
            errorMsg = errorJson.details || errorJson.error || errorMsg;
          }
        } catch {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }
      
      // Check for cached pre-analysis metrics in response headers (for faster comparison)
      const preAnalysisHeader = response.headers.get('X-Pre-Analysis-Metrics');
      if (preAnalysisHeader) {
        try {
          // Decode base64 and parse JSON
          const metricsJson = atob(preAnalysisHeader);
          const metrics = JSON.parse(metricsJson);
          setCachedPreAnalysis(metrics);
          console.log('✅ Pre-analysis metrics cached for comparison:', metrics);
        } catch (e) {
          console.warn('⚠️ Failed to parse pre-analysis metrics from header:', e);
        }
      }
      
      // Get content length for progress tracking
      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : null;
      
      setProgress('⏳ Downloading cleaned file...');
      
      // Read blob with streaming support and error handling
      let blob: Blob;
      try {
        // Check if response body is readable
        if (!response.body) {
          throw new Error('Response body is empty or not readable');
        }
        
        console.log('📥 Starting blob download (streaming)...');
        
        // For streaming responses, blob() will handle it automatically
        // But we can track progress if content-length is available
        if (totalBytes) {
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let receivedBytes = 0;
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            chunks.push(value);
            receivedBytes += value.length;
            
            // Update progress
            const progressPercent = Math.round((receivedBytes / totalBytes) * 100);
            setProgress(`⏳ Downloading cleaned file... ${progressPercent}%`);
          }
          
          // Combine chunks into blob
          blob = new Blob(chunks as BlobPart[], { type: 'audio/wav' });
        } else {
          // Fallback to standard blob() if no content-length
          blob = await response.blob();
        }
        
        console.log(`✅ Blob downloaded: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
      } catch (blobError) {
        console.error('❌ Blob read error:', blobError);
        const fileSizeMB = audioFile.size / (1024 * 1024);
        
        let errorMessage = 'Failed to download cleaned file. ';
        if (blobError instanceof Error) {
          if (blobError.message.includes('Failed to fetch') || blobError.message.includes('network')) {
            errorMessage += `Network error during download. The cleaning process likely completed successfully on the server (${fileSizeMB.toFixed(1)} MB processed), but the connection was lost while downloading the ${fileSizeMB.toFixed(1)} MB cleaned file. This can happen with large files due to:\n- HTTP connection timeout\n- Network interruption\n- Browser download timeout\n\nTry with a smaller file or check your network connection.`;
          } else if (blobError.message.includes('timeout')) {
            errorMessage += `Download timeout. The cleaned file (${fileSizeMB.toFixed(1)} MB) is too large to download in one request. The cleaning completed successfully, but the download timed out.`;
          } else {
            errorMessage += `Error: ${blobError.message}`;
          }
        } else {
          errorMessage += `Unknown error occurred during file download. The cleaning may have completed, but the file could not be retrieved.`;
        }
        
        throw new Error(errorMessage);
      }
      
      if (blob.size === 0) {
        throw new Error('Received empty file from server');
      }

      const cleanedUrl = window.URL.createObjectURL(blob);
      setCleanedFileUrl(cleanedUrl);
      
      // Get filename from Content-Disposition header (should be normalized with original name)
      const contentDisposition = response.headers.get('Content-Disposition');
      let cleanedFileName = audioFile.name.replace(/\.(wav|mp3|m4a|flac)$/i, '_cleaned.wav');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch) {
          // Strip any quotes from the filename
          cleanedFileName = filenameMatch[1].replace(/^["']|["']$/g, '');
        }
      }
      
      // Also save as File for transfer to next process
      const file = new File([blob], cleanedFileName, { type: blob.type || 'audio/wav' });
      setCleanedFile(file);

      setProgress('✅ Cleaning completed!');
      setIsProcessing(false);
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

    } catch (error) {
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
    setCurrentTime(0);
    setIsPlaying(false);
    setActivePlayer('original');
    setOriginalWaveform([]);
    setCleanedWaveform([]);
  };

  // Generate waveform data from audio file (from NoiseRemoverContent)
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
    if (audioFile && !originalWaveform.length) {
      generateWaveform(audioFile).then(setOriginalWaveform);
    }
  }, [audioFile, originalWaveform.length, generateWaveform]);

  // Load waveform when cleaned file changes
  useEffect(() => {
    if (cleanedFile && !cleanedWaveform.length) {
      generateWaveform(cleanedFile).then(setCleanedWaveform);
    }
  }, [cleanedFile, cleanedWaveform.length, generateWaveform]);

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
      if (cleanedAudioRef.current) {
        cleanedAudioRef.current.pause();
        cleanedAudioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
    };
    
    window.addEventListener('stop-all-audio', handleStopAllAudio);
    return () => {
      window.removeEventListener('stop-all-audio', handleStopAllAudio);
    };
  }, []);

  // Setup audio elements (from NoiseRemoverContent)
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
        
        if (activePlayer === 'original' || !cleanedFile) {
          setCurrentTime(audio.currentTime);
        }
      });
      
      audio.addEventListener('ended', () => {
        if (activePlayer === 'original' || !cleanedFile) {
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
  }, [originalFileUrl, activePlayer, cleanedFile]);

  useEffect(() => {
    if (cleanedFileUrl) {
      // Cleanup previous audio
      if (cleanedAudioRef.current) {
        cleanedAudioRef.current.pause();
        cleanedAudioRef.current = null;
      }
      
      const audio = new Audio(cleanedFileUrl);
      cleanedAudioRef.current = audio;
      
      audio.addEventListener('loadedmetadata', () => {
        if (!duration) setDuration(audio.duration);
      });
      
      audio.addEventListener('timeupdate', () => {
        // Don't update time during drag (prevents conflicts)
        if (isDraggingPlaybackRef.current) return;
        
        if (activePlayer === 'cleaned') {
          setCurrentTime(audio.currentTime);
        }
      });
      
      audio.addEventListener('ended', () => {
        if (activePlayer === 'cleaned') {
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
  }, [cleanedFileUrl, duration, activePlayer]);

  // Global mouse events for stable dragging (from NoiseRemoverContent)
  useEffect(() => {
    if (!isDraggingPlayback) {
      return;
    }
    
    const currentActivePlayer = activePlayer;
    const currentDuration = duration;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const activeCanvas = currentActivePlayer === 'original' ? originalCanvasRef.current : cleanedCanvasRef.current;
      
      if (!activeCanvas || !currentDuration || currentDuration <= 0) {
        return;
      }
      
      const rect = activeCanvas.getBoundingClientRect();
      const scaleX = activeCanvas.width / rect.width;
      const x = (e.clientX - rect.left) * scaleX;
      
      const padding = 20;
      const drawWidth = activeCanvas.width - padding * 2;
      const clickTime = ((x - padding) / drawWidth) * currentDuration;
      const clampedTime = Math.max(0, Math.min(currentDuration, clickTime));
      
      const masterAudio = currentActivePlayer === 'original' ? originalAudioRef.current : cleanedAudioRef.current;
      const slaveAudio = currentActivePlayer === 'original' ? cleanedAudioRef.current : originalAudioRef.current;
      
      if (masterAudio) {
        masterAudio.currentTime = clampedTime;
      }
      if (slaveAudio) {
        slaveAudio.currentTime = clampedTime;
      }
      setCurrentTime(clampedTime);
    };
    
    const handleGlobalMouseUp = () => {
      setIsDraggingPlayback(false);
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove, { capture: true, passive: false });
    window.addEventListener('mouseup', handleGlobalMouseUp, { capture: true });
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
      window.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });
    };
  }, [isDraggingPlayback, activePlayer, duration]);

  // Synchronize playback between players (from NoiseRemoverContent)
  useEffect(() => {
    if (!isPlaying || isDraggingPlayback) return;
    
    const masterAudio = activePlayer === 'original' ? originalAudioRef.current : cleanedAudioRef.current;
    const slaveAudio = activePlayer === 'original' ? cleanedAudioRef.current : originalAudioRef.current;
    
    if (masterAudio && slaveAudio) {
      slaveAudio.currentTime = masterAudio.currentTime;
      
      const updateSlave = () => {
        if (masterAudio && slaveAudio && !masterAudio.paused && !isDraggingPlaybackRef.current) {
          const masterTime = masterAudio.currentTime;
          const slaveTime = slaveAudio.currentTime;
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

  // Draw waveforms (from NoiseRemoverContent)
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
    
    ctx.fillStyle = activePlayer === 'original' ? '#3b82f6' : '#475569';
    for (let i = 0; i < originalWaveform.length; i++) {
      const x = padding + i * barWidth;
      const amplitude = (originalWaveform[i] / maxAmplitude) * drawHeight;
      ctx.fillRect(x, padding + drawHeight / 2 - amplitude / 2, barWidth - 1, amplitude);
    }
    
    // Draw playback position with drag handle
    if (currentTime > 0 && currentTime <= duration) {
      const playX = padding + (currentTime / duration) * drawWidth;
      const handleSize = 12;
      const handleY = padding - handleSize;
      
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(playX, padding);
      ctx.lineTo(playX, padding + drawHeight);
      ctx.stroke();
      
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
    if (!cleanedCanvasRef.current || !cleanedWaveform.length || !duration) return;
    
    const canvas = cleanedCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);
    
    const barWidth = drawWidth / cleanedWaveform.length;
    const maxAmplitude = Math.max(...cleanedWaveform);
    
    ctx.fillStyle = activePlayer === 'cleaned' ? '#10b981' : '#475569';
    for (let i = 0; i < cleanedWaveform.length; i++) {
      const x = padding + i * barWidth;
      const amplitude = (cleanedWaveform[i] / maxAmplitude) * drawHeight;
      ctx.fillRect(x, padding + drawHeight / 2 - amplitude / 2, barWidth - 1, amplitude);
    }
    
    // Draw playback position with drag handle
    if (currentTime > 0 && currentTime <= duration) {
      const playX = padding + (currentTime / duration) * drawWidth;
      const handleSize = 12;
      const handleY = padding - handleSize;
      
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(playX, padding);
      ctx.lineTo(playX, padding + drawHeight);
      ctx.stroke();
      
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
  }, [cleanedWaveform, duration, currentTime, activePlayer]);

  // Playback handlers (from NoiseRemoverContent)
  const handlePlayPause = () => {
    if (isDraggingPlayback) return;
    
    if (audioFile && !cleanedFile) {
      const audio = originalAudioRef.current;
      if (audio) {
        if (audio.paused) {
          audio.play().catch(console.error);
          setIsPlaying(true);
          setActivePlayer('original');
        } else {
          audio.pause();
          setIsPlaying(false);
        }
      }
      return;
    }
    
    const masterAudio = activePlayer === 'original' ? originalAudioRef.current : cleanedAudioRef.current;
    const slaveAudio = activePlayer === 'original' ? cleanedAudioRef.current : originalAudioRef.current;
    
    if (masterAudio && slaveAudio) {
      if (masterAudio.paused) {
        const syncTime = masterAudio.currentTime;
        slaveAudio.currentTime = syncTime;
        masterAudio.play().catch(console.error);
        setIsPlaying(true);
      } else {
        masterAudio.pause();
        slaveAudio.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleTogglePlayer = () => {
    const currentMaster = activePlayer === 'original' ? originalAudioRef.current : cleanedAudioRef.current;
    const currentSlave = activePlayer === 'original' ? cleanedAudioRef.current : originalAudioRef.current;
    
    if (currentMaster && currentSlave) {
      const wasPlaying = !currentMaster.paused;
      const currentTime = currentMaster.currentTime;
      
      if (wasPlaying) {
        currentMaster.pause();
        currentSlave.pause();
      }
      
      const newActivePlayer = activePlayer === 'original' ? 'cleaned' : 'original';
      setActivePlayer(newActivePlayer);
      
      if (wasPlaying) {
        setTimeout(() => {
          const newMaster = newActivePlayer === 'original' ? originalAudioRef.current : cleanedAudioRef.current;
          const newSlave = newActivePlayer === 'original' ? cleanedAudioRef.current : originalAudioRef.current;
          if (newMaster && newSlave) {
            newMaster.currentTime = currentTime;
            newSlave.currentTime = currentTime;
            newMaster.play();
            setIsPlaying(true);
          }
        }, 50);
      }
    } else {
      setActivePlayer(activePlayer === 'original' ? 'cleaned' : 'original');
    }
  };

  const handleWaveformMouseDown = (e: React.MouseEvent<HTMLCanvasElement>, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (!canvasRef.current || !duration) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const padding = 20;
    const drawWidth = canvas.width - padding * 2;
    const handleSize = 12;
    const handleY = padding - handleSize;
    
    const playX = (currentTime >= 0 && duration > 0) ? padding + (currentTime / duration) * drawWidth : -1;
    const hitAreaWidth = 30;
    const hitAreaHeight = 20;
    
    const isInPlaybackHandle = playX >= 0 && 
                               x >= playX - hitAreaWidth / 2 && x <= playX + hitAreaWidth / 2 && 
                               y >= handleY - 10 && y <= padding + hitAreaHeight;
    
    if (isInPlaybackHandle) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingPlayback(true);
    }
  };

  const handleWaveformMouseMove = (e: React.MouseEvent<HTMLCanvasElement>, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (isDraggingPlayback) return;
    
    if (!canvasRef.current || !duration) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const padding = 20;
    const drawWidth = canvas.width - padding * 2;
    const handleSize = 12;
    const handleY = padding - handleSize;
    
    const playX = currentTime >= 0 ? padding + (currentTime / duration) * drawWidth : -1;
    const hitAreaWidth = 30;
    
    const isOverHandle = playX >= 0 && 
                         x >= playX - hitAreaWidth / 2 && x <= playX + hitAreaWidth / 2 && 
                         y >= handleY - 10 && y <= padding + 20;
    
    setIsHoveringPlaybackHandle(isOverHandle);
  };

  const handleWaveformMouseUp = () => {
    if (isDraggingPlayback) {
      setIsDraggingPlayback(false);
    }
  };

  const handleWaveformMouseLeave = () => {
    setIsHoveringPlaybackHandle(false);
    handleWaveformMouseUp();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      {/* File Info Header */}
      {audioFile && (
        <FileInfoHeader
          fileName={audioFile.name}
          fileSize={audioFile.size}
          processes={currentFileHistory}
        />
      )}
      
      <div className="p-3 space-y-2">
        {/* File Selector */}
        <FileSelector
          onFileSelect={handleFileSelect}
          acceptedFileTypes="audio/*"
          currentFile={audioFile}
        />

      {/* Two Sliders for Fingerprint Removal and Humanization */}
      {audioFile && !isProcessing && (
        <div className="space-y-3">
          {/* Fingerprint Removal Slider */}
          <div className="bg-slate-800 rounded-lg p-3">
            <label className="block text-sm font-medium text-white mb-1.5">
              Fingerprint Removal: {fingerprintIntensity}%
            </label>
            <input
              type="range"
              min="20"
              max="60"
              value={fingerprintIntensity}
              onChange={(e) => setFingerprintIntensity(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              disabled={isProcessing}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span className="text-red-400">Min (20%)</span>
              <span className="text-green-400 font-semibold">Optimal (30%)</span>
              <span className="text-yellow-400">Max (60%)</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Kontrollerer matematisk Hz-behandling: ratio target, outlier removal, spectral normalization
            </p>
            <p className="text-xs text-orange-300 mt-1.5 font-medium">
              ⚠️ Under 20% = AI Generated | Over 60% = Risiko for over-processing
            </p>
          </div>

          {/* Humanizing Slider */}
          <div className="bg-slate-800 rounded-lg p-3">
            <label className="block text-sm font-medium text-white mb-1.5">
              Musical Humanization: {humanizingIntensity}%
            </label>
            <input
              type="range"
              min="5"
              max="20"
              value={humanizingIntensity}
              onChange={(e) => setHumanizingIntensity(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              disabled={isProcessing}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span className="text-red-400">Min (5%)</span>
              <span className="text-green-400 font-semibold">Optimal (15%)</span>
              <span className="text-yellow-400">Max (20%)</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Kontrollerer musikalsk humanization: tempo variation, pitch variation, timing variation, chroma variation
            </p>
            <p className="text-xs text-orange-300 mt-1.5 font-medium">
              ⚠️ Under 5% = Inconclusive | Over 20% = Risiko for over-humanization
            </p>
          </div>
        </div>
      )}

      {/* Compact Info Box - Responsive padding */}
      <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-1.5 md:p-2">
        <p className="text-xs text-orange-200 font-medium mb-0.5 md:mb-1">🔍 Enhanced Removal:</p>
        <ul className="text-xs text-orange-100 space-y-0.5 ml-3 list-disc">
          <li>Multi-stage filtering (17kHz → 15.5kHz)</li>
          <li>Phase randomization (disrupts patterns)</li>
          <li>Spectral normalization (target ratio ~0.15)</li>
          <li>High-frequency dithering (high mode)</li>
        </ul>
      </div>

      {/* Compact Progress - Responsive padding */}
      {progress && (
        <div className="bg-slate-700 border border-slate-600 rounded-lg p-1.5 md:p-2">
          <p className="text-xs font-medium text-gray-200 mb-1 md:mb-1.5">{progress}</p>
          {progress.includes('Cleaning completed') && (
            <p className="text-xs text-green-300 mt-1">
              🔊 No audible difference - your audio quality is fully preserved!
            </p>
          )}
          {isProcessing && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-orange-300">⏱️ {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}</span>
                {estimatedSeconds && (
                  <span className="text-orange-200">Est: {Math.floor(estimatedSeconds / 60)}:{(estimatedSeconds % 60).toString().padStart(2, '0')}</span>
                )}
              </div>
              {estimatedSeconds && (
                <div className="w-full bg-orange-900/50 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-1000"
                    style={{ width: `${Math.min((elapsedSeconds / estimatedSeconds) * 100, 95)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Side-by-side Players (like NoiseRemoverContent) */}
      {audioFile && (
        <div className="space-y-4">
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

            {/* Cleaned Player */}
            <div className={`bg-slate-800 rounded-lg p-4 border-2 ${activePlayer === 'cleaned' ? 'border-green-500' : 'border-slate-700'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white">Cleaned</h3>
                {activePlayer === 'cleaned' && isPlaying && (
                  <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">Playing</span>
                )}
              </div>
              {cleanedFile ? (
                cleanedWaveform.length > 0 ? (
                  <canvas
                    ref={cleanedCanvasRef}
                    width={600}
                    height={150}
                    className="w-full h-auto rounded-md mb-2"
                    style={{ cursor: isDraggingPlayback ? 'grabbing' : (isHoveringPlaybackHandle ? 'grab' : 'default') }}
                    onMouseDown={(e) => handleWaveformMouseDown(e, cleanedCanvasRef)}
                    onMouseMove={(e) => handleWaveformMouseMove(e, cleanedCanvasRef)}
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
          {cleanedFile && (
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
          )}

          {/* Hidden audio elements */}
          {originalFileUrl && (
            <audio ref={originalAudioRef} src={originalFileUrl} />
          )}
          {cleanedFileUrl && (
            <audio ref={cleanedAudioRef} src={cleanedFileUrl} />
          )}
        </div>
      )}

      {/* Before/After Comparison (Energy and Spectrum) */}
      {cleanedFileUrl && originalFileUrl && (
        <div className="space-y-2">

          {/* Energy Comparison - will show error if it fails */}
          {cleanedFile && (
            <WatermarkEnergyComparison 
              originalFile={audioFile}
              cleanedFile={cleanedFile}
              originalAnalysisMetrics={cachedPreAnalysis}
            />
          )}

          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-gray-400 hover:text-gray-300 flex items-center gap-1">
              <span className="transform group-open:rotate-90 transition-transform">▶</span>
              🔬 Technical Spectrum (Advanced)
            </summary>
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <AudioSpectrum 
                  audioUrl={originalFileUrl} 
                  label="⚠️ Original"
                  color="red"
                />
                <AudioSpectrum 
                  audioUrl={cleanedFileUrl} 
                  label="✓ Cleaned"
                  color="green"
                />
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Compact Actions */}
      <div className="space-y-2">
        {!cleanedFileUrl ? (
          <div className="flex gap-2">
            <button
              onClick={handleClean}
              disabled={!audioFile || isProcessing}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                audioFile && !isProcessing
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? '🔄 Processing...' : '🧹 Remove Fingerprints'}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 py-2 px-3 rounded text-sm font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              💾 Download
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300"
            >
              New File
            </button>
          </div>
        )}
        
        {onOpenAnalyzer && !cleanedFileUrl && (
          <button
            onClick={() => onOpenAnalyzer()}
            className="w-full py-1.5 px-3 rounded text-xs font-medium text-purple-700 bg-purple-50 border-2 border-purple-200 hover:bg-purple-100"
          >
            🔍 Open Fingerprint Analysis →
          </button>
        )}

        {cleanedFileUrl && onOpenAnalyzer && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded p-2">
            <p className="text-xs text-purple-800 mb-1.5">
              <strong>💡 Verify:</strong> Want to check that fingerprints are removed?
            </p>
            <button
              onClick={() => onOpenAnalyzer && onOpenAnalyzer(cleanedFile || undefined)}
              className="w-full py-1.5 px-3 rounded text-xs font-medium text-purple-700 bg-white border-2 border-purple-300 hover:bg-purple-50"
            >
              🔍 Analyze Cleaned File →
            </button>
          </div>
        )}
        
        {/* Navigation to next process (step 4) */}
        {onNextProcess && cleanedFileUrl && (
          <button
            onClick={() => onNextProcess(cleanedFile || undefined)}
            className="w-full px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded text-xs md:text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all mt-2"
          >
            → Next: Key Detect
          </button>
        )}
      </div>
      </div>
    </div>
  );
}

