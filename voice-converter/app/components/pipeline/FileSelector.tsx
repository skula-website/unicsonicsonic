'use client';

import { useState, useRef, useEffect } from 'react';
import { useFileHistory, FileHistoryEntry } from '../../lib/fileHistory';

interface FileSelectorProps {
  onFileSelect: (file: File) => void;
  acceptedFileTypes?: string;
  currentFile?: File | null;
}

export default function FileSelector({ onFileSelect, acceptedFileTypes = 'audio/*', currentFile }: FileSelectorProps) {
  const { fileHistory, getLatestFile } = useFileHistory();
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<FileHistoryEntry | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const latestFile = getLatestFile();
  
  // Get current file's history entry
  const currentFileEntry = currentFile 
    ? fileHistory.find(entry => entry.file.name === currentFile.name)
    : null;

  // Auto-select latest file if no current file is set
  useEffect(() => {
    // Only auto-select if there's no current file and we have a latest file
    if (!currentFile && latestFile) {
      // Small delay to avoid calling during render
      const timer = setTimeout(() => {
        onFileSelect(latestFile.file);
        setSelectedHistoryEntry(latestFile);
      }, 0);
      return () => clearTimeout(timer);
    } else if (currentFile) {
      // If current file exists, find matching entry in history
      const matchingEntry = fileHistory.find(entry => entry.file.name === currentFile.name);
      if (matchingEntry) {
        setSelectedHistoryEntry(matchingEntry);
      }
    }
  }, []); // Only run once on mount - we don't want to re-trigger auto-select

  useEffect(() => {
    // Cleanup audio when component unmounts or file changes
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  // Stop all audio when modal closes/opens (listen to custom event)
  useEffect(() => {
    const handleStopAllAudio = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlayingPreview(false);
      }
    };
    
    window.addEventListener('stop-all-audio', handleStopAllAudio);
    return () => {
      window.removeEventListener('stop-all-audio', handleStopAllAudio);
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      setSelectedHistoryEntry(null);
      setShowHistory(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      onFileSelect(file);
      setSelectedHistoryEntry(null);
      setShowHistory(false);
    }
  };

  const handleSelectHistoryFile = (entry: FileHistoryEntry) => {
    setSelectedHistoryEntry(entry);
    onFileSelect(entry.file);
    setShowHistory(false);
  };

  const handlePlayPreview = (e: React.MouseEvent, entry: FileHistoryEntry) => {
    e.stopPropagation();
    
    if (audioRef.current && audioRef.current.src === entry.fileUrl) {
      // Same file - toggle play/pause
      if (isPlayingPreview) {
        audioRef.current.pause();
        setIsPlayingPreview(false);
      } else {
        audioRef.current.play();
        setIsPlayingPreview(true);
      }
    } else {
      // New file - create new audio element
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(entry.fileUrl);
      audioRef.current = audio;
      audio.play();
      setIsPlayingPreview(true);
      
      audio.addEventListener('ended', () => {
        setIsPlayingPreview(false);
      });
      
      audio.addEventListener('pause', () => {
        setIsPlayingPreview(false);
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('da-DK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-2">
      {/* Upload Area + Info Button - Side by side */}
      <div className="grid grid-cols-[70%_30%] gap-2">
        {/* Upload Area - 70% width */}
        <div
          className={`border-2 border-dashed ${currentFile ? 'border-green-500 bg-green-900/20' : 'border-slate-600 bg-slate-800'} rounded-lg p-3 text-center cursor-pointer transition-all hover:border-purple-500`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={acceptedFileTypes}
            onChange={handleFileUpload}
          />
          {currentFile ? (
            <div className="space-y-1">
              <p className="text-white text-xs font-medium truncate" title={currentFile.name}>📎 {currentFile.name}</p>
              <p className="text-gray-400 text-xs">{formatFileSize(currentFile.size)}</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-400 text-xs mb-1">
                Drag & drop or <span className="text-purple-400 font-medium">click</span>
              </p>
              <p className="text-gray-500 text-xs">Select from history below</p>
            </div>
          )}
        </div>

        {/* Process History Info Button - 30% width */}
        {currentFileEntry && currentFileEntry.processes.length > 0 ? (
          <div className="relative group">
            <button
              className="w-full h-full bg-slate-800 border-2 border-slate-600 rounded-lg p-3 flex flex-col items-center justify-center hover:border-purple-500 hover:bg-slate-700 transition-all"
              title="Click to view process history"
            >
              <svg 
                className="w-5 h-5 text-purple-400 mb-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-gray-300 font-medium">
                {currentFileEntry.processes.length} {currentFileEntry.processes.length === 1 ? 'process' : 'processes'}
              </span>
            </button>
            
            {/* Tooltip with process history */}
            <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-slate-900 text-xs text-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 border border-slate-700">
              <div className="font-medium text-white mb-2 pb-2 border-b border-slate-700">
                Process History
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentFileEntry.processes.map((process, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-gray-300">
                    <span className="text-base">{process.processIcon}</span>
                    <span className="flex-1">{process.processName}</span>
                    <span className="text-gray-500 text-xs">
                      {new Date(process.timestamp).toLocaleTimeString('da-DK', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-slate-800 border-2 border-slate-700 rounded-lg p-3 flex flex-col items-center justify-center opacity-50">
            <svg 
              className="w-5 h-5 text-gray-500 mb-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-500">No history</span>
          </div>
        )}
      </div>

      {/* File History */}
      {fileHistory.length > 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-700">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-slate-700 transition-colors rounded-t-lg"
          >
            <span className="text-sm font-medium text-white">
              📚 Filhistorik {fileHistory.length > 0 && `(${fileHistory.length})`}
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${showHistory ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showHistory && (
            <div className="border-t border-slate-700 max-h-64 overflow-y-auto">
              {fileHistory.map((entry) => {
                const isSelected = selectedHistoryEntry?.id === entry.id;
                const isCurrentFile = currentFile?.name === entry.file.name;
                
                return (
                  <div
                    key={entry.id}
                    className={`px-3 py-2 border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50 transition-colors ${
                      isCurrentFile ? 'bg-green-900/20 border-l-4 border-l-green-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <button
                            onClick={() => handleSelectHistoryFile(entry)}
                            className={`text-sm font-medium truncate ${
                              isCurrentFile ? 'text-green-400' : 'text-white hover:text-purple-400'
                            }`}
                          >
                            {entry.file.name}
                          </button>
                          {isCurrentFile && (
                            <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">Aktiv</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                          {formatFileSize(entry.file.size)} • {formatDate(entry.lastUsed)}
                        </p>
                        
                        {/* Process History - Collapsible */}
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-400 hover:text-gray-300 mb-1">
                            Processes: {entry.processes.length}
                          </summary>
                          <div className="mt-2 space-y-1 pl-2 border-l-2 border-slate-600">
                            {entry.processes.map((process, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-gray-300">
                                <span>{process.processIcon}</span>
                                <span className="flex-1">{process.processName}</span>
                                <span className="text-gray-500 text-xs">
                                  {new Date(process.timestamp).toLocaleTimeString('da-DK', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                      
                      {/* Play Button */}
                      <button
                        onClick={(e) => handlePlayPreview(e, entry)}
                        className="flex-shrink-0 p-1.5 rounded hover:bg-slate-600 transition-colors"
                        title="Afspil forhåndsvisning"
                      >
                        {isPlayingPreview && audioRef.current?.src === entry.fileUrl ? (
                          <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

