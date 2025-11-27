'use client';

import { useState, useRef, useEffect } from 'react';
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

      {/* Compact Info Box - Responsive padding */}
      <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-1.5 md:p-2">
        <p className="text-xs text-orange-200 font-medium mb-0.5 md:mb-1">🔍 Removes:</p>
        <ul className="text-xs text-orange-100 space-y-0.5 ml-3 list-disc">
          <li>Spectral watermarks (18-22 kHz)</li>
          <li>Statistical fingerprints</li>
          <li>DC offset & metadata</li>
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

      {/* Compact Before/After Comparison */}
      {cleanedFileUrl && originalFileUrl && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-white">📊 Before/After</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-red-500/20 border-2 border-red-500/50 rounded p-2">
              <span className="font-bold text-red-300 text-xs">⚠️ Original</span>
              <audio controls className="w-full mt-1" style={{ height: '32px' }}>
                <source src={originalFileUrl} />
              </audio>
            </div>
            <div className="bg-green-500/20 border-2 border-green-500/50 rounded p-2">
              <span className="font-bold text-green-300 text-xs">✓ Cleaned</span>
              <audio controls className="w-full mt-1" style={{ height: '32px' }}>
                <source src={cleanedFileUrl} />
              </audio>
            </div>
          </div>

          {/* Energy Comparison - will show error if it fails */}
          {cleanedFile && (
            <WatermarkEnergyComparison 
              originalFile={audioFile}
              cleanedFile={cleanedFile}
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

