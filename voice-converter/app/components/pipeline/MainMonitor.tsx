'use client';

interface MainMonitorProps {
  currentStep?: string;
  totalSteps?: number;
  progress?: number;
  log?: string[];
}

export default function MainMonitor({ 
  currentStep, 
  totalSteps = 10, 
  progress = 0,
  log = []
}: MainMonitorProps) {
  return (
    <div className="bg-slate-800 rounded-xl shadow-xl border-2 border-slate-700 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h2 className="text-xl font-bold text-white">Main Monitor</h2>
        </div>
        <div className="text-sm text-gray-400">
          {currentStep || 'Idle'}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-300">Overall Progress</span>
          <span className="text-sm font-bold text-white">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
          </div>
        </div>
      </div>

      {/* Log Output */}
      <div className="bg-slate-900 rounded-lg p-4 h-24 overflow-y-auto font-mono text-xs">
        {log.length > 0 ? (
          <div className="space-y-1">
            {log.slice(-5).map((line, i) => (
              <div key={i} className="text-gray-300">
                <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {line}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">Waiting for process to start...</div>
        )}
      </div>
    </div>
  );
}

