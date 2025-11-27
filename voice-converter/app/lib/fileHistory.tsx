'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ProcessHistory {
  processId: number;
  processName: string;
  processIcon: string;
  timestamp: number;
}

export interface FileHistoryEntry {
  id: string;
  file: File;
  fileUrl: string;
  processes: ProcessHistory[];
  createdAt: number;
  lastUsed: number;
}

interface FileHistoryContextType {
  fileHistory: FileHistoryEntry[];
  addFile: (file: File, processId: number, processName: string, processIcon: string) => FileHistoryEntry;
  addProcessToFile: (fileId: string, processId: number, processName: string, processIcon: string) => void;
  getLatestFile: () => FileHistoryEntry | null;
  clearHistory: () => void;
}

const FileHistoryContext = createContext<FileHistoryContextType | undefined>(undefined);

export function FileHistoryProvider({ children }: { children: ReactNode }) {
  const [fileHistory, setFileHistory] = useState<FileHistoryEntry[]>([]);

  const addFile = useCallback((file: File, processId: number, processName: string, processIcon: string): FileHistoryEntry => {
    const fileUrl = URL.createObjectURL(file);
    const now = Date.now();
    
    const newEntry: FileHistoryEntry = {
      id: `${file.name}_${now}`,
      file,
      fileUrl,
      processes: [{
        processId,
        processName,
        processIcon,
        timestamp: now,
      }],
      createdAt: now,
      lastUsed: now,
    };

    setFileHistory(prev => {
      // Remove old entry with same filename if exists (keep latest)
      const filtered = prev.filter(entry => entry.file.name !== file.name);
      return [newEntry, ...filtered].slice(0, 20); // Keep last 20 files
    });

    return newEntry;
  }, []);

  const addProcessToFile = useCallback((fileId: string, processId: number, processName: string, processIcon: string) => {
    setFileHistory(prev => prev.map(entry => {
      if (entry.id === fileId) {
        return {
          ...entry,
          processes: [
            ...entry.processes,
            {
              processId,
              processName,
              processIcon,
              timestamp: Date.now(),
            }
          ],
          lastUsed: Date.now(),
        };
      }
      return entry;
    }));
  }, []);

  const getLatestFile = useCallback((): FileHistoryEntry | null => {
    if (fileHistory.length === 0) return null;
    return fileHistory[0]; // Most recent is first
  }, [fileHistory]);

  const clearHistory = useCallback(() => {
    // Cleanup object URLs
    fileHistory.forEach(entry => {
      URL.revokeObjectURL(entry.fileUrl);
    });
    setFileHistory([]);
  }, [fileHistory]);

  return (
    <FileHistoryContext.Provider
      value={{
        fileHistory,
        addFile,
        addProcessToFile,
        getLatestFile,
        clearHistory,
      }}
    >
      {children}
    </FileHistoryContext.Provider>
  );
}

export function useFileHistory() {
  const context = useContext(FileHistoryContext);
  if (context === undefined) {
    throw new Error('useFileHistory must be used within a FileHistoryProvider');
  }
  return context;
}

