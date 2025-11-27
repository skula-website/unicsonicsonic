'use client';

import { useRef } from 'react';
import ProcessContainer, { ProcessStatus } from './ProcessContainer';
import RailNetwork from './RailNetwork';

interface ProcessGridProps {
  activeStep?: number;
  completedSteps?: number[];
  processes: Array<{
    id: number;
    title: string;
    icon: string;
    status: ProcessStatus;
    progress?: number;
    description?: string;
    onClick?: (originRect?: DOMRect) => void;
    children?: React.ReactNode;
  }>;
}

export default function ProcessGrid({ 
  activeStep, 
  completedSteps = [],
  processes 
}: ProcessGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  
  // Mobile: Sort processes by ID (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
  const mobileProcesses = [...processes].sort((a, b) => a.id - b.id);
  
  // Desktop: Group processes by row based on flowchart layout
  // Row 1: 1, 2, 3 (left to right)
  const row1 = processes.filter(p => p.id <= 3);
  // Row 2: 6, 5, 4 (left to right, but flow is 6→5→4, positioned under 1, 2, 3)
  const row2 = processes.filter(p => p.id >= 4 && p.id <= 6).sort((a, b) => b.id - a.id); // Reverse order: 6, 5, 4
  // Row 3: 7, 8, 9 (left to right, positioned under 6, 6, 4)
  const row3 = processes.filter(p => p.id >= 7 && p.id <= 9);
  // Bottom: 10 (centered under row 3)
  const bottom = processes.filter(p => p.id === 10);

  return (
    <div ref={gridRef} className="relative">
      {/* Rail Network Background - Hidden on mobile, visible on desktop */}
      <RailNetwork 
        gridRef={gridRef}
        activeStep={activeStep} 
        completedSteps={completedSteps}
        totalSteps={processes.length}
      />

      {/* MOBIL: 2 kolonner, nummeret rækkefølge (1-10) */}
      <div className="grid grid-cols-2 gap-4 md:hidden relative z-10">
        {mobileProcesses.map((process) => (
          <div key={process.id} data-step-id={process.id}>
            <ProcessContainer
              title={process.title}
              icon={process.icon}
              status={process.status}
              progress={process.progress}
              description={process.description}
              onClick={process.onClick}
              isActive={activeStep === process.id}
              stepNumber={process.id}
            >
              {process.children}
            </ProcessContainer>
          </div>
        ))}
      </div>

      {/* DESKTOP: Original layout - Visible in DOM but hidden on mobile */}
      {/* Row 1: Left to Right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-8 relative z-10 opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto" data-row="1">
        {row1.map((process) => (
          <div key={process.id} data-step-id={process.id}>
            <ProcessContainer
              title={process.title}
              icon={process.icon}
              status={process.status}
              progress={process.progress}
              description={process.description}
              onClick={process.onClick}
              isActive={activeStep === process.id}
              stepNumber={process.id}
            >
              {process.children}
            </ProcessContainer>
          </div>
        ))}
      </div>

      {/* Row 2: 6, 5, 4 (left to right, positioned under 1, 2, 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-8 relative z-10 opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto" data-row="2">
        {row2.map((process) => (
          <div key={process.id} data-step-id={process.id}>
            <ProcessContainer
              title={process.title}
              icon={process.icon}
              status={process.status}
              progress={process.progress}
              description={process.description}
              onClick={process.onClick}
              isActive={activeStep === process.id}
              stepNumber={process.id}
            >
              {process.children}
            </ProcessContainer>
          </div>
        ))}
      </div>

      {/* Row 3: 7, 8, 9 (left to right, positioned under 6, 6, 4) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-8 relative z-10 opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto" data-row="3">
        {row3.map((process) => (
          <div key={process.id} data-step-id={process.id}>
            <ProcessContainer
              title={process.title}
              icon={process.icon}
              status={process.status}
              progress={process.progress}
              description={process.description}
              onClick={process.onClick}
              isActive={activeStep === process.id}
              stepNumber={process.id}
            >
              {process.children}
            </ProcessContainer>
          </div>
        ))}
      </div>

      {/* Bottom: 10 (centered) */}
      {bottom.length > 0 && (
        <div className="flex justify-center relative z-10 opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto" data-row="4">
          {bottom.map((process) => (
            <div key={process.id} data-step-id={process.id}>
              <ProcessContainer
                title={process.title}
                icon={process.icon}
                status={process.status}
                progress={process.progress}
                description={process.description}
                onClick={process.onClick}
                isActive={activeStep === process.id}
                stepNumber={process.id}
              >
                {process.children}
              </ProcessContainer>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

