'use client';

import { ReactNode, useRef } from 'react';

export type ProcessStatus = 'idle' | 'running' | 'done' | 'error';

interface ProcessContainerProps {
  title: string;
  icon?: string;
  status?: ProcessStatus;
  progress?: number;
  description?: string;
  onClick?: (originRect?: DOMRect) => void; // Pass container position for zoom animation
  children?: ReactNode;
  isActive?: boolean;
  stepNumber?: number;
}

export default function ProcessContainer({
  title,
  icon = '⚙️',
  status = 'idle',
  progress = 0,
  description,
  onClick,
  children,
  isActive = false,
  stepNumber
}: ProcessContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (onClick && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      onClick(rect);
    }
  };
  const statusColors = {
    idle: 'border-slate-700 bg-slate-800/50',
    running: 'border-purple-500 bg-purple-500/10',
    done: 'border-green-500 bg-green-500/10',
    error: 'border-red-500 bg-red-500/10'
  };

  const statusIcons = {
    idle: '○',
    running: '⟳',
    done: '✓',
    error: '✗'
  };

  return (
    <div
      ref={containerRef}
      className={`
        relative rounded-lg border-2 p-4 transition-all min-h-[120px]
        ${onClick ? 'cursor-pointer hover:border-purple-400 hover:shadow-lg hover:scale-[1.02]' : 'cursor-default'}
        ${statusColors[status]}
        ${isActive ? 'ring-2 ring-purple-400 ring-opacity-50 shadow-xl' : ''}
      `}
      onClick={handleClick}
    >
      {/* Step Number */}
      {stepNumber && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center border-2 border-purple-400 shadow-lg">
            <span className="text-xs font-bold text-white">{stepNumber}</span>
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <div className={`absolute ${stepNumber ? 'top-2 left-2' : 'top-2 right-2'} flex items-center gap-2`}>
        <span className={`text-xs font-bold ${
          status === 'idle' ? 'text-gray-500' :
          status === 'running' ? 'text-purple-400 animate-spin' :
          status === 'done' ? 'text-green-400' :
          'text-red-400'
        }`}>
          {statusIcons[status]}
        </span>
      </div>

      {/* Icon and Title */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-bold text-white text-sm">{title}</h3>
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-gray-400 mb-3">{description}</p>
      )}

      {/* Progress Bar (only when running) */}
      {status === 'running' && progress > 0 && (
        <div className="mb-2">
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1 text-right">{Math.round(progress)}%</div>
        </div>
      )}

      {/* Children (output, visualizations, etc.) */}
      {children && (
        <div className="mt-3">
          {children}
        </div>
      )}
    </div>
  );
}

