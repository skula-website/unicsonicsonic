'use client';

import { useState } from 'react';
import MainMonitor from './components/pipeline/MainMonitor';
import ProcessGrid from './components/pipeline/ProcessGrid';
import ProcessDetailModal from './components/pipeline/ProcessDetailModal';
import AnalyzerContent from './components/pipeline/AnalyzerContent';
import CleanerContent from './components/pipeline/CleanerContent';
import ConverterContent from './components/pipeline/ConverterContent';
import TrimmerContent from './components/pipeline/TrimmerContent';
import SidebarPanel from './components/pipeline/SidebarPanel';
import LyricWriterContent from './components/pipeline/LyricWriterContent';
import { ProcessStatus } from './components/pipeline/ProcessContainer';

export default function PipelinePage() {
  const [activeStep, setActiveStep] = useState<number | undefined>();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  
  // ProcessDetailModal state (for all processes)
  const [showProcessDetail, setShowProcessDetail] = useState(false);
  const [processDetailOrigin, setProcessDetailOrigin] = useState<DOMRect | null>(null);
  const [processDetailInfo, setProcessDetailInfo] = useState<{ title: string; icon: string; stepNumber: number } | null>(null);
  
  // File transfer between processes
  const [fileForCleaner, setFileForCleaner] = useState<File | null>(null);
  const [fileForAnalyzer, setFileForAnalyzer] = useState<File | null>(null);
  const [fileForConverter, setFileForConverter] = useState<File | null>(null);
  const [fileForTrimmer, setFileForTrimmer] = useState<File | null>(null);

  // Process states
  const [processStates, setProcessStates] = useState<Record<number, ProcessStatus>>({
    1: 'idle', // Convert
    2: 'idle', // Analyze
    3: 'idle', // Remove
    4: 'idle', // Key detect (future)
    5: 'idle', // Tabs detector (future)
    6: 'idle', // Noise remover (future)
    7: 'idle', // Genre detector (future)
    8: 'idle', // Audio trimmer (future)
    9: 'idle', // Fade in/out (future)
    10: 'idle', // Auto EQ (future)
  });

  const [processProgress, setProcessProgress] = useState<Record<number, number>>({});

  const addLog = (message: string) => {
    setLog(prev => [...prev, message].slice(-10)); // Keep last 10
  };

  const handleProcessClick = (processId: number, originRect?: DOMRect) => {
    // Use ProcessDetailModal for all processes (1-10)
    const process = processes.find(p => p.id === processId);
    if (process && originRect) {
      setProcessDetailOrigin(originRect);
      setProcessDetailInfo({
        title: process.title,
        icon: process.icon,
        stepNumber: processId
      });
      setShowProcessDetail(true);
      setActiveStep(processId);
      
      if (processId === 1) {
        addLog('Convert audio: Opening audio converter');
      } else if (processId === 2) {
        addLog('Analyze audio: Opening fingerprint analyzer');
      } else if (processId === 3) {
        addLog('Remove fingerprint: Opening fingerprint remover');
      } else {
        addLog(`Process ${processId}: Opening with zoom animation`);
      }
    }
  };

  // Navigate to next process (1→2, 2→3, 3→4, etc.)
  // Optionally skip to a specific step (e.g., 2→4 if file is clean)
  const navigateToNextProcess = (currentStep: number, file?: File, targetStep?: number) => {
    const nextStep = targetStep || (currentStep + 1);
    if (nextStep > 10) return; // No next step after 10
    
    const nextProcess = processes.find(p => p.id === nextStep);
    if (!nextProcess || !processDetailOrigin) return;

    // Handle file transfer based on current and next step
    if (currentStep === 1 && nextStep === 2) {
      // Converter → Analyzer
      setFileForAnalyzer(file || null);
    } else if (currentStep === 2 && nextStep === 3) {
      // Analyzer → Cleaner
      setFileForCleaner(file || null);
    } else if (currentStep === 3 && nextStep === 4) {
      // Cleaner → Key Detect
      // Future: setFileForKeyDetect(file || null);
    }

    // Mark current step as done
    setProcessStates(prev => ({ ...prev, [currentStep]: 'done', [nextStep]: 'running' }));
    setCompletedSteps(prev => [...prev, currentStep]);
    
    // Close current and open next
    setShowProcessDetail(false);
    const currentOrigin = processDetailOrigin;
    
    // Small delay for smooth transition
    setTimeout(() => {
      setProcessDetailOrigin(currentOrigin);
      setProcessDetailInfo({
        title: nextProcess.title,
        icon: nextProcess.icon,
        stepNumber: nextStep
      });
      setShowProcessDetail(true);
      setActiveStep(nextStep);
      addLog(`Navigating from Process ${currentStep} to Process ${nextStep}`);
    }, 100);
  };

  const processes = [
    {
      id: 1,
      title: 'Convert Audio',
      icon: '🔄',
      status: processStates[1],
      progress: processProgress[1],
      description: 'WAV to MP3',
      onClick: (rect?: DOMRect) => handleProcessClick(1, rect),
    },
    {
      id: 2,
      title: 'Analyze Audio',
      icon: '🔍',
      status: processStates[2],
      progress: processProgress[2],
      description: 'Fingerprint detection',
      onClick: (rect?: DOMRect) => handleProcessClick(2, rect),
    },
    {
      id: 3,
      title: 'Remove Fingerprint',
      icon: '🧹',
      status: processStates[3],
      progress: processProgress[3],
      description: 'Clean watermarks',
      onClick: (rect?: DOMRect) => handleProcessClick(3, rect),
    },
    // Future processes (placeholders)
    {
      id: 4,
      title: 'Key Detect',
      icon: '🎹',
      status: 'idle' as ProcessStatus,
      description: 'Coming soon',
      onClick: (rect?: DOMRect) => handleProcessClick(4, rect),
    },
    {
      id: 5,
      title: 'Tabs Detector',
      icon: '📊',
      status: 'idle' as ProcessStatus,
      description: 'Coming soon',
      onClick: (rect?: DOMRect) => handleProcessClick(5, rect),
    },
    {
      id: 6,
      title: 'Noise Remover',
      icon: '🔇',
      status: 'idle' as ProcessStatus,
      description: 'Coming soon',
      onClick: (rect?: DOMRect) => handleProcessClick(6, rect),
    },
    {
      id: 7,
      title: 'Audio Trimmer',
      icon: '✂️',
      status: 'idle' as ProcessStatus,
      description: 'Trim audio files',
      onClick: (rect?: DOMRect) => handleProcessClick(7, rect),
    },
    {
      id: 8,
      title: 'Fade In/Out',
      icon: '📈',
      status: 'idle' as ProcessStatus,
      description: 'Coming soon',
      onClick: (rect?: DOMRect) => handleProcessClick(8, rect),
    },
    {
      id: 9,
      title: 'Genre Detector',
      icon: '🎵',
      status: 'idle' as ProcessStatus,
      description: 'Coming soon',
      onClick: (rect?: DOMRect) => handleProcessClick(9, rect),
    },
    {
      id: 10,
      title: 'Auto EQ',
      icon: '🎚️',
      status: 'idle' as ProcessStatus,
      description: 'Coming soon',
      onClick: (rect?: DOMRect) => handleProcessClick(10, rect),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900 p-4 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <img src="/unicsonic-logo.svg" alt="UnicSonic" className="w-12 h-12" />
            <span className="text-2xl font-bold text-white">UnicSonic Pipeline</span>
          </div>
          <span className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 border-2 border-orange-400 rounded-full text-white font-bold text-sm shadow-lg">
            🎉 FREE BETA
          </span>
        </div>

        {/* Main Content: Monitor + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Main Monitor - Left Side (50%) */}
          <div>
            <MainMonitor
              currentStep={activeStep ? processes.find(p => p.id === activeStep)?.title : undefined}
              totalSteps={processes.length}
              progress={overallProgress}
              log={log}
            />
          </div>

          {/* Auxiliary Tools Sidebar - Right Side (50%) */}
          <div>
            <SidebarPanel
              onOpenLyricWriter={(rect) => {
                setProcessDetailOrigin(rect);
                setProcessDetailInfo({
                  title: 'Lyrics Formatter',
                  icon: '📝',
                  stepNumber: 0 // Special number for auxiliary tools
                });
                setShowProcessDetail(true);
                addLog('Auxiliary tool: Opening Lyrics Formatter');
              }}
            />
          </div>
        </div>

        {/* Process Grid */}
        <ProcessGrid
          activeStep={activeStep}
          completedSteps={completedSteps}
          processes={processes}
        />
      </div>

      {/* ProcessDetailModal - For all processes (1-10) */}
      {processDetailInfo && (
        <ProcessDetailModal
          isOpen={showProcessDetail}
          onClose={() => {
            setShowProcessDetail(false);
            setProcessDetailOrigin(null);
            setProcessDetailInfo(null);
            setActiveStep(undefined);
            addLog(`Process ${processDetailInfo.stepNumber}: Closed`);
          }}
          title={processDetailInfo.title}
          icon={processDetailInfo.icon}
          stepNumber={processDetailInfo.stepNumber}
          originRect={processDetailOrigin}
        >
          {processDetailInfo.stepNumber === 1 ? (
            <ConverterContent
              onNextProcess={(file) => {
                setFileForAnalyzer(file || null);
                navigateToNextProcess(1, file, 2);
              }}
              preloadedFile={fileForConverter || undefined}
            />
          ) : processDetailInfo.stepNumber === 2 ? (
            <AnalyzerContent
              onOpenCleaner={(file, isClean) => {
                if (isClean) {
                  // File is clean - skip step 3 and go directly to Key Detect (step 4)
                  navigateToNextProcess(2, file, 4);
                } else {
                  // File has fingerprints - go to Remove Fingerprints (step 3)
                  setFileForCleaner(file || null);
                  const cleanerProcess = processes.find(p => p.id === 3);
                  if (cleanerProcess && processDetailOrigin) {
                    setShowProcessDetail(false);
                    setTimeout(() => {
                      setProcessDetailOrigin(processDetailOrigin);
                      setProcessDetailInfo({
                        title: cleanerProcess.title,
                        icon: cleanerProcess.icon,
                        stepNumber: 3
                      });
                      setShowProcessDetail(true);
                      setActiveStep(3);
                      setProcessStates(prev => ({ ...prev, 2: 'done', 3: 'running' }));
                      setCompletedSteps(prev => [...prev, 2]);
                      addLog('Analysis complete - opening fingerprint remover');
                    }, 100);
                  }
                }
              }}
              preloadedFile={fileForAnalyzer || undefined}
            />
          ) : processDetailInfo.stepNumber === 3 ? (
            <CleanerContent
              onOpenAnalyzer={(file) => {
                setFileForAnalyzer(file || null);
                // Navigate back to analyzer (step 2)
                const analyzerProcess = processes.find(p => p.id === 2);
                if (analyzerProcess && processDetailOrigin) {
                  setShowProcessDetail(false);
                  setTimeout(() => {
                    setProcessDetailOrigin(processDetailOrigin);
                    setProcessDetailInfo({
                      title: analyzerProcess.title,
                      icon: analyzerProcess.icon,
                      stepNumber: 2
                    });
                    setShowProcessDetail(true);
                    setActiveStep(2);
                    setProcessStates(prev => ({ ...prev, 3: 'idle', 2: 'running' }));
                    addLog('Opening fingerprint analyzer');
                  }, 100);
                }
              }}
              onNextProcess={(file) => {
                setFileForCleaner(file || null);
                navigateToNextProcess(3, file);
              }}
              preloadedFile={fileForCleaner || undefined}
            />
          ) : processDetailInfo.stepNumber === 7 ? (
            <TrimmerContent
              onNextProcess={(file) => {
                setFileForTrimmer(file || null);
                navigateToNextProcess(7, file);
              }}
              preloadedFile={fileForTrimmer || undefined}
            />
          ) : processDetailInfo.stepNumber === 0 ? (
            // Auxiliary Tools (Lyrics Formatter, etc.)
            processDetailInfo.title === 'Lyrics Formatter' ? (
              <LyricWriterContent />
            ) : (
              <div className="space-y-3">
                <div className="bg-slate-700 rounded-lg p-3">
                  <h3 className="text-base font-bold text-white mb-1">{processDetailInfo.icon} {processDetailInfo.title}</h3>
                  <p className="text-gray-300 text-xs">
                    This auxiliary tool is coming soon.
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-700 rounded-lg p-3">
                <h3 className="text-base font-bold text-white mb-1">{processDetailInfo.icon} {processDetailInfo.title}</h3>
                {processDetailInfo.stepNumber === 1 ? (
                  <>
                    <p className="text-gray-300 text-xs mb-2">
                      Convert your audio files from WAV to MP3 format for optimized processing and distribution.
                    </p>
                    <div className="bg-blue-500/20 border border-blue-500/50 rounded p-2">
                      <p className="text-blue-200 text-xs">
                        💡 This feature is coming soon. It will allow you to convert audio files efficiently while maintaining quality.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-300 text-xs">
                      This feature is coming soon. Check back later for updates!
                    </p>
                    <div className="bg-blue-500/20 border border-blue-500/50 rounded p-2 mt-2">
                      <p className="text-blue-200 text-xs">
                        💡 This process is part of the UnicSonic pipeline. Development is in progress.
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              {/* Navigation to next process */}
              {processDetailInfo.stepNumber < 10 && (
                <button
                  onClick={() => navigateToNextProcess(processDetailInfo.stepNumber)}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all text-sm md:text-base"
                >
                  → Next: {processes.find(p => p.id === processDetailInfo.stepNumber + 1)?.icon} {processes.find(p => p.id === processDetailInfo.stepNumber + 1)?.title}
                </button>
              )}
            </div>
          )}
        </ProcessDetailModal>
      )}
    </div>
  );
}

